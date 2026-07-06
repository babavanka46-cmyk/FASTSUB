const API = 'http://localhost:8100';
const statusEl = document.getElementById('status');
const messageEl = document.getElementById('message');
const apiKeyEl = document.getElementById('apiKey');
const projectIdEl = document.getElementById('projectId');

init();

async function init() {
  const saved = await chrome.storage.sync.get(['geminiApiKey', 'projectId']);
  apiKeyEl.value = saved.geminiApiKey || '';
  projectIdEl.value = saved.projectId || '';
  checkConnection();
}

document.getElementById('save').addEventListener('click', async () => {
  await chrome.storage.sync.set({
    geminiApiKey: apiKeyEl.value.trim(),
    projectId: projectIdEl.value.trim(),
  });
  message('Saved');
});

document.getElementById('correct').addEventListener('click', async () => {
  const apiKey = apiKeyEl.value.trim();
  const projectId = projectIdEl.value.trim();
  if (!apiKey || !projectId) {
    message('Project ID and API Key are required.');
    return;
  }
  try {
    message('Fetching subtitles...');
    const response = await fetch(`${API}/api/project/${projectId}/subtitles`);
    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      const detail = errorJson?.detail || `Status ${response.status}`;
      throw new Error(`Failed to fetch subtitles: ${detail}`);
    }
    const subtitles = await response.json();
    
    message('Correcting with Gemini...');
    const corrected = await correctWithGemini(subtitles, apiKey);
    
    message('Syncing back...');
    const saveResponse = await fetch(`${API}/api/project/${projectId}/subtitles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corrected),
    });
    if (!saveResponse.ok) {
      const errorJson = await saveResponse.json().catch(() => ({}));
      const detail = errorJson?.detail || `Status ${saveResponse.status}`;
      throw new Error(`Failed to save subtitles: ${detail}`);
    }
    
    await chrome.storage.sync.set({ geminiApiKey: apiKey, projectId });
    message('Correction complete. Refresh FASTSUB if needed.');
  } catch (err) {
    message(`Error: ${err.message}`);
    console.error(err);
  }
});

async function checkConnection() {
  try {
    const response = await fetch(`${API}/api/health`);
    if (!response.ok) throw new Error('offline');
    statusEl.textContent = 'Connected';
    statusEl.classList.add('ok');
  } catch {
    statusEl.textContent = 'Offline';
    statusEl.classList.remove('ok');
  }
}

async function correctWithGemini(subtitles, apiKey) {
  const prompt = [
    'Fix Thai spelling errors, adjust grammar, and correct word spacing.',
    'STRICTLY preserve the array structure and timeline timestamps.',
    'Do not change start or end values. Return only valid JSON matching the input schema.',
  ].join(' ');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `${prompt}\n\n${JSON.stringify(subtitles)}` }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });
  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    const errorMsg = errorJson?.error?.message || `Status ${response.status}`;
    throw new Error(`Gemini API error: ${errorMsg}`);
  }
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini response format is invalid or blocked.');
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error('Failed to parse Gemini output as JSON.');
  }
}

function message(value) {
  messageEl.textContent = value;
}
