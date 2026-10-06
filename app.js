let savedReflections = [];
try { savedReflections = JSON.parse(localStorage.getItem('sel-reflections') || '[]'); } catch { savedReflections = []; }
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
  document.querySelectorAll('.mode-button').forEach(item => item.classList.remove('active'));
  button.classList.add('active'); state.mode = button.dataset.mode;
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
  const cards = state.cards.filter(c => c.type === state.activeType); if (!cards.length) return;
  drawCard = cards[Math.floor(Math.random() * cards.length)]; drawFlipped = false; state.focusId = drawCard.id; renderCards(); renderDrawFace();
  drawInstruction.textContent = '先觀察圖案與第一個浮現的感受，準備好後再翻面或開始反思。';
  drawModal.hidden = false; drawModal.setAttribute('aria-hidden','false');
}
function isSmallScreen() { return window.matchMedia('(max-width: 620px)').matches; }
function imgFor(full) { if (!isSmallScreen()) return full; if (full.includes('assets/cards/')) return full.replace('assets/cards/', 'assets/cards-s/'); if (full.includes('assets/backs/')) return full.replace('assets/backs/', 'assets/backs-s/').replace(/\.png$/, '.jpg'); return full; }

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
document.addEventListener('keydown', event => { if (event.key === 'Escape') { if (!modal.hidden) closeZoom(); if (!reflectionModal.hidden) closeReflection(); if (!drawModal.hidden) closeDraw(); } });
