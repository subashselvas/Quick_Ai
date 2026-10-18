import express from "express";
import cors from "cors";
import "dotenv/config";
import { clerkMiddleware } from "@clerk/express";

import aiRouter from "./routes/aiRoutes.js";
import userRouter from "./routes/userRoutes.js";
import connectCloudinary from "./configs/cloudinary.js";
import { requireApiAuth } from "./middlewares/auth.js";

const app = express();

// Initialize Cloudinary if credentials are present
connectCloudinary();

app.use(cors());
app.use(express.json());

// Public health check routes (accessible even without Clerk credentials)
app.get("/", (req, res) => {
  res.send("Server is Live!");
});

app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Conditionally attach Clerk middleware if CLERK_SECRET_KEY is configured
if (process.env.CLERK_SECRET_KEY) {
  app.use(clerkMiddleware());
} else {
  console.warn("⚠️ CLERK_SECRET_KEY is not set. API routes requiring auth will prompt for authentication.");
  app.use((req, res, next) => {
    req.auth = () => ({ userId: null });
    next();
  });
}

// Protect API routes with JSON 401 response for API callers
app.use("/api/ai", requireApiAuth, aiRouter);
app.use("/api/user", requireApiAuth, userRouter);

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

const PORT = process.env.PORT || 3000;

// Only listen when executed directly, not when imported as serverless function
if (!process.env.VERCEL && process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log("Server is running on port", PORT);
  });
}

export default app;