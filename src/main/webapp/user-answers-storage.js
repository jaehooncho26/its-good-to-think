// q1-page.js

document.addEventListener('DOMContentLoaded', function() {
    const q1Display = document.getElementById('q1-display');

    // Load Q1 answer from localStorage
    const storedAnswers = JSON.parse(localStorage.getItem('userAnswers') || '{}');
    if (storedAnswers.q1) {
        q1Display.textContent = storedAnswers.q1;
    } else {
        q1Display.textContent = 'You haven’t answered Q1 yet.';
    }
});