// signup.js

// Initialize Supabase client with your URL and key
const supabaseUrl = 'https://aqpyxfjhlypevabhrdxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxcHl4ZmpobHlwZXZhYmhyZHhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MjgyODIsImV4cCI6MjA1ODAwNDI4Mn0.dXeKewJjtQG6EeQ7y-g7KwKjoK7i1dKrXmb6LnDzm5E';

// Use the global supabase object from the CDN
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Handle form submission
const signupForm = document.getElementById('signup-form');
const errorMessage = document.getElementById('error-message');
const successMessage = document.getElementById('success-message');

signupForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    errorMessage.textContent = '';
    successMessage.textContent = '';
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password
        });
        if (error) {
            errorMessage.textContent = 'Error: ' + error.message;
            console.error('Sign up error:', error.message);
        } else {
            successMessage.textContent = 'Sign up successful! Please check your email for verification.';
            console.log('Sign up successful', data);
            signupForm.reset();
        }
    } catch (err) {
        errorMessage.textContent = 'An unexpected error occurred. Please try again.';
        console.error('Unexpected error during sign up:', err);
    }
});