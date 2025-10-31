// script.js — functional logic for tabs, pomodoro, calculator, notes (soft-pink theme)

// --- Tab switching ---
function switchTab(id, btnEl) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
  if (btnEl) btnEl.classList.add('active');
}

// wait until DOM ready
document.addEventListener('DOMContentLoaded', () => {
  // Pomodoro elements
  const timeEl = document.getElementById('time');
  const startBtn = document.getElementById('start');
  const pauseBtn = document.getElementById('pause');
  const resetBtn = document.getElementById('reset');
  const focusMinInput = document.getElementById('focus-min');
  const breakMinInput = document.getElementById('break-min');
  const sessionCountEl = document.getElementById('session-count');
  const autoStartChk = document.getElementById('auto-start');

  // Calculator elements
  const calcDisplay = document.getElementById('display');

  // Notes elements
  const noteInput = document.getElementById('note-input');
  const noteList = document.getElementById('note-list');

  // Pomodoro logic
  let timer = null;
  let isRunning = false;
  let isFocus = true;
  let sessionCount = 0;
  let timeLeft = parseInt(focusMinInput.value || 25, 10) * 60;
  let totalSeconds = timeLeft;

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  function updateTimeDisplay() {
    timeEl.textContent = formatTime(Math.max(0, timeLeft));
    sessionCountEl.textContent = sessionCount;
  }

  function startTimer() {
    if (isRunning) return;
    // ensure timeLeft set if 0
    if (timeLeft <= 0) {
      timeLeft = (isFocus ? parseInt(focusMinInput.value, 10) : parseInt(breakMinInput.value, 10)) * 60;
      totalSeconds = timeLeft;
    }
    isRunning = true;
    timer = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(timer);
        isRunning = false;
        // session ended
        if (isFocus) sessionCount++;
        // gentle audio feedback (short beep)
        playBeep();
        // desktop notification if permitted
        showNotification(isFocus ? 'Sesi fokus selesai' : 'Istirahat selesai');
        // toggle mode
        toggleMode();
        // auto-start next if checked
        if (autoStartChk.checked) {
          startTimer();
        }
      }
      updateTimeDisplay();
    }, 1000);
    updateTimeDisplay();
  }

  function pauseTimer() {
    if (timer) clearInterval(timer);
    timer = null;
    isRunning = false;
    updateTimeDisplay();
  }

  function resetTimer() {
    pauseTimer();
    isFocus = true;
    timeLeft = parseInt(focusMinInput.value || 25, 10) * 60;
    totalSeconds = timeLeft;
    updateTimeDisplay();
  }

  function toggleMode() {
    pauseTimer();
    isFocus = !isFocus;
    timeLeft = (isFocus ? parseInt(focusMinInput.value, 10) : parseInt(breakMinInput.value, 10)) * 60;
    totalSeconds = timeLeft;
    updateTimeDisplay();
  }

  startBtn.addEventListener('click', startTimer);
  pauseBtn.addEventListener('click', pauseTimer);
  resetBtn.addEventListener('click', resetTimer);

  // Update times when inputs change (if not running)
  focusMinInput.addEventListener('change', () => {
    const v = Math.max(1, Math.min(60, parseInt(focusMinInput.value || 25, 10)));
    focusMinInput.value = v;
    if (!isRunning && isFocus) {
      timeLeft = v * 60;
      totalSeconds = timeLeft;
      updateTimeDisplay();
    }
  });
  breakMinInput.addEventListener('change', () => {
    const v = Math.max(1, Math.min(60, parseInt(breakMinInput.value || 5, 10)));
    breakMinInput.value = v;
    if (!isRunning && !isFocus) {
      timeLeft = v * 60;
      totalSeconds = timeLeft;
      updateTimeDisplay();
    }
  });

  // gentle beep using WebAudio (short)
  function playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      g.gain.value = 0.06;
      o.connect(g); g.connect(ctx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
      setTimeout(() => { try { o.stop(); ctx.close(); } catch (e) {} }, 500);
    } catch (e) {
      // ignore
    }
  }

  function showNotification(text) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification('foculo', { body: text });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(p => {
        if (p === 'granted') new Notification('foculo', { body: text });
      });
    }
  }

  // initial display
  updateTimeDisplay();

  // --- Calculator functions ---
  window.appendValue = function (value) {
    calcDisplay.value = (calcDisplay.value || '') + value;
  };
  window.clearDisplay = function () {
    calcDisplay.value = '';
  };
  window.calculateResult = function () {
    const expr = calcDisplay.value || '';
    if (!expr) return;
    if (!/^[0-9+\-*/().\s]+$/.test(expr)) {
      calcDisplay.value = 'Error';
      return;
    }
    try {
      // safer eval using Function
      const result = Function(`"use strict"; return (${expr})`)();
      calcDisplay.value = (typeof result === 'number' && isFinite(result)) ? String(result) : 'Error';
    } catch (e) {
      calcDisplay.value = 'Error';
    }
  };

  // keyboard support for calculator (when calculator tab active)
  document.addEventListener('keydown', (e) => {
    const activeTab = Array.from(document.querySelectorAll('.tab-content')).find(t => !t.classList.contains('hidden'));
    if (!activeTab) return;
    if (activeTab.id !== 'calculator') return;
    if (e.key >= '0' && e.key <= '9') appendValue(e.key);
    if (['+','-','/','*','.','(',')'].includes(e.key)) appendValue(e.key);
    if (e.key === 'Enter') calculateResult();
    if (e.key === 'Backspace') calcDisplay.value = calcDisplay.value.slice(0, -1);
    if (e.key === 'Escape') clearDisplay();
  });

  // --- Notes (localStorage) ---
  const NOTES_KEY = 'foculo_notes_v1';

  function loadNotes() {
    try {
      return JSON.parse(localStorage.getItem(NOTES_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveNotes(notes) {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  }

  function renderNotes() {
    noteList.innerHTML = '';
    const notes = loadNotes();
    if (notes.length === 0) {
      const li = document.createElement('li');
      li.textContent = '📝 Belum ada catatan';
      li.style.color = '#9b8b93';
      noteList.appendChild(li);
      return;
    }
    notes.forEach((n, i) => {
      const li = document.createElement('li');
      const txt = document.createElement('span');
      txt.textContent = n;
      li.appendChild(txt);

      const del = document.createElement('button');
      del.textContent = 'Hapus';
      del.className = 'note-delete';
      del.onclick = () => {
        const arr = loadNotes();
        arr.splice(i, 1);
        saveNotes(arr);
        renderNotes();
      };
      li.appendChild(del);
      noteList.appendChild(li);
    });
  }

  window.saveNote = function () {
    const text = (noteInput.value || '').trim();
    if (!text) return;
    const arr = loadNotes();
    arr.unshift(text);
    saveNotes(arr);
    noteInput.value = '';
    renderNotes();
  };
  window.clearNotesInput = function () {
    noteInput.value = '';
  };

  // initial render of notes
  renderNotes();

  // ensure the pomodoro tab active on load
  switchTab('pomodoro', document.querySelector('.tab-btn'));

});
