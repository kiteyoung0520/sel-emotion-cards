let savedReflections = [];
try { savedReflections = JSON.parse(localStorage.getItem('sel-reflections') || '[]'); } catch { savedReflections = []; }
function loadLS(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}
let gameRecords = {
  checkin: loadLS('sel-checkin'),
  pairing: loadLS('sel-pairing'),
  perspective: loadLS('sel-perspective'),
};
const GAME_DEFS = {
  checkin: {
    title: '心情簽到',
    eyebrow: 'DAILY CHECK-IN',
    instruction: '抽一張情緒卡，看看今天的自己。寫下一句話就好，不用完美。',
    label: '情緒卡',
    type: '情緒卡',
    saveKey: 'sel-checkin',
    drawExtras: () => [],
    fields: [
      { span: '01 · 今日', b: '今天的我，用一句話形容', placeholder: '例如：有一點累，但還好' },
      { span: '02 · 身體', b: '我的身體現在的感覺', placeholder: '例如：肩膀緊緊的、呼吸有點淺' },
      { span: '03 · 給自己', b: '我想對自己說的一句話', placeholder: '例如：你已經做得很好了' },
    ],
    saveLabel: '保存今日簽到',
  },
  pairing: {
    title: '情境 × 回應配對',
    eyebrow: 'SCENARIO × RESPONSE',
    instruction: '先抽情境卡，再抽出需要、回應與對話卡。想想：我會怎麼做？',
    label: '情境卡',
    type: '情境卡',
    saveKey: 'sel-pairing',
    drawExtras: () => [
      pickRandomByType('需要卡'),
      pickRandomByType('回應卡'),
      pickRandomByType('對話與請求卡'),
    ].filter(Boolean),
    slotLabels: (extras) => ['情境卡', '需要卡', '回應卡', '對話與請求卡'].slice(0, extras.length + 1),
    fields: [
      { span: '01 · 行動', b: '這組配對，我會怎麼做？', placeholder: '寫下一個我做得到的小行動' },
      { span: '02 · 共鳴', b: '哪一張卡最打動我？為什麼？', placeholder: '標題或小語都可以' },
    ],
    saveLabel: '保存這次配對',
  },
  perspective: {
    title: '視角切換',
    eyebrow: 'PERSPECTIVE SWITCH',
    instruction: '抽一張情境卡和一張視角卡。換個位置，再看一次同一個情境。',
    label: '情境卡',
    type: '情境卡',
    saveKey: 'sel-perspective',
    drawExtras: () => [pickRandomByType('視角卡')].filter(Boolean),
    slotLabels: (extras) => ['情境卡', '視角卡'].slice(0, extras.length + 1),
    fields: [
      { span: '01 · 原本', b: '換視角之前，我怎麼看這件事？', placeholder: '寫下第一個浮現的念頭' },
      { span: '02 · 新視角', b: '用了視角卡之後，我看到什麼不同？', placeholder: '視角卡提醒了我什麼？' },
      { span: '03 · 差異', b: '我發現的差異', placeholder: '兩個視角之間，最明顯的不一樣是…' },
    ],
    saveLabel: '保存這次視角',
  },
};
function pickRandomByType(type, avoid) {
  const pool = state.cards.filter(c => c.type === type && (!avoid || c.id !== avoid.id));
  const cards = pool.length ? pool : state.cards.filter(c => c.type === type);
  if (!cards.length) return null;
  return cards[Math.floor(Math.random() * cards.length)];
}
let gameMode = '';
let gameMain = null;
let gameExtras = [];
const gameModal = document.querySelector('.game-modal');
const gameStage = document.querySelector('.game-stage');
const gameFields = document.querySelector('.game-fields');
const gameTitle = document.querySelector('#gameTitle');
const gameEyebrow = document.querySelector('#gameEyebrow');
const gameInstruction = document.querySelector('#gameInstruction');
const gameAgainButton = document.querySelector('#gameAgainButton');
const historyModal = document.querySelector('.history-modal');
const historyList = document.querySelector('#historyList');
const state = { cards: window.SEL_CARDS || [], activeType: '', mode: 'explore', focusId: '', reflections: Array.isArray(savedReflections) ? savedReflections : [] };
const categoryBar = document.querySelector('.category-bar');
const grid = document.querySelector('.card-grid');
const empty = document.querySelector('.empty-state');
const activeTitle = document.querySelector('#activeTitle');
const activeEyebrow = document.querySelector('#activeEyebrow');
const roundBanner = document.querySelector('.round-banner');
const modal = document.querySelector('.zoom-modal');
const zoomStage = document.querySelector('.zoom-stage');
const modalClose = document.querySelector('.modal-close');
const modalFlip = document.querySelector('.modal-flip');
const reflectionModal = document.querySelector('.reflection-modal');
const reflectionTitle = document.querySelector('.reflection-card-title');
const reflectionClose = document.querySelector('.reflection-close');
const pauseToast = document.querySelector('.pause-toast');
const drawModal = document.querySelector('.draw-modal');
const drawStage = document.querySelector('.draw-stage');
const drawClose = document.querySelector('.draw-close');
const drawInstruction = document.querySelector('.draw-instruction');
let drawCard = null;
let drawFlipped = false;
let zoomCard = null;
let zoomFlipped = false;
let reflectionCard = null;

