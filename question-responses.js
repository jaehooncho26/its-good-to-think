// questions-responses.js (v4 — filter by answer_id + question, write question on insert)
const supabaseUrl = 'https://aqpyxfjhlypevabhrdxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxcHl4ZmpobHlwZXZhYmhyZHhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MjgyODIsImV4cCI6MjA1ODAwNDI4Mn0.dXeKewJjtQG6EeQ7y-g7KwKjoK7i1dKrXmb6LnDzm5E';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

const params     = new URLSearchParams(window.location.search);
const CURRENT_Q  = Math.max(1, Math.min(7, parseInt(params.get('q') || '1', 10)));
const ANSWER_ID  = params.get('answer_id'); // keep as string; DB will coerce if numeric

const qCol        = (n) => `q${n}`;
const questionCol = (n) => `question${n}`;

// Elements
const headerEl          = document.querySelector('.answer-section h1') || document.getElementById('questionHeaderText');
const originalAnswerEl  = document.getElementById('original-answer');
const addCommentSection = document.getElementById('add-comment-section');
const commentsList      = document.getElementById('comments-list');
const submitBtn         = document.getElementById('submit-comment');
const replyInput        = document.getElementById('new-comment-text');

// "username's answer" line (inserted just above the readonly textarea)
let ownerEl = document.getElementById('answerOwner');
if (!ownerEl) {
  const host = document.querySelector('.answer-section') || document.body;
  ownerEl = document.createElement('p');
  ownerEl.id = 'answerOwner';
  ownerEl.style.margin = '8px 0 10px';
  ownerEl.style.textAlign = 'center';
  const ta = document.getElementById('original-answer');
  if (ta && ta.parentNode === host) host.insertBefore(ownerEl, ta);
  else host.appendChild(ownerEl);
}

function possessive(name = 'user') {
  return /s$/i.test(name) ? `${name}'` : `${name}'s`;
}

// 1) Header: "question to think on: …"
async function loadQuestionHeader() {
  const col = questionCol(CURRENT_Q);
  const { data, error } = await supabaseClient
    .from('questions')
    .select(col)
    .eq('id', 1)
    .single();

  const prompt = !error ? (data?.[col] || '') : '';
  if (headerEl) {
    headerEl.textContent = prompt
      ? `question to think on: ${prompt}`
      : `question ${CURRENT_Q}`;
  }
}

// 2) Load the original answer + owner name
async function fetchOriginalAnswerAndOwner() {
  if (!ANSWER_ID) {
    originalAnswerEl.value = 'No answer ID provided';
    ownerEl.textContent = '';
    return;
  }

  const col = qCol(CURRENT_Q);
  const { data: ansRow, error: ansErr } = await supabaseClient
    .from('user_answers')
    .select(`user_id, ${col}`)
    .eq('id', ANSWER_ID)
    .single();

  if (ansErr || !ansRow) {
    console.error('Error fetching original answer:', ansErr);
    originalAnswerEl.value = 'Error fetching answer';
    ownerEl.textContent = '';
    return;
  }

  originalAnswerEl.value = ansRow[col] || 'No answer found';

  // Username
  let username = '';
  if (ansRow.user_id) {
    const { data: userRow, error: userErr } = await supabaseClient
      .from('users')
      .select('username')
      .eq('user_id', ansRow.user_id)
      .single();
    if (!userErr && userRow) username = userRow.username || '';
  }
  ownerEl.textContent = username ? `${possessive(username)} answer` : `user’s answer`;
}

// 3) Fetch comments ONLY for this answer_id AND this question
async function fetchComments() {
  commentsList.innerHTML = '';

  if (!ANSWER_ID) {
    commentsList.innerHTML = '<li>No answer selected.</li>';
    return;
  }

  const { data: comments, error: commentsError } = await supabaseClient
    .from('comments')
    .select('id, user_id, comment_text, created_at, answer_id, question')
    .eq('answer_id', ANSWER_ID)
    .eq('question', CURRENT_Q)                    // ✅ filter by question too
    .order('created_at', { descending: true });

  if (commentsError) {
    console.error('Error fetching comments:', commentsError);
    commentsList.innerHTML = '<li>Error fetching comments</li>';
    return;
  }

  if (!comments || comments.length === 0) {
    commentsList.innerHTML = '<li>No responses yet.</li>';
    return;
  }

  // Resolve usernames
  const userIds = [...new Set(comments.map(c => c.user_id).filter(Boolean))];
  let usernameMap = {};
  if (userIds.length) {
    const { data: users } = await supabaseClient
      .from('users')
      .select('user_id, username')
      .in('user_id', userIds);
    (users || []).forEach(u => { usernameMap[u.user_id] = u.username || 'Unknown User'; });
  }

  comments.forEach(comment => {
    const li = document.createElement('li');
    const username = usernameMap[comment.user_id] || 'Unknown User';
    li.innerHTML = `<strong>${username}</strong><br>${comment.comment_text}`;
    commentsList.appendChild(li);
  });
}

// 4) Insert a comment bound to this answer_id AND this question
async function addComment() {
  const text = (replyInput?.value || '').trim();
  if (!text || !ANSWER_ID) return;

  const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
  if (userError || !user) {
    alert('Please log in to leave a response.');
    return;
  }

  const { error } = await supabaseClient
    .from('comments')
    .insert({
      user_id: user.id,
      answer_id: ANSWER_ID,
      question: CURRENT_Q,       // ✅ store the question number
      comment_text: text
    });

  if (error) {
    console.error('Error adding comment:', error);
    alert('Error adding your response. Please try again.');
    return;
  }

  replyInput.value = '';
  await fetchComments();
}

// Auth-gate visibility for reply box
supabaseClient.auth.onAuthStateChange(async (_ev, session) => {
  addCommentSection.style.display = session?.user ? 'block' : 'none';
});

// Init
window.onload = async function () {
  if (!ANSWER_ID) {
    originalAnswerEl.value = 'No answer ID provided';
    addCommentSection.style.display = 'none';
    return;
  }

  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    addCommentSection.style.display = user ? 'block' : 'none';

    await loadQuestionHeader();
    await fetchOriginalAnswerAndOwner();
    await fetchComments();
  } catch (e) {
    console.error('Error on page load:', e);
    originalAnswerEl.value = 'Error loading page';
  }
};

// Submit (image-link) button
submitBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  addComment();
});
