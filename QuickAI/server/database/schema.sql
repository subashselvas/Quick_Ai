-- PostgreSQL Schema for QuickAI creations table
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

-- Index for fast user queries
CREATE INDEX IF NOT EXISTS idx_creations_user_id ON creations (user_id);

-- Index for public community creations
CREATE INDEX IF NOT EXISTS idx_creations_publish ON creations (publish, created_at DESC);