state.activeType = [...new Set(state.cards.map(c => c.type))][0] || '';
document.querySelector('#downloadButton').disabled = state.reflections.length === 0;
renderCategories(); renderCards();

document.querySelectorAll('.mode-button').forEach(button => button.addEventListener('click', () => {
  const mode = button.dataset.mode;
  if (GAME_DEFS[mode]) { openGame(mode); return; }
  document.querySelectorAll('.mode-button').forEach(item => item.classList.remove('active'));
  button.classList.add('active'); state.mode = mode;
  const names = { explore:'自由探索：慢慢翻看，依自己的節奏覺察。', reflect:'開始反思：選一張卡，寫下此刻的看見、感受與下一步。' };
  roundBanner.textContent = names[state.mode]; roundBanner.hidden = false;
  if (state.mode === 'reflect') openReflection(getFocusedCard());
}));

function getFocusedCard() {
  const cards = state.cards.filter(c => c.type === state.activeType);
  return cards.find(c => c.id === state.focusId) || cards[0] || null;
}

document.querySelector('#drawButton').addEventListener('click', () => drawRandomCard());
document.querySelector('#skipButton').addEventListener('click', () => {
  const cards = state.cards.filter(c => c.type === state.activeType); if (!cards.length) return;
  const current = cards.findIndex(c => c.id === state.focusId); state.focusId = cards[(current + 1) % cards.length].id; renderCards(); scrollToFocus();
});
const pauseToastDefault = pauseToast.textContent;
document.querySelector('#pauseButton').addEventListener('click', () => { pauseToast.textContent = pauseToastDefault; pauseToast.hidden = false; setTimeout(() => { pauseToast.hidden = true; }, 2600); });
function scrollToFocus() { setTimeout(() => document.querySelector(`[data-id="${state.focusId}"]`)?.scrollIntoView({ behavior:'smooth', block:'center' }), 40); }
function drawRandomCard() {
  closeGame();
  const cards = state.cards.filter(c => c.type === state.activeType); if (!cards.length) return;
  drawCard = cards[Math.floor(Math.random() * cards.length)]; drawFlipped = false; state.focusId = drawCard.id; renderCards(); renderDrawFace();
  drawInstruction.textContent = '先觀察圖案與第一個浮現的感受，準備好後再翻面或開始反思。';
  drawModal.hidden = false; drawModal.setAttribute('aria-hidden','false');
}
function isSmallScreen() { return window.matchMedia('(max-width: 620px)').matches; }
function imgFor(full) { if (!isSmallScreen()) return full; if (full.includes('assets/cards/')) return full.replace('assets/cards/', 'assets/cards-s/'); if (full.includes('assets/backs/')) return full.replace('assets/backs/', 'assets/backs-s/').replace(/\.png(?=\?|$)/, '.jpg'); return full; }

