const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const rawUrl = process.env.SUPABASE_URL || "";
const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const SUPABASE_URL = typeof rawUrl === 'string' ? rawUrl.trim() : rawUrl;
const SUPABASE_SERVICE_ROLE_KEY = typeof rawKey === 'string' ? rawKey.trim() : rawKey;

// Diagnostic logs (non-secret): confirm presence and target URL
console.log("[supabase] SUPABASE_URL set:", !!SUPABASE_URL);
console.log("[supabase] SUPABASE_SERVICE_ROLE_KEY set:", !!SUPABASE_SERVICE_ROLE_KEY);
console.log("[supabase] Target host:", SUPABASE_URL ? (new URL(SUPABASE_URL)).host : "(none)");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Check .env');
}

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
);

module.exports = supabase;