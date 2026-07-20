
import { supabase } from './supabaseClient';

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