function preloadAllImages() {
  const queue = [];
  const seen = new Set();
  state.cards.forEach((card) => {
    [card.image, card.backImage].forEach((path) => {
      if (!path) return;
      const url = imgFor(path);
      if (seen.has(url)) return;
      seen.add(url);
      queue.push(url);
    });
  });
  const concurrency = 6;
  let active = 0;
  function next() {
    while (active < concurrency && queue.length) {
      const url = queue.shift();
      active += 1;
      const img = new Image();
      img.onload = img.onerror = () => { active -= 1; next(); };
      img.src = url;
    }
  }
  next();
}

const startPreload = () => {
  if (document.readyState === 'complete') preloadAllImages();
  else window.addEventListener('load', preloadAllImages, { once: true });
};
startPreload();

function renderDrawFace() { if (!drawCard) return; drawStage.innerHTML = drawFlipped ? `<div class="face back"><img class="back-image" src="${imgFor(drawCard.backImage)}" alt="${drawCard.title}的文字背面"></div>` : `<div class="face front"><img src="${imgFor(drawCard.image)}" alt="${drawCard.title}的放大圖案"></div>`; }
function closeDraw() { drawModal.hidden = true; drawModal.setAttribute('aria-hidden','true'); drawStage.innerHTML = ''; }

function renderCategories() {
  const grouped = new Map(); state.cards.forEach(card => grouped.set(card.type, (grouped.get(card.type) || 0) + 1));
  categoryBar.innerHTML = [...grouped.entries()].map(([type, count]) => { const card = state.cards.find(c => c.type === type); return `<button class="category-button ${type === state.activeType ? 'active' : ''}" style="--accent:${card.accent}" data-type="${type}">${type}<span class="count">${count}</span></button>`; }).join('');
  categoryBar.querySelectorAll('button').forEach(button => button.addEventListener('click', () => { state.activeType = button.dataset.type; state.focusId = ''; renderCategories(); renderCards(); }));
}

function renderCards() {
  const cards = state.cards.filter(c => c.type === state.activeType); activeTitle.textContent = state.activeType; activeEyebrow.textContent = `${cards.length} 張卡片 · 目前牌組`; empty.hidden = cards.length > 0;
  grid.innerHTML = cards.map(card => `<article class="card ${card.id === state.focusId ? 'is-selected' : ''}" tabindex="0" role="button" aria-label="${card.title}，點擊翻面" data-id="${card.id}" style="--accent:${card.accent};--soft:${card.soft}"><div class="card-inner"><div class="face front"><img src="${imgFor(card.image)}" alt="${card.title}的情境圖案" loading="lazy"><button class="zoom-button" type="button" aria-label="放大查看${card.title}">放大</button></div><div class="face back"><img class="back-image" src="${imgFor(card.backImage)}" alt="${card.title}的文字背面"><button class="zoom-button" type="button" aria-label="放大查看${card.title}文字">放大</button></div></div></article>`).join('');
  grid.querySelectorAll('.card').forEach(card => {
    const flip = () => { card.classList.toggle('is-flipped'); state.focusId = card.dataset.id; };
    card.addEventListener('click', flip);
    card.querySelectorAll('.zoom-button').forEach(button => button.addEventListener('click', event => { event.stopPropagation(); openZoom(state.cards.find(item => item.id === card.dataset.id), card.classList.contains('is-flipped')); }));
    card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); flip(); } });
  });
}

