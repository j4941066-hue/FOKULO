// --- Tab Switching ---
function switchTab(id) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(id).classList.remove('hidden');
  event.target.classList.add('active');
}

// --- Pomodoro Timer ---
let timer;
let timeLeft = 25 * 60;
let isRunning = false;
let sessionCount = 1;
const timeDisplay = document.getElementById("time");
const sessionDisplay = document.getElementById("session-count");

function updateDisplay() {
  let minutes = Math.floor(timeLeft / 60);
  let seconds = timeLeft % 60;
  timeDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

document.getElementById("start").addEventListener("click", function() {
  if (!isRunning) {
    isRunning = true;
    timer = setInterval(() => {
      timeLeft--;
      updateDisplay();
      if (timeLeft <= 0) {
        clearInterval(timer);
        isRunning = false;
        alert("Waktu selesai! Istirahat dulu ya 🌿");
        sessionCount++;
        sessionDisplay.textContent = sessionCount;
        timeLeft = 25 * 60;
        updateDisplay();
      }
    }, 1000);
  }
});

document.getElementById("pause").addEventListener("click", function() {
  clearInterval(timer);
  isRunning = false;
});

document.getElementById("reset").addEventListener("click", function() {
  clearInterval(timer);
  isRunning = false;
  timeLeft = 25 * 60;
  updateDisplay();
});

// --- Calculator ---
function appendValue(value) {
  document.getElementById("display").value += value;
}
function clearDisplay() {
  document.getElementById("display").value = '';
}
function calculateResult() {
  try {
    document.getElementById("display").value = eval(document.getElementById("display").value);
  } catch {
    document.getElementById("display").value = 'Error';
  }
}

// --- Notes ---
function saveNote() {
  const input = document.getElementById("note-input");
  const text = input.value.trim();
  if (text === '') return;

  const notes = JSON.parse(localStorage.getItem('notes')) || [];
  notes.push(text);
  localStorage.setItem('notes', JSON.stringify(notes));
  input.value = '';
  renderNotes();
}

function renderNotes() {
  const noteList = document.getElementById("note-list");
  noteList.innerHTML = '';
  const notes = JSON.parse(localStorage.getItem('notes')) || [];
  notes.forEach((note, i) => {
    const li = document.createElement('li');
    li.textContent = note;
    li.onclick = () => deleteNote(i);
    noteList.appendChild(li);
  });
}

function deleteNote(index) {
  const notes = JSON.parse(localStorage.getItem('notes')) || [];
  notes.splice(index, 1);
  localStorage.setItem('notes', JSON.stringify(notes));
  renderNotes();
}

renderNotes();
updateDisplay();
switchTab('pomodoro');


// initial render
renderNotes();

// ensure current tab shown (default first)
switchTab('pomodoro');
