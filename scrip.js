// --- Tab switching ---
function switchTab(id){
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
    // Find button by data or text
    const btn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.textContent.toLowerCase().includes(id));
    if(btn) btn.classList.add('active');
    const el = document.getElementById(id);
    if(el) el.classList.add('active');
}

// --- Pomodoro Timer ---
const focusInput = document.getElementById('focusMinutes');
const breakInput = document.getElementById('breakMinutes');
const timerDisplay = document.getElementById('timerDisplay');
const timerModeEl = document.getElementById('timerMode');

let timerInterval = null;
let remainingSeconds = parseInt(focusInput.value,10) * 60 || 1500;
let isFocus = true;
let isRunning = false;

function formatTime(s){
    const m = Math.floor(s/60).toString().padStart(2,'0');
    const sec = (s%60).toString().padStart(2,'0');
    return `${m}:${sec}`;
}

function updateTimerDisplay(){
    timerDisplay.textContent = formatTime(Math.max(0, remainingSeconds));
    timerModeEl.textContent = `Mode: ${isFocus ? 'Fokus' : 'Istirahat'}`;
    // update running visual
    if(isRunning){
        timerDisplay.classList.add('pulse');
    } else {
        timerDisplay.classList.remove('pulse');
    }
}

function startTimer(){
    if(isRunning) return;
    // if finished, reset to selected durations
    if(remainingSeconds <= 0){
        remainingSeconds = (isFocus ? parseInt(focusInput.value,10) : parseInt(breakInput.value,10)) * 60;
    }
    isRunning = true;
    updateTimerDisplay();
    timerInterval = setInterval(()=> {
        remainingSeconds--;
        if(remainingSeconds <= 0){
            playBeep();
            showEndNotification(isFocus ? 'Sesi fokus selesai' : 'Istirahat selesai');
            // vibrate if supported
            if(navigator.vibrate) navigator.vibrate([200,80,200]);
            toggleMode();
        }
        updateTimerDisplay();
    }, 1000);
}

