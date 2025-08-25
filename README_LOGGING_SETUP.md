# Automated Logging System Setup

Det automatiska loggningssystemet för Sveriges Förskolor loggar kontinuerligt alla system-händelser, fel, användarinteraktioner och API-anrop till en Supabase-databas.

## Funktioner

✅ **Automatisk loggning av:**
- System-händelser (startup, initialization, etc.)
- JavaScript-fel och Promise-rejections
- Användarinteraktioner (sökningar, kommun-filter, etc.)
- Google Places API-anrop med resultat
- Supabase-operationer och prestanda
- Memory och prestanda-metriker

✅ **Intelligent datahantering:**
- Automatisk buffering (50 loggar per batch)
- Automatisk rensning efter 7 dagar
- Max 10MB lagringsgräns med automatisk cleanup
- Graceful degradation vid anslutningsproblem

✅ **Självunderhållande:**
- Ingen användarinteraktion krävs
- Automatisk felhantering
- Buffer-management för att förhindra memory leaks
- Smart retry-logik för nätverksproblem

## Setup av databas-tabell

För att aktivera databasloggning, kör följande SQL i Supabase SQL Editor:

\`\`\`sql
-- Skapa loggning-tabell
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

-- Skapa index för prestanda
CREATE INDEX IF NOT EXISTS idx_app_logs_session_id ON app_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_app_logs_category ON app_logs(category);
CREATE INDEX IF NOT EXISTS idx_app_logs_timestamp ON app_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_app_logs_created_at ON app_logs(created_at);

-- Aktivera Row Level Security
ALTER TABLE app_logs ENABLE ROW LEVEL SECURITY;

-- Skapa policies för anonyma användare
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

-- Cleanup-funktion för automatisk rensning
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
    -- Ta bort loggar äldre än 7 dagar
    DELETE FROM app_logs 
    WHERE created_at < NOW() - INTERVAL '7 days';
    
    -- Om tabellen fortfarande är för stor, ta bort äldsta posterna
    DELETE FROM app_logs 
    WHERE id IN (
        SELECT id FROM app_logs 
        ORDER BY created_at ASC 
        LIMIT (
            SELECT GREATEST(0, COUNT(*) - 10000)
            FROM app_logs 
        )
    );
END;
$$ LANGUAGE plpgsql;
\`\`\`

## Monitorering av loggar

### Via Supabase Dashboard:
1. Gå till Supabase project dashboard
2. Klicka på "Table Editor" 
3. Välj tabellen \`app_logs\`
4. Filtrera efter \`category\` eller \`session_id\`

### Via SQL queries:
\`\`\`sql
-- Senaste fel
SELECT * FROM app_logs 
WHERE category = 'ERROR' 
ORDER BY timestamp DESC 
LIMIT 20;

-- API-anrop statistik
SELECT message, COUNT(*) 
FROM app_logs 
WHERE category = 'API' 
GROUP BY message 
ORDER BY count DESC;

-- Session-analys
SELECT session_id, COUNT(*), MIN(timestamp), MAX(timestamp)
FROM app_logs 
GROUP BY session_id 
ORDER BY MIN(timestamp) DESC;

-- Användarbeteende
SELECT message, COUNT(*) as occurrences
FROM app_logs 
WHERE category = 'USER'
GROUP BY message 
ORDER BY occurrences DESC;
\`\`\`

## Log-kategorier

- **SYSTEM**: Applikationsstart, initialisering, konfiguration
- **ERROR**: JavaScript-fel, API-fel, nätverksproblem  
- **API**: Google Places API-anrop, Supabase-operationer
- **USER**: Sökningar, kommun-filter, användarinteraktioner
- **PERFORMANCE**: Laddningstider, memory-användning
- **SUPABASE**: Databasoperationer och prestanda
- **GOOGLE_API**: Google Maps/Places API status

## Troubleshooting

### Loggarna sparas inte i databasen
1. Kontrollera att tabellen \`app_logs\` existerar i Supabase
2. Verifiera att RLS-policies är korrekt konfigurerade
3. Kontrollera browser console för felmeddelanden
4. Loggar buffras lokalt om databasen är otillgänglig

### Hög databaslast
- Systemet begränsar automatiskt till max 10MB lagring
- Automatisk rensning sker varje timme
- Buffer-storlek begränsas för att förhindra spam

### Performance-påverkan
- Minimal påverkan: ~1-2ms per log-operation
- Intelligent batching minskar databaslast
- Automatisk buffer-hantering förhindrar memory-läckor

## API för manuell loggning

\`\`\`javascript
// Logga anpassade händelser
window.logEvent('CUSTOM', 'Min händelse', { data: 'value' });

// Logga användaraktioner  
window.logUserAction('Button clicked', { buttonId: 'submit' });

// Logga API-anrop
window.logAPICall('MyAPI', 'getData', { endpoint: '/users', success: true });
\`\`\`