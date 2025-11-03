document.addEventListener("DOMContentLoaded", async function () {
	// --- Header navigation ---
	document.getElementById("profileButton")?.addEventListener("click", () => (window.location.href = "profile-page.html"));
	document.getElementById("questionsButton")?.addEventListener("click", () => (window.location.href = "questions-page.html"));
  
	// --- Current question from URL ---
	const CURRENT_Q = Math.max(1, Math.min(7, parseInt(new URLSearchParams(location.search).get('q') || '1', 10)));
	const qCol      = (n) => `q${n}`;
	const postedCol = (n) => `q${n}_posted`;
  
	// --- Supabase ---
	const supabaseUrl = 'https://aqpyxfjhlypevabhrdxs.supabase.co';
	const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxcHl4ZmpobHlwZXZhYmhyZHhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MjgyODIsImV4cCI6MjA1ODAwNDI4Mn0.dXeKewJjtQG6EeQ7y-g7KwKjoK7i1dKrXmb6LnDzm5E';
	const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
  
	// --- Auth gate ---
	let isAuthed = false;
	try {
	  const { data: { user } } = await supabaseClient.auth.getUser();
	  isAuthed = !!user;
	} catch { isAuthed = false; }
	supabaseClient.auth.onAuthStateChange((_e, session) => { isAuthed = !!session?.user; });
  
	const AUTH_GUARD_SELECTOR = [
	  'button','.icon-button','.reply-button',
	  '#editBtn','#saveBtn','#postBtn',
	  '#profileButton','#questionsButton'
	].join(',');
  
	function interceptIfNotAuthed(e) {
	  const t = e.target.closest(AUTH_GUARD_SELECTOR);
	  if (!t) return;
	  if (isAuthed) return;
	  e.preventDefault(); e.stopPropagation();
	  window.location.href = 'signup-page.html';
	}
	document.addEventListener('click', interceptIfNotAuthed, true);
	document.addEventListener('touchstart', interceptIfNotAuthed, true);
  
	// --- Elements ---
	const headerTextEl = document.getElementById("questionHeaderText");
	const readOnlyEl   = document.getElementById("q1DisplayReadOnly");
	const editorEl     = document.getElementById("q1Editor");
	const editBtn      = document.getElementById("editBtn");
	const saveBtnImg   = document.getElementById("saveBtn");
	const saveOrReplyA = document.getElementById("saveOrReplyLink");
	const postBtn      = document.getElementById("postBtn");
	const statusEl     = document.getElementById("status-msg");
	const publicWrap   = document.getElementById("publicAnswers");
	const setStatus    = (msg) => { if (statusEl) statusEl.textContent = msg || ""; };
  
	let currentAnswerId = null;
	let postedFlag = false;
	const DEBOUNCE_MS = 600;
	let typingTimer = null;
  
	// --- Popup (confirm post) ---
	function showPopup({ messageHTML, onOk }) {
	  document.querySelector(".tier-alert-overlay")?.remove();
	  const overlay = document.createElement("div");
	  overlay.className = "tier-alert-overlay";
	  overlay.innerHTML = `
		<div class="tier-alert-box">
		  <p>${messageHTML}</p>
		  <div class="tier-alert-buttons">
			<img src="ok-button.png" id="okBtn" class="tier-alert-img" alt="OK">
			<img src="cancel-button.png" id="cancelBtn" class="tier-alert-img" alt="Cancel">
		  </div>
		</div>
	  `;
	  document.body.appendChild(overlay);
	  document.getElementById("okBtn").addEventListener("click", async () => {
		try { await onOk?.(); } finally { overlay.remove(); }
	  });
	  document.getElementById("cancelBtn").addEventListener("click", () => overlay.remove());
	  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
	}
  
	// --- Reward popup (OK + Level Up) ---
	function showThoughtCoinNotification(amount = 7) {
	  document.querySelector(".tier-alert-overlay")?.remove();
  
	  const overlay = document.createElement("div");
	  overlay.className = "tier-alert-overlay";
	  overlay.innerHTML = `
		<div class="tier-alert-box">
		  <p style="margin-bottom:12px;">you earned <strong>${amount}</strong> thought coins!</p>
		  <div class="tier-alert-buttons">
			<img src="ok-button.png" id="tcOkBtn" class="tier-alert-img" alt="OK">
			<img src="level-up-button.png" id="tcLevelBtn" class="tier-alert-img" alt="Level Up">
		  </div>
		</div>
	  `;
	  document.body.appendChild(overlay);
  
	  document.getElementById("tcOkBtn")?.addEventListener("click", () => {
		overlay.remove(); // stay here
	  });
  
	  document.getElementById("tcLevelBtn")?.addEventListener("click", () => {
		window.location.href = "level-up-page.html"; // go to level up
	  });
  
	  // Click outside = dismiss (same as OK)
	  overlay.addEventListener("click", (e) => {
		if (e.target === overlay) overlay.remove();
	  });
	}
  
	// --- Load prompt text ---
	async function loadHeaderText() {
	  const col = `question${CURRENT_Q}`;
	  const { data, error } = await supabaseClient
		.from('questions')
		.select(col)
		.eq('id', 1)
		.single();
	  const text = error ? '' : (data?.[col] || '');
	  if (headerTextEl) headerTextEl.textContent = text ? `question ${CURRENT_Q}: ${text}` : `question ${CURRENT_Q}`;
	}
  
	// --- User helper ---
	async function getUser() {
	  const { data, error } = await supabaseClient.auth.getUser();
	  if (error) return null;
	  return data.user || null;
	}
  
	async function awardThoughtCoins(amount = 7) {
		try {
		  const { data: { user }, error } = await supabaseClient.auth.getUser();
		  if (error || !user) return;
	  
		  // One atomic server-side call; returns the new total
		  const { data: newTotal, error: rpcErr } = await supabaseClient
			.rpc('award_thoughtcoins', { p_increment: amount });
	  
		  if (rpcErr) {
			console.error('award_thoughtcoins RPC failed:', rpcErr);
			alert('Could not add Thought Coins.'); // optional
			return;
		  }
	  
		  // Optional status/toast
		  setStatus(`Posted! +${amount} Thought Coins 🪙 (total: ${newTotal})`);
		  setTimeout(() => setStatus(''), 1500);
		} catch (e) {
		  console.error('awardThoughtCoins fatal:', e);
		}
	  }
	  
	  
  
	// --- Read/update answer row helpers ---
	async function fetchLatestRowForQ(userId) {
	  const fields = `id, ${qCol(CURRENT_Q)}, ${postedCol(CURRENT_Q)}`;
	  const { data } = await supabaseClient
		.from("user_answers")
		.select(fields)
		.eq("user_id", userId)
		.order("updated_at", { ascending: false })
		.limit(1);
	  return data?.[0] || null;
	}
  
	async function upsertAnswerForQ(text) {
	  const user = await getUser();
	  if (!user) { window.location.href = "signup-page.html"; return null; }
	  if (postedFlag) { alert(`You already posted your Q${CURRENT_Q} answer.`); return null; }
  
	  let res;
	  const payload = {};
	  payload[qCol(CURRENT_Q)] = text;
  
	  if (currentAnswerId) {
		res = await supabaseClient
		  .from("user_answers")
		  .update(payload)
		  .eq("id", currentAnswerId)
		  .select(`id, ${qCol(CURRENT_Q)}, ${postedCol(CURRENT_Q)}`)
		  .single();
	  } else {
		payload.user_id = user.id;
		payload[postedCol(CURRENT_Q)] = false;
		res = await supabaseClient
		  .from("user_answers")
		  .insert(payload)
		  .select(`id, ${qCol(CURRENT_Q)}, ${postedCol(CURRENT_Q)}`)
		  .single();
	  }
  
	  if (res.error) {
		console.error("Upsert error:", res.error);
		alert("Failed to save your answer.");
		return null;
	  }
	  return res.data;
	}
  
	async function markPostedForQ() {
	  const update = {};
	  update[postedCol(CURRENT_Q)] = true;
	  const { data, error } = await supabaseClient
		.from("user_answers")
		.update(update)
		.eq("id", currentAnswerId)
		.select(`id, ${postedCol(CURRENT_Q)}`)
		.single();
	  if (error) { alert("Failed to post your answer."); return null; }
	  return data;
	}
  
	async function loadMyAnswer() {
	  const user = await getUser();
	  if (!user) {
		if (readOnlyEl) readOnlyEl.textContent = "Please sign up to save your answer.";
		lockEditing();
		setButtonsForUnposted();
		return;
	  }
  
	  const row = await fetchLatestRowForQ(user.id);
	  if (row) {
		currentAnswerId = row.id;
		postedFlag = !!row[postedCol(CURRENT_Q)];
		if (readOnlyEl) readOnlyEl.textContent = row[qCol(CURRENT_Q)] || "";
		if (editorEl)   editorEl.value       = row[qCol(CURRENT_Q)] || "";
	  }
  
	  if (postedFlag) setButtonsForPosted();
	  else            setButtonsForUnposted();
	}
  
	async function loadPublicAnswers() {
	  const { data, error } = await supabaseClient
		.from("user_answers")
		.select(`id, ${qCol(CURRENT_Q)}`)
		.eq(postedCol(CURRENT_Q), true)
		.not(qCol(CURRENT_Q), "is", null);
  
	  if (error) { console.error(error); return; }
	  if (!publicWrap) return;
	  publicWrap.innerHTML = "";
  
	  (data || []).forEach((row) => {
		const wrapper = document.createElement("div");
		wrapper.className = "public-answer-wrapper";
  
		const card = document.createElement("div");
		card.className = "public-answer-card";
		card.textContent = row[qCol(CURRENT_Q)] || "";
  
		const replyContainer = document.createElement("div");
		replyContainer.className = "reply-button-container";
  
		const replyLink = document.createElement("a");
		replyLink.href = `question-page-responses.html?q=${CURRENT_Q}&answer_id=${row.id}`;
		replyLink.className = "reply-button";
  
		const replyImg = document.createElement("img");
		replyImg.src = "reply-button.png";
		replyImg.alt = "Reply";
  
		replyLink.appendChild(replyImg);
		replyContainer.appendChild(replyLink);
  
		wrapper.appendChild(card);
		wrapper.appendChild(replyContainer);
		publicWrap.appendChild(wrapper);
	  });
	}
  
	// --- Editor helpers ---
	function showEditor(show) {
	  if (!editorEl) return;
	  editorEl.style.display = show ? "block" : "none";
	  if (show) editorEl.focus();
	}
	function lockEditing() { showEditor(false); }
  
	function setButtonsForPosted() {
	  if (saveBtnImg) saveBtnImg.src = "reply-button.png";
	  if (editBtn)    editBtn.style.display = "none";
	  if (postBtn)    postBtn.style.display = "none";
	  if (saveOrReplyA && currentAnswerId) {
		saveOrReplyA.setAttribute("href", `question-page-responses.html?q=${CURRENT_Q}&answer_id=${currentAnswerId}`);
	  }
	}
	function setButtonsForUnposted() {
	  if (saveBtnImg) saveBtnImg.src = "save-button.png";
	  if (editBtn)    editBtn.style.display = "inline-block";
	  if (postBtn)    postBtn.style.display = "inline-block";
	  if (saveOrReplyA) saveOrReplyA.removeAttribute("href");
	}
  
	// --- Events ---
	editBtn?.addEventListener("click", async (e) => {
	  e.preventDefault();
	  const user = await getUser();
	  if (!user) { window.location.href = "signup-page.html"; return; }
	  showEditor(true);
	});
  
	saveOrReplyA?.addEventListener("click", async (e) => {
	  e.preventDefault();
	  const user = await getUser();
	  if (!user) { window.location.href = "signup-page.html"; return; }
  
	  if (postedFlag) {
		if (currentAnswerId) {
		  window.location.href = `question-page-responses.html?q=${CURRENT_Q}&answer_id=${currentAnswerId}`;
		}
		return;
	  }
  
	  const text = (editorEl?.value || "").trim();
	  if (!text) { alert("Answer cannot be empty."); return; }
  
	  setStatus("Saving...");
	  const row = await upsertAnswerForQ(text);
	  if (row) {
		currentAnswerId = row.id;
		if (readOnlyEl) readOnlyEl.textContent = row[qCol(CURRENT_Q)];
		lockEditing();
		setStatus("Saved!");
		setTimeout(() => setStatus(""), 800);
	  }
	});
  
	postBtn?.addEventListener("click", async (e) => {
	  e.preventDefault();
	  const user = await getUser();
	  if (!user) { window.location.href = "signup-page.html"; return; }
	  if (postedFlag) { alert("You already posted."); return; }
  
	  const candidate = (editorEl && editorEl.style.display === "block")
		? (editorEl.value || "").trim()
		: (readOnlyEl?.textContent || "").trim();
  
	  if (!candidate) {
		alert("Your answer is empty. Please write or save an answer before posting.");
		return;
	  }
  
	  showPopup({
		messageHTML: "Warning. Once you post an answer, you cannot post again.",
		onOk: async () => {
		  try {
			if (!currentAnswerId) {
			  const row = await upsertAnswerForQ(candidate);
			  if (row) {
				currentAnswerId = row.id;
				if (readOnlyEl) readOnlyEl.textContent = row[qCol(CURRENT_Q)] || "";
			  }
			} else if (editorEl && editorEl.style.display === "block") {
			  await upsertAnswerForQ(candidate);
			  if (readOnlyEl) readOnlyEl.textContent = candidate;
			}
  
			const updated = await markPostedForQ();
			if (updated) {
			  postedFlag = true;
			  setButtonsForPosted();
  
			  // ✅ Award +7 Thought Coins and show 2-button popup
			  await awardThoughtCoins(7);
			  showThoughtCoinNotification(7);
  
			  setStatus("Posted!");
			  loadPublicAnswers();
			}
		  } catch (err) {
			console.error("Post flow failed:", err);
		  }
		}
	  });
	});
  
	// Autosave
	editorEl?.addEventListener("input", () => {
	  if (postedFlag) return;
	  setStatus("Typing…");
	  if (typingTimer) clearTimeout(typingTimer);
	  typingTimer = setTimeout(async () => {
		const text = (editorEl.value || "").trim();
		if (!text) { setStatus(""); return; }
		try {
		  setStatus("Saving…");
		  const row = await upsertAnswerForQ(text);
		  if (row) currentAnswerId = row.id;
		  setStatus("Saved");
		  setTimeout(() => setStatus(""), 800);
		} catch {
		  setStatus("Failed to save");
		}
	  }, DEBOUNCE_MS);
	});
  
	// Init
	await loadHeaderText();
	await loadMyAnswer();
	await loadPublicAnswers();
  });
  