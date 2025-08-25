// Script to create the logging table in Supabase
// Run this in browser console on the site to create the table

async function createLoggingTable() {
    const supabaseUrl = 'https://zfeqsdtddvelapbrwlol.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmZXFzZHRkZHZlbGFwYnJ3bG9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQwNjA2MjMsImV4cCI6MjAzOTYzNjYyM30.bPl7ZBHQD7yI9OKQ6_VqL2QWGhzJpHqNa5H1YgvY-qo';
    
    const createTableSQL = `
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
        
        CREATE INDEX IF NOT EXISTS idx_app_logs_session_id ON app_logs(session_id);
        CREATE INDEX IF NOT EXISTS idx_app_logs_category ON app_logs(category);
        CREATE INDEX IF NOT EXISTS idx_app_logs_timestamp ON app_logs(timestamp);
        CREATE INDEX IF NOT EXISTS idx_app_logs_created_at ON app_logs(created_at);
        
        ALTER TABLE app_logs ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS "Allow anonymous inserts" ON app_logs
            FOR INSERT 
            TO anon 
            WITH CHECK (true);
            
        CREATE POLICY IF NOT EXISTS "Allow reading logs" ON app_logs
            FOR SELECT 
            TO anon 
            USING (true);
            
        CREATE POLICY IF NOT EXISTS "Allow deleting logs" ON app_logs
            FOR DELETE 
            TO anon 
            USING (true);
    `;
    
    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sql: createTableSQL })
        });
        
        if (response.ok) {
            console.log('✅ Logging table created successfully');
            return true;
        } else {
            console.error('❌ Failed to create table:', response.status, await response.text());
            return false;
        }
    } catch (error) {
        console.error('❌ Error creating table:', error);
        return false;
    }
}

// Test insert to verify table works
async function testLogging() {
    const supabaseUrl = 'https://zfeqsdtddvelapbrwlol.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmZXFzZHRkZHZlbGFwYnJ3bG9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQwNjA2MjMsImV4cCI6MjAzOTYzNjYyM30.bPl7ZBHQD7yI9OKQ6_VqL2QWGhzJpHqNa5H1YgvY-qo';
    
    const testLog = {
        session_id: 'test_' + Date.now(),
        category: 'SYSTEM',
        message: 'Test log entry',
        data: JSON.stringify({ test: true, timestamp: new Date().toISOString() }),
        timestamp: new Date().toISOString(),
        relative_time: 0,
        url: window.location.href,
        user_agent: navigator.userAgent
    };
    
    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/app_logs`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(testLog)
        });
        
        if (response.ok) {
            console.log('✅ Test log inserted successfully');
            return true;
        } else {
            console.error('❌ Failed to insert test log:', response.status, await response.text());
            return false;
        }
    } catch (error) {
        console.error('❌ Error inserting test log:', error);
        return false;
    }
}

// Run setup
console.log('Setting up logging table...');
createLoggingTable().then(success => {
    if (success) {
        console.log('Testing logging...');
        testLogging().then(testSuccess => {
            if (testSuccess) {
                console.log('🎉 Logging system ready!');
            } else {
                console.log('⚠️ Table created but testing failed');
            }
        });
    }
});