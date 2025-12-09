import { createClient } from '@supabase/supabase-js';

// REPLACE THESE WITH YOUR ACTUAL SUPABASE CREDENTIALS
// You can find these in Project Settings -> API on your Supabase Dashboard
const SUPABASE_URL: string = 'https://pqjxwpgemhojewqiumfi.supabase.co';
const SUPABASE_ANON_KEY: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxanh3cGdlbWhvamV3cWl1bWZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODk3NzUsImV4cCI6MjA4MDg2NTc3NX0.yaboj9aE5vUQ9IikoPMWTKAONS5lB2-2gszB0MoR3U8';

let client = null;

try {
  // Only attempt to create client if URL is valid to prevent "Failed to construct 'URL'" error
  if (SUPABASE_URL && SUPABASE_URL.startsWith('http') && SUPABASE_URL !== 'YOUR_SUPABASE_PROJECT_URL') {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else {
    console.warn("Supabase credentials not configured. Update services/supabaseClient.ts");
  }
} catch (error) {
  console.error("Error initializing Supabase client:", error);
}

export const supabase = client;