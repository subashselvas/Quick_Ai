import { neon } from '@neondatabase/serverless';

let sql;

if (process.env.DATABASE_URL) {
    sql = neon(process.env.DATABASE_URL);
} else {
    console.warn("⚠️ DATABASE_URL is not set. Database queries will return empty results until configured.");
    sql = async () => [];
}

export default sql;