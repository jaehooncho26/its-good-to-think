// q1-page.js
document.addEventListener("DOMContentLoaded", async function () {
	// --- Navigation ---
	const profileButton = document.getElementById("profileButton");
	const questionsButton = document.getElementById("questionsButton");
	profileButton?.addEventListener("click", () => (window.location.href = "profile-page.html"));
	questionsButton?.addEventListener("click", () => (window.location.href = "questions-page.html"));
  
	// --- Supabase (expects @supabase/supabase-js loaded in HTML before this file) ---
	const supabaseUrl = 'https://aqpyxfjhlypevabhrdxs.supabase.co';
	const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxcHl4ZmpobHlwZXZhYmhyZHhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MjgyODIsImV4cCI6MjA1ODAwNDI4Mn0.dXeKewJjtQG6EeQ7y-g7KwKjoK7i1dKrXmb6LnDzm5E';
	const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
  
	// --- Elements ---
	const myAnswerEl   = document.getElementById("q1Display");     // editable
	const otherAnswerEl = document.getElementById("q1Display2");   // showcase (readonly)
	const addAnswerBtn = document.getElementById("add-answer-button"); // still supported as manual save
	const replyBtn     = document.getElementById("reply-button");
	const statusEl     = document.getElementById("status-msg");
	const setStatus = (msg) => { if (statusEl) statusEl.textContent = msg || ""; };
  
	// Track the row we're editing
	let currentAnswerId = null;
	let typingSaveTimer = null;
	const DEBOUNCE_MS = 800;
	let initializing = true; // avoid saving while we are just setting initial value
  
	// --- Auth helper ---
	async function getAuthedUserOrExplain() {
	  const { data: { user }, error } = await supabaseClient.auth.getUser();
	  if (error) {
		console.error("auth.getUser error:", error);
		setStatus("Could not verify login.");
		return null;
	  }
	  if (!user) {
		setStatus("Please log in to see and save your answer.");
		myAnswerEl.value = "Please log in to see and save your answer.";
		return null;
	  }
	  return user;
	}
  
	// --- Fetch my latest answer (most recent by created_at) ---
	async function fetchMyAnswer() {
	  try {
		const user = await getAuthedUserOrExplain();
		if (!user) return;
  
		const { data, error } = await supabaseClient
		  .from("user_answers")
		  .select("id, q1, created_at")
		  .eq("user_id", user.id)
		  .order("created_at", { ascending: false })
		  .limit(1);
  
		if (error) throw error;
  
		initializing = true;
		if (data && data.length === 1) {
		  currentAnswerId = data[0].id;
		  myAnswerEl.value = data[0].q1 || "";
		} else {
		  currentAnswerId = null;
		  myAnswerEl.value = ""; // fresh
		}
		initializing = false;
		setStatus("");
	  } catch (err) {
		console.error("fetchMyAnswer error:", err);
		myAnswerEl.value = "Error fetching data";
		setStatus("Error fetching your answer.");
		initializing = false;
	  }
	}
  
	// --- Save helpers: update existing row or insert new ---
	async function upsertMyAnswer(newAnswer) {
	  const user = await getAuthedUserOrExplain();
	  if (!user) return;
  
	  if (currentAnswerId) {
		// UPDATE the existing latest row
		const { data, error } = await supabaseClient
		  .from("user_answers")
		  .update({ q1: newAnswer })
		  .eq("id", currentAnswerId)
		  .select("id, q1")
		  .single();
  
		if (error) throw error;
		// Keep same id; just confirm UI value
		myAnswerEl.value = data.q1 || "";
		return data;
	  } else {
		// INSERT a new row (first time user types/saves)
		const { data, error } = await supabaseClient
		  .from("user_answers")
		  .insert({ user_id: user.id, q1: newAnswer })
		  .select("id, q1, created_at")
		  .single();
  
		if (error) throw error;
		currentAnswerId = data.id;
		myAnswerEl.value = data.q1 || "";
		return data;
	  }
	}
  
	// --- Debounced autosave on input ---
	myAnswerEl.addEventListener("input", () => {
	  if (initializing) return; // don't autosave while populating initial value
	  const text = (myAnswerEl.value || "").trim();
	  // if you want to allow empty values, remove the check below:
	  if (text.length === 0) {
		setStatus(""); // don't save empties by default
		return;
	  }
  
	  setStatus("Saving...");
	  if (typingSaveTimer) clearTimeout(typingSaveTimer);
	  typingSaveTimer = setTimeout(async () => {
		try {
		  await upsertMyAnswer(text);
		  setStatus("Saved");
		  setTimeout(() => setStatus(""), 1000);
		} catch (err) {
		  console.error("autosave error:", err);
		  setStatus("Failed to save");
		}
	  }, DEBOUNCE_MS);
	});
  
	// --- Manual save button still works (if you want the click pattern) ---
	addAnswerBtn?.addEventListener("click", async (e) => {
	  e.preventDefault();
	  try {
		const text = (myAnswerEl.value || "").trim();
		if (!text) {
		  alert("Answer cannot be empty.");
		  return;
		}
		setStatus("Saving...");
		await upsertMyAnswer(text);
		setStatus("Saved!");
		setTimeout(() => setStatus(""), 1000);
	  } catch (err) {
		console.error("manual save error:", err);
		setStatus("");
		alert("Failed to save your answer.");
	  }
	});
  
	// --- Load OTHER user's latest answer (showcase) ---
	async function fetchOtherAnswer() {
	  const otherUserId = "0a8f21e5-ada4-470c-9fa4-5af2e29c4c23";
	  try {
		const { data, error } = await supabaseClient
		  .from("user_answers")
		  .select("id, q1, created_at")
		  .eq("user_id", otherUserId)
		  .order("created_at", { ascending: false })
		  .limit(1);
  
		if (error) throw error;
  
		if (data && data.length === 1) {
		  otherAnswerEl.value = data[0].q1 || "...";
		  replyBtn.href = `q1-page-responses1.html?answer_id=${data[0].id}`;
		} else {
		  otherAnswerEl.value = "No answer found for this user";
		}
	  } catch (err) {
		console.error("fetchOtherAnswer error:", err);
		otherAnswerEl.value = "Error fetching data";
	  }
	}
  
	// --- Initial load ---
	await fetchMyAnswer();
	await fetchOtherAnswer();
  });
  