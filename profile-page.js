// profile-page.js — fetch and show Supabase user info on profile
document.addEventListener('DOMContentLoaded', async () => {
    const SUPABASE_URL = 'https://aqpyxfjhlypevabhrdxs.supabase.co';
    const SUPABASE_ANON_KEY =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxcHl4ZmpobHlwZXZhYmhyZHhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MjgyODIsImV4cCI6MjA1ODAwNDI4Mn0.dXeKewJjtQG6EeQ7y-g7KwKjoK7i1dKrXmb6LnDzm5E';
    const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
    const nameEl = document.getElementById('thinkName');
    const levelEl = document.getElementById('thinkLevel');
    const statsEl = document.getElementById('thinkStats');
    const levelButton = document.getElementById('levelButton');
    const questionButton = document.getElementById('questionbutton');
  
    // Reuse the same helpers as level-up page
    async function getAuthUser() {
      const { data: s } = await sb.auth.getSession();
      if (s?.session?.user) return s.session.user;
      const { data: u } = await sb.auth.getUser();
      return u?.user ?? null;
    }
  
    function deriveUsernameFromAuth(user) {
      const qsUsername = new URLSearchParams(location.search).get('username');
      if (qsUsername && qsUsername.trim()) return qsUsername.trim();
      if (user?.user_metadata?.username) return String(user.user_metadata.username);
      if (user?.email?.includes('@')) return user.email.split('@')[0];
      return `user_${(user?.id || 'anon').slice(0, 6)}`;
    }
  
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
  
    // Render user info
    function renderUser(row) {
      if (!row) {
        nameEl.textContent = 'username: (not found)';
        levelEl.textContent = 'LEVEL 0';
        statsEl.textContent = 'TOTAL XP: 0 | 0 THOUGHT COINS';
        return;
      }
  
      const username = row.username ?? 'Unknown';
      const level = row.level ?? 0;
      const xp = row.XP ?? 0;
      const coins = row.thoughtcoins ?? 0;
  
      nameEl.textContent = `username: ${username}`;
      levelEl.textContent = `LEVEL ${level}`;
      statsEl.textContent = `TOTAL XP: ${xp} | ${coins} THOUGHT COINS`;
    }
  
    // ---------- INIT ----------
    const authUser = await getAuthUser();
    if (!authUser) {
      console.warn('[profile-page] Not logged in');
      renderUser(null);
      return;
    }
  
    const username = deriveUsernameFromAuth(authUser);
    const row = await fetchUser(username);
    renderUser(row);
  
    // Level-up button
    levelButton.addEventListener('click', () => {
      window.location.href = 'level-up-page.html';
    });
    // Level-up button
    questionsButton.addEventListener('click', () => {
        window.location.href = 'questions-page.html';
      });
  });
  