import { clerkClient } from "@clerk/express";

// Middleware to check userId, subscription status and free usage
export const auth = async (req, res, next) => {
    try {
        const authData = typeof req.auth === 'function' ? req.auth() : (req.auth || {});
        const userId = authData.userId;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized. Please sign in." });
        }

        const hasPremiumPlan = typeof authData.has === 'function' ? await authData.has({ plan: 'premium' }) : false;

        let free_usage = 0;
        try {
            const user = await clerkClient.users.getUser(userId);
            const userFreeUsage = user?.privateMetadata?.free_usage;
            if (!hasPremiumPlan && userFreeUsage !== undefined && userFreeUsage !== null) {
                free_usage = Number(userFreeUsage) || 0;
            } else if (!hasPremiumPlan) {
                await clerkClient.users.updateUserMetadata(userId, {
                    privateMetadata: {
                        free_usage: 0
                    }
                });
                free_usage = 0;
            }
        } catch (clerkErr) {
            console.warn("Clerk metadata warning:", clerkErr.message);
        }

        req.userId = userId;
        req.free_usage = free_usage;
        req.plan = hasPremiumPlan ? 'premium' : 'free';
        next();
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// API Route Auth protection middleware that responds with 401 JSON instead of redirecting
export const requireApiAuth = (req, res, next) => {
    try {
        const authData = typeof req.auth === 'function' ? req.auth() : (req.auth || {});
        if (!authData?.userId) {
            return res.status(401).json({ success: false, message: "Unauthorized. Please sign in." });
        }
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }
};