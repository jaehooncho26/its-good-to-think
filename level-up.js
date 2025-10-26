/* level-up.js — dynamic weights, pointer calibration, juicy level-up UX, atomic XP+level update */
(() => {
    'use strict';
  
    // --- Supabase config ---
    const SUPABASE_URL = 'https://aqpyxfjhlypevabhrdxs.supabase.co';
    const SUPABASE_ANON_KEY =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxcHl4ZmpobHlwZXZhYmhyZHhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MjgyODIsImV4cCI6MjA1ODAwNDI4Mn0.dXeKewJjtQG6EeQ7y-g7KwKjoK7i1dKrXmb6LnDzm5E';
    const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
    // --- DOM refs (existing elements) ---
    const wheel       = document.getElementById('wheel');
    const spinButton  = document.getElementById('spinButton');
    const nameEl      = document.getElementById('thinkName');
    const levelEl     = document.getElementById('thinkLevel');
    const statsEl     = document.getElementById('thinkStats');
    const progressEl  = document.getElementById('progressInner');
    const progressLbl = document.getElementById('progressLabel');
    const progressWrap= document.querySelector('.level-progress');
  
    // ====== WHEEL & ECONOMY CONFIG ======
    // Visible slice order in HTML: 50, 250, 75, 500, 25, 100
    const rewards = [ 50, 250, 75, 500, 25, 100 ];
  
    // Base "fun" weights (sum ≈ 1)
    const baseWeights = [0.12, 0.22, 0.18, 0.06, 0.07, 0.35];
    // Dynamic tuning
    const PITY_STREAK_MIN   = 4;
    const PITY_BONUS_250    = 0.08;
    const PITY_BONUS_500    = 0.03;
    const HOT_COOLDOWN_SPINS= 3;
    const HOT_500_DAMP      = 0.4;
    const ANTI_REPEAT_FACTOR= 0.75;
    const isLowPrize = (xp) => xp <= 75;

    const SHOW_SPIN_HISTORY = false;

  
    // ====== CALIBRATION (pointer vs wedges) ======
    const savedCal = JSON.parse(localStorage.getItem('wheel_calibration') || '{}');
    let ANGLE_OFFSET = Number.isFinite(savedCal.ANGLE_OFFSET) ? savedCal.ANGLE_OFFSET : 0; // degrees
    const BASES = [-90, 0, 90, 180];                             // top/right/bottom/left
    let BASE_INDEX = Number.isInteger(savedCal.BASE_INDEX) ? savedCal.BASE_INDEX : 0; // 0 = top
    let SPIN_SIGN  = (savedCal.SPIN_SIGN === -1) ? -1 : 1;       // 1 = CW, -1 = CCW
  
    function persistCalibration() {
      localStorage.setItem('wheel_calibration', JSON.stringify({ ANGLE_OFFSET, BASE_INDEX, SPIN_SIGN }));
      updateCenters(); updateBadge();
    }
  
    const WEDGE_DEG = 60; // 6 slices
    let sectorCenters = [];
    function updateCenters() {
      const BASE_DEG = BASES[BASE_INDEX];
      sectorCenters = Array.from({ length: 6 }, (_, i) =>
        BASE_DEG + i * WEDGE_DEG + WEDGE_DEG / 2 + ANGLE_OFFSET
      );
    }
    updateCenters();
  
    // ====== DYNAMIC STATE (persisted) ======
    const savedDyn = JSON.parse(localStorage.getItem('wheel_dyn_state') || '{}');
    let coldStreak    = Number.isInteger(savedDyn.coldStreak) ? savedDyn.coldStreak : 0; // consecutive lows
    let hotCooldown   = Number.isInteger(savedDyn.hotCooldown) ? savedDyn.hotCooldown : 0; // spins left
    let lastPrizeIdx  = Number.isInteger(savedDyn.lastPrizeIdx) ? savedDyn.lastPrizeIdx : -1;
    function persistDyn() {
      localStorage.setItem('wheel_dyn_state', JSON.stringify({ coldStreak, hotCooldown, lastPrizeIdx }));
    }
  
    // Build dynamic weights for this spin
    function getDynamicWeights() {
      let w = baseWeights.slice();
      if (coldStreak >= PITY_STREAK_MIN) { w[1] += PITY_BONUS_250; w[3] += PITY_BONUS_500; } // 250/500
      if (hotCooldown > 0) { w[3] *= HOT_500_DAMP; } // damp 500 after a hot win
      if (lastPrizeIdx >= 0 && lastPrizeIdx < w.length) { w[lastPrizeIdx] *= ANTI_REPEAT_FACTOR; }
      const sum = w.reduce((a,b)=>a+b,0) || 1;
      return w.map(v => v / sum);
    }
  
    // Weighted picker
    function pickIndexWeighted(w) {
      const sum = w.reduce((a, b) => a + b, 0) || 1;
      const r = Math.random() * sum;
      let acc = 0;
      for (let i = 0; i < w.length; i++) { acc += w[i]; if (r <= acc) return i; }
      return w.length - 1;
    }
  
    // ====== JUICY UI (auto-create if missing) ======
    function ensureNode(id, tag, className, parent=document.body) {
      let el = document.getElementById(id);
      if (!el) {
        el = document.createElement(tag);
        el.id = id;
        if (className) el.className = className;
        parent.appendChild(el);
      }
      return el;
    }
  
    // --- Card art by level ---
    function getCardSrcForLevel(level) {
      if (level >= 41) return 'card-luminary.png';
      if (level >= 31) return 'card-catalyst.png';
      if (level >= 21) return 'card-muse.png';
      if (level >= 11) return 'card-seeker.png';
      return 'card.png';
    }
    // Preload to avoid flash when swapping
    (function preloadCardArt(){
      ['card.png','card-seeker.png','card-muse.png','card-catalyst.png','card-luminary.png']
        .forEach(src => { const i = new Image(); i.src = src; });
    })();
    function updateCardArt(level) {
      const img = document.getElementById('cardBg') || document.querySelector('.think-bg');
      if (!img) return;
      const nextSrc = getCardSrcForLevel(Number(level || 1));
      if (img.getAttribute('src') !== nextSrc) img.setAttribute('src', nextSrc);
    }
  
    // Level-up overlay
    function ensureLevelUpOverlay() {
      const overlay = ensureNode('levelUpOverlay', 'div', 'lu-overlay');
      overlay.hidden = true;
      overlay.style.cssText = 'position:fixed;inset:0;display:grid;place-items:center;background:rgba(0,0,0,.55);z-index:10000;backdrop-filter:blur(2px);';
      if (!overlay.querySelector('.lu-card')) {
        const card = document.createElement('div');
        card.className = 'lu-card';
        card.style.cssText = 'padding:28px 36px;border-radius:18px;text-align:center;color:#fff;background:linear-gradient(180deg,#111,#000);box-shadow:0 10px 40px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.08);animation:lu_pop 400ms cubic-bezier(.2,1,.2,1);';
        const title = document.createElement('div');
        title.className = 'lu-title';
        title.textContent = 'LEVEL UP!';
        title.style.cssText = "font:900 24px/1 'Jua',sans-serif;letter-spacing:.02em;";
        const lvl = document.createElement('div');
        lvl.id = 'luLevel';
        lvl.className = 'lu-level';
        lvl.textContent = '2';
        lvl.style.cssText = "font:900 56px/1 'Jua',sans-serif;margin-top:6px;background:linear-gradient(90deg,#ffd27a,#fff,#ffd27a);-webkit-background-clip:text;color:transparent;";
        overlay.appendChild(card);
        card.appendChild(title);
        card.appendChild(lvl);
        const style = document.createElement('style');
        style.textContent = '@keyframes lu_pop{0%{transform:scale(.8);opacity:0}100%{transform:scale(1);opacity:1}}';
        document.head.appendChild(style);
      }
      return overlay;
    }
  
    function showLevelUp(newLevel){
      const overlay = ensureLevelUpOverlay();
      const lbl = document.getElementById('luLevel');
      if (lbl) lbl.textContent = newLevel;
      overlay.hidden = false;
      setTimeout(()=> overlay.hidden = true, 1600);
    }
  
    // Confetti
    function ensureConfetti() {
      const c = ensureNode('confetti', 'canvas', 'confetti');
      c.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;';
      return c;
    }
    function confettiBurst(count=140){
      const c = ensureConfetti(); const dpr = window.devicePixelRatio || 1;
      c.width = innerWidth * dpr; c.height = innerHeight * dpr;
      const ctx = c.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0);
      const parts = Array.from({length:count}, ()=>({
        x: innerWidth/2, y: innerHeight*0.35, r: Math.random()*3+2,
        vx: (Math.random()*2-1)*6, vy: Math.random()*-8-6,
        rot: Math.random()*360, vr: (Math.random()*2-1)*10,
        col: `hsl(${Math.random()*360},85%,60%)`, life: 0
      }));
      let t=0; (function loop(){
        t+=16; ctx.clearRect(0,0,innerWidth,innerHeight);
        for(const p of parts){
          p.life+=16; p.vy+=0.25; p.x+=p.vx; p.y+=p.vy; p.rot+=p.vr;
          ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180);
          ctx.fillStyle=p.col; ctx.fillRect(-p.r,-p.r,p.r*2,p.r*2); ctx.restore();
        }
        if (t<1400) requestAnimationFrame(loop); else ctx.clearRect(0,0,innerWidth,innerHeight);
      })();
    }
  
    // XP toast
    function ensureXpToast(){
      const el = ensureNode('xpToast','div','xp-toast');
      el.style.cssText = 'position:fixed;left:50%;top:30%;transform:translate(-50%,-50%);padding:10px 14px;border-radius:999px;color:#fff;font-weight:800;background:rgba(0,0,0,.6);z-index:9999;pointer-events:none;opacity:0;transition:opacity .2s,transform .4s;';
      return el;
    }
    function showXpToast(xp){
      const el = ensureXpToast();
      el.textContent = `+${xp} XP`;
      requestAnimationFrame(()=>{
        el.style.opacity='1'; el.style.transform='translate(-50%,-70%)';
        setTimeout(()=>{ el.style.opacity='0'; el.style.transform='translate(-50%,-50%)';},1200);
      });
    }
  
    // Progress bar pulse
    function pulseProgressBar(){
      if(!progressEl) return;
      progressEl.style.animation = 'pbPulse .6s ease';
      const style = document.getElementById('pbPulseStyle') || (()=> {
        const s = document.createElement('style'); s.id='pbPulseStyle';
        s.textContent='@keyframes pbPulse{0%{filter:brightness(1)}30%{filter:brightness(1.4)}100%{filter:brightness(1)}}';
        document.head.appendChild(s); return s;
      })();
      setTimeout(()=>{ progressEl.style.animation = ''; }, 650);
    }
  
    // Spin history
    function ensureHistory() {
        if (!SHOW_SPIN_HISTORY) return null;  // <— prevents creation
        let ul = document.getElementById('spinHistory');
        if (!ul) {
          ul = document.createElement('ul');
          ul.id = 'spinHistory';
          ul.style.cssText = 'list-style:none;margin:12px auto 0;padding:0;max-width:520px;color:#fff;opacity:.9;';
          wheel?.parentElement?.appendChild(ul);
        }
        return ul;
      }
      
      function pushSpinHistory(xp, leveled) {
        if (!SHOW_SPIN_HISTORY) return;       // <— prevents logging
        const ul = ensureHistory(); if (!ul) return;
        const li = document.createElement('li');
        li.style.cssText='display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed rgba(255,255,255,.12);font-size:.95em;';
        const t  = new Date().toLocaleTimeString();
        li.innerHTML = `<span>${t}</span><span>${xp} XP${leveled ? ' ⚡' : ''}</span>`;
        ul.prepend(li);
        while (ul.children.length > 5) ul.lastChild.remove();
      }
      
  
    // SFX (optional)
    function playSfx(id){
      const el = document.getElementById(id);
      if (!el) return;
      try { el.currentTime = 0; el.play(); } catch {}
    }
  
    // ---------- Auth / username helpers ----------
    async function getAuthUser() {
      const { data: s } = await sb.auth.getSession();
      if (s?.session?.user) return s.session.user;
      const { data: u } = await sb.auth.getUser();
      return u?.user ?? null;
    }
    function deriveUsernameFromAuth(user) {
      const qsUsername = new URLSearchParams(location.search).get('username');
      if (qsUsername && qsUsername.trim()) return qsUsername.trim();
      if (user?.user_metadata?.username)    return String(user.user_metadata.username);
      if (user?.email?.includes('@'))       return user.email.split('@')[0];
      return `user_${(user?.id || 'anon').slice(0, 6)}`;
    }
  
    // ---------- Level math (client mirror) ----------
    function computeProgressFromTotalXP(totalXp) {
      let vLevel = 1, vCum = 0, req = 0;
      const getReq = (lvl) => {
        if (lvl >= 1  && lvl <= 10) return 1000;
        if (lvl >= 11 && lvl <= 20) return 2000;
        if (lvl >= 21 && lvl <= 30) return 3000;
        if (lvl >= 31 && lvl <= 40) return 4000;
        return 5000; // 41–50
      };
      for (let l = 1; l <= 50; l++) { req = getReq(l); if (totalXp >= vCum + req) { vCum += req; vLevel = l + 1; } else break; }
      if (vLevel > 50) vLevel = 50;
      if (vLevel >= 50) return { level: 50, xp_into_level: Math.max(totalXp - vCum, 0), xp_needed_next: 0 };
      req = getReq(vLevel);
      const into = totalXp - vCum;
      return { level: vLevel, xp_into_level: into, xp_needed_next: req - into };
    }
  
    // ---------- DB ops ----------
    async function fetchUser(username) {
      const { data, error } = await sb
        .from('users')
        .select('username, level, "XP", thoughtcoins')
        .eq('username', username)
        .maybeSingle();
      if (error) { console.error('[level-up] fetchUser error:', error); return null; }
      return data ?? null;
    }
    async function ensureUser(username) {
      const existing = await fetchUser(username);
      if (existing) return existing;
      const { data, error } = await sb
        .from('users')
        .insert([{ username, level: 1, "XP": 0, thoughtcoins: 0 }])
        .select('username, level, "XP", thoughtcoins')
        .single();
      if (error) { console.error('[level-up] ensureUser insert error:', error); return null; }
      return data;
    }
    async function spinAwardAndUpdateLevel(username, xp) {
      const { data, error } = await sb.rpc('spin_award_and_update_level', { p_username: username, p_xp: xp });
      if (error) { console.warn('[level-up] spin_award_and_update_level error:', error); return { ok: false, row: null, error }; }
      const row = Array.isArray(data) ? data[0] : data;
      return { ok: !!row, row, error: null };
    }
  
    // Optional: award coins on actions (requires SQL function `award_coins`)
    async function awardCoins(username, amount) {
      const { data, error } = await sb.rpc('award_coins', { p_username: username, p_amount: amount });
      if (error) { console.warn('[level-up] award_coins error:', error); return null; }
      return Array.isArray(data) ? data[0] : data;
    }
    window.awardCoinsForQuestion = async (username) => awardCoins(username, 7);
    window.awardCoinsForReply    = async (username) => awardCoins(username, 3);
  
    // ---------- UI render ----------
    function renderProgress(totalXp, serverLevel, rowMaybe) {
      if (!progressEl || !progressWrap || !progressLbl) return;
      let xpInto, xpNext, lvl;
      if (rowMaybe && typeof rowMaybe.xp_into_level === 'number' && typeof rowMaybe.xp_needed_next === 'number') {
        xpInto = rowMaybe.xp_into_level; xpNext = rowMaybe.xp_needed_next; lvl = rowMaybe.level ?? serverLevel;
      } else {
        const calc = computeProgressFromTotalXP(totalXp);
        xpInto = calc.xp_into_level; xpNext = calc.xp_needed_next; lvl = calc.level;
      }
      const denom = xpInto + xpNext;
      const pct = denom > 0 ? Math.max(0, Math.min(100, Math.round((xpInto / denom) * 100))) : 100;
      progressEl.style.width = `${pct}%`;
      progressWrap.setAttribute('aria-valuenow', String(pct));
      if (lvl >= 50) progressLbl.textContent = `Progress: MAX LEVEL (50)`;
      else progressLbl.textContent = `Progress: ${xpInto} / ${xpInto + xpNext} XP to Level ${lvl + 1}`;
    }
    function renderUser(row) {
      if (!row) {
        if (nameEl)  nameEl.textContent  = 'username: (not found)';
        if (levelEl) levelEl.textContent = 'LEVEL 0';
        if (statsEl) statsEl.textContent = 'TOTAL XP: 0  |  0 THOUGHT COINS';
        renderProgress(0, 0, null);
        updateCardArt(1); // default art
        return;
      }
      const username = row.username ?? 'Unknown';
      const level    = row.level ?? 0;
      const xp       = row.XP ?? 0;
      const coins    = row.thoughtcoins ?? 0;
      if (nameEl)  nameEl.textContent  = `username: ${username}`;
      if (levelEl) levelEl.textContent = `LEVEL ${level}`;
      if (statsEl) statsEl.textContent = `TOTAL XP: ${xp}  |  ${coins} THOUGHT COINS`;
      renderProgress(xp, level, row);
      updateCardArt(level); // <-- swap card art by tier
    }
  
    // ---------- Spin animation & locking ----------
    let turns = 0;
    let isSpinning = false;
  
    function setSpinEnabled(enabled) {
      if (!spinButton) return;
      if (enabled) spinButton.classList.remove('disabled');
      else         spinButton.classList.add('disabled');
    }
  
    function animateTo(centerDeg) {
      return new Promise((resolve) => {
        const normalized = (centerDeg + 360) % 360;
        const finalRot   = SPIN_SIGN * normalized;
        turns += 6;
        const target = turns * 360 * SPIN_SIGN + finalRot;
        wheel.style.transition = 'transform 4s cubic-bezier(0.25, 1, 0.3, 1)';
        wheel.style.transform  = `rotate(${target}deg)`;
        setTimeout(() => {
          wheel.style.transition = 'none';
          wheel.style.transform  = `rotate(${finalRot}deg)`;
          turns = 0;
          resolve();
        }, 4000);
      });
    }
  
    // ---------- Spin flow ----------
    async function onSpinClicked(username) {
      if (isSpinning) return;
      isSpinning = true;
      setSpinEnabled(false);
      playSfx('sfxSpin');
  
      try {
        const current = await ensureUser(username);
        if (!current) throw new Error('Cannot load/create user row');
        const coins = Number(current.thoughtcoins ?? 0);
        if (coins < 1) { alert('You need at least 1 Thought Coin to spin.'); return; }
  
        // Build weights and pick outcome
        const dynWeights = getDynamicWeights();
        const idx       = pickIndexWeighted(dynWeights);
        const centerDeg = sectorCenters[idx];
        const xpReward  = rewards[idx];
        const prevLvl   = Number(current.level ?? 0);
  
        // Commit on server first (don’t reveal outcome yet)
        const res = await spinAwardAndUpdateLevel(username, xpReward);
        if (!res.ok || !res.row) {
          const msg = res.error?.message || '';
          if (msg.includes('NO_COINS')) alert('You have 0 Thought Coins. Earn more coins to spin!');
          else alert('Spin failed. See console for details.');
          return;
        }
  
        // Update dynamic-state, but still no UI reveal
        if (rewards[idx] === 500) hotCooldown = HOT_COOLDOWN_SPINS; else if (hotCooldown > 0) hotCooldown -= 1;
        if ((rewards[idx] ?? 0) <= 75) coldStreak += 1; else coldStreak = 0;
        lastPrizeIdx = idx;
        persistDyn();
  
        // Animate wheel
        await animateTo(centerDeg);
  
        // AFTER animation: reveal everything
        const newLvl = Number(res.row.level ?? prevLvl);
        showXpToast(xpReward);
        renderUser(res.row);   // updates labels, progress, AND card art
        pulseProgressBar();
  
        if (newLvl > prevLvl) {
          showLevelUp(newLvl);
          confettiBurst(160);
          playSfx('sfxLevel');
        }
        pushSpinHistory(xpReward, newLvl > prevLvl);
  
      } catch (e) {
        console.error('[level-up] Unexpected error during spin:', e);
        alert('Oops—something went wrong. Please try again.');
      } finally {
        isSpinning = false;
        setSpinEnabled(true);
      }
    }
  
    // ---------- Init ----------
    document.addEventListener('DOMContentLoaded', async () => {
      if (!wheel || !spinButton) { console.warn('[level-up] Missing wheel or spin button in DOM.'); return; }
  
      const authUser = await getAuthUser();
      if (!authUser) { console.warn('[level-up] Not logged in — redirect to login or add ?username=...'); renderUser(null); return; }
  
      const username = deriveUsernameFromAuth(authUser);
      const row = await ensureUser(username);
      renderUser(row); // will set initial card art based on level
  
      spinButton.addEventListener('click', () => onSpinClicked(username));
  
      const profileButton = document.getElementById("profileButton");
      if (profileButton) {
        profileButton.addEventListener("click", function() {
          window.location.href = "profile-page.html";
        });
      }
    });
  
    // (Optional) If you show a calibration badge somewhere:
    function updateBadge(){ /* noop in this build */ }
  
  })();
  