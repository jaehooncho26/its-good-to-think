// signup.js

// Initialize Supabase client
const supabaseUrl = 'https://aqpyxfjhlypevabhrdxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxcHl4ZmpobHlwZXZhYmhyZHhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MjgyODIsImV4cCI6MjA1ODAwNDI4Mn0.dXeKewJjtQG6EeQ7y-g7KwKjoK7i1dKrXmb6LnDzm5E';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// DOM elements
const signupForm = document.getElementById('signup-form');
const errorMessage = document.getElementById('error-message');
const successMessage = document.getElementById('success-message');

/**
 * Save locally stored Q1 draft (from index.html) to Supabase once user exists.
 */
async function saveDraftQ1ToSupabase(userId) {
  if (!userId) return;

  const draft =
    (localStorage.getItem('q1Draft') ?? '').trim() ||
    (localStorage.getItem('index_q1') ?? '').trim();

  if (!draft) return; // nothing to save

  const { data, error } = await supabaseClient
    .from('user_answers')
    .insert({ user_id: userId, q1: draft, q1_posted: false })
    .select('id')
    .single();

  if (error) {
    console.warn('Could not persist q1 draft after signup:', error);
    return;
  }

  localStorage.removeItem('q1Draft');
  localStorage.removeItem('index_q1');
  console.log('Saved initial Q1 to Supabase (id:', data?.id, ')');
}

// If the user later signs in (e.g., after email confirmation), persist the draft then.
supabaseClient.auth.onAuthStateChange(async (_event, session) => {
  const userId = session?.user?.id;
  if (userId) {
    await saveDraftQ1ToSupabase(userId);
  }
});

// Handle form submission
signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorMessage.textContent = '';
  successMessage.textContent = '';

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const phoneNumber = document.getElementById('phone').value.trim();
  const username = document.getElementById('username').value.trim();

  if (!email || !password || !phoneNumber || !username) {
    errorMessage.textContent = 'Please fill in all fields.';
    return;
  }

  try {
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: { username }
      }
    });

    if (authError) {
      errorMessage.textContent = `Error: ${authError.message}`;
      console.error('Sign-up error:', authError.message);
      return;
    }

    const user = authData.user;
    const sessionUserId = authData.session?.user?.id || user?.id;

    // Save to users table
    const { error: upsertError } = await supabaseClient
      .from('users')
      .upsert(
        { user_id: user.id, phone: phoneNumber, username },
        { onConflict: 'user_id' }
      );

    if (upsertError) console.warn('Upsert users error:', upsertError);

    // Save Q1 draft if session exists
    if (authData.session && sessionUserId) {
      await saveDraftQ1ToSupabase(sessionUserId);
    }

    // ✅ Success message + redirect to login-page.html
    successMessage.textContent =
      'Sign-up successful! Please check your email for verification, then log in. Redirecting to login page...';
    signupForm.reset();

    // Redirect after 2 seconds
    setTimeout(() => {
      window.location.href = 'login-page.html';
    }, 2000);

  } catch (err) {
    errorMessage.textContent = 'An unexpected error occurred. Please try again.';
    console.error('Unexpected error:', err);
  }
});
