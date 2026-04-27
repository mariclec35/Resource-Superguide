import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verify() {
  console.log('--- Supabase Diagnostic ---');
  console.log('URL:', supabaseUrl);
  
  try {
    const columns = [
      'id', 'name', 'category', 'address', 'phone', 'website', 'description', 
      'status', 'org_slug', 'name_aliases', 'search_embeddings_text', 
      'metadata', 'eligibility', 'relational_graph', 'locations', 'contact'
    ];

    console.log('Probing columns individually...');
    for (const col of columns) {
      const { error } = await supabase.from('resources').select(col).limit(1);
      if (error) {
        console.log(`❌ Column [${col}] is MISSING`);
      } else {
        console.log(`✅ Column [${col}] is PRESENT`);
      }
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

verify();
