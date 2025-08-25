-- Create logging table for automated logger
-- This needs to be run in Supabase SQL editor

CREATE TABLE IF NOT EXISTS app_logs (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    relative_time BIGINT,
    url TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_app_logs_session_id ON app_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_app_logs_category ON app_logs(category);
CREATE INDEX IF NOT EXISTS idx_app_logs_timestamp ON app_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_app_logs_created_at ON app_logs(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE app_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anonymous inserts (for logging from the app)
CREATE POLICY "Allow anonymous inserts" ON app_logs
    FOR INSERT 
    TO anon 
    WITH CHECK (true);

-- Create policy to allow reading logs (for analysis)
CREATE POLICY "Allow reading logs" ON app_logs
    FOR SELECT 
    TO anon 
    USING (true);

-- Create policy to allow deleting old logs (for cleanup)
CREATE POLICY "Allow deleting logs" ON app_logs
    FOR DELETE 
    TO anon 
    USING (true);

-- Create a function to automatically delete old logs
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
    -- Delete logs older than 7 days
    DELETE FROM app_logs 
    WHERE created_at < NOW() - INTERVAL '7 days';
    
    -- If table is still too large, delete oldest records
    DELETE FROM app_logs 
    WHERE id IN (
        SELECT id FROM app_logs 
        ORDER BY created_at ASC 
        LIMIT (
            SELECT COUNT(*) - 10000 
            FROM app_logs 
            WHERE (SELECT COUNT(*) FROM app_logs) > 10000
        )
    )
    AND (SELECT COUNT(*) FROM app_logs) > 10000;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled function to run cleanup daily
-- (This would need to be set up in Supabase Edge Functions or cron)

COMMENT ON TABLE app_logs IS 'Automated application logs with automatic cleanup';
COMMENT ON FUNCTION cleanup_old_logs() IS 'Cleanup function to maintain log table size';