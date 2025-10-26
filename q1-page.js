// Use DOMContentLoaded for faster execution
document.addEventListener("DOMContentLoaded", function() {
    const profileButton = document.getElementById("profileButton");
	profileButton.addEventListener("click", function() {
		// Delay redirect to allow feedback visibility

	window.location.href = "profile-page.html";
	});
    const questionsButton = document.getElementById("questionsButton");
	questionsButton.addEventListener("click", function() {
		// Delay redirect to allow feedback visibility

	window.location.href = "questions-page.html";
	});
});