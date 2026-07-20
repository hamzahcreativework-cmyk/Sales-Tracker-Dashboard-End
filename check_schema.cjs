
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fecdwnbteibclpriwpob.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlY2R3bmJ0ZWliY2xwcml3cG9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzNjM4MTUsImV4cCI6MjA3NTkzOTgxNX0.H8gthU8oiYS8EEnsJ6vf5GfgV3QvpVbgLjxyogDE-8c';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkReportsSchema() {
    const { data, error } = await supabase
        .from('laporan')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching reports:', error);
    } else {
        if (data && data.length > 0) {
            console.log('Reports table columns:', Object.keys(data[0]));
        } else {
            console.log('Reports table is empty, cannot determine columns from data.');
        }
    }
}

checkReportsSchema();
