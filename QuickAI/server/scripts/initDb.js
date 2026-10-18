import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function initDb() {
    if (!process.env.DATABASE_URL) {
        console.error("❌ Error: DATABASE_URL is not defined in environment variables.");
        process.exit(1);
    }

    console.log("Connecting to Neon PostgreSQL...");
    const sql = neon(process.env.DATABASE_URL);

    try {
        console.log("Creating 'creations' table if not exists...");
        await sql`
            CREATE TABLE IF NOT EXISTS creations (
                id SERIAL PRIMARY KEY,
                user_id TEXT NOT NULL,
                prompt TEXT NOT NULL,
                content TEXT NOT NULL,
                type VARCHAR(50) NOT NULL,
                publish BOOLEAN DEFAULT FALSE,
                likes TEXT[] DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;

        await sql`
            CREATE INDEX IF NOT EXISTS idx_creations_user_id ON creations (user_id);
        `;

        await sql`
            CREATE INDEX IF NOT EXISTS idx_creations_publish ON creations (publish, created_at DESC);
        `;

        console.log("✅ Database schema initialized successfully!");
    } catch (error) {
        console.error("❌ Failed to initialize database schema:", error.message);
        process.exit(1);
    }
}

initDb();
