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
	const myAnswerEl    = document.getElementById("q1Display");     // editable
	const otherAnswerEl = document.getElementById("q1Display2");    // readonly
	const addAnswerBtn  = document.getElementById("add-answer-button");
	const replyBtn      = document.getElementById("reply-button");
	const statusEl      = document.getElementById("status-msg");
	const setStatus = (msg) => { if (statusEl) statusEl.textContent = msg || ""; };
  
	// --- State ---
	let currentAnswerId = null;
	let typingSaveTimer = null;
	const DEBOUNCE_MS = 800;
	let initializing = true; // don’t autosave while initial value is being set
  
	// ---------- Helpers ----------
	async function getAuthedUserOrExplain() {
	  const { data: { user }, error } = await supabaseClient.auth.getUser();
	  if (error) {
		console.error("auth.getUser error:", error);
		setStatus("Could not verify login.");
		return null;
	  }
	  if (!user) {
		setStatus("Please log in to see and save your answer.");
		if (myAnswerEl) myAnswerEl.value = "Please log in to see and save your answer.";
		return null;
	  }
	  return user;
	}
  
	// Try different order columns to reliably get "latest"
	async function fetchLatestAnswer(userId) {
	  const orders = [
		{ column: "updated_at", ascending: false },
		{ column: "created_at", ascending: false },
		{ column: "id",         ascending: false },
	  ];
	  for (const o of orders) {
		try {
		  const { data, error } = await supabaseClient
			.from("user_answers")
			.select("id, q1")
			.eq("user_id", userId)
			.order(o.column, { ascending: o.ascending })
			.limit(1);
  
		  if (error) {
			// Column might not exist; try next ordering
			console.warn(`Order by ${o.column} failed, trying next...`, error);
			continue;
		  }
		  if (data && data.length === 1) return data[0];
		} catch (err) {
		  console.warn(`Query with order ${o.column} threw, trying next...`, err);
		  // continue to next order option
		}
	  }
	  return null;
	}
  
	async function upsertMyAnswer(newAnswer) {
	  const user = await getAuthedUserOrExplain();
	  if (!user) return null;
  
	  if (currentAnswerId) {
		// UPDATE existing latest row
		const { data, error } = await supabaseClient
		  .from("user_answers")
		  .update({ q1: newAnswer })
		  .eq("id", currentAnswerId)
		  .select("id, q1")
		  .single();
  
		if (error) throw error;
		myAnswerEl.value = data.q1 || "";
		return data;
	  } else {
		// INSERT first row for this user
		const { data, error } = await supabaseClient
		  .from("user_answers")
		  .insert({ user_id: user.id, q1: newAnswer })
		  .select("id, q1")
		  .single();
  
		if (error) throw error;
		currentAnswerId = data.id;
		myAnswerEl.value = data.q1 || "";
		return data;
	  }
	}
  
	// ---------- Fetch my answer (logged-in user) ----------
	async function fetchMyAnswer() {
	  try {
		const user = await getAuthedUserOrExplain();
		if (!user) return;
  
		initializing = true;
		const row = await fetchLatestAnswer(user.id);
		if (row) {
		  currentAnswerId = row.id;
		  myAnswerEl.value = row.q1 || "";
		} else {
		  currentAnswerId = null;
		  myAnswerEl.value = "";
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
  
	// ---------- Fetch Angie/Jaehoon answer (showcase) ----------
	async function fetchOtherAnswer() {
	  const otherUserId = "0a8f21e5-ada4-470c-9fa4-5af2e29c4c23"; // keep your known UUID
	  try {
		const row = await fetchLatestAnswer(otherUserId);
		if (row) {
		  otherAnswerEl.value = row.q1 || "...";
		  if (replyBtn) replyBtn.href = `q1-page-responses1.html?answer_id=${row.id}`;
		} else {
		  otherAnswerEl.value = "No answer found for this user";
		}
	  } catch (err) {
		console.error("fetchOtherAnswer error:", err);
		otherAnswerEl.value = "Error fetching data";
	  }
	}
  
	// ---------- Autosave on input (debounced) ----------
	if (myAnswerEl) {
	  myAnswerEl.addEventListener("input", () => {
		if (initializing) return; // ignore initial population
		const text = (myAnswerEl.value || "").trim();
		if (text.length === 0) {
		  setStatus(""); // skip saving empties; change if you want to allow blank saves
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
	}
  
	// ---------- Manual save button (still supported) ----------
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
  
	// ---------- Initial load ----------
	await fetchMyAnswer();
	await fetchOtherAnswer();
  });
  