function openZoom(card, flipped) { if (!card) return; zoomCard = card; zoomFlipped = flipped; renderZoomFace(); modal.hidden = false; modal.setAttribute('aria-hidden', 'false'); modalClose.focus(); }
function renderZoomFace() { if (!zoomCard) return; zoomStage.innerHTML = zoomFlipped ? `<div class="face back"><img class="back-image" src="${imgFor(zoomCard.backImage)}" alt="${zoomCard.title}的文字背面"></div>` : `<div class="face front"><img src="${imgFor(zoomCard.image)}" alt="${zoomCard.title}的放大圖案"></div>`; }
function closeZoom() { modal.hidden = true; modal.setAttribute('aria-hidden', 'true'); zoomStage.innerHTML = ''; }
function openReflection(card) {
  if (!card) return;
  closeGame();
  reflectionCard = card;
  reflectionTitle.textContent = `${card.type} · ${card.title}`;
  const previous = state.reflections.find(item => item.cardId === card.id);
  reflectionModal.querySelectorAll('textarea').forEach((textarea, index) => { textarea.value = previous?.answers?.[index] || ''; });
  reflectionModal.hidden = false;
  reflectionModal.setAttribute('aria-hidden','false');
  reflectionModal.querySelector('textarea')?.focus();
}
function closeReflection() { reflectionModal.hidden = true; reflectionModal.setAttribute('aria-hidden','true'); reflectionModal.querySelectorAll('textarea').forEach(t => t.value = ''); reflectionCard = null; }
function saveReflection() {
  if (!reflectionCard) return;
  const answers = [...reflectionModal.querySelectorAll('textarea')].map(textarea => textarea.value.trim());
  const entry = { cardId: reflectionCard.id, type: reflectionCard.type, title: reflectionCard.title, subtitle: reflectionCard.subtitle, prompt: reflectionCard.prompt, quote: reflectionCard.quote, image: reflectionCard.image, answers, savedAt: new Date().toLocaleString('zh-TW', { dateStyle:'medium', timeStyle:'short' }) };
  const existing = state.reflections.findIndex(item => item.cardId === entry.cardId);
  if (existing >= 0) state.reflections[existing] = entry; else state.reflections.push(entry);
  localStorage.setItem('sel-reflections', JSON.stringify(state.reflections));
  document.querySelector('#downloadButton').disabled = false;
  closeReflection();
  pauseToast.textContent = '這次覺察已保存，可以下載覺察 PDF。'; pauseToast.hidden = false; setTimeout(() => { pauseToast.hidden = true; }, 2800);
}

