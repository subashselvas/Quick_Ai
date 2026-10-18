import sql from "../configs/db.js";

export const getUserCreations = async (req, res) => {
    try {
        const userId = req.userId || (typeof req.auth === 'function' ? req.auth()?.userId : req.auth?.userId);

        const creations = await sql`SELECT * FROM creations WHERE user_id = ${userId} ORDER BY created_at DESC`;

        const normalizedCreations = (creations || []).map(item => ({
            ...item,
            likes: Array.isArray(item.likes) ? item.likes : []
        }));

        res.json({ success: true, creations: normalizedCreations });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const getPublishedCreations = async (req, res) => {
    try {
        const creations = await sql`
            SELECT * FROM creations WHERE publish = true ORDER BY created_at DESC
        `;

        const normalizedCreations = (creations || []).map(item => ({
            ...item,
            likes: Array.isArray(item.likes) ? item.likes : []
        }));

        res.json({ success: true, creations: normalizedCreations });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const toggleLikeCreation = async (req, res) => {
    try {
        const userId = req.userId || (typeof req.auth === 'function' ? req.auth()?.userId : req.auth?.userId);
        const { id } = req.body;

        const [creation] = await sql`SELECT * FROM creations WHERE id = ${id}`;

        if (!creation) {
            return res.json({ success: false, message: "Creation not found" });
        }

        const currentLikes = Array.isArray(creation.likes) ? creation.likes : [];
        const userIdStr = String(userId);
        let updatedLikes;
        let message;

        if (currentLikes.includes(userIdStr)) {
            updatedLikes = currentLikes.filter((user) => user !== userIdStr);
            message = 'Creation Unliked';
        } else {
            updatedLikes = [...currentLikes, userIdStr];
            message = 'Creation Liked';
        }

        const formattedArray = `{${updatedLikes.join(',')}}`;

        await sql`UPDATE creations SET likes = ${formattedArray}::text[] WHERE id = ${id}`;

        res.json({ success: true, message, likesCount: updatedLikes.length });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};