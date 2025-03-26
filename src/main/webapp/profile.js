// profile.js
document.addEventListener('DOMContentLoaded', function() {
    const tossButton = document.getElementById('toss-button');
    const resultImage = document.getElementById('result-image');
    const resultText = document.getElementById('result-text');

    tossButton.addEventListener('click', function() {
        const random = Math.random();
        let result;
        
        if (random < 0.5) {
            result = 'heads';
            resultImage.src = 'heads.png';
            resultImage.alt = 'Heads';
            resultText.textContent = 'HEADS! you earned 30XP!';
        } else {
            result = 'tails';
            resultImage.src = 'tails.png';
            resultImage.alt = 'Tails';
            resultText.textContent = 'tails. you earned 10xp.';
        }
        
        resultImage.style.display = 'block';
    });
});