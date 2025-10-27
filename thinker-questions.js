/* thinker-questions.js — final fix aligned to your CSS */
(() => {
    'use strict';
  
    const wheel = document.getElementById('wheel');
    const spinButton = document.getElementById('spinButton');
    const revealed = document.getElementById('revealedQuestions');
    if (!wheel || !spinButton || !revealed) return;
  
    // Question set bound to slice *indices* (0..5) — colors never change places.
    // If your first banner in HTML shows “Question 1: Who are you?”, keep it there;
    // the wheel starts from Question 2..7 as we defined earlier.
    const questions = [
      { num: 2, text: 'What do you believe is your purpose?', active: true }, // slice 0 (gold)
      { num: 3, text: 'When do you feel most alive?',         active: true }, // slice 1 (brown)
      { num: 4, text: 'What truth have you avoided?',         active: true }, // slice 2 (green)
      { num: 5, text: 'What is something you’ve never said out loud?', active: true }, // slice 3 (blue)
      { num: 6, text: 'If time stopped right now, what would matter most?', active: true }, // slice 4 (red)
      { num: 7, text: 'What would you ask if you could speak to the universe?', active: true } // slice 5 (black)
    ];
  
    // EXACT mapping from your CSS / DOM slice order to true wedge centers:
    // slice[0] label at 300° belongs to the wedge centered at 330° (gold), etc.
    const CENTER_BY_SLICE = [300, 0, 60, 120, 180, 240];

  
    const slices = wheel.querySelectorAll('.slice');
    let currentRotation = 0; // degrees, clockwise-positive
    let spinning = false;
  
    // Render labels for active/inactive
    function renderLabels() {
      for (let i = 0; i < slices.length; i++) {
        const s = slices[i];
        const q = questions[i];
        if (q && q.active) {
          s.textContent = `Question ${q.num}`;
          s.style.opacity = '1';
        } else {
          s.textContent = '';
          s.style.opacity = '0.25';
        }
      }
    }
    renderLabels();
  
    function revealBanner(q) {
      const div = document.createElement('div');
      div.className = 'question-button question-revealed';
      div.innerHTML = `
        <picture>
          <source media="(max-width: 768px)" srcset="red-banner-button-mobile.png">
          <img src="red-banner-button.png" alt="Revealed Question">
        </picture>
        <span class="button-text">Question ${q.num}: ${q.text}</span>
      `;
      revealed.appendChild(div);
    }
  
    function pickRandomActiveIndex() {
      const active = questions.map((q, i) => (q.active ? i : null)).filter(i => i !== null);
      if (!active.length) return -1;
      const k = Math.floor(Math.random() * active.length);
      return active[k];
    }
  
    function animateTo(sliceIndex) {
      return new Promise((resolve) => {
        const C = CENTER_BY_SLICE[sliceIndex]; // desired center angle
        const r = ((currentRotation % 360) + 360) % 360;
        const fullTurns = 5 * 360; // constant energy
        // delta so that (r + delta + C) % 360 == 0  -> lands with C at the top
        const delta = (360 - ((r + C) % 360)) % 360;
        const target = currentRotation + fullTurns + delta;
  
        wheel.style.transition = 'transform 4s cubic-bezier(0.25, 1, 0.3, 1)';
        wheel.style.transform = `rotate(${target}deg)`;
  
        const end = () => {
          wheel.removeEventListener('transitionend', end);
          currentRotation = target; // preserve accumulated rotation (no snap-back)
          resolve();
        };
        wheel.addEventListener('transitionend', end, { once: true });
        setTimeout(end, 4100); // safety
      });
    }
  
    async function spin() {
      if (spinning) return;
      const idx = pickRandomActiveIndex();
      if (idx === -1) {
        alert('All questions have been revealed.');
        return;
      }
  
      spinning = true;
      spinButton.classList.add('disabled');
  
      try {
        await animateTo(idx);
  
        // Reveal and deactivate exactly the landed slice index
        const q = questions[idx];
        if (q && q.active) {
          revealBanner(q);
          q.active = false;
          renderLabels(); // dims its label (color stays)
        }
      } catch (e) {
        console.error('[thinker-questions] spin error:', e);
      } finally {
        spinning = false;
        spinButton.classList.remove('disabled');
      }
    }
  
    spinButton.addEventListener('click', spin);
  
    // Initial pose
    wheel.style.transition = 'none';
    wheel.style.transform = 'rotate(0deg)';
  })();
  
  const q1Button = document.getElementById("revealedQuestions");
q1Button.addEventListener("click", function() {
    window.location.href = "q1-page.html";
});