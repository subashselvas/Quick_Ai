import OpenAI from "openai";
import sql from "../configs/db.js";
import { clerkClient } from "@clerk/express";
import axios from "axios";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import FormData from "form-data";
import pdf from "pdf-parse";

// Initialize OpenAI client pointing to Gemini API
const getAIClient = () => {
    return new OpenAI({
        apiKey: process.env.GEMINI_API_KEY || "dummy_key",
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
    });
};

export const generateArticle = async (req, res) => {
    try {
        const userId = req.userId || (typeof req.auth === 'function' ? req.auth()?.userId : req.auth?.userId);
        const { prompt, length } = req.body;
        const plan = req.plan || 'free';
        const free_usage = req.free_usage || 0;

        if (plan !== 'premium' && free_usage >= 10) {
            return res.json({ success: false, message: "Limit reached. Upgrade to continue." });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({
                success: false,
                message: "GEMINI_API_KEY is not configured on the server."
            });
        }

        const AI = getAIClient();
        const response = await AI.chat.completions.create({
            model: "gemini-2.0-flash",
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
            temperature: 0.7,
            max_tokens: Number(length) || 1500,
        });

        const content = response.choices?.[0]?.message?.content || "";

        await sql`
            INSERT INTO creations (user_id, prompt, content, type, publish, likes) 
            VALUES (${userId}, ${prompt}, ${content}, 'article', false, '{}')
        `;

        if (plan !== 'premium' && userId) {
            try {
                await clerkClient.users.updateUserMetadata(userId, {
                    privateMetadata: {
                        free_usage: free_usage + 1
                    }
                });
            } catch (clerkErr) {
                console.warn("Clerk metadata update warning:", clerkErr.message);
            }
        }

        res.json({ success: true, content });
    } catch (error) {
        console.error("generateArticle error:", error.message);
        res.json({ success: false, message: error.message });
    }
};

export const generateBlogTitle = async (req, res) => {
    try {
        const userId = req.userId || (typeof req.auth === 'function' ? req.auth()?.userId : req.auth?.userId);
        const { prompt } = req.body;
        const plan = req.plan || 'free';
        const free_usage = req.free_usage || 0;

        if (plan !== 'premium' && free_usage >= 10) {
            return res.json({ success: false, message: "Limit reached. Upgrade to continue." });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({
                success: false,
                message: "GEMINI_API_KEY is not configured on the server."
            });
        }

        const AI = getAIClient();
        const response = await AI.chat.completions.create({
            model: "gemini-2.0-flash",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 500,
        });

        const content = response.choices?.[0]?.message?.content || "";

        await sql`
            INSERT INTO creations (user_id, prompt, content, type, publish, likes) 
            VALUES (${userId}, ${prompt}, ${content}, 'blog-title', false, '{}')
        `;

        if (plan !== 'premium' && userId) {
            try {
                await clerkClient.users.updateUserMetadata(userId, {
                    privateMetadata: {
                        free_usage: free_usage + 1
                    }
                });
            } catch (clerkErr) {
                console.warn("Clerk metadata update warning:", clerkErr.message);
            }
        }

        res.json({ success: true, content });
    } catch (error) {
        console.error("generateBlogTitle error:", error.message);
        res.json({ success: false, message: error.message });
    }
};

export const generateImage = async (req, res) => {
    try {
        const userId = req.userId || (typeof req.auth === 'function' ? req.auth()?.userId : req.auth?.userId);
        const { prompt, publish } = req.body;
        const plan = req.plan;

        if (plan !== "premium") {
            return res.json({
                success: false,
                message: "This feature is only available for premium subscriptions",
            });
        }

        if (!process.env.CLIPDROP_API_KEY) {
            return res.status(500).json({
                success: false,
                message: "CLIPDROP_API_KEY is not configured on the server."
            });
        }

        const formData = new FormData();
        formData.append("prompt", prompt);

        const response = await axios.post(
            "https://clipdrop-api.co/text-to-image/v1",
            formData,
            {
                headers: {
                    "x-api-key": process.env.CLIPDROP_API_KEY,
                    ...formData.getHeaders(),
                },
                responseType: "arraybuffer",
            }
        );

        const base64Image = `data:image/png;base64,${Buffer.from(response.data).toString("base64")}`;
        const uploadResult = await cloudinary.uploader.upload(base64Image);
        const secure_url = uploadResult.secure_url;

        await sql`
            INSERT INTO creations (user_id, prompt, content, type, publish, likes) 
            VALUES (${userId}, ${prompt}, ${secure_url}, 'image', ${Boolean(publish)}, '{}')
        `;

        res.json({ success: true, content: secure_url });
    } catch (error) {
        console.error("generateImage error:", error.message);
        res.json({
            success: false,
            message: error.response?.data?.toString() || error.message,
        });
    }
};

