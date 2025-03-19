// This script handles form submission and communicates with the backend.

document.addEventListener("DOMContentLoaded", function() {
    // Ensure that the form's submit button triggers the submitForm function
    document.getElementById("submitButton").addEventListener("click", submitForm);
});

async function submitForm() {
    // Collect user answers from the textareas
    const answers = {
        who: document.getElementById('who').value,
        where: document.getElementById('where').value,
        why: document.getElementById('why').value,
        what: document.getElementById('what').value,
        whereGoing: document.getElementById('whereGoing').value,
    };

    try {
        // Send the answers to the backend using fetch
        const response = await fetch('/get-insights/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(answers),
        });

        // Parse the response from the backend (assumes JSON format)
        const data = await response.json();

        // Display the insights received from the backend
        const insightsDisplay = document.getElementById('insightsDisplay');
        insightsDisplay.innerHTML = `<h3>Insights to Deepen Your Answers:</h3><p>${data.insights}</p>`;
    } catch (error) {
        // Log any error that occurs during the fetch request
        console.error('Error fetching insights:', error);
    }
}
