// index-page-buttons.js

document.addEventListener("DOMContentLoaded", async function () {
  const loginButton  = document.getElementById("loginButton");
  const submitButton = document.getElementById("submitButton");
  const q1El         = document.getElementById("q1");

  // --- Supabase init (UMD build is already loaded in index.html) ---
  const supabaseUrl = 'https://aqpyxfjhlypevabhrdxs.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxcHl4ZmpobHlwZXZhYmhyZHhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MjgyODIsImV4cCI6MjA1ODAwNDI4Mn0.dXeKewJjtQG6EeQ7y-g7KwKjoK7i1dKrXmb6LnDzm5E';

  let supabaseClient = null;
  if (window.supabase?.createClient) {
    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
  } else {
    console.warn('[index] Supabase library not found. Page will load without auth redirect.');
  }

  function stashQ1Draft() {
    const q1 = (q1El?.value || "").trim();
    localStorage.setItem("answers", JSON.stringify({ q1 }));
    localStorage.setItem("q1Draft", q1);
  }

  // --- Redirect logged-in users on load ---
  if (supabaseClient) {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session?.user) {
        window.location.replace('profile-page.html');
        return; // stop binding guest-only handlers
      }
    } catch (e) {
      console.warn('[index] auth.getSession failed:', e);
    }

    // If the user signs in while this page is open, redirect then too
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        window.location.replace('profile-page.html');
      }
    });
  }

  // --- Guest-only interactions (no redirect happened) ---
  loginButton?.addEventListener("click", function () {
    stashQ1Draft();
    window.location.href = "login-page.html";
  });

  submitButton?.addEventListener("click", function () {
    stashQ1Draft();
    setTimeout(function () {
      // No ?q specified here, so it will default to Q1 logic on q1-page.html
      window.location.href = "q1-page.html";
    }, 100);
  });

  const form = document.getElementById("questions");
  form?.addEventListener("submit", function (e) {
    e.preventDefault();
    stashQ1Draft();
    window.location.href = "q1-page.html";
  });
});
