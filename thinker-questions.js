// thinker-questions.js — clickable Q1 + modal notice when spin is gated
document.addEventListener("DOMContentLoaded", async function () {
  'use strict';

  // --- Ensure Supabase global exists (UMD script must be loaded before this file) ---
  if (typeof supabase === 'undefined') {
    console.error('[thinker-questions] window.supabase is undefined. Include UMD script before this file.');
    return;
  }

  // --- Supabase ---
  const supabaseUrl = 'https://aqpyxfjhlypevabhrdxs.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxcHl4ZmpobHlwZXZhYmhyZHhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MjgyODIsImV4cCI6MjA1ODAwNDI4Mn0.dXeKewJjtQG6EeQ7y-g7KwKjoK7i1dKrXmb6LnDzm5E';
  const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

  // --- DOM refs ---
  const wheel = document.getElementById('wheel');
  const spinButton = document.getElementById('spinButton');
  const revealed = document.getElementById('revealedQuestions');
  if (!wheel || !spinButton || !revealed) return;

  // --- Header helpers ---
  document.getElementById("profileButton")?.addEventListener("click", () => (window.location.href = "profile-page.html"));
  document.getElementById("discordButtom")?.addEventListener("click", () => window.open("https://discord.gg/", "_blank"));

  // --- Wheel data ---
  const questions = [
    { num: 2, text: 'What do you believe is your purpose?', active: true },
    { num: 3, text: 'When do you feel most alive?',         active: true },
    { num: 4, text: 'What truth have you avoided?',         active: true },
    { num: 5, text: 'What is something you’ve never said out loud?', active: true },
    { num: 6, text: 'If time stopped right now, what would matter most?', active: true },
    { num: 7, text: 'What would you ask if you could speak to the universe?', active: true }
  ];
  const CENTER_BY_SLICE = [300, 0, 60, 120, 180, 240];
  const slices = wheel.querySelectorAll('.slice');
  let currentRotation = 0;
  let spinning = false;

  // --- Small modal (same overlay style you already use) ---
  function showPopup(messageHTML) {
    document.querySelector(".tier-alert-overlay")?.remove();
    const overlay = document.createElement("div");
    overlay.className = "tier-alert-overlay";
    overlay.innerHTML = `
      <div class="tier-alert-box">
        <p>${messageHTML}</p>
        <div class="tier-alert-buttons">
          <img src="ok-button.png" id="okBtn" class="tier-alert-img" alt="OK">
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById("okBtn").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
  }

  // --- Render labels for active/inactive slices ---
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

  // --- Banner creation (for unlocked/newly revealed) ---
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
    // We use container delegation below, but stopping here prevents bubbling to fallback
    div.addEventListener('click', (e) => {
      e.stopPropagation();
      window.location.href = `q1-page.html?q=${q.num}`;
    });
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
      const C = CENTER_BY_SLICE[sliceIndex];
      const r = ((currentRotation % 360) + 360) % 360;
      const fullTurns = 5 * 360;
      const delta = (360 - ((r + C) % 360)) % 360;
      const target = currentRotation + fullTurns + delta;

      wheel.style.transition = 'transform 4s cubic-bezier(0.25, 1, 0.3, 1)';
      wheel.style.transform = `rotate(${target}deg)`;

      const end = () => {
        wheel.removeEventListener('transitionend', end);
        currentRotation = target;
        resolve();
      };
      wheel.addEventListener('transitionend', end, { once: true });
      setTimeout(end, 4100);
    });
  }

  // ----- Supabase state / gating -----
  const postedCol   = (n) => `q${n}_posted`;
  const unlockedCol = (n) => `q${n}_unlocked`; // optional, if you added these

  let answersRow = null;
  let currentUser = null;

  async function getUser() {
    const { data, error } = await supabaseClient.auth.getUser();
    if (error) return null;
    return data?.user || null;
  }

  async function fetchAnswersRow(userId) {
    const selectCols = [
      'id','user_id',
      'q1_posted','q2_posted','q3_posted','q4_posted','q5_posted','q6_posted','q7_posted',
      // unlock flags (if present). If you didn't add them, these will be null; that's fine.
      'q2_unlocked','q3_unlocked','q4_unlocked','q5_unlocked','q6_unlocked','q7_unlocked'
    ].join(', ');
    const { data, error } = await supabaseClient
      .from('user_answers')
      .select(selectCols)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) { console.error('[thinker-questions] fetchAnswersRow error', error); return null; }
    return data || null;
  }

  async function ensureAnswersRow(userId) {
    const row = await fetchAnswersRow(userId);
    if (row) return row;
    const { data, error } = await supabaseClient
      .from('user_answers')
      .upsert({ user_id: userId }, { onConflict: 'user_id' })
      .select('*')
      .single();
    if (error) { console.error(error); return null; }
    return data;
  }

  function getRevealedQuestionNumbers() {
    // parse numbers from existing banners; include Q1 as always revealed
    const spans = revealed.querySelectorAll('.button-text');
    const nums = new Set([1]);
    spans.forEach((el) => {
      const m = el.textContent.match(/Question\s+(\d+)/i);
      if (m) nums.add(parseInt(m[1], 10));
    });
    return Array.from(nums).sort((a,b)=>a-b);
  }

  function isSpinEligible() {
    if (!answersRow || !currentUser) return false;
    const revealedNums = getRevealedQuestionNumbers();
    for (const n of revealedNums) {
      const flag = answersRow[postedCol(n)];
      if (!flag) return false;
    }
    return true;
  }

  // We no longer disable pointer events—button remains clickable. We just set a title.
  function updateSpinLock() {
    const ok = isSpinEligible();
    spinButton.setAttribute('aria-disabled', (!ok).toString());
    const revealedNums = getRevealedQuestionNumbers();
    const missing = revealedNums.filter((n) => !answersRow?.[postedCol(n)]);
    spinButton.title = (!ok)
      ? (missing.length
          ? `You must post your answers for: ${missing.map(n => `Q${n}`).join(', ')}`
          : (!currentUser ? 'Please sign in to spin.' : 'You must post your previous answer to spin.'))
      : '';
  }

  // Persist unlock to DB (optional; only if you added qN_unlocked)
  async function persistUnlock(n) {
    if (!currentUser) return;
    const upd = {}; upd[unlockedCol(n)] = true;
    const { error } = await supabaseClient
      .from('user_answers')
      .update(upd)
      .eq('user_id', currentUser.id);
    if (error) console.error('[thinker-questions] persistUnlock error', error);
    else answersRow[unlockedCol(n)] = true;
  }

  function renderUnlockedFromDB() {
    // Q1 is already present in HTML. Add banners for any unlocked Q2..Q7.
    for (const q of questions) {
      const isUnlocked = !!answersRow?.[unlockedCol(q.num)];
      if (isUnlocked) {
        revealBanner(q);
        q.active = false;
      }
    }
    renderLabels();
  }

  async function hydrate() {
    currentUser = await getUser();
    if (!currentUser) {
      answersRow = null;
      updateSpinLock();
      return;
    }
    answersRow = await ensureAnswersRow(currentUser.id);
    renderUnlockedFromDB();
    updateSpinLock();
  }

  // ----- Spin flow -----
  async function spin() {
    // Button is always clickable. If gated, show modal and bail.
    if (!isSpinEligible()) {
      const revealedNums = getRevealedQuestionNumbers();
      const missing = revealedNums.filter((n) => !answersRow?.[postedCol(n)]);
      const msg = missing.length
        ? `You need to post ${missing.map(n => `Question ${n}`).join(', ')} in order to spin again.`
        : `You need to post the previous question in order to spin again.`;
      showPopup(msg);
      return;
    }

    if (spinning) return;

    const idx = pickRandomActiveIndex();
    if (idx === -1) {
      showPopup('All questions have been revealed.');
      return;
    }

    spinning = true;

    try {
      await animateTo(idx);
      const q = questions[idx];
      if (q && q.active) {
        revealBanner(q);
        q.active = false;
        renderLabels();
        await persistUnlock(q.num); // so it stays after refresh
        // After revealing a new one, spinning is gated until user posts that answer
        updateSpinLock();
      }
    } catch (err) {
      console.error('[thinker-questions] spin error:', err);
    } finally {
      spinning = false;
    }
  }

  spinButton.addEventListener('click', spin);

  // ----- Make ALL banners clickable, including the static Q1 one -----
  revealed.addEventListener('click', (e) => {
    const banner = e.target.closest('.question-button');
    if (banner) {
      e.stopPropagation();
      const textEl = banner.querySelector('.button-text');
      const m = textEl?.textContent.match(/Question\s+(\d+)/i);
      const qNum = m ? parseInt(m[1], 10) : 1;
      window.location.href = `q1-page.html?q=${qNum}`;
      return;
    }
    // Clicking empty space goes to Q1
    window.location.href = 'q1-page.html?q=1';
  });

  // Initial pose + load
  wheel.style.transition = 'none';
  wheel.style.transform = 'rotate(0deg)';
  await hydrate();
});
