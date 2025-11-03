// questions-pages-buttons.js

document.addEventListener("DOMContentLoaded", async () => {
	const supabaseUrl = 'https://aqpyxfjhlypevabhrdxs.supabase.co';
	const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxcHl4ZmpobHlwZXZhYmhyZHhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MjgyODIsImV4cCI6MjA1ODAwNDI4Mn0.dXeKewJjtQG6EeQ7y-g7KwKjoK7i1dKrXmb6LnDzm5E';
	const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
  
	const profileButton = document.getElementById("profileButton");
	const q1Button = document.getElementById("q1-button");
	const q2Button = document.getElementById("q2-button");
	const q3Button = document.getElementById("q3-button");
	const q4Button = document.getElementById("q4-button");
	const q5Button = document.getElementById("q5-button");
  
	profileButton?.addEventListener("click", () => (window.location.href = "profile-page.html"));
  
	const ACCESS_RULES = {
	  q1: { min: 0,  target: "thinker-questions.html" },
	  q2: { min: 11, target: "seeker-questions.html" },
	  q3: { min: 21, target: "muse-questions.html" },
	  q4: { min: 31, target: "catalyst-questions.html" },
	  q5: { min: 41, target: "luminary-questions.html" },
	};
  
	// ---- Load user + level ----
	let user = null;
	let level = 0;
  
	try {
	  const { data: { user: authUser } } = await supabaseClient.auth.getUser();
	  user = authUser || null;
  
	  if (user) {
		const { data, error } = await supabaseClient
		  .from("users")
		  .select("level")
		  .eq("user_id", user.id)
		  .single();
		if (!error && data?.level !== undefined) {
		  level = Number(data.level) || 0;
		}
	  }
	} catch (e) {
	  console.warn("Error fetching user level:", e);
	}
  
	// --- Custom alert popup with level-up button ---
	function showTierAlert() {
	  // remove any existing
	  document.querySelector(".tier-alert-overlay")?.remove();
  
	  const overlay = document.createElement("div");
	  overlay.className = "tier-alert-overlay";
	  overlay.innerHTML = `
		<div class="tier-alert-box">
		  <p>You are not at a high enough tier to enter.</p>
		  <div class="tier-alert-buttons">
			<img src="level-up-button.png" id="levelUpBtn" class="tier-alert-img" alt="Level Up">
			<img src="ok-button.png" id="okBtn" class="tier-alert-img" alt="OK">
		  </div>
		</div>
	  `;
  
	  document.body.appendChild(overlay);
  
	  document.getElementById("okBtn").addEventListener("click", () => overlay.remove());
	  document.getElementById("levelUpBtn").addEventListener("click", () => {
		window.location.href = "level-up-page.html"; // change if you have a different level-up page
	  });
	}
  
	// --- Gate click logic ---
	function gateClick(minLevel, targetHref) {
	  return (e) => {
		e.preventDefault();
  
		if (!user) {
		  window.location.href = "signup-page.html";
		  return;
		}
  
		if (level >= minLevel) {
		  window.location.href = targetHref;
		} else {
		  showTierAlert();
		}
	  };
	}
  
	// Attach handlers
	q1Button?.addEventListener("click", gateClick(ACCESS_RULES.q1.min, ACCESS_RULES.q1.target));
	q2Button?.addEventListener("click", gateClick(ACCESS_RULES.q2.min, ACCESS_RULES.q2.target));
	q3Button?.addEventListener("click", gateClick(ACCESS_RULES.q3.min, ACCESS_RULES.q3.target));
	q4Button?.addEventListener("click", gateClick(ACCESS_RULES.q4.min, ACCESS_RULES.q4.target));
	q5Button?.addEventListener("click", gateClick(ACCESS_RULES.q5.min, ACCESS_RULES.q5.target));
  });
  