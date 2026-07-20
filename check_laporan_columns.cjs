const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Error: Supabase URL or Anon Key is missing in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColumns() {
    const { data, error } = await supabase
        .from('laporan')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching data:', error);
    } else {
        if (data && data.length > 0) {
            console.log('Columns in "laporan" table:', Object.keys(data[0]));
        } else {
            console.log('Table "laporan" is empty, cannot determine columns from data.');
            // Try to insert a dummy row to see if it fails on missing columns? No, that's risky.
            // We'll just assume the previous schema check was accurate or rely on the user's intent.
        }
    }
}

checkColumns();
