// profile-page.js — profile info + tier card art with smooth cross-fade
document.addEventListener('DOMContentLoaded', async () => {
    const SUPABASE_URL = 'https://aqpyxfjhlypevabhrdxs.supabase.co';
    const SUPABASE_ANON_KEY =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxcHl4ZmpobHlwZXZhYmhyZHhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MjgyODIsImV4cCI6MjA1ODAwNDI4Mn0.dXeKewJjtQG6EeQ7y-g7KwKjoK7i1dKrXmb6LnDzm5E';
    const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
    // DOM
    const nameEl       = document.getElementById('thinkName');
    const levelEl      = document.getElementById('thinkLevel');
    const statsEl      = document.getElementById('thinkStats');
    const levelButton  = document.getElementById('levelButton');
    const questionsBtn = document.getElementById('questionsButton');
    const cardImg      = document.getElementById('cardBg'); // starts as card-blank.png in HTML
  
    // ---------- Card art helpers (same tiers as level-up page) ----------
    function getCardSrcForLevel(level) {
      if (level >= 41) return 'card-luminary.png';
      if (level >= 31) return 'card-catalyst.png';
      if (level >= 21) return 'card-muse.png';
      if (level >= 11) return 'card-seeker.png';
      return 'card.png';
    }
  
    // Preload to prevent flicker and enable instant cross-fades
    (function preloadCardArt() {
      ['card-blank.png', 'card.png', 'card-seeker.png', 'card-muse.png', 'card-catalyst.png', 'card-luminary.png']
        .forEach(src => { const i = new Image(); i.src = src; });
    })();
  
    // Smooth cross-fade (keeps current image visible until next is ready)
    function updateCardArt(level) {
      if (!cardImg) return;
  
      const next = getCardSrcForLevel(Number(level || 1));
      const current = cardImg.getAttribute('src');
      if (current === next) return; // already correct
  
      const wrapper = cardImg.parentElement;
      if (!wrapper) return;
  
      // Ensure we can position an overlay inside the wrapper
      const wStyle = getComputedStyle(wrapper);
      if (wStyle.position === 'static') wrapper.style.position = 'relative';
  
      const overlay = new Image();
      overlay.src = next;
      overlay.className = 'think-bg';
      overlay.alt = '';
      overlay.style.position = 'absolute';
      overlay.style.inset = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.objectFit = getComputedStyle(cardImg).objectFit || 'contain';
      overlay.style.borderRadius = getComputedStyle(cardImg).borderRadius || '0';
      overlay.style.pointerEvents = 'none';
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 320ms ease';
  
      overlay.onload = () => {
        // Place new art on top, fade it in
        wrapper.appendChild(overlay);
        requestAnimationFrame(() => { overlay.style.opacity = '1'; });
  
        // After fade, set base to new src and remove overlay
        setTimeout(() => {
          cardImg.setAttribute('src', next);
          overlay.remove();
        }, 340);
      };
  
      // If cached, trigger onload immediately
      if (overlay.complete) overlay.onload();
    }
  
    // ---------- Auth helpers ----------
    async function getAuthUser() {
      const { data: s } = await sb.auth.getSession();
      if (s?.session?.user) return s.session.user;
      const { data: u } = await sb.auth.getUser();
      return u?.user ?? null;
    }
  
    function deriveUsernameFromAuth(user) {
      const qsUsername = new URLSearchParams(location.search).get('username');
      if (qsUsername && qsUsername.trim()) return qsUsername.trim();
      if (user?.user_metadata?.username)   return String(user.user_metadata.username);
      if (user?.email?.includes('@'))      return user.email.split('@')[0];
      return `user_${(user?.id || 'anon').slice(0, 6)}`;
    }
  
    // ---------- DB fetch ----------
    async function fetchUser(username) {
      const { data, error } = await sb
        .from('users')
        .select('username, level, "XP", thoughtcoins')
        .eq('username', username)
        .maybeSingle();
  
      if (error) {
        console.error('[profile-page] fetchUser error:', error);
        return null;
      }
      return data ?? null;
    }
  
    // ---------- Render ----------
    function renderUser(row) {
      if (!row) {
        if (nameEl)  nameEl.textContent  = 'username: (not found)';
        if (levelEl) levelEl.textContent = 'LEVEL 0';
        if (statsEl) statsEl.textContent = 'TOTAL XP: 0 | 0 THOUGHT COINS';
        // Keep placeholder visible
        cardImg?.setAttribute('src', 'card-blank.png');
        return;
      }
  
      const username = row.username ?? 'Unknown';
      const level    = row.level ?? 0;
      const xp       = row.XP ?? 0;
      const coins    = row.thoughtcoins ?? 0;
  
      if (nameEl)  nameEl.textContent  = `username: ${username}`;
      if (levelEl) levelEl.textContent = `LEVEL ${level}`;
      if (statsEl) statsEl.textContent = `TOTAL XP: ${xp} | ${coins} THOUGHT COINS`;
  
      updateCardArt(level);
    }
  
    // ---------- Init ----------
    const authUser = await getAuthUser();
    if (!authUser) {
      console.warn('[profile-page] Not logged in');
      renderUser(null);
      return;
    }
  
    const username = deriveUsernameFromAuth(authUser);
    const row = await fetchUser(username);
    renderUser(row);
  
    // ---------- Nav ----------
    levelButton?.addEventListener('click', () => {
      window.location.href = 'level-up-page.html';
    });
    questionsBtn?.addEventListener('click', () => {
      window.location.href = 'questions-page.html';
    });
  });
  