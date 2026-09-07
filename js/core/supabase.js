const SUPABASE_URL = 'https://plvxqizictmmolsvgeyk.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_l_aqPAQx9g7SwfxWaGVsyA_xvkxJszB';
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
