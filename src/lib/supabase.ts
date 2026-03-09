import { createClient } from '@supabase/supabase-js';

// Access runtime environment variables injected by the server in production,
// or fallback to Vite's import.meta.env in development.
const env = typeof window !== 'undefined' ? (window as any).ENV || {} : {};
const supabaseUrl = env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
