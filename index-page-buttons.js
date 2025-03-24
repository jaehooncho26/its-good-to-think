// Use DOMContentLoaded for faster execution
document.addEventListener("DOMContentLoaded", function() {
    const loginButton = document.getElementById("login-button");
	loginButton.addEventListener("click", function() {
		// Delay redirect to allow feedback visibility

	window.location.href = "login-page.html";
	});
	
	
	// Get the submit button
    const submitButton = document.getElementById("submitButton");

    // Check if the button exists
    if (!submitButton) {
        console.error("Submit button not found.");
        return;
    }

    // Add click event listener
    submitButton.addEventListener("click", function() {
        // Get all text area elements
        const q1 = document.getElementById("q1");
        const q2 = document.getElementById("q2");
        const q3 = document.getElementById("q3");
        const q4 = document.getElementById("q4");
        const q5 = document.getElementById("q5");

        // Get values and store them in an object with keys q1 to q5
        const answers = {
            q1: q1.value,
            q2: q2.value,
            q3: q3.value,
            q4: q4.value,
            q5: q5.value
        };

        // Save to localStorage as a single JSON string
        localStorage.setItem("answers", JSON.stringify(answers));

        // Provide user feedback
        alert("Collect your cloud coins by saving your thoughts on the next page");

        // Delay redirect to allow feedback visibility
        setTimeout(function() {
            window.location.href = "questions-page.html";
        }, 1000); // Redirect after 1 second
    });
});