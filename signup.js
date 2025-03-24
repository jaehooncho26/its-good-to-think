// signup.js

// Initialize Supabase client with your URL and key
const supabaseUrl = 'https://aqpyxfjhlypevabhrdxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxcHl4ZmpobHlwZXZhYmhyZHhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MjgyODIsImV4cCI6MjA1ODAwNDI4Mn0.dXeKewJjtQG6EeQ7y-g7KwKjoK7i1dKrXmb6LnDzm5E';

// Use the global supabase object from the CDN (ensure Supabase CDN script is loaded in HTML)
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// DOM elements
const signupForm = document.getElementById('signup-form');
const errorMessage = document.getElementById('error-message');
const successMessage = document.getElementById('success-message');

// Handle form submission
signupForm.addEventListener('submit', async (event) => {
    event.preventDefault(); // Prevent default form submission

    // Clear previous messages
    errorMessage.textContent = '';
    successMessage.textContent = '';

    // Get form values
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const phoneNumber = document.getElementById('phone').value.trim();
    const username = document.getElementById('username').value.trim();

    // Basic form validation
    if (!email || !password || !phoneNumber || !username) {
        errorMessage.textContent = 'Please fill in all fields.';
        return;
    }

    try {
        // Sign up user with Supabase Auth
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: { username } // Pass username as user metadata (optional)
            }
        });

        if (authError) {
            errorMessage.textContent = `Error: ${authError.message}`;
            console.error('Sign-up error:', authError.message);
            return;
        }

        const user = authData.user; // Extract user from auth response

        // Insert additional user data into 'users' table
        const { error: insertError } = await supabaseClient
            .from('users') // Ensure this table exists in your Supabase database
            .insert({
                user_id: user.id, // Link to Supabase Auth user ID
                phone: phoneNumber,
                username
            });

        if (insertError) {
            errorMessage.textContent = `Error saving user data: ${insertError.message}`;
            console.error('Insert error:', insertError.message);
            return;
        }

        // Success
        successMessage.textContent = 'Sign-up successful! Please check your email for verification.';
        console.log('Sign-up successful:', user);
        signupForm.reset(); // Clear form

    } catch (err) {
        errorMessage.textContent = 'An unexpected error occurred. Please try again.';
        console.error('Unexpected error:', err);
    }
});