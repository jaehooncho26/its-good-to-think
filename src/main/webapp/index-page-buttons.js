// Ensure the JavaScript runs when the page is fully loaded
window.onload = function() {
    // Get the 'submitButton' by its ID (the think-button.png image)
    const submitButton = document.getElementById("submitButton");

    // Add an event listener for the 'click' event on the submit button
    submitButton.addEventListener("click", function() {
        // Get values from the text areas
        const whoAnswer = document.getElementById("q1").value;
        const whereAnswer = document.getElementById("q2").value;
        const whyAnswer = document.getElementById("q3").value;
        const whatAnswer = document.getElementById("q4").value;
        const whereGoingAnswer = document.getElementById("q5").value;

        // Save these answers to localStorage
        localStorage.setItem("whoAnswer", whoAnswer);
        localStorage.setItem("whereAnswer", whereAnswer);
        localStorage.setItem("whyAnswer", whyAnswer);
        localStorage.setItem("whatAnswer", whatAnswer);
        localStorage.setItem("whereGoingAnswer", whereGoingAnswer);

        // Redirect to questions-page.html
        window.location.href = "questions-page.html";
    });
};