// Ensure the JavaScript runs when the page is fully loaded
window.onload = function() {
    // Get the 'submitButton' by its ID (the think-button.png image)
    const submitButton = document.getElementById("submitButton");

    // Add an event listener for the 'click' event on the submit button
    submitButton.addEventListener("click", function() {
        // Get values from the text areas
        const whoAnswer = document.getElementById("who").value;
        const whereAnswer = document.getElementById("where").value;
        const whyAnswer = document.getElementById("why").value;
        const whatAnswer = document.getElementById("what").value;
        const whereGoingAnswer = document.getElementById("whereGoing").value;

        // Save these answers to localStorage
        localStorage.setItem("whoAnswer", whoAnswer);
        localStorage.setItem("whereAnswer", whereAnswer);
        localStorage.setItem("whyAnswer", whyAnswer);
        localStorage.setItem("whatAnswer", whatAnswer);
        localStorage.setItem("whereGoingAnswer", whereGoingAnswer);

        // Redirect to questions-page.html
        window.location.href = "questions-page.html";
    });

    // Add event listener for q1-button to redirect to q1-page.html
    const q1Button = document.getElementById("q1-button");
    q1Button.addEventListener("click", function() {
        window.location.href = "q1-page.html";
    });
};