export const removeImageBackground = async (req, res) => {
    const image = req.file;
    try {
        const userId = req.userId || (typeof req.auth === 'function' ? req.auth()?.userId : req.auth?.userId);
        const plan = req.plan;

        if (plan !== 'premium') {
            return res.json({ success: false, message: "This feature is only available for premium subscriptions" });
        }

        if (!image) {
            return res.json({ success: false, message: "Please provide an image file" });
        }

        const uploadResult = await cloudinary.uploader.upload(image.path, {
            transformation: [
                {
                    effect: 'background_removal',
                    background_removal: 'remove_the_background'
                }
            ]
        });

        const secure_url = uploadResult.secure_url;

        await sql`
            INSERT INTO creations (user_id, prompt, content, type, publish, likes) 
            VALUES (${userId}, 'Remove background from image', ${secure_url}, 'image', false, '{}')
        `;

        res.json({ success: true, content: secure_url });
    } catch (error) {
        console.error("removeImageBackground error:", error.message);
        res.json({ success: false, message: error.message });
    } finally {
        if (image?.path && fs.existsSync(image.path)) {
            try { fs.unlinkSync(image.path); } catch (e) { /* ignore cleanup error */ }
        }
    }
};

export const removeImageObject = async (req, res) => {
    const image = req.file;
    try {
        const userId = req.userId || (typeof req.auth === 'function' ? req.auth()?.userId : req.auth?.userId);
        const { object } = req.body;
        const plan = req.plan;

        if (plan !== 'premium') {
            return res.json({ success: false, message: "This feature is only available for premium subscriptions" });
        }

        if (!image) {
            return res.json({ success: false, message: "Please provide an image file" });
        }

        const uploadResult = await cloudinary.uploader.upload(image.path);
        const imageUrl = cloudinary.url(uploadResult.public_id, {
            transformation: [{ effect: `gen_remove:${object}` }],
            resource_type: 'image'
        });

        await sql`
            INSERT INTO creations (user_id, prompt, content, type, publish, likes) 
            VALUES (${userId}, ${`Removed ${object} from image`}, ${imageUrl}, 'image', false, '{}')
        `;

        res.json({ success: true, content: imageUrl });
    } catch (error) {
        console.error("removeImageObject error:", error.message);
        res.json({ success: false, message: error.message });
    } finally {
        if (image?.path && fs.existsSync(image.path)) {
            try { fs.unlinkSync(image.path); } catch (e) { /* ignore cleanup error */ }
        }
    }
};

export const resumeReview = async (req, res) => {
    const resume = req.file;
    try {
        const userId = req.userId || (typeof req.auth === 'function' ? req.auth()?.userId : req.auth?.userId);
        const plan = req.plan;

        if (plan !== 'premium') {
            return res.json({ success: false, message: "This feature is only available for premium subscriptions" });
        }

        if (!resume) {
            return res.json({ success: false, message: "Please upload a resume PDF file" });
        }

        if (resume.size > 5 * 1024 * 1024) {
            return res.json({ success: false, message: "Resume file size exceeds allowed size (5MB)." });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({
                success: false,
                message: "GEMINI_API_KEY is not configured on the server."
            });
        }

        const dataBuffer = fs.readFileSync(resume.path);
        const pdfData = await pdf(dataBuffer);

        const prompt = `Review the following resume and provide constructive feedback on its strengths, weaknesses, and areas for improvement. Resume Content:\n\n${pdfData.text}`;

        const AI = getAIClient();
        const response = await AI.chat.completions.create({
            model: "gemini-2.0-flash",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 800,
        });

        const content = response.choices?.[0]?.message?.content || "";

        await sql`
            INSERT INTO creations (user_id, prompt, content, type, publish, likes) 
            VALUES (${userId}, 'Review the uploaded resume', ${content}, 'resume-review', false, '{}')
        `;

        res.json({ success: true, content });
    } catch (error) {
        console.error("resumeReview error:", error.message);
        res.json({ success: false, message: error.message });
    } finally {
        if (resume?.path && fs.existsSync(resume.path)) {
            try { fs.unlinkSync(resume.path); } catch (e) { /* ignore cleanup error */ }
        }
    }
};
