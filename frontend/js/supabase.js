window.SUPABASE_URL = "https://gpbohlbrgkkjhdfgmjdr.supabase.co";
window.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwYm9obGJyZ2tramhkZmdtamRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NTA2NDcsImV4cCI6MjEwMDIyNjY0N30.a9O-CWV53jva83iVhs9CToRYBmA1eN1-bH-GqPnLS6Y";

if (window.supabase?.createClient) {
    window.supabaseClient = window.supabase.createClient(
        window.SUPABASE_URL,
        window.SUPABASE_ANON_KEY,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        }
    );
}

console.log("Supabase loaded");