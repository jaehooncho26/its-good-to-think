// Initialize Supabase client with your URL and key
const supabaseUrl = 'https://aqpyxfjhlypevabhrdxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxcHl4ZmpobHlwZXZhYmhyZHhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MjgyODIsImV4cCI6MjA1ODAwNDI4Mn0.dXeKewJjtQG6EeQ7y-g7KwKjoK7i1dKrXmb6LnDzm5E';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Get form elements
const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');
const successMessage = document.getElementById('success-message');

loginForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    errorMessage.textContent = '';
    successMessage.textContent = '';

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        // Attempt to log in
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            errorMessage.textContent = 'Error: ' + error.message;
            console.error('Login error:', error.message);
            return;
        }

        successMessage.textContent = 'Login successful!';
        const userId = data.user.id;

        // Retrieve answers from localStorage
        const answers = JSON.parse(localStorage.getItem('answers'));
        if (answers) {
            // Insert answers into Supabase
            const { error: insertError } = await supabaseClient
                .from('answers')
                .insert([{
                    user_id: userId,
                    q1: answers.q1,
                    q2: answers.q2,
                    q3: answers.q3,
                    q4: answers.q4,
                    q5: answers.q5
                }]);

            if (insertError) {
                console.error('Error saving answers:', insertError.message);
                errorMessage.textContent = 'Error saving answers: ' + insertError.message;
            } else {
                localStorage.removeItem('answers'); // Clear localStorage
                console.log('Answers saved to database');
            }
        }

        // Optionally redirect to another page after login
        // Uncomment the line below if desired
        // window.location.href = 'profile.html';

    } catch (err) {
        errorMessage.textContent = 'An unexpected error occurred. Please try again.';
        console.error('Unexpected error during login:', err);
    }
});