function pauseTimer(){
    if(timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;
    updateTimerDisplay();
}

function resetTimer(){
    pauseTimer();
    isFocus = true;
    remainingSeconds = parseInt(focusInput.value,10) * 60;
    updateTimerDisplay();
}

function toggleMode(){
    pauseTimer();
    isFocus = !isFocus;
    remainingSeconds = (isFocus ? parseInt(focusInput.value,10) : parseInt(breakInput.value,10)) * 60;
    updateTimerDisplay();
    // auto-start next mode: keep off by default for gentle UX
    // startTimer();
}

// update when inputs change
focusInput.addEventListener('change', ()=> {
    const v = Math.max(1, Math.min(60, parseInt(focusInput.value,10) || 25));
    focusInput.value = v;
    if(isFocus && !isRunning) remainingSeconds = v * 60;
    updateTimerDisplay();
});
breakInput.addEventListener('change', ()=> {
    const v = Math.max(1, Math.min(30, parseInt(breakInput.value,10) || 5));
    breakInput.value = v;
    if(!isFocus && !isRunning) remainingSeconds = v * 60;
    updateTimerDisplay();
});

// gentle beep using WebAudio API + layered tones for nicer sound
function playBeep(){
    try{
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const now = ctx.currentTime;
        // primary tone
        const o1 = ctx.createOscillator();
        const g1 = ctx.createGain();
        o1.type = 'sine'; o1.frequency.value = 880;
        g1.gain.value = 0.06;
        o1.connect(g1); g1.connect(ctx.destination);
        // second tone for warmth
        const o2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        o2.type = 'triangle'; o2.frequency.value = 660;
        g2.gain.value = 0.04;
        o2.connect(g2); g2.connect(ctx.destination);
        o1.start(now); o2.start(now);
        // ramp down
        g1.gain.setValueAtTime(0.06, now); g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
        g2.gain.setValueAtTime(0.04, now); g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
        setTimeout(()=> { try{ o1.stop(); o2.stop(); ctx.close(); }catch(e){} }, 700);
    }catch(e){
        console.log('beep error', e);
    }
}

// desktop notification (request permission gracefully)
function showEndNotification(text){
    if(!("Notification" in window)) return;
    if(Notification.permission === "granted"){
        new Notification("foculo", { body: text, icon: "" });
    } else if(Notification.permission !== "denied"){
        Notification.requestPermission().then(permission => {
            if(permission === "granted"){
                new Notification("foculo", { body: text, icon: "" });
            }
        });
    }
}

// initialize
remainingSeconds = parseInt(focusInput.value,10) * 60;
updateTimerDisplay();


// --- Calculator ---
const calcDisplay = document.getElementById('calcDisplay');
let calcExpr = '';

function setCalcDisplay(v){
    calcDisplay.value = v;
}

function appendCalc(ch){
    // prevent starting with multiple zeros
    if(calcExpr === '0' && ch !== '.' && /[0-9]/.test(ch)){
        calcExpr = ch;
    } else {
        calcExpr += ch;
    }
    setCalcDisplay(calcExpr || '0');
}

function clearCalc(){
    calcExpr = '';
    setCalcDisplay('0');
}

function deleteCalc(){
    calcExpr = calcExpr.slice(0, -1);
    setCalcDisplay(calcExpr || '0');
}

function calculateResult(){
    if(!calcExpr) return;
    // allow digits, operators, parentheses, dot and spaces
    if(!/^[0-9+\-*/().\s]+$/.test(calcExpr)){
        setCalcDisplay('Error');
        calcExpr = '';
        return;
    }
    try{
        const result = Function(`"use strict"; return (${calcExpr})`)();
        calcExpr = (typeof result === 'number' && isFinite(result)) ? String(result) : '';
        setCalcDisplay(calcExpr || '0');
    }catch(e){
        setCalcDisplay('Error');
        calcExpr = '';
    }
}

// keyboard support for calculator when its tab active
document.addEventListener('keydown', (e)=>{
    const active = document.querySelector('.tab-content.active');
    if(!active) return;
    if(active.id !== 'calculator') return;
    if(e.key >= '0' && e.key <= '9') appendCalc(e.key);
    if(['+','-','/','*','.','(',')'].includes(e.key)) appendCalc(e.key);
    if(e.key === 'Enter') calculateResult();
    if(e.key === 'Backspace') deleteCalc();
    if(e.key === 'Escape') clearCalc();
});


// --- Notes (localStorage) ---
const NOTES_KEY = 'foculo_notes_v1';

function loadNotes(){
    try{
        const raw = localStorage.getItem(NOTES_KEY);
        return raw ? JSON.parse(raw) : [];
    }catch(e){
        return [];
    }
}
function saveNotes(notes){
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

function renderNotes(){
    const container = document.getElementById('notesList');
    const notes = loadNotes();
    container.innerHTML = '';
    if(notes.length === 0){
        const empty = document.createElement('div');
        empty.className = 'empty-notes';
        empty.innerHTML = `<p>📝 Belum ada catatan</p><p style="font-size:0.9em;color:var(--muted)">Klik "Tambah Catatan" untuk membuat catatan baru</p>`;
        container.appendChild(empty);
        return;
    }
    notes.forEach((n, idx) => {
        const card = document.createElement('div');
        card.className = 'note-card';
        const title = document.createElement('div');
        title.className = 'note-title';
        title.textContent = n.title || 'Tanpa judul';
        const content = document.createElement('div');
        content.className = 'note-content';
        content.textContent = n.content || '';
        const actions = document.createElement('div');
        actions.className = 'note-actions';
        const editBtn = document.createElement('button');
        editBtn.className = 'edit';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', ()=> openNoteModal(n, idx));
        const delBtn = document.createElement('button');
        delBtn.className = 'delete';
        delBtn.textContent = 'Hapus';
        delBtn.addEventListener('click', ()=> {
            if(confirm('Hapus catatan ini?')) {
                const arr = loadNotes();
                arr.splice(idx,1);
                saveNotes(arr);
                renderNotes();
            }
        });
        const meta = document.createElement('div');
        meta.style.fontSize='0.8em';
        meta.style.color='var(--muted)';
        const when = new Date(n.updated || n.created || Date.now());
        meta.textContent = when.toLocaleString();
        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
        card.appendChild(title);
        card.appendChild(content);
        card.appendChild(meta);
        card.appendChild(actions);
        container.appendChild(card);
    });
}

// Modal for add/edit notes
function openNoteModal(note = null, idx = null){
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.tabIndex = -1;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <h3>${note ? 'Edit Catatan' : 'Tambah Catatan'}</h3>
        <div class="form-row">
            <input id="noteTitle" placeholder="Judul (opsional)" />
        </div>
        <div class="form-row">
            <textarea id="noteContent" placeholder="Isi catatan..."></textarea>
        </div>
        <div class="modal-actions">
            <button class="btn ghost" id="cancelNote">Batal</button>
            <button class="btn primary" id="saveNote">${note ? 'Simpan' : 'Tambah'}</button>
        </div>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const titleInput = modal.querySelector('#noteTitle');
    const contentInput = modal.querySelector('#noteContent');
    if(note){
        titleInput.value = note.title || '';
        contentInput.value = note.content || '';
    } else {
        titleInput.value = '';
        contentInput.value = '';
    }
    setTimeout(()=> contentInput.focus(), 60);

    function closeModal(){
        overlay.remove();
    }
    modal.querySelector('#cancelNote').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e)=> {
        if(e.target === overlay) closeModal();
    });
    modal.addEventListener('keydown', (e)=> {
        if(e.key === 'Escape') closeModal();
        if(e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            modal.querySelector('#saveNote').click();
        }
    });

    modal.querySelector('#saveNote').addEventListener('click', ()=>{
        const title = titleInput.value.trim();
        const content = contentInput.value.trim();
        if(!title && !content){
            alert('Masukkan judul atau isi catatan.');
            return;
        }
        const arr = loadNotes();
        const timestamp = Date.now();
        if(typeof idx === 'number'){
            arr[idx] = { ...arr[idx], title, content, updated: timestamp };
        } else {
            arr.unshift({ title, content, created: timestamp, updated: timestamp });
        }
        saveNotes(arr);
        renderNotes();
        closeModal();
    });
}

// initial render
renderNotes();

// ensure current tab shown (default first)
switchTab('pomodoro');