function openGame(mode) {
  const def = GAME_DEFS[mode];
  if (!def) return;
  closeDraw(); closeReflection(); closeZoom();
  gameMode = mode;
  gameTitle.textContent = def.title;
  gameEyebrow.textContent = def.eyebrow;
  gameInstruction.textContent = def.instruction;
  gameMain = pickRandomByType(def.label);
  gameExtras = def.drawExtras();
  renderGameStage();
  renderGameFields();
  gameModal.hidden = false;
  gameModal.setAttribute('aria-hidden', 'false');
}
function closeGame() {
  gameModal.hidden = true;
  gameModal.setAttribute('aria-hidden', 'true');
  gameStage.innerHTML = '';
  gameFields.innerHTML = '';
  gameMode = '';
  gameMain = null;
  gameExtras = [];
}
function renderGameStage() {
  const def = GAME_DEFS[gameMode];
  if (!def || !gameMain) {
    gameStage.innerHTML = '<p class="empty-state">這個類型目前沒有卡片。</p>';
    gameAgainButton.disabled = true;
    return;
  }
  gameAgainButton.disabled = false;
  const labels = def.slotLabels ? def.slotLabels(gameExtras) : [def.label, ...gameExtras.map(c => c.type)];
  const slots = [{ card: gameMain, label: labels[0] || def.label }].concat(
    gameExtras.map((card, i) => ({ card, label: labels[i + 1] || card.type }))
  );
  gameStage.innerHTML = slots.map((slot, idx) => `
    <div class="game-slot" data-idx="${idx}">
      <p class="game-slot-label">${escapeHtml(slot.label)}</p>
      <div class="game-slot-card card" tabindex="0" role="button" aria-label="${escapeHtml(slot.card.title)}，點擊翻面" data-id="${slot.card.id}" style="--accent:${slot.card.accent};--soft:${slot.card.soft}">
        <div class="card-inner">
          <div class="face front"><img src="${imgFor(slot.card.image)}" alt="${escapeHtml(slot.card.title)}的圖案"><button class="zoom-button" type="button" aria-label="放大查看${escapeHtml(slot.card.title)}">放大</button></div>
          <div class="face back"><img class="back-image" src="${imgFor(slot.card.backImage)}" alt="${escapeHtml(slot.card.title)}的文字背面"><button class="zoom-button" type="button" aria-label="放大查看${escapeHtml(slot.card.title)}文字">放大</button></div>
        </div>
      </div>
    </div>
  `).join('');
  gameStage.querySelectorAll('.game-slot-card').forEach(card => {
    const flip = () => card.classList.toggle('is-flipped');
    card.addEventListener('click', flip);
    card.querySelectorAll('.zoom-button').forEach(button => button.addEventListener('click', event => {
      event.stopPropagation();
      openZoom(state.cards.find(item => item.id === card.dataset.id), card.classList.contains('is-flipped'));
    }));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
  });
}
function redrawGame() {
  const def = GAME_DEFS[gameMode];
  if (!def) return;
  gameMain = pickRandomByType(def.label, gameMain);
  gameExtras = def.drawExtras();
  renderGameStage();
}
function renderGameFields() {
  const def = GAME_DEFS[gameMode];
  if (!def) return;
  gameFields.innerHTML = def.fields.map((f, i) => `
    <label class="game-field">
      <span>${escapeHtml(f.span)}</span>
      <b>${escapeHtml(f.b)}</b>
      <textarea data-idx="${i}" placeholder="${escapeHtml(f.placeholder)}"></textarea>
    </label>
  `).join('') + `<button class="primary-button game-save" type="button">${escapeHtml(def.saveLabel)}</button>`;
  gameFields.querySelector('.game-save').addEventListener('click', saveGameRecord);
}
function saveGameRecord() {
  const def = GAME_DEFS[gameMode];
  if (!def || !gameMain) return;
  const answers = [...gameFields.querySelectorAll('textarea')].map(t => t.value.trim());
  const now = new Date();
  const snapshot = card => ({
    id: card.id, type: card.type, title: card.title,
    subtitle: card.subtitle, prompt: card.prompt, quote: card.quote,
    image: card.image, accent: card.accent,
  });
  const entry = {
    id: now.getTime().toString(36) + Math.random().toString(36).slice(2, 7),
    kind: gameMode,
    main: snapshot(gameMain),
    extras: gameExtras.map(snapshot),
    answers,
    date: now.toISOString().slice(0, 10),
    savedAt: now.toLocaleString('zh-TW', { dateStyle: 'medium', timeStyle: 'short' }),
  };
  gameRecords[gameMode].push(entry);
  localStorage.setItem(def.saveKey, JSON.stringify(gameRecords[gameMode]));
  closeGame();
  pauseToast.textContent = `已保存${def.title}紀錄，可在「遊戲紀錄」查看或下載 PDF。`;
  pauseToast.hidden = false;
  setTimeout(() => { pauseToast.hidden = true; }, 2800);
}
let historyTab = 'all';
function openHistory() {
  closeGame(); closeDraw(); closeReflection(); closeZoom();
  historyTab = 'all';
  renderHistory();
  historyModal.hidden = false;
  historyModal.setAttribute('aria-hidden', 'false');
}
function closeHistory() {
  historyModal.hidden = true;
  historyModal.setAttribute('aria-hidden', 'true');
}
function renderHistory() {
  const labels = { all: '全部', checkin: '心情簽到', pairing: '情境配對', perspective: '視角切換' };
  const tabsHtml = Object.keys(labels).map(key => {
    const count = key === 'all'
      ? Object.values(gameRecords).reduce((n, arr) => n + arr.length, 0)
      : gameRecords[key].length;
    return `<button class="history-tab ${key === historyTab ? 'active' : ''}" data-tab="${key}">${labels[key]}<span class="count">${count}</span></button>`;
  }).join('');
  const records = historyTab === 'all'
    ? [...gameRecords.checkin, ...gameRecords.pairing, ...gameRecords.perspective].sort((a, b) => (b.id > a.id ? 1 : -1))
    : [...gameRecords[historyTab]].reverse();
  const listHtml = records.length
    ? records.map(r => {
        const main = r.main;
        const extras = (r.extras || []).map(e => `${e.type}·${e.title}`).join(' + ');
        const fields = GAME_DEFS[r.kind]?.fields || [];
        const answersHtml = fields.map((f, i) =>
          r.answers[i] ? `<div class="history-answer"><b>${escapeHtml(f.b)}</b><p>${escapeHtml(r.answers[i])}</p></div>` : ''
        ).join('');
        return `
          <article class="history-item" style="--accent:${main.accent}">
            <div class="history-item-head">
              <span class="history-badge">${escapeHtml(labels[r.kind] || r.kind)}</span>
              <time>${escapeHtml(r.savedAt)}</time>
            </div>
            <h3>${escapeHtml(main.title)}</h3>
            ${extras ? `<p class="history-extras">${escapeHtml(extras)}</p>` : ''}
            <div class="history-answers">${answersHtml}</div>
          </article>
        `;
      }).join('')
    : '<p class="empty-state">還沒有紀錄。先試試一個遊戲模式吧。</p>';
  historyList.innerHTML = `<div class="history-tabs">${tabsHtml}</div><div class="history-records">${listHtml}</div>`;
  historyList.querySelectorAll('.history-tab').forEach(tab => {
    tab.addEventListener('click', () => { historyTab = tab.dataset.tab; renderHistory(); });
  });
}
function buildGamePage(entry, index) {
  const def = GAME_DEFS[entry.kind];
  if (!def) return '';
  const main = entry.main;
  const extras = entry.extras || [];
  const extrasHtml = extras.length ? `
    <div class="pdf-pair">
      ${extras.map(e => `
        <div class="pdf-pair-card">
          <img src="${escapeHtml(e.image)}" alt="">
          <p class="pdf-label">${escapeHtml(e.type)}</p>
          <h3>${escapeHtml(e.title)}</h3>
          <p class="pdf-subtitle">${escapeHtml(e.subtitle)}</p>
        </div>
      `).join('')}
    </div>
  ` : '';
  const answersHtml = def.fields.map((f, i) => `
    <div class="pdf-answer"><b>${escapeHtml(f.b)}</b><p>${escapeHtml(entry.answers[i] || '（尚未填寫）')}</p></div>
  `).join('');
  return `
    <section class="pdf-page" style="--accent:${escapeHtml(main.accent)}">
      <div class="pdf-kicker">SEL · ${escapeHtml(def.title)} ${String(index + 1).padStart(2, '0')}</div>
      <div class="pdf-heading">
        <div><h1>${escapeHtml(def.title)}</h1><p>${escapeHtml(entry.savedAt)}</p></div>
        <span class="pdf-type">${escapeHtml(main.type)}</span>
      </div>
      <div class="pdf-card">
        <img src="${escapeHtml(main.image)}" alt="">
        <div>
          <p class="pdf-label">這一次，我抽到了</p>
          <h2>${escapeHtml(main.title)}</h2>
          <p class="pdf-subtitle">${escapeHtml(main.subtitle)}</p>
          <div class="pdf-quote"><b>心靈小語</b><p>${escapeHtml(main.quote)}</p></div>
        </div>
      </div>
      ${extrasHtml}
      <div class="pdf-reflection">
        <p class="pdf-label">我的書寫</p>
        ${answersHtml}
      </div>
      <footer>每一次抽卡，都是更靠近自己的一步。</footer>
    </section>
  `;
}
async function downloadGamePdf() {
  const all = [...gameRecords.checkin, ...gameRecords.pairing, ...gameRecords.perspective].sort((a, b) => (a.date < b.date ? 1 : -1));
  if (!all.length) {
    pauseToast.textContent = '還沒有遊戲紀錄可以下載。';
    pauseToast.hidden = false;
    setTimeout(() => { pauseToast.hidden = true; }, 2400);
    return;
  }
  const report = document.createElement('div');
  report.className = 'pdf-render-root';
  report.innerHTML = `<div class="pdf-report">${all.map(buildGamePage).join('')}</div>`;
  document.body.appendChild(report);
  try {
    if (!window.html2canvas || !window.jspdf?.jsPDF) throw new Error('PDF library unavailable');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pages = [...report.querySelectorAll('.pdf-page')];
    let firstPage = true;
    for (const page of pages) {
      const canvas = await window.html2canvas(page, { scale: 2, backgroundColor: '#fbf8f1', useCORS: true, logging: false });
      const pxPerMm = canvas.width / 210;
      const sliceH = Math.floor(pxPerMm * 297);
      for (let y = 0; y < canvas.height; y += sliceH) {
        const h = Math.min(sliceH, canvas.height - y);
        const slice = document.createElement('canvas');
        slice.width = canvas.width; slice.height = h;
        slice.getContext('2d').drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
        if (!firstPage) pdf.addPage(); firstPage = false;
        pdf.addImage(slice.toDataURL('image/jpeg', .94), 'JPEG', 0, 0, 210, h / pxPerMm);
      }
    }
    pdf.save(`SEL遊戲紀錄_${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (error) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) { pauseToast.textContent = '瀏覽器封鎖了新視窗，請允許彈出視窗後再下載。'; pauseToast.hidden = false; return; }
    printWindow.document.write(`<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>SEL 遊戲紀錄</title><link rel="stylesheet" href="${new URL('styles.css', location.href).href}"><style>body{background:#fff}.pdf-render-root{display:block!important;position:static!important}.pdf-page{break-after:page;page-break-after:always}</style></head><body>${report.innerHTML}</body></html>`);
    printWindow.document.close(); printWindow.focus(); printWindow.print();
  } finally { report.remove(); }
}

function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[char])); }
function buildReportPage(entry, index) {
  const questions = ['我看見了什麼？','我的身體哪裡有反應？','我現在有什麼感覺？','造成這個感覺的原因？','我想嘗試哪一個小行動？'];
  return `<section class="pdf-page" style="--accent:${escapeHtml(state.cards.find(c => c.id === entry.cardId)?.accent || '#628a91')}">
    <div class="pdf-kicker">SEL · 覺察紀錄 ${String(index + 1).padStart(2,'0')}</div>
    <div class="pdf-heading"><div><h1>我的覺察旅程</h1><p>${escapeHtml(entry.savedAt)}</p></div><span class="pdf-type">${escapeHtml(entry.type)}</span></div>
    <div class="pdf-card"><img src="${escapeHtml(entry.image)}" alt=""><div><p class="pdf-label">這一次，我選擇了</p><h2>${escapeHtml(entry.title)}</h2><p class="pdf-subtitle">${escapeHtml(entry.subtitle)}</p><div class="pdf-quote"><b>心靈小語</b><p>${escapeHtml(entry.quote)}</p></div></div></div>
    <div class="pdf-reflection"><p class="pdf-label">五步反思</p>${questions.map((question, i) => `<div class="pdf-answer"><b>${escapeHtml(question)}</b><p>${escapeHtml(entry.answers[i] || '（尚未填寫）')}</p></div>`).join('')}</div>
    <footer>給自己一點時間，讓感受被看見，也讓下一步慢慢長出來。</footer>
  </section>`;
}
function buildReportDocument() { return `<div class="pdf-report">${state.reflections.map(buildReportPage).join('')}</div>`; }
async function downloadReflectionPdf() {
  if (!state.reflections.length) return;
  const report = document.createElement('div'); report.innerHTML = buildReportDocument(); report.className = 'pdf-render-root'; document.body.appendChild(report);
  try {
    if (!window.html2canvas || !window.jspdf?.jsPDF) throw new Error('PDF library unavailable');
    const { jsPDF } = window.jspdf; const pdf = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
    const pages = [...report.querySelectorAll('.pdf-page')];
    let firstPage = true;
    for (const page of pages) {
      const canvas = await window.html2canvas(page, { scale:2, backgroundColor:'#fbf8f1', useCORS:true, logging:false });
      const pxPerMm = canvas.width / 210;
      const sliceH = Math.floor(pxPerMm * 297);
      for (let y = 0; y < canvas.height; y += sliceH) {
        const h = Math.min(sliceH, canvas.height - y);
        const slice = document.createElement('canvas'); slice.width = canvas.width; slice.height = h;
        slice.getContext('2d').drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
        if (!firstPage) pdf.addPage(); firstPage = false;
        pdf.addImage(slice.toDataURL('image/jpeg', .94), 'JPEG', 0, 0, 210, h / pxPerMm);
      }
    }
    pdf.save(`SEL覺察紀錄_${new Date().toISOString().slice(0,10)}.pdf`);
  } catch (error) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) { pauseToast.textContent = '瀏覽器封鎖了新視窗，請允許彈出視窗後再下載。'; pauseToast.hidden = false; return; }
    printWindow.document.write(`<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>SEL 覺察紀錄</title><link rel="stylesheet" href="${new URL('styles.css', location.href).href}"><style>body{background:#fff}.pdf-render-root{display:block!important;position:static!important}.pdf-page{break-after:page;page-break-after:always}</style></head><body>${buildReportDocument()}</body></html>`); printWindow.document.close(); printWindow.focus(); printWindow.print();
  } finally { report.remove(); }
}

