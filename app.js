const state = { cards: window.SEL_CARDS || [], activeType: '', mode: 'explore', focusId: '' };
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

state.activeType = [...new Set(state.cards.map(c => c.type))][0] || '';
renderCategories(); renderCards();

document.querySelectorAll('.mode-button').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.mode-button').forEach(item => item.classList.remove('active'));
  button.classList.add('active'); state.mode = button.dataset.mode;
  const names = { explore:'自由探索：慢慢翻看，依自己的節奏覺察。' };
  roundBanner.textContent = names[state.mode]; roundBanner.hidden = false;
}));

document.querySelector('#drawButton').addEventListener('click', () => drawRandomCard());
document.querySelector('#skipButton').addEventListener('click', () => {
  const cards = state.cards.filter(c => c.type === state.activeType); if (!cards.length) return;
  const current = cards.findIndex(c => c.id === state.focusId); state.focusId = cards[(current + 1) % cards.length].id; renderCards(); scrollToFocus();
});
document.querySelector('#pauseButton').addEventListener('click', () => { pauseToast.hidden = false; setTimeout(() => { pauseToast.hidden = true; }, 2600); });
function scrollToFocus() { setTimeout(() => document.querySelector(`[data-id="${state.focusId}"]`)?.scrollIntoView({ behavior:'smooth', block:'center' }), 40); }
function drawRandomCard() {
  const cards = state.cards.filter(c => c.type === state.activeType); if (!cards.length) return;
  drawCard = cards[Math.floor(Math.random() * cards.length)]; drawFlipped = false; state.focusId = drawCard.id; renderCards(); renderDrawFace();
  drawInstruction.textContent = '先觀察圖案與第一個浮現的感受，準備好後再翻面或開始反思。';
  drawModal.hidden = false; drawModal.setAttribute('aria-hidden','false');
}
function renderDrawFace() { if (!drawCard) return; drawStage.innerHTML = drawFlipped ? `<div class="face back"><img class="back-image" src="${drawCard.backImage}" alt="${drawCard.title}的文字背面"></div>` : `<div class="face front"><img src="${drawCard.image}" alt="${drawCard.title}的放大圖案"></div>`; }
function closeDraw() { drawModal.hidden = true; drawModal.setAttribute('aria-hidden','true'); drawStage.innerHTML = ''; }

function renderCategories() {
  const grouped = new Map(); state.cards.forEach(card => grouped.set(card.type, (grouped.get(card.type) || 0) + 1));
  categoryBar.innerHTML = [...grouped.entries()].map(([type, count]) => { const card = state.cards.find(c => c.type === type); return `<button class="category-button ${type === state.activeType ? 'active' : ''}" style="--accent:${card.accent}" data-type="${type}">${type}<span class="count">${count}</span></button>`; }).join('');
  categoryBar.querySelectorAll('button').forEach(button => button.addEventListener('click', () => { state.activeType = button.dataset.type; state.focusId = ''; renderCategories(); renderCards(); }));
}

function renderCards() {
  const cards = state.cards.filter(c => c.type === state.activeType); activeTitle.textContent = state.activeType; activeEyebrow.textContent = `${cards.length} 張卡片 · 目前牌組`; empty.hidden = cards.length > 0;
  grid.innerHTML = cards.map(card => `<article class="card ${card.id === state.focusId ? 'is-selected' : ''}" tabindex="0" role="button" aria-label="${card.title}，點擊翻面" data-id="${card.id}" style="--accent:${card.accent};--soft:${card.soft}"><div class="card-inner"><div class="face front"><img src="${card.image}" alt="${card.title}的情境圖案" loading="lazy"><button class="zoom-button" type="button" aria-label="放大查看${card.title}">放大</button></div><div class="face back"><img class="back-image" src="${card.backImage}" alt="${card.title}的文字背面"><button class="zoom-button" type="button" aria-label="放大查看${card.title}文字">放大</button></div></div></article>`).join('');
  grid.querySelectorAll('.card').forEach(card => {
    const flip = () => { card.classList.toggle('is-flipped'); if (state.mode === 'reflect' && card.classList.contains('is-flipped')) setTimeout(() => openReflection(state.cards.find(item => item.id === card.dataset.id)), 420); };
    card.addEventListener('click', flip);
    card.querySelectorAll('.zoom-button').forEach(button => button.addEventListener('click', event => { event.stopPropagation(); openZoom(state.cards.find(item => item.id === card.dataset.id), card.classList.contains('is-flipped')); }));
    card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); flip(); } });
  });
}

function openZoom(card, flipped) { if (!card) return; zoomCard = card; zoomFlipped = flipped; renderZoomFace(); modal.hidden = false; modal.setAttribute('aria-hidden', 'false'); modalClose.focus(); }
function renderZoomFace() { if (!zoomCard) return; zoomStage.innerHTML = zoomFlipped ? `<div class="face back"><img class="back-image" src="${zoomCard.backImage}" alt="${zoomCard.title}的文字背面"></div>` : `<div class="face front"><img src="${zoomCard.image}" alt="${zoomCard.title}的放大圖案"></div>`; }
function closeZoom() { modal.hidden = true; modal.setAttribute('aria-hidden', 'true'); zoomStage.innerHTML = ''; }
function openReflection(card) { if (!card) return; reflectionTitle.textContent = `${card.type} · ${card.title}`; reflectionModal.hidden = false; reflectionModal.setAttribute('aria-hidden','false'); reflectionModal.querySelector('textarea')?.focus(); }
function closeReflection() { reflectionModal.hidden = true; reflectionModal.setAttribute('aria-hidden','true'); reflectionModal.querySelectorAll('textarea').forEach(t => t.value = ''); }

modalClose.addEventListener('click', closeZoom); modalFlip.addEventListener('click', () => { if (zoomCard) { zoomFlipped = !zoomFlipped; renderZoomFace(); } }); zoomStage.addEventListener('click', () => { if (zoomCard) { zoomFlipped = !zoomFlipped; renderZoomFace(); } }); modal.addEventListener('click', event => { if (event.target === modal) closeZoom(); });
drawClose.addEventListener('click', closeDraw);
drawModal.addEventListener('click', event => { if (event.target === drawModal) closeDraw(); });
drawStage.addEventListener('click', () => { if (drawCard) { drawFlipped = !drawFlipped; renderDrawFace(); } });
document.querySelector('#drawFlipButton').addEventListener('click', () => { if (drawCard) { drawFlipped = !drawFlipped; renderDrawFace(); } });
document.querySelector('#drawZoomButton').addEventListener('click', () => { if (drawCard) openZoom(drawCard, drawFlipped); });
document.querySelector('#drawAgainButton').addEventListener('click', drawRandomCard);
document.querySelector('#drawReflectButton').addEventListener('click', () => { if (drawCard) { closeDraw(); openReflection(drawCard); } });
reflectionClose.addEventListener('click', closeReflection); reflectionModal.addEventListener('click', event => { if (event.target === reflectionModal) closeReflection(); }); reflectionModal.querySelector('.reflection-done').addEventListener('click', closeReflection);
document.addEventListener('keydown', event => { if (event.key === 'Escape') { if (!modal.hidden) closeZoom(); if (!reflectionModal.hidden) closeReflection(); if (!drawModal.hidden) closeDraw(); } });
