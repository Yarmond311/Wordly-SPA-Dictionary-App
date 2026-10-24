const API_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
let savedWords = JSON.parse(localStorage.getItem('wordly_saved')) || [];
let recentSearches = JSON.parse(localStorage.getItem('wordly_recents')) || [];
let currentAudioUrl = null;
let currentWordData = null;


const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const resultsContainer = document.getElementById('resultsContainer');
const recentTags = document.getElementById('recentTags');
const audioBtn = document.getElementById('audioBtn');
const saveWordBtn = document.getElementById('saveWordBtn');
const savedWordsBtn = document.getElementById('savedWordsBtn');
const savedModal = document.getElementById('savedModal');
const closeSavedBtn = document.getElementById('closeSavedBtn');
const savedList = document.getElementById('savedList');
const themeToggle = document.getElementById('themeToggle');

// Initialize Lucide icons & states
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) window.lucide.createIcons();
  updateRecentUI();
  updateSavedUI();
  initTheme();
});

// Expose fetchWord to window scope for inline onclick listeners
window.fetchWord = async function(word) {
  if (!word.trim()) return;
  
  loadingState.classList.remove('hidden');
  errorState.classList.add('hidden');
  resultsContainer.classList.add('hidden');

  try {
    const response = await fetch(`${API_URL}${encodeURIComponent(word)}`);
    if (!response.ok) throw new Error('Word not found in dictionary.');

    const data = await response.json();
    currentWordData = data[0];
    
    renderResults(currentWordData);
    addRecentSearch(word);
  } catch (err) {
    showError('Word Not Found', err.message || 'Unable to retrieve definition.');
  } finally {
    loadingState.classList.add('hidden');
  }
};

function renderResults(data) {
  document.getElementById('resultWord').textContent = data.word;
  
  const phonetic = data.phonetics?.find(p => p.text)?.text || data.phonetic || '';
  document.getElementById('resultPhonetic').textContent = phonetic;

  const audioObj = data.phonetics?.find(p => p.audio && p.audio.length > 0);
  if (audioObj) {
    currentAudioUrl = audioObj.audio;
    audioBtn.classList.remove('hidden');
  } else {
    currentAudioUrl = null;
    audioBtn.classList.add('hidden');
  }

  const meaningsContainer = document.getElementById('meaningsList');
  meaningsContainer.innerHTML = '';

  data.meanings.forEach(m => {
    const block = document.createElement('div');
    block.className = 'bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4';
    
    let html = `<div class="flex items-center gap-2">
      <span class="font-bold text-sm uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">${m.partOfSpeech}</span>
    </div><ul class="space-y-3">`;

    m.definitions.slice(0, 4).forEach((d, i) => {
      html += `<li class="flex items-start gap-3 text-slate-700">
        <span class="text-indigo-500 font-bold text-sm mt-0.5">${i + 1}.</span>
        <div>
          <p class="leading-relaxed">${d.definition}</p>
          ${d.example ? `<p class="text-sm text-slate-500 italic mt-1">"${d.example}"</p>` : ''}
        </div>
      </li>`;
    });
    html += '</ul>';

    if (m.synonyms && m.synonyms.length > 0) {
      html += `<div class="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100">
        <span class="text-xs font-semibold text-slate-400 uppercase">Synonyms:</span>
        ${m.synonyms.slice(0, 5).map(s => `
          <button onclick="fetchWord('${s}')" class="text-xs font-medium text-indigo-600 bg-indigo-50/80 hover:bg-indigo-100 px-2 py-1 rounded-md transition-colors">${s}</button>
        `).join('')}
      </div>`;
    }

    block.innerHTML = html;
    meaningsContainer.appendChild(block);
  });

  const sourceUrl = data.sourceUrls?.[0] || `https://en.wiktionary.org/wiki/${data.word}`;
  document.getElementById('sourceUrl').href = sourceUrl;

  updateSaveButtonState(data.word);
  resultsContainer.classList.remove('hidden');
  if (window.lucide) window.lucide.createIcons();
}

// Form & Audio Listeners
searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  window.fetchWord(searchInput.value);
});

audioBtn.addEventListener('click', () => {
  if (currentAudioUrl) {
    new Audio(currentAudioUrl).play();
  } else {
    const utterance = new SpeechSynthesisUtterance(currentWordData.word);
    window.speechSynthesis.speak(utterance);
  }
});

// Bookmark Management
saveWordBtn.addEventListener('click', () => {
  if (!currentWordData) return;
  const word = currentWordData.word;
  const index = savedWords.indexOf(word);

  if (index > -1) {
    savedWords.splice(index, 1);
  } else {
    savedWords.push(word);
  }

  localStorage.setItem('wordly_saved', JSON.stringify(savedWords));
  updateSaveButtonState(word);
  updateSavedUI();
});

function updateSaveButtonState(word) {
  const isSaved = savedWords.includes(word);
  saveWordBtn.classList.toggle('text-indigo-600', isSaved);
  saveWordBtn.classList.toggle('fill-indigo-600', isSaved);
}

function updateSavedUI() {
  document.getElementById('savedCount').textContent = savedWords.length;
  savedList.innerHTML = savedWords.length === 0 
    ? '<p class="text-slate-400 text-sm text-center py-8">No saved words yet.</p>'
    : savedWords.map(w => `
      <div class="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors">
        <button onclick="fetchWord('${w}'); savedModal.classList.add('hidden')" class="font-medium text-slate-800 hover:text-indigo-600">${w}</button>
        <button onclick="removeSaved('${w}')" class="text-slate-400 hover:text-rose-500">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    `).join('');
  if (window.lucide) window.lucide.createIcons();
}

window.removeSaved = function(word) {
  savedWords = savedWords.filter(w => w !== word);
  localStorage.setItem('wordly_saved', JSON.stringify(savedWords));
  updateSavedUI();
  if (currentWordData && currentWordData.word === word) {
    updateSaveButtonState(word);
  }
};

savedWordsBtn.addEventListener('click', () => savedModal.classList.remove('hidden'));
closeSavedBtn.addEventListener('click', () => savedModal.classList.add('hidden'));

// Search History
function addRecentSearch(word) {
  recentSearches = [word, ...recentSearches.filter(w => w.toLowerCase() !== word.toLowerCase())].slice(0, 5);
  localStorage.setItem('wordly_recents', JSON.stringify(recentSearches));
  updateRecentUI();
}

function updateRecentUI() {
  recentTags.innerHTML = recentSearches.map(w => `
    <button onclick="fetchWord('${w}')" class="text-xs bg-white border border-slate-200 hover:border-indigo-300 text-slate-600 px-2.5 py-1 rounded-lg shadow-sm transition-colors">${w}</button>
  `).join('');
}

function showError(title, msg) {
  document.getElementById('errorTitle').textContent = title;
  document.getElementById('errorMessage').textContent = msg;
  errorState.classList.remove('hidden');
}

themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  localStorage.setItem('wordly_theme', isDark ? 'dark' : 'light');
});

function initTheme() {
  if (localStorage.getItem('wordly_theme') === 'dark') {
    document.body.classList.add('dark');
  }
}