modalClose.addEventListener('click', closeZoom); modalFlip.addEventListener('click', () => { if (zoomCard) { zoomFlipped = !zoomFlipped; renderZoomFace(); } }); zoomStage.addEventListener('click', () => { if (zoomCard) { zoomFlipped = !zoomFlipped; renderZoomFace(); } }); modal.addEventListener('click', event => { if (event.target === modal) closeZoom(); });
drawClose.addEventListener('click', closeDraw);
drawModal.addEventListener('click', event => { if (event.target === drawModal) closeDraw(); });
drawStage.addEventListener('click', () => { if (drawCard) { drawFlipped = !drawFlipped; renderDrawFace(); } });
document.querySelector('#drawFlipButton').addEventListener('click', () => { if (drawCard) { drawFlipped = !drawFlipped; renderDrawFace(); } });
document.querySelector('#drawZoomButton').addEventListener('click', () => { if (drawCard) openZoom(drawCard, drawFlipped); });
document.querySelector('#drawAgainButton').addEventListener('click', drawRandomCard);
document.querySelector('#drawReflectButton').addEventListener('click', () => { if (drawCard) { closeDraw(); openReflection(drawCard); } });
reflectionClose.addEventListener('click', closeReflection); reflectionModal.addEventListener('click', event => { if (event.target === reflectionModal) closeReflection(); }); reflectionModal.querySelector('.reflection-done').addEventListener('click', saveReflection);
document.querySelector('#downloadButton').addEventListener('click', downloadReflectionPdf);
document.querySelector('.game-close').addEventListener('click', closeGame);
gameModal.addEventListener('click', event => { if (event.target === gameModal) closeGame(); });
document.querySelector('#historyButton').addEventListener('click', openHistory);
document.querySelector('.history-close').addEventListener('click', closeHistory);
historyModal.addEventListener('click', event => { if (event.target === historyModal) closeHistory(); });
document.querySelector('#historyDownloadButton').addEventListener('click', downloadGamePdf);
document.querySelector('#gameAgainButton').addEventListener('click', redrawGame);
document.addEventListener('keydown', event => { if (event.key === 'Escape') { if (!modal.hidden) closeZoom(); else if (!historyModal.hidden) closeHistory(); else if (!gameModal.hidden) closeGame(); else if (!reflectionModal.hidden) closeReflection(); else if (!drawModal.hidden) closeDraw(); } });
