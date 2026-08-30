/**
 * Supabase client + auth wrapper. The anon/public key below is safe to
 * expose in client-side code — access to data is enforced by the Row
 * Level Security policies in supabase/schema.sql, not by hiding this key.
 *
 * Sign-in only, deliberately — there's no sign-up flow here. Accounts are
 * created per customer by the operator via Supabase Dashboard →
 * Authentication → Users → Add user. That's also where public sign-ups
 * must be disabled (Authentication → Sign In / Providers → Email →
 * "Allow new users to sign up"), since the anon key alone doesn't stop a
 * visitor from calling auth.signUp() directly.
 */
(function () {
  const SUPABASE_URL = 'https://atbkznuvpyhhouyogtnf.supabase.co';
  const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0Ymt6bnV2cHloaG91eW9ndG5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NDg1NjcsImV4cCI6MjEwMjAyNDU2N30.O_-uwq0uUR_XWymywYCqVHLiM2FMHjw_PSqaRxtWjxs';

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  function signIn(email, password) {
    return client.auth.signInWithPassword({ email, password });
  }

  function signOut() {
    return client.auth.signOut();
  }

  function getSession() {
    return client.auth.getSession();
  }

  window.Auth = { signIn, signOut, getSession };
  window.SupabaseClient = client;
})();
