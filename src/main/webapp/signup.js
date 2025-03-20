// Initialize Supabase
const supabaseUrl = 'https://aqpyxfjhlypevabhrdxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxcHl4ZmpobHlwZXZhYmhyZHhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MjgyODIsImV4cCI6MjA1ODAwNDI4Mn0.dXeKewJjtQG6EeQ7y-g7KwKjoK7i1dKrXmb6LnDzm5E';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Signup form submit handler
document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();  // Prevent form from reloading the page

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Error message container
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');

    // Clear previous messages
    errorMessage.innerHTML = '';
    successMessage.innerHTML = '';

    // Try to create the user in Supabase
    try {
        const { user, error } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (error) {
            // Show error message
            errorMessage.innerHTML = error.message;
        } else {
            // Show success message
            successMessage.innerHTML = 'Signup successful! Please check your email to verify your account.';
            document.getElementById('signup-form').reset(); // Reset the form
        }
    } catch (error) {
        errorMessage.innerHTML = `An unexpected error occurred: ${error.message}`;
    }
});
