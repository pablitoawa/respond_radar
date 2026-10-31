

let watchedLeads = {};
let currentTabChat = null;
let isSoundEnabled = true;
let isWidgetHidden = false;
let searchQuery = '';
let currentFilter = 'mine';
let currentPeriod = 'all';
let currentSubFilter = 'all';

let selectedSalesMonth = 'current';
let commissionConfig = {
  starter: 10,
  pro: 20,
  black: 50,
  currency: 'EUR'
};
let planPricesConfig = {
  starter: 29,
  pro: 59,
  black: 130,
  currency: 'EUR'
};
let isKeyboardNavEnabled = true;

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function getLeadMonthKey(lead) {
  const dateStr = lead?.sale?.soldAt || lead?.addedAt || lead?.lastMessageTime;
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getCurrentMonthKey() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function formatMonthLabel(monthKey) {
  if (!monthKey || monthKey === 'all') return 'Histórico Completo';
  const parts = monthKey.split('-');
  if (parts.length !== 2) return monthKey;
  const year = parts[0];
  const mIndex = parseInt(parts[1], 10) - 1;
  const name = MONTH_NAMES_ES[mIndex] || monthKey;
  return `${name} ${year}`;
}

let activeModalLeadId = null;
let selectedPlan = 'Pro';
let selectedPaymentMode = 'abono';
let isBannerPopoverOpen = false;

document.addEventListener('DOMContentLoaded', async () => {
  await initData();
  await detectActiveTab();
  setupViewNavigation();
  await setupSettingsTab();
  setupSalesPeriodFilter();
  setupEventListeners();
  setupModalEventListeners();
  render();
});

async function initData() {
  const data = await chrome.storage.local.get([
    'watchedLeads',
    'soundEnabled',
    'widgetHidden',
    'commissionConfig',
    'planPricesConfig',
    'keyboardNavigationEnabled'
  ]);
  watchedLeads = data.watchedLeads || {};
  if (data.soundEnabled !== undefined) {
    isSoundEnabled = data.soundEnabled;
  }
  if (data.widgetHidden !== undefined) {
    isWidgetHidden = data.widgetHidden;
  }
  if (data.keyboardNavigationEnabled !== undefined) {
    isKeyboardNavEnabled = !!data.keyboardNavigationEnabled;
  }
  if (data.commissionConfig) {
    commissionConfig = { ...commissionConfig, ...data.commissionConfig };
  }
  if (data.planPricesConfig) {
    planPricesConfig = { ...planPricesConfig, ...data.planPricesConfig };
  }
}

async function detectActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const bannerName = document.getElementById('current-tab-lead-name');
  const btnAdd = document.getElementById('btn-add-current');
  const bannerPopover = document.getElementById('banner-follow-popover');

  if (!tab || !tab.url || !tab.url.includes('app.respond.io')) {
    if (bannerName) {
      bannerName.innerText = 'Respond.io no está en esta pestaña';
      bannerName.style.color = '#94a3b8';
    }
    if (btnAdd) {
      btnAdd.className = 'btn-strip-add is-disabled';
      btnAdd.disabled = true;
      btnAdd.innerText = 'Abrir Respond.io';
      btnAdd.onclick = () => {
        chrome.tabs.create({ url: 'https://app.respond.io' });
      };
    }
    if (bannerPopover) bannerPopover.classList.add('hidden');
    return;
  }

  const match = tab.url.match(/\/space\/([^/]+)\/inbox\/([^/?]+)/);
  if (!match) {
    if (bannerName) bannerName.innerText = 'Abre un chat para añadirlo';
    if (btnAdd) {
      btnAdd.className = 'btn-strip-add is-disabled';
      btnAdd.disabled = true;
      btnAdd.innerText = 'Sin chat';
    }
    if (bannerPopover) bannerPopover.classList.add('hidden');
    return;
  }

  const spaceId = match[1];
  const conversationId = match[2];

  let contactName = 'Chat #' + conversationId.slice(-4);
  if (tab.title && tab.title.includes(' - ')) {
    const rawName = tab.title.split(' - ')[0].trim();
    if (rawName && !rawName.toLowerCase().includes('inbox')) {
      contactName = rawName;
    }
  }

  currentTabChat = {
    spaceId,
    conversationId,
    name: contactName,
    url: tab.url
  };

  const isAlreadyWatched = !!watchedLeads[conversationId];

  if (isAlreadyWatched) {
    const lead = watchedLeads[conversationId];
    if (lead.sale && lead.sale.isSold) {
      bannerName.innerText = `👑 ${lead.name} (${lead.sale.plan})`;
    } else {
      bannerName.innerText = `★ ${lead.name}`;
    }
    btnAdd.className = 'btn-strip-add is-watched';
    btnAdd.innerText = '✓ En Radar';
    btnAdd.disabled = true;
    if (bannerPopover) bannerPopover.classList.add('hidden');
  } else {
    bannerName.innerText = `💬 ${contactName}`;
    btnAdd.className = 'btn-strip-add';
    btnAdd.innerText = '⭐ Seguir';
    btnAdd.disabled = false;
    btnAdd.onclick = (e) => {
      e.stopPropagation();
      isBannerPopoverOpen = !isBannerPopoverOpen;
      if (bannerPopover) {
        bannerPopover.classList.toggle('hidden', !isBannerPopoverOpen);
      }
    };
  }
}

async function addLead({ spaceId, conversationId, name, url }, { targetPlan = 'Pro' } = {}) {
  const dData = await chrome.storage.local.get(['dismissedLeads']);
  const dismissedLeads = dData.dismissedLeads || {};
  if (dismissedLeads[conversationId]) {
    delete dismissedLeads[conversationId];
    await chrome.storage.local.set({ dismissedLeads });
  }

  const existing = watchedLeads[conversationId] || {};
  watchedLeads[conversationId] = {
    ...existing,
    spaceId,
    conversationId,
    name: name || existing.name,
    owner: 'mine',
    targetPlan,
    manuallyWatched: true,
    addedAt: existing.addedAt || new Date().toISOString(),
    lastMessage: existing.lastMessage || 'Sin mensajes nuevos aún',
    lastMessageTime: existing.lastMessageTime || new Date().toISOString(),
    unreadCount: existing.unreadCount || 0,
    url: url || existing.url
  };

  await chrome.storage.local.set({ watchedLeads });
  chrome.runtime.sendMessage({ type: 'UPDATE_BADGE' });
  isBannerPopoverOpen = false;
  const popover = document.getElementById('banner-follow-popover');
  if (popover) popover.classList.add('hidden');
  await detectActiveTab();
  render();
}

async function removeLead(conversationId) {
  delete watchedLeads[conversationId];
  const dData = await chrome.storage.local.get(['dismissedLeads']);
  const dismissedLeads = dData.dismissedLeads || {};
  dismissedLeads[conversationId] = true;
  await chrome.storage.local.set({ watchedLeads, dismissedLeads });
  chrome.runtime.sendMessage({ type: 'UPDATE_BADGE' });
  await detectActiveTab();
  render();
}

function getStageSlug(stage) {
  if (!stage) return '';
  const s = String(stage).toLowerCase();
  if (s.includes('150')) return '150';
  if (s.includes('registro')) return 'registro';
  if (s.includes('fondeo')) return 'fondeo';
  if (s.includes('ingresando')) return 'ingresando';
  if (s.includes('revisi')) return 'revision';
  if (s.includes('final')) return 'final';
  if (s.includes('venta')) return 'sold';
  return 'custom';
}

async function setLeadPlan(conversationId, plan) {
  if (watchedLeads[conversationId]) {
    watchedLeads[conversationId].targetPlan = plan;
    await chrome.storage.local.set({ watchedLeads });
    render();
  }
}

async function setLeadStage(conversationId, stage) {
  if (watchedLeads[conversationId]) {
    if (watchedLeads[conversationId].processStage === stage) {
      delete watchedLeads[conversationId].processStage;
    } else {
      watchedLeads[conversationId].processStage = stage;
    }
    await chrome.storage.local.set({ watchedLeads });
    render();
  }
}

function getQuickFollowUpDate(type) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (type === 'tomorrow') {
    d.setDate(d.getDate() + 1);
    return { date: d.toISOString().slice(0, 10), label: 'Mañana' };
  }
  if (type === 'saturday') {
    const day = d.getDay();
    let diff = (6 - day);
    if (diff <= 0) diff += 7;
    d.setDate(d.getDate() + diff);
    return { date: d.toISOString().slice(0, 10), label: 'Este Sábado' };
  }
  if (type === 'week1') {
    d.setDate(d.getDate() + 7);
    return { date: d.toISOString().slice(0, 10), label: 'En 1 semana' };
  }
  if (type === 'week2') {
    d.setDate(d.getDate() + 14);
    return { date: d.toISOString().slice(0, 10), label: 'En 2 semanas' };
  }
  if (type === 'month_end') {
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { date: end.toISOString().slice(0, 10), label: 'Fin de mes' };
  }
  if (type === 'month1') {
    d.setMonth(d.getMonth() + 1);
    return { date: d.toISOString().slice(0, 10), label: 'En 1 mes' };
  }
  return null;
}

function getFollowUpStatus(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  const todayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0, 10);

  if (dateStr === todayStr) {
    return { status: 'today', text: '¡Hoy tiene el dinero!', badge: '🚨 Hoy cobra' };
  }

  const partsToday = todayStr.split('-').map(Number);
  const partsTarget = String(dateStr).slice(0, 10).split('-').map(Number);
  const dateToday = new Date(partsToday[0], partsToday[1] - 1, partsToday[2]);
  const dateTarget = new Date(partsTarget[0], partsTarget[1] - 1, partsTarget[2]);
  const diffDays = Math.round((dateTarget - dateToday) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return { status: 'overdue', text: `Vencido hace ${overdueDays}d`, badge: `⚠️ -${overdueDays}d`, diffDays };
  }

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const dayName = dayNames[dateTarget.getDay()];
  const monthName = monthNames[dateTarget.getMonth()];
  const dayNum = dateTarget.getDate();

  if (diffDays === 1) {
    return { status: 'tomorrow', text: 'Mañana', badge: 'Mañana', diffDays };
  }
  return {
    status: 'future',
    text: `${dayName} ${dayNum} ${monthName} (en ${diffDays}d)`,
    badge: `📅 ${dayName} ${dayNum}`,
    diffDays
  };
}

async function setLeadFollowUp(conversationId, date, label, note) {
  if (watchedLeads[conversationId]) {
    watchedLeads[conversationId].followUpDate = date;
    if (label) watchedLeads[conversationId].followUpLabel = label;
    if (note !== undefined) watchedLeads[conversationId].followUpNote = note;
    await chrome.storage.local.set({ watchedLeads });
    render();
  }
}

async function clearLeadFollowUp(conversationId) {
  if (watchedLeads[conversationId]) {
    delete watchedLeads[conversationId].followUpDate;
    delete watchedLeads[conversationId].followUpLabel;
    delete watchedLeads[conversationId].followUpNote;
    await chrome.storage.local.set({ watchedLeads });
    render();
  }
}

async function toggleExcludeTouchLead(conversationId) {
  if (!watchedLeads[conversationId]) return;
  const lead = watchedLeads[conversationId];

  if (lead.touchExcludedAt) {
    delete lead.touchExcludedAt;
    delete lead.touchExcludedMsgTime;
    delete lead.touchExcludedSnippet;
  } else {
    lead.touchExcludedAt = Date.now();
    lead.touchExcludedMsgTime = lead.lastMessageTime || null;
    lead.touchExcludedSnippet = lead.lastMessage || '';
  }

  await chrome.storage.local.set({ watchedLeads });
  render();
}

function isOutgoingSnippet(snippet) {
  if (!snippet) return false;
  return snippet.includes('↗') || snippet.startsWith('You:') || snippet.startsWith('Tú:');
}

function isLeadScheduledSilentOver24h(lead) {
  if (!lead) return false;
  const isSold = lead.sale && lead.sale.isSold;
  if (isSold) return false;

  if (lead.followUpDate) return false;

  const isScheduled = !!lead.processStage;
  if (!isScheduled) return false;

  if (lead.unreadCount > 0) return false;

  if (lead.touchExcludedAt) {
    const lastTime = lead.lastMessageTime ? new Date(lead.lastMessageTime).getTime() : 0;
    const isOut = isOutgoingSnippet(lead.lastMessage);

    const customerReplied = (lastTime > lead.touchExcludedAt) ||
      (lead.touchExcludedSnippet && lead.lastMessage && lead.lastMessage !== lead.touchExcludedSnippet && !isOut);

    if (customerReplied) {
      delete lead.touchExcludedAt;
      delete lead.touchExcludedMsgTime;
      delete lead.touchExcludedSnippet;
      chrome.storage.local.set({ watchedLeads });
    } else {
      return false;
    }
  }

  let lastTimeMs = 0;
  if (lead.lastMessageTime) {
    const t = new Date(lead.lastMessageTime).getTime();
    if (!isNaN(t)) lastTimeMs = t;
  }
  if (!lastTimeMs && lead.addedAt) {
    const t = new Date(lead.addedAt).getTime();
    if (!isNaN(t)) lastTimeMs = t;
  }
  if (!lastTimeMs) return false;

  const diffHours = (Date.now() - lastTimeMs) / (1000 * 60 * 60);
  return diffHours >= 24;
}

function getSilentTimeLabel(lead) {
  if (!lead) return '24h+';

  let lastTimeMs = 0;
  if (lead.lastMessageTime) {
    const t = new Date(lead.lastMessageTime).getTime();
    if (!isNaN(t)) lastTimeMs = t;
  }
  if (!lastTimeMs && lead.addedAt) {
    const t = new Date(lead.addedAt).getTime();
    if (!isNaN(t)) lastTimeMs = t;
  }
  if (!lastTimeMs) return '24h+';

  const diffHours = Math.floor((Date.now() - lastTimeMs) / (1000 * 60 * 60));
  if (diffHours < 48) {
    return `${diffHours}h sin respuesta`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d sin respuesta`;
}

async function openChat(lead) {
  const targetUrl = lead.url || `https://app.respond.io/space/${lead.spaceId || '384258'}/inbox/${lead.conversationId}`;

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs && tabs[0];
    const isRespondTab = activeTab && activeTab.url && activeTab.url.includes('app.respond.io');

    if (isRespondTab) {
      chrome.tabs.sendMessage(activeTab.id, {
        type: 'SMOOTH_NAVIGATE_TO_CHAT',
        payload: {
          url: targetUrl,
          conversationId: lead.conversationId
        }
      });
    } else {
      chrome.runtime.sendMessage({
        type: 'NAVIGATE_TO_CHAT',
        payload: {
          url: targetUrl,
          conversationId: lead.conversationId
        }
      });
    }
  } catch (e) {
    chrome.runtime.sendMessage({
      type: 'NAVIGATE_TO_CHAT',
      payload: {
        url: targetUrl,
        conversationId: lead.conversationId
      }
    });
  }

  if (watchedLeads[lead.conversationId]) {
    watchedLeads[lead.conversationId].unreadCount = 0;
    await chrome.storage.local.set({ watchedLeads });
  }

  window.close();
}

async function markLeadAsRead(conversationId) {
  if (watchedLeads[conversationId]) {
    watchedLeads[conversationId].unreadCount = 0;
    await chrome.storage.local.set({ watchedLeads });
    chrome.runtime.sendMessage({ type: 'UPDATE_BADGE' });
    render();
  }
}

async function markAllAsRead() {
  let changed = false;
  for (const id in watchedLeads) {
    if (watchedLeads[id].unreadCount > 0) {
      watchedLeads[id].unreadCount = 0;
      changed = true;
    }
  }
  if (changed) {
    await chrome.storage.local.set({ watchedLeads });
    chrome.runtime.sendMessage({ type: 'UPDATE_BADGE' });
    render();
  }
}

function exportBackup() {
  const dataStr = JSON.stringify(watchedLeads, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `respond_radar_leads_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function setupBackupHandlers() {
  const btnExport = document.getElementById('btn-export-backup');
  const btnImport = document.getElementById('btn-import-backup');
  const fileInput = document.getElementById('import-file-input');

  btnExport?.addEventListener('click', exportBackup);

  btnImport?.addEventListener('click', () => {
    fileInput?.click();
  });

  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (typeof imported === 'object' && imported !== null) {
          watchedLeads = { ...watchedLeads, ...imported };
          await chrome.storage.local.set({ watchedLeads });
          chrome.runtime.sendMessage({ type: 'UPDATE_BADGE' });
          alert(`✅ Se restauraron/importaron leads con éxito.`);
          render();
        } else {
          alert('El archivo no tiene el formato correcto.');
        }
      } catch (err) {
        alert('Error al leer el archivo de copia de seguridad.');
      }
    };
    reader.readAsText(file);
    fileInput.value = '';
  });
}

function setupEventListeners() {
  const searchInput = document.getElementById('lead-search-input');
  searchInput?.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    render();
  });

  const tabBtns = document.querySelectorAll('.filter-tabs-bar .tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter || 'mine';
      render();
    });
  });

  const subtabBtns = document.querySelectorAll('.pipeline-subtabs-bar .subtab-btn');
  subtabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      subtabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSubFilter = btn.dataset.subfilter || 'all';
      if (currentSubFilter === 'tocar-hoy') {
        currentPeriod = 'all';
        document.querySelectorAll('.period-btn, .period-pill, .period-pill-btn').forEach(pb => {
          pb.classList.toggle('active', (pb.dataset.period || 'all') === 'all');
        });
      }
      render();
    });
  });

  const periodBtns = document.querySelectorAll('.period-btn, .period-pill');
  periodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      periodBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPeriod = btn.dataset.period || 'all';
      render();
    });
  });

  document.querySelectorAll('.btn-popover-pill').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetPlan = btn.dataset.plan;
      if (currentTabChat) {
        addLead(currentTabChat, { targetPlan });
      }
    });
  });

  document.addEventListener('click', (e) => {
    const popover = document.getElementById('banner-follow-popover');
    const btnAdd = document.getElementById('btn-add-current');
    if (popover && !popover.contains(e.target) && e.target !== btnAdd) {
      popover.classList.add('hidden');
      isBannerPopoverOpen = false;
    }

    if (!e.target.closest('.lead-actions')) {
      document.querySelectorAll('.lead-menu-dropdown').forEach(d => d.classList.add('hidden'));
      document.querySelectorAll('.lead-card').forEach(c => c.classList.remove('menu-open'));
      document.querySelectorAll('.btn-card-menu').forEach(b => b.classList.remove('active'));
    }
  });

  const soundBtn = document.getElementById('toggle-sound-btn');
  soundBtn?.addEventListener('click', async () => {
    isSoundEnabled = !isSoundEnabled;
    await chrome.storage.local.set({ soundEnabled: isSoundEnabled });
    updateSoundUI();
  });

  const widgetBtn = document.getElementById('toggle-widget-btn');
  widgetBtn?.addEventListener('click', async () => {
    isWidgetHidden = !isWidgetHidden;
    await chrome.storage.local.set({ widgetHidden: isWidgetHidden });
    updateWidgetVisibilityUI();
  });

  const keyboardNavBtn = document.getElementById('toggle-keyboard-nav-btn');
  keyboardNavBtn?.addEventListener('click', async () => {
    isKeyboardNavEnabled = !isKeyboardNavEnabled;
    await chrome.storage.local.set({ keyboardNavigationEnabled: isKeyboardNavEnabled });
    updateKeyboardNavUI();
  });

  const btnMarkAll = document.getElementById('btn-mark-all-read');
  btnMarkAll?.addEventListener('click', () => {
    markAllAsRead();
  });

  setupBackupHandlers();
  updateSoundUI();
  updateWidgetVisibilityUI();
  updateKeyboardNavUI();
}

let currentView = 'leads';

function setupViewNavigation() {
  const navBtns = document.querySelectorAll('.nav-seg-btn');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetView = btn.dataset.view;
      if (!targetView) return;
      currentView = targetView;
      navBtns.forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.view-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `view-${targetView}`);
      });
      if (targetView === 'sales') {
        renderSalesCustomList();
      }
    });
  });
}

async function setupSettingsTab() {

  const commStarterInput = document.getElementById('comm-starter-val');
  const commProInput = document.getElementById('comm-pro-val');
  const commBlackInput = document.getElementById('comm-black-val');
  const commCurrEur = document.getElementById('comm-curr-eur');
  const commCurrUsd = document.getElementById('comm-curr-usd');
  const commBadgeStatus = document.getElementById('commissions-badge-status');

  function updateCommissionsUI() {
    if (commStarterInput) commStarterInput.value = commissionConfig.starter;
    if (commProInput) commProInput.value = commissionConfig.pro;
    if (commBlackInput) commBlackInput.value = commissionConfig.black;
    const isEur = commissionConfig.currency === 'EUR';
    commCurrEur?.classList.toggle('active', isEur);
    commCurrUsd?.classList.toggle('active', !isEur);
    const sym = isEur ? '€' : '$';
    ['starter', 'pro', 'black'].forEach(plan => {
      const el = document.getElementById(`comm-sym-${plan}`);
      if (el) el.innerText = sym;
    });
  }
  updateCommissionsUI();

  async function saveCommissions() {
    const sVal = parseFloat(commStarterInput?.value);
    const pVal = parseFloat(commProInput?.value);
    const bVal = parseFloat(commBlackInput?.value);
    commissionConfig.starter = !isNaN(sVal) && sVal >= 0 ? sVal : 10;
    commissionConfig.pro = !isNaN(pVal) && pVal >= 0 ? pVal : 20;
    commissionConfig.black = !isNaN(bVal) && bVal >= 0 ? bVal : 50;

    await chrome.storage.local.set({ commissionConfig });
    if (commBadgeStatus) {
      commBadgeStatus.innerText = '✓ Guardado';
      commBadgeStatus.className = 'status-pill-tag online';
      setTimeout(() => {
        if (commBadgeStatus) commBadgeStatus.innerText = 'Guardado';
      }, 1500);
    }
    render();
  }

  [commStarterInput, commProInput, commBlackInput].forEach(inp => {
    inp?.addEventListener('input', () => saveCommissions());
    inp?.addEventListener('change', () => saveCommissions());
  });

  commCurrEur?.addEventListener('click', async () => {
    commissionConfig.currency = 'EUR';
    updateCommissionsUI();
    await saveCommissions();
  });

  commCurrUsd?.addEventListener('click', async () => {
    commissionConfig.currency = 'USD';
    updateCommissionsUI();
    await saveCommissions();
  });

  const planStarterInput = document.getElementById('plan-price-starter-val');
  const planProInput = document.getElementById('plan-price-pro-val');
  const planBlackInput = document.getElementById('plan-price-black-val');
  const planCurrEur = document.getElementById('plan-price-curr-eur');
  const planCurrUsd = document.getElementById('plan-price-curr-usd');
  const planBadgeStatus = document.getElementById('plan-prices-badge-status');

  function updatePlanPricesUI() {
    if (planStarterInput) planStarterInput.value = planPricesConfig.starter;
    if (planProInput) planProInput.value = planPricesConfig.pro;
    if (planBlackInput) planBlackInput.value = planPricesConfig.black;
    const isEur = planPricesConfig.currency === 'EUR';
    planCurrEur?.classList.toggle('active', isEur);
    planCurrUsd?.classList.toggle('active', !isEur);
    const sym = isEur ? '€' : '$';
    ['starter', 'pro', 'black'].forEach(plan => {
      const el = document.getElementById(`plan-price-sym-${plan}`);
      if (el) el.innerText = sym;
    });
  }
  updatePlanPricesUI();

  async function savePlanPrices() {
    const sVal = parseFloat(planStarterInput?.value);
    const pVal = parseFloat(planProInput?.value);
    const bVal = parseFloat(planBlackInput?.value);
    planPricesConfig.starter = !isNaN(sVal) && sVal >= 0 ? sVal : 29;
    planPricesConfig.pro = !isNaN(pVal) && pVal >= 0 ? pVal : 59;
    planPricesConfig.black = !isNaN(bVal) && bVal >= 0 ? bVal : 130;

    await chrome.storage.local.set({ planPricesConfig });
    if (planBadgeStatus) {
      planBadgeStatus.innerText = '✓ Guardado';
      planBadgeStatus.className = 'status-pill-tag online';
      setTimeout(() => {
        if (planBadgeStatus) planBadgeStatus.innerText = 'Guardado';
      }, 1500);
    }
  }

  [planStarterInput, planProInput, planBlackInput].forEach(inp => {
    inp?.addEventListener('input', () => savePlanPrices());
    inp?.addEventListener('change', () => savePlanPrices());
  });

  planCurrEur?.addEventListener('click', async () => {
    planPricesConfig.currency = 'EUR';
    updatePlanPricesUI();
    await savePlanPrices();
  });

  planCurrUsd?.addEventListener('click', async () => {
    planPricesConfig.currency = 'USD';
    updatePlanPricesUI();
    await savePlanPrices();
  });

  const keywordsInput = document.getElementById('flash-keywords-input');
  const btnSaveKeywords = document.getElementById('btn-save-flash-keywords');
  const btnResetKeywords = document.getElementById('btn-reset-flash-keywords');
  const keywordsBadgeStatus = document.getElementById('flash-keywords-badge-status');
  const DEFAULT_FLASH_KEYWORDS_POPUP = ['KING', 'REY', 'SECRETO'];

  async function loadFlashKeywordsUI() {
    const kData = await chrome.storage.local.get(['flashTriggerKeywords']);
    const list = (Array.isArray(kData?.flashTriggerKeywords) && kData.flashTriggerKeywords.length > 0)
      ? kData.flashTriggerKeywords
      : DEFAULT_FLASH_KEYWORDS_POPUP;
    if (keywordsInput) {
      keywordsInput.value = list.join(', ');
    }
    if (keywordsBadgeStatus) {
      keywordsBadgeStatus.innerText = `${list.length} Palabra${list.length === 1 ? '' : 's'}`;
      keywordsBadgeStatus.className = 'status-pill-tag online';
    }
  }
  loadFlashKeywordsUI();

  btnSaveKeywords?.addEventListener('click', async () => {
    const rawVal = keywordsInput?.value || '';
    const keywords = rawVal.split(/[,\n]+/).map(w => w.trim().toUpperCase()).filter(w => w.length > 0);
    const toSave = keywords.length > 0 ? keywords : DEFAULT_FLASH_KEYWORDS_POPUP;
    if (keywordsInput) keywordsInput.value = toSave.join(', ');
    await chrome.storage.local.set({ flashTriggerKeywords: toSave });
    if (keywordsBadgeStatus) {
      keywordsBadgeStatus.innerText = '✓ Guardado';
      keywordsBadgeStatus.className = 'status-pill-tag online';
      setTimeout(() => {
        if (keywordsBadgeStatus) {
          keywordsBadgeStatus.innerText = `${toSave.length} Palabra${toSave.length === 1 ? '' : 's'}`;
        }
      }, 1800);
    }
  });

  btnResetKeywords?.addEventListener('click', async () => {
    if (keywordsInput) keywordsInput.value = DEFAULT_FLASH_KEYWORDS_POPUP.join(', ');
    await chrome.storage.local.set({ flashTriggerKeywords: DEFAULT_FLASH_KEYWORDS_POPUP });
    if (keywordsBadgeStatus) {
      keywordsBadgeStatus.innerText = `${DEFAULT_FLASH_KEYWORDS_POPUP.length} Palabras`;
      keywordsBadgeStatus.className = 'status-pill-tag online';
    }
  });

  const greetingInput = document.getElementById('flash-greeting-input');
  const btnSaveGreeting = document.getElementById('btn-save-flash-greeting');
  const btnResetGreeting = document.getElementById('btn-reset-flash-greeting');
  const greetingBadgeStatus = document.getElementById('greeting-msg-badge-status');
  const DEFAULT_GREETING_MSG = "Hola, cómo estás? De donde eres y qué edad tienes?";

  async function loadFlashGreetingUI() {
    const gData = await chrome.storage.local.get(['flashGreetingMessage']);
    const current = gData?.flashGreetingMessage;
    const isCustom = (typeof current === 'string' && current.trim() && current.trim() !== DEFAULT_GREETING_MSG);
    if (greetingInput) {
      greetingInput.value = (typeof current === 'string' && current.trim()) ? current.trim() : DEFAULT_GREETING_MSG;
    }
    if (greetingBadgeStatus) {
      greetingBadgeStatus.innerText = isCustom ? 'Personalizado' : 'Por Defecto';
      greetingBadgeStatus.className = isCustom ? 'status-pill-tag online' : 'status-pill-tag';
    }
  }
  loadFlashGreetingUI();

  btnSaveGreeting?.addEventListener('click', async () => {
    const val = (greetingInput?.value || '').trim();
    const toSave = val || DEFAULT_GREETING_MSG;
    if (greetingInput) greetingInput.value = toSave;
    await chrome.storage.local.set({ flashGreetingMessage: toSave });
    if (greetingBadgeStatus) {
      greetingBadgeStatus.innerText = '✓ Guardado';
      greetingBadgeStatus.className = 'status-pill-tag online';
      setTimeout(() => {
        const isCustom = toSave !== DEFAULT_GREETING_MSG;
        if (greetingBadgeStatus) {
          greetingBadgeStatus.innerText = isCustom ? 'Personalizado' : 'Por Defecto';
          greetingBadgeStatus.className = isCustom ? 'status-pill-tag online' : 'status-pill-tag';
        }
      }, 1800);
    }
  });

  btnResetGreeting?.addEventListener('click', async () => {
    if (greetingInput) greetingInput.value = DEFAULT_GREETING_MSG;
    await chrome.storage.local.set({ flashGreetingMessage: DEFAULT_GREETING_MSG });
    if (greetingBadgeStatus) {
      greetingBadgeStatus.innerText = 'Por Defecto';
      greetingBadgeStatus.className = 'status-pill-tag';
    }
  });
}

function setupSalesPeriodFilter() {
  const monthSelect = document.getElementById('sales-month-select');
  const pillMonth = document.getElementById('sales-pill-month');
  const pillAll = document.getElementById('sales-pill-all');

  function updateMonthOptions() {
    if (!monthSelect) return;
    const soldLeads = Object.values(watchedLeads).filter(l => l.sale && l.sale.isSold);
    const monthsSet = new Set();
    const curKey = getCurrentMonthKey();
    monthsSet.add(curKey);

    soldLeads.forEach(l => {
      const mKey = getLeadMonthKey(l);
      if (mKey) monthsSet.add(mKey);
    });

    const sortedMonths = Array.from(monthsSet).sort().reverse();
    monthSelect.innerHTML = '';

    const curMonthLabel = formatMonthLabel(curKey);
    const optCurrent = document.createElement('option');
    optCurrent.value = 'current';
    optCurrent.textContent = `⚡ Este Mes (${curMonthLabel})`;
    monthSelect.appendChild(optCurrent);

    const optAll = document.createElement('option');
    optAll.value = 'all';
    optAll.textContent = '🌐 Todo el Histórico';
    monthSelect.appendChild(optAll);

    sortedMonths.forEach(mKey => {
      const opt = document.createElement('option');
      opt.value = mKey;
      opt.textContent = `📅 ${formatMonthLabel(mKey)}`;
      monthSelect.appendChild(opt);
    });

    monthSelect.value = selectedSalesMonth;
  }

  updateMonthOptions();

  monthSelect?.addEventListener('change', (e) => {
    selectedSalesMonth = e.target.value;
    pillMonth?.classList.toggle('active', selectedSalesMonth === 'current');
    pillAll?.classList.toggle('active', selectedSalesMonth === 'all');
    render();
  });

  pillMonth?.addEventListener('click', () => {
    selectedSalesMonth = 'current';
    if (monthSelect) monthSelect.value = 'current';
    pillMonth.classList.add('active');
    pillAll?.classList.remove('active');
    render();
  });

  pillAll?.addEventListener('click', () => {
    selectedSalesMonth = 'all';
    if (monthSelect) monthSelect.value = 'all';
    pillAll.classList.add('active');
    pillMonth?.classList.remove('active');
    render();
  });
}

function updateSoundUI() {
  const icon = document.getElementById('sound-icon');
  const label = document.getElementById('sound-label');
  const soundSwitch = document.getElementById('sound-custom-switch');
  if (isSoundEnabled) {
    if (icon) icon.innerHTML = window.RadarIcons?.render('volume2', 15) || '';
    if (label) label.innerText = 'Alertas Sonoras';
    soundSwitch?.classList.add('active');
  } else {
    if (icon) icon.innerHTML = window.RadarIcons?.render('volumeX', 15) || '';
    if (label) label.innerText = 'Alertas Silenciadas';
    soundSwitch?.classList.remove('active');
  }
}

function updateWidgetVisibilityUI() {
  const icon = document.getElementById('widget-icon');
  const label = document.getElementById('widget-label');
  const widgetSwitch = document.getElementById('widget-custom-switch');
  if (isWidgetHidden) {
    if (icon) icon.innerHTML = window.RadarIcons?.render('eyeOff', 15) || '';
    if (label) label.innerText = 'Barra Flotante Oculta';
    widgetSwitch?.classList.remove('active');
  } else {
    if (icon) icon.innerHTML = window.RadarIcons?.render('eye', 15) || '';
    if (label) label.innerText = 'Barra Flotante en Pantalla';
    widgetSwitch?.classList.add('active');
  }
}

function updateKeyboardNavUI() {
  const icon = document.getElementById('keyboard-nav-icon');
  const label = document.getElementById('keyboard-nav-label');
  const navSwitch = document.getElementById('keyboard-nav-custom-switch');
  if (isKeyboardNavEnabled) {
    if (icon) icon.innerHTML = window.RadarIcons?.render('zap', 15) || '';
    if (label) label.innerText = 'Navegación con Teclado (Alt + ↑ / ↓)';
    navSwitch?.classList.add('active');
  } else {
    if (icon) icon.innerHTML = window.RadarIcons?.render('x', 15) || '';
    if (label) label.innerText = 'Navegación con Teclado Desactivada';
    navSwitch?.classList.remove('active');
  }
}

function formatTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `${diffMin}m`;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getLeadDate(lead) {
  if (lead.addedAt) {
    const d = new Date(lead.addedAt);
    if (!isNaN(d.getTime())) return d;
  }
  if (lead.lastMessageTime) {
    const d = new Date(lead.lastMessageTime);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

function getDayCategory(date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);

  const dayOfWeek = (now.getDay() + 6) % 7;
  const startOfWeek = new Date(today.getTime() - dayOfWeek * 86400000);

  if (date >= today) return 'today';
  if (date >= yesterday) return 'yesterday';
  if (date >= startOfWeek) return 'week';
  return 'older';
}

function formatLeadDateTag(date) {
  const cat = getDayCategory(date);
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const zapIcon = window.RadarIcons?.render('zap', 10, 'radar-tag-icon text-cyan') || '';
  const calIcon = window.RadarIcons?.render('calendar', 10, 'radar-tag-icon') || '';
  if (cat === 'today') {
    return `<span class="lead-date-tag is-today" title="Asignado hoy a las ${timeStr}">${zapIcon}<span>Hoy ${timeStr}</span></span>`;
  }
  if (cat === 'yesterday') {
    return `<span class="lead-date-tag is-yesterday" title="Asignado ayer a las ${timeStr}">${calIcon}<span>Ayer ${timeStr}</span></span>`;
  }
  const dayMonth = date.toLocaleDateString([], { day: '2-digit', month: 'short' });
  return `<span class="lead-date-tag is-older" title="Asignado el ${dayMonth} a las ${timeStr}">${calIcon}<span>${dayMonth}</span></span>`;
}

function setupModalEventListeners() {
  const modal = document.getElementById('sale-modal');
  const btnClose = document.getElementById('modal-close-btn');
  const form = document.getElementById('sale-form');

  btnClose?.addEventListener('click', closeSaleModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeSaleModal();
  });

  const planPills = document.querySelectorAll('.plan-pill');
  planPills.forEach(pill => {
    pill.addEventListener('click', () => {
      planPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedPlan = pill.dataset.plan || 'Pro';
    });
  });

  const modePills = document.querySelectorAll('.mode-pill');
  modePills.forEach(pill => {
    pill.addEventListener('click', () => {
      modePills.forEach(m => m.classList.remove('active'));
      pill.classList.add('active');
      selectedPaymentMode = pill.dataset.mode || 'abono';
      const amtContainer = document.getElementById('sale-amount-container');
      if (amtContainer) {
        amtContainer.style.display = selectedPaymentMode === 'abono' ? 'flex' : 'none';
      }
    });
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeModalLeadId || !watchedLeads[activeModalLeadId]) return;

    const amount = document.getElementById('sale-amount').value.trim();
    const hfmId = document.getElementById('sale-hfm-id').value.trim();
    const invoiceUrl = document.getElementById('sale-invoice-url').value.trim();
    const telegramQrUrl = document.getElementById('sale-qr-url').value.trim();

    watchedLeads[activeModalLeadId].sale = {
      isSold: true,
      plan: selectedPlan,
      isInstallment: selectedPaymentMode === 'abono',
      amount,
      hfmId,
      invoiceUrl,
      telegramQrUrl,
      soldAt: watchedLeads[activeModalLeadId].sale?.soldAt || new Date().toISOString()
    };
    watchedLeads[activeModalLeadId].processStage = 'Venta';
    watchedLeads[activeModalLeadId].targetPlan = selectedPlan;

    await chrome.storage.local.set({ watchedLeads });
    closeSaleModal();
    render();
  });

  const btnRevert = document.getElementById('btn-revert-sale');
  btnRevert?.addEventListener('click', async () => {
    if (!activeModalLeadId || !watchedLeads[activeModalLeadId]) return;
    if (confirm('¿Desmarcar esta venta y volver a dejar el lead como prospecto activo?')) {
      delete watchedLeads[activeModalLeadId].sale;
      if (watchedLeads[activeModalLeadId].processStage === 'Venta') {
        watchedLeads[activeModalLeadId].processStage = 'Ingresando';
      }
      await chrome.storage.local.set({ watchedLeads });
      closeSaleModal();
      render();
    }
  });
}

function openSaleModal(leadId) {
  const lead = watchedLeads[leadId];
  if (!lead) return;

  activeModalLeadId = leadId;
  const modal = document.getElementById('sale-modal');
  const modalLeadName = document.getElementById('modal-lead-name');
  const dangerBox = document.getElementById('modal-danger-actions');

  if (modalLeadName) modalLeadName.innerText = `👤 ${lead.name}`;

  if (lead.sale && lead.sale.isSold) {
    selectedPlan = lead.sale.plan || 'Starter';
    selectedPaymentMode = lead.sale.isInstallment ? 'abono' : 'completo';

    const amtInp = document.getElementById('sale-amount');
    const hfmInp = document.getElementById('sale-hfm-id');
    const invInp = document.getElementById('sale-invoice-url');
    const qrInp = document.getElementById('sale-qr-url');
    if (amtInp) amtInp.value = lead.sale.amount || '';
    if (hfmInp) hfmInp.value = lead.sale.hfmId || '';
    if (invInp) invInp.value = lead.sale.invoiceUrl || '';
    if (qrInp) qrInp.value = lead.sale.telegramQrUrl || '';

    dangerBox?.classList.remove('hidden');
  } else {
    selectedPlan = lead.targetPlan || 'Starter';
    selectedPaymentMode = 'abono';

    const amtInp = document.getElementById('sale-amount');
    const hfmInp = document.getElementById('sale-hfm-id');
    const invInp = document.getElementById('sale-invoice-url');
    const qrInp = document.getElementById('sale-qr-url');
    if (amtInp) amtInp.value = '';
    if (hfmInp) hfmInp.value = '';
    if (invInp) invInp.value = '';
    if (qrInp) qrInp.value = '';

    dangerBox?.classList.add('hidden');
  }

  document.querySelectorAll('.plan-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.plan === selectedPlan);
  });
  document.querySelectorAll('.mode-pill').forEach(m => {
    m.classList.toggle('active', m.dataset.mode === selectedPaymentMode);
  });

  const amtContainer = document.getElementById('sale-amount-container');
  if (amtContainer) {
    amtContainer.style.display = selectedPaymentMode === 'abono' ? 'flex' : 'none';
  }

  modal?.classList.remove('hidden');
}

function closeSaleModal() {
  const modal = document.getElementById('sale-modal');
  modal?.classList.add('hidden');
  activeModalLeadId = null;
}

function render() {
  const listEl = document.getElementById('leads-list');
  const emptyState = document.getElementById('empty-state');
  const leadsCountEl = document.getElementById('active-leads-count');
  const totalProspectsLabel = document.getElementById('total-prospects-label');
  const unreadSummaryEl = document.getElementById('unread-summary');
  const btnMarkAll = document.getElementById('btn-mark-all-read');

  const tabCountMine = document.getElementById('tab-count-mine');
  const tabCountSold = document.getElementById('tab-count-sold');
  const tabCountAll = document.getElementById('tab-count-all');

  const metricsBanner = document.getElementById('sales-metrics-banner');
  const metricTotalSales = document.getElementById('metric-total-sales');
  const metricStarterSales = document.getElementById('metric-starter-sales');
  const metricProSales = document.getElementById('metric-pro-sales');
  const metricBlackSales = document.getElementById('metric-black-sales');
  const metricTotalRevenue = document.getElementById('metric-total-revenue');

  const periodCountAllEl = document.getElementById('period-count-all');
  const periodCountTodayEl = document.getElementById('period-count-today');
  const periodCountYesterdayEl = document.getElementById('period-count-yesterday');
  const periodCountWeekEl = document.getElementById('period-count-week');

  const leadEntries = Object.values(watchedLeads);

  let totalUnread = 0;
  let countMine = 0;
  let countSold = 0;
  let starterCount = 0;
  let proCount = 0;
  let blackCount = 0;
  let totalRevenueEur = 0;

  let periodCountAll = 0;
  let periodCountToday = 0;
  let periodCountYesterday = 0;
  let periodCountWeek = 0;

  leadEntries.forEach(l => {
    const isSold = l.sale && l.sale.isSold;
    const lDate = getLeadDate(l);
    const cat = getDayCategory(lDate);

    if (isSold) {
      countSold++;
    } else {
      countMine++;
    }
    totalUnread += (l.unreadCount || 0);

    if (isSold) {
      const leadMonthKey = getLeadMonthKey(l);
      const curMonthKey = getCurrentMonthKey();

      let matchSalesMonth = false;
      if (selectedSalesMonth === 'all') {
        matchSalesMonth = true;
      } else if (selectedSalesMonth === 'current') {
        matchSalesMonth = (leadMonthKey === curMonthKey || !leadMonthKey);
      } else {
        matchSalesMonth = (leadMonthKey === selectedSalesMonth);
      }

      if (matchSalesMonth) {
        const plan = (l.sale.plan || '').toLowerCase();
        if (plan === 'starter') starterCount++;
        else if (plan === 'black') blackCount++;
        else proCount++;

        const num = parseFloat((l.sale.amount || '').replace(/[^0-9.]/g, ''));
        if (!isNaN(num)) {
          totalRevenueEur += num;
        }
      }
    }

    let matchesCurrentTab = true;
    if (currentFilter === 'mine' && isSold) matchesCurrentTab = false;
    else if (currentFilter === 'sold' && !isSold) matchesCurrentTab = false;

    if (matchesCurrentTab) {
      periodCountAll++;
      if (cat === 'today') {
        periodCountToday++;
        periodCountWeek++;
      } else if (cat === 'yesterday') {
        periodCountYesterday++;
        periodCountWeek++;
      } else if (cat === 'week') {
        periodCountWeek++;
      }
    }
  });

  if (leadsCountEl) leadsCountEl.innerText = countMine + countSold;

  if (tabCountMine) tabCountMine.innerText = countMine;
  if (tabCountSold) tabCountSold.innerText = countSold;
  if (tabCountAll) tabCountAll.innerText = leadEntries.length;

  if (periodCountAllEl) periodCountAllEl.innerText = periodCountAll;
  if (periodCountTodayEl) periodCountTodayEl.innerText = periodCountToday;
  if (periodCountYesterdayEl) periodCountYesterdayEl.innerText = periodCountYesterday;
  if (periodCountWeekEl) periodCountWeekEl.innerText = periodCountWeek;

  const currSym = commissionConfig.currency === 'USD' ? '$' : '€';
  const starterCommission = starterCount * (commissionConfig.starter || 10);
  const proCommission = proCount * (commissionConfig.pro || 20);
  const blackCommission = blackCount * (commissionConfig.black || 50);
  const totalCommission = starterCommission + proCommission + blackCommission;
  const totalSalesCount = starterCount + proCount + blackCount;

  if (metricTotalSales) metricTotalSales.innerText = totalSalesCount;
  if (metricStarterSales) metricStarterSales.innerText = starterCount;
  if (metricProSales) metricProSales.innerText = proCount;
  if (metricBlackSales) metricBlackSales.innerText = blackCount;

  const metricStarterComm = document.getElementById('metric-starter-comm');
  const metricProComm = document.getElementById('metric-pro-comm');
  const metricBlackComm = document.getElementById('metric-black-comm');
  if (metricStarterComm) metricStarterComm.innerText = `+${currSym}${starterCommission}`;
  if (metricProComm) metricProComm.innerText = `+${currSym}${proCommission}`;
  if (metricBlackComm) metricBlackComm.innerText = `+${currSym}${blackCommission}`;

  if (metricTotalRevenue) {
    metricTotalRevenue.innerText = `€${totalRevenueEur.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  const metricMyCommission = document.getElementById('metric-my-commission');
  if (metricMyCommission) {
    metricMyCommission.innerText = `${currSym}${totalCommission.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  const periodLabel = selectedSalesMonth === 'all'
    ? 'Histórico Completo'
    : selectedSalesMonth === 'current'
      ? `${formatMonthLabel(getCurrentMonthKey())} (Actual)`
      : formatMonthLabel(selectedSalesMonth);

  const heroPeriodLabel = document.getElementById('sales-hero-period-label');
  if (heroPeriodLabel) heroPeriodLabel.innerText = periodLabel;

  const periodTagSub = document.getElementById('sales-period-tag-sub');
  if (periodTagSub) periodTagSub.innerText = periodLabel;

  const commissionDetailLbl = document.getElementById('metric-commission-detail-lbl');
  if (commissionDetailLbl) {
    commissionDetailLbl.innerText = totalSalesCount > 0
      ? `Promedio: ${currSym}${(totalCommission / totalSalesCount).toFixed(0)} / venta`
      : 'Sin ventas este mes';
  }

  if (metricsBanner) {
    if (currentFilter === 'sold' || (currentFilter === 'mine' && countSold > 0)) {
      metricsBanner.classList.remove('hidden');
    } else {
      metricsBanner.classList.add('hidden');
    }
  }

  if (unreadSummaryEl) {
    unreadSummaryEl.innerText = totalUnread > 0 ? `🔥 ${totalUnread} sin responder` : '0 sin responder';
    unreadSummaryEl.style.color = totalUnread > 0 ? 'var(--accent-orange)' : 'var(--text-muted)';
  }

  if (btnMarkAll) {
    btnMarkAll.classList.toggle('hidden', totalUnread === 0);
  }

  let subCountAll = 0;
  let subCountTocarHoy = 0;
  let subCount150 = 0;
  let subCountRegistro = 0;
  let subCountFondeo = 0;
  let subCountIngresando = 0;
  let subCountRevision = 0;
  let subCountFinal = 0;
  let subCountFollowup = 0;

  leadEntries.forEach(l => {
    const isSold = l.sale && l.sale.isSold;
    if (!isSold) {
      subCountAll++;
      const stage = (l.processStage || '').toLowerCase();
      if (stage.includes('150')) subCount150++;
      else if (stage.includes('registro')) subCountRegistro++;
      else if (stage.includes('fondeo')) subCountFondeo++;
      else if (stage.includes('ingresando')) subCountIngresando++;
      else if (stage.includes('revisi')) subCountRevision++;
      else if (stage.includes('final')) subCountFinal++;

      if (l.followUpDate) subCountFollowup++;

      if (isLeadScheduledSilentOver24h(l)) {
        subCountTocarHoy++;
      }
    }
  });

  const subtabAllEl = document.getElementById('subtab-count-all');
  const subtabTocarHoyEl = document.getElementById('subtab-count-tocar-hoy');
  const subtab150El = document.getElementById('subtab-count-150');
  const subtabRegistroEl = document.getElementById('subtab-count-registro');
  const subtabFondeoEl = document.getElementById('subtab-count-fondeo');
  const subtabIngresandoEl = document.getElementById('subtab-count-ingresando');
  const subtabRevisionEl = document.getElementById('subtab-count-revision');
  const subtabFinalEl = document.getElementById('subtab-count-final');
  const subtabFollowupEl = document.getElementById('subtab-count-followup');

  if (subtabAllEl) subtabAllEl.innerText = subCountAll;
  if (subtabTocarHoyEl) subtabTocarHoyEl.innerText = subCountTocarHoy;
  if (subtab150El) subtab150El.innerText = subCount150;
  if (subtabRegistroEl) subtabRegistroEl.innerText = subCountRegistro;
  if (subtabFondeoEl) subtabFondeoEl.innerText = subCountFondeo;
  if (subtabIngresandoEl) subtabIngresandoEl.innerText = subCountIngresando;
  if (subtabRevisionEl) subtabRevisionEl.innerText = subCountRevision;
  if (subtabFinalEl) subtabFinalEl.innerText = subCountFinal;
  if (subtabFollowupEl) subtabFollowupEl.innerText = subCountFollowup;

  const subtabsBar = document.getElementById('pipeline-subtabs-bar');
  if (subtabsBar) {
    subtabsBar.style.display = (currentFilter === 'mine') ? 'flex' : 'none';
  }

  const filtered = leadEntries.filter(l => {
    const isSold = l.sale && l.sale.isSold;

    if (currentFilter === 'mine' && isSold) return false;
    if (currentFilter === 'sold' && !isSold) return false;

    if (currentFilter === 'mine' && currentSubFilter !== 'all') {
      const stage = (l.processStage || '').toLowerCase();
      if (currentSubFilter === 'tocar-hoy' && !isLeadScheduledSilentOver24h(l)) return false;
      if (currentSubFilter === '150' && !stage.includes('150')) return false;
      if (currentSubFilter === 'registro' && !stage.includes('registro')) return false;
      if (currentSubFilter === 'fondeo' && !stage.includes('fondeo')) return false;
      if (currentSubFilter === 'ingresando' && !stage.includes('ingresando')) return false;
      if (currentSubFilter === 'revision' && !stage.includes('revisi')) return false;
      if (currentSubFilter === 'final' && !stage.includes('final')) return false;
      if (currentSubFilter === 'followup' && !l.followUpDate) return false;
    }

    if (currentSubFilter !== 'tocar-hoy') {
      const lDate = getLeadDate(l);
      const cat = getDayCategory(lDate);
      if (currentPeriod === 'today' && cat !== 'today') return false;
      if (currentPeriod === 'yesterday' && cat !== 'yesterday') return false;
      if (currentPeriod === 'week' && cat !== 'today' && cat !== 'yesterday' && cat !== 'week') return false;
    }

    if (!searchQuery) return true;
    const nameMatch = l.name && l.name.toLowerCase().includes(searchQuery);
    const msgMatch = l.lastMessage && l.lastMessage.toLowerCase().includes(searchQuery);
    const planMatch = (l.targetPlan || l.sale?.plan || '').toLowerCase().includes(searchQuery);
    return nameMatch || msgMatch || planMatch;
  });

  if (totalProspectsLabel) totalProspectsLabel.innerText = filtered.length;

  filtered.sort((a, b) => {
    if (currentSubFilter === 'tocar-hoy') {
      const stagePriority = (lead) => {
        const s = (lead.processStage || '').toLowerCase();
        if (s.includes('final')) return 0;
        if (s.includes('revisi')) return 1;
        if (s.includes('fondeo')) return 2;
        if (s.includes('registro')) return 3;
        if (s.includes('150')) return 4;
        if (s.includes('ingresando')) return 5;
        return 6;
      };
      const pa = stagePriority(a);
      const pb = stagePriority(b);
      if (pa !== pb) return pa - pb;

      const ta = new Date(a.lastMessageTime || a.addedAt || 0).getTime();
      const tb = new Date(b.lastMessageTime || b.addedAt || 0).getTime();
      return ta - tb;
    }

    if (currentSubFilter === 'followup') {
      const fa = getFollowUpStatus(a.followUpDate);
      const fb = getFollowUpStatus(b.followUpDate);
      const weightA = fa?.status === 'today' ? 0 : (fa?.status === 'overdue' ? 1 : 2);
      const weightB = fb?.status === 'today' ? 0 : (fb?.status === 'overdue' ? 1 : 2);
      if (weightA !== weightB) return weightA - weightB;
      return (a.followUpDate || '').localeCompare(b.followUpDate || '');
    }
    const unreadA = a.unreadCount || 0;
    const unreadB = b.unreadCount || 0;
    if (unreadA !== unreadB) return unreadB - unreadA;
    return getLeadDate(b).getTime() - getLeadDate(a).getTime();
  });

  if (!listEl) return;
  listEl.innerHTML = '';

  if (filtered.length === 0) {
    emptyState?.classList.remove('hidden');
    const emptyTitle = document.querySelector('.empty-title');
    const emptyDesc = document.querySelector('.empty-desc');

    if (emptyTitle && emptyDesc) {
      if (searchQuery) {
        emptyTitle.innerText = 'Sin coincidencias';
        emptyDesc.innerText = `No encontramos prospectos con "${searchQuery}".`;
      } else if (currentSubFilter === 'tocar-hoy') {
        emptyTitle.innerText = '¡Al día! Cero prospectos esperando';
        emptyDesc.innerText = 'No tienes prospectos agendados con más de 24 horas sin respuesta. ¡Gran trabajo!';
      } else if (currentSubFilter === 'followup') {
        emptyTitle.innerText = 'Sin seguimientos pendientes';
        emptyDesc.innerText = 'Programa cuándo tienen el dinero tus leads desde el botón "⋯" o en Respond.io.';
      } else if (currentFilter === 'sold') {
        emptyTitle.innerText = 'Aún no hay ventas registradas';
        emptyDesc.innerText = 'Pulsa el botón "💰 Venta" en cualquier lead tuyo para registrar una compra.';
      } else {
        emptyTitle.innerText = 'Tu radar está libre';
        emptyDesc.innerText = 'Abre un chat en Respond.io y pulsa "Seguir" para vigilarlo en tiempo real.';
      }
    }
  } else {
    emptyState?.classList.add('hidden');

    let lastGroupCategory = null;

    filtered.forEach(lead => {
      const card = document.createElement('div');
      card.className = `lead-card ${lead.unreadCount > 0 ? 'has-unread' : ''}`;
      card.dataset.id = lead.conversationId;

      const leadDate = getLeadDate(lead);
      const leadCategory = getDayCategory(leadDate);

      if ((currentPeriod === 'all' || currentPeriod === 'week') && !searchQuery && currentSubFilter !== 'followup') {
        if (lastGroupCategory !== leadCategory) {
          lastGroupCategory = leadCategory;
          const groupDivider = document.createElement('div');
          groupDivider.className = 'lead-group-divider';
          const zapIcon = window.RadarIcons?.render('zap', 11, 'text-cyan') || '';
          const calIcon = window.RadarIcons?.render('calendar', 11) || '';
          if (leadCategory === 'today') groupDivider.innerHTML = `${zapIcon}<span>Hoy</span>`;
          else if (leadCategory === 'yesterday') groupDivider.innerHTML = `${calIcon}<span>Ayer</span>`;
          else if (leadCategory === 'week') groupDivider.innerHTML = `${calIcon}<span>Esta semana</span>`;
          else groupDivider.innerHTML = `${calIcon}<span>Anteriores</span>`;
          listEl.appendChild(groupDivider);
        }
      }

      const initials = (lead.name || 'L')
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

      const isSold = lead.sale && lead.sale.isSold;
      const targetPlan = lead.sale?.plan || lead.targetPlan || 'Starter';

      const userIcon = window.RadarIcons?.render('user', 11) || '';
      const ownerBadgeHtml = `<span class="badge-owner badge-owner-mine" title="Prospecto Mío">${userIcon} Mío</span>`;

      let planBadgeHtml = '';
      if (isSold) {
        const planClass = `badge-plan-${(lead.sale.plan || 'pro').toLowerCase()}`;
        const amountStr = lead.sale.amount ? ` · ${lead.sale.amount}` : '';
        const crownIcon = window.RadarIcons?.render('crown', 11, 'text-amber') || '';
        planBadgeHtml = `<span class="lead-plan-badge ${planClass}">${crownIcon} ${escapeHtml(lead.sale.plan)}${amountStr}</span>`;
      } else {
        const planClass = `badge-plan-${targetPlan.toLowerCase()}`;
        let planIcon = '';
        if (targetPlan === 'Starter') planIcon = window.RadarIcons?.render('star', 11, 'text-amber') || '';
        else if (targetPlan === 'Black') planIcon = window.RadarIcons?.render('crown', 11, 'text-purple') || '';
        else planIcon = window.RadarIcons?.render('diamond', 11, 'text-cyan') || '';
        planBadgeHtml = `<span class="lead-plan-badge ${planClass}">${planIcon} ${targetPlan}</span>`;
      }

      let stageBadgeHtml = '';
      if (!isSold && lead.processStage) {
        const stageSlug = getStageSlug(lead.processStage);
        const stageLower = lead.processStage.toLowerCase();
        let stageIcon = '';
        if (stageLower.includes('150')) stageIcon = window.RadarIcons?.render('checkCircle', 11, 'text-emerald') || '';
        else if (stageLower.includes('registro')) stageIcon = window.RadarIcons?.render('fileText', 11) || '';
        else if (stageLower.includes('fondeo')) stageIcon = window.RadarIcons?.render('creditCard', 11) || '';
        else if (stageLower.includes('ingresando')) stageIcon = window.RadarIcons?.render('smartphone', 11) || '';
        else if (stageLower.includes('revisi')) stageIcon = window.RadarIcons?.render('alertTriangle', 11) || '';
        else if (stageLower.includes('final')) stageIcon = window.RadarIcons?.render('flag', 11) || '';
        const cleanStageText = lead.processStage.replace(/[✅📝💳📲⚠️🏁]/g, '').trim();
        stageBadgeHtml = `<span class="lead-stage-badge stage-${stageSlug}" title="Etapa: ${escapeHtml(lead.processStage)}">${stageIcon} ${escapeHtml(cleanStageText || lead.processStage)}</span>`;
      }

      let followUpBadgeHtml = '';
      if (!isSold && lead.followUpDate) {
        const fStatus = getFollowUpStatus(lead.followUpDate);
        if (fStatus) {
          const calIcon = window.RadarIcons?.render('calendar', 11) || '';
          const alertIcon = window.RadarIcons?.render('alertCircle', 11, 'text-red') || '';
          const badgeIcon = (fStatus.status === 'overdue' || fStatus.status === 'today') ? alertIcon : calIcon;
          const cleanBadgeText = fStatus.badge.replace(/[🚨⚠️📅]/g, '').trim();
          followUpBadgeHtml = `<span class="lead-followup-badge is-${fStatus.status}" title="Tiene el dinero: ${escapeHtml(fStatus.text)}">${badgeIcon} ${escapeHtml(cleanBadgeText)}</span>`;
        }
      }

      let silentBadgeHtml = '';
      if (!isSold && isLeadScheduledSilentOver24h(lead)) {
        const silentLabel = getSilentTimeLabel(lead);
        const alertIcon = window.RadarIcons?.render('alertCircle', 11, 'text-red') || '';
        silentBadgeHtml = `<span class="lead-silent-badge" title="Prospecto agendado sin respuesta hace ${escapeHtml(silentLabel)}">${alertIcon} ${escapeHtml(silentLabel)}</span>`;
      }

      let touchExcludedBadgeHtml = '';
      if (!isSold && lead.touchExcludedAt) {
        const bellOffIcon = window.RadarIcons?.render('bellOff', 11, 'text-muted') || '';
        touchExcludedBadgeHtml = `<span class="lead-touch-excluded-badge" title="Ya se le hizo follow. Si vuelve a responder, saldrá en Tocar Hoy">${bellOffIcon} Follow hecho</span>`;
      }

      card.innerHTML = `
        <div class="lead-card-header">
          <div class="lead-card-identity" title="Abrir chat de ${escapeHtml(lead.name)}">
            <div class="lead-avatar">${initials}</div>
            <div class="lead-identity-info">
              <div class="lead-name-row">
                <span class="lead-name" title="${escapeHtml(lead.name)}">${escapeHtml(lead.name)}</span>
                ${formatLeadDateTag(leadDate)}
                <span class="lead-elapsed">${formatTime(lead.lastMessageTime)}</span>
              </div>
            </div>
          </div>
          <div class="lead-actions">
            ${lead.unreadCount > 0 ? `
              <button class="btn-card-read" title="Marcar como leído">${window.RadarIcons?.render('check', 11) || '✓'}</button>
              <span class="unread-badge">${lead.unreadCount}</span>
            ` : ''}
            ${!isSold && (currentSubFilter === 'tocar-hoy' || isLeadScheduledSilentOver24h(lead) || lead.touchExcludedAt) ? `
              <button type="button" class="btn-card-exclude ${lead.touchExcludedAt ? 'is-excluded' : ''}"
                      title="${lead.touchExcludedAt ? 'Reactivar en Tocar Hoy (+24h)' : 'Ya le hice follow / Excluir de Tocar Hoy (reaparece si contesta)'}">
                ${lead.touchExcludedAt ? (window.RadarIcons?.render('bell', 11) + ' <span>Reactivar</span>') : (window.RadarIcons?.render('bellOff', 11) + ' <span>Excluir</span>')}
              </button>
            ` : ''}
            <button type="button" class="btn-card-open" title="Abrir chat en Respond.io">
              <span>Abrir</span>
              ${window.RadarIcons?.render('externalLink', 11) || ''}
            </button>
            <button type="button" class="btn-card-menu" title="Opciones (Venta, Etapas, Eliminar)">
              ${window.RadarIcons?.render('moreHorizontal', 13) || '⋯'}
            </button>

            <div class="lead-menu-dropdown hidden">
              ${!isSold ? `
                <div class="menu-section-title">Plan apartado:</div>
                <div class="menu-plan-pills">
                  <button class="btn-menu-plan ${targetPlan === 'Starter' ? 'active' : ''}" data-plan="Starter">
                    ${window.RadarIcons?.render('star', 12, 'text-amber') || ''} <span>Starter</span>
                  </button>
                  <button class="btn-menu-plan ${targetPlan === 'Pro' ? 'active' : ''}" data-plan="Pro">
                    ${window.RadarIcons?.render('diamond', 12, 'text-cyan') || ''} <span>Pro</span>
                  </button>
                  <button class="btn-menu-plan ${targetPlan === 'Black' ? 'active' : ''}" data-plan="Black">
                    ${window.RadarIcons?.render('crown', 12, 'text-purple') || ''} <span>Black</span>
                  </button>
                </div>
                <div class="menu-divider"></div>
                <div class="menu-section-title">Etapa del proceso:</div>
                <div class="menu-stage-pills">
                  <button class="btn-menu-stage stage-150 ${lead.processStage === '150 ✅' ? 'active' : ''}" data-stage="150 ✅">
                    ${window.RadarIcons?.render('checkCircle', 12, 'text-emerald') || ''} <span>150</span>
                  </button>
                  <button class="btn-menu-stage stage-registro ${lead.processStage === 'En registro' ? 'active' : ''}" data-stage="En registro">
                    ${window.RadarIcons?.render('fileText', 12) || ''} <span>Registro</span>
                  </button>
                  <button class="btn-menu-stage stage-fondeo ${lead.processStage === 'En fondeo' ? 'active' : ''}" data-stage="En fondeo">
                    ${window.RadarIcons?.render('creditCard', 12) || ''} <span>Fondeo</span>
                  </button>
                  <button class="btn-menu-stage stage-ingresando ${lead.processStage === 'Ingresando' ? 'active' : ''}" data-stage="Ingresando">
                    ${window.RadarIcons?.render('smartphone', 12) || ''} <span>Ingresando</span>
                  </button>
                  <button class="btn-menu-stage stage-revision ${lead.processStage === 'En revisión' ? 'active' : ''}" data-stage="En revisión">
                    ${window.RadarIcons?.render('alertTriangle', 12) || ''} <span>Revisión</span>
                  </button>
                  <button class="btn-menu-stage stage-final ${lead.processStage === 'Final' ? 'active' : ''}" data-stage="Final">
                    ${window.RadarIcons?.render('flag', 12) || ''} <span>Final</span>
                  </button>
                </div>
                <div class="menu-divider"></div>
                <div class="menu-section-title">¿Cuándo tiene el dinero?</div>
                ${lead.followUpDate ? `
                  <div class="menu-followup-active">
                    <span>${window.RadarIcons?.render('bell', 12) || ''} <strong>${getFollowUpStatus(lead.followUpDate)?.text || lead.followUpDate}</strong></span>
                    <button type="button" class="btn-menu-clear-date" title="Quitar fecha">${window.RadarIcons?.render('x', 11) || '✕'}</button>
                  </div>
                ` : ''}
                <div class="menu-qdate-pills">
                  <button type="button" class="btn-menu-qdate" data-qdate="tomorrow">${window.RadarIcons?.render('zap', 11, 'text-cyan') || ''} Mañana</button>
                  <button type="button" class="btn-menu-qdate" data-qdate="saturday">${window.RadarIcons?.render('calendar', 11) || ''} Sábado</button>
                  <button type="button" class="btn-menu-qdate" data-qdate="week1">${window.RadarIcons?.render('calendar', 11) || ''} +1 sem</button>
                  <button type="button" class="btn-menu-qdate" data-qdate="week2">${window.RadarIcons?.render('calendar', 11) || ''} +2 sem</button>
                  <button type="button" class="btn-menu-qdate" data-qdate="month_end">${window.RadarIcons?.render('dollarSign', 11, 'text-emerald') || ''} Fin mes</button>
                  <button type="button" class="btn-menu-qdate" data-qdate="month1">${window.RadarIcons?.render('calendar', 11) || ''} +1 mes</button>
                </div>
              ` : ''}
              ${!isSold && lead.processStage ? `
                <div class="menu-divider"></div>
                <button type="button" class="btn-menu-item btn-menu-exclude-touch" title="${lead.touchExcludedAt ? 'Reactivar en Tocar Hoy (+24h)' : 'Excluir de Tocar Hoy (ya le hice follow)'}">
                  ${lead.touchExcludedAt ? (window.RadarIcons?.render('bell', 12) + ' <span>Reactivar en Tocar Hoy</span>') : (window.RadarIcons?.render('bellOff', 12) + ' <span>Excluir de Tocar Hoy (ya toqué)</span>')}
                </button>
              ` : ''}
              <div class="menu-divider"></div>
              <button class="btn-menu-item btn-menu-sale" title="${isSold ? 'Ver / Editar venta' : 'Registrar venta'}">
                ${window.RadarIcons?.render(isSold ? 'edit' : 'dollarSign', 12, 'text-emerald') || ''}
                <span>${isSold ? 'Ver / Editar Venta' : 'Registrar Venta'}</span>
              </button>
              <div class="menu-divider"></div>
              <button class="btn-menu-item btn-menu-trash" title="Quitar del radar">
                ${window.RadarIcons?.render('trash', 12, 'text-red') || ''}
                <span>Quitar del radar</span>
              </button>
            </div>
          </div>
        </div>

        <div class="lead-card-badges" title="Abrir chat de ${escapeHtml(lead.name)}">
          ${ownerBadgeHtml}
          ${planBadgeHtml}
          ${stageBadgeHtml}
          ${followUpBadgeHtml}
          ${silentBadgeHtml}
          ${touchExcludedBadgeHtml}
          <span class="lead-snippet" title="${escapeHtml(lead.lastMessage)}">${escapeHtml(lead.lastMessage || 'Esperando respuesta...')}</span>
        </div>
      `;

      card.querySelector('.lead-card-identity')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openChat(lead);
      });
      card.querySelector('.lead-card-badges')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openChat(lead);
      });

      card.querySelector('.btn-card-open')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openChat(lead);
      });

      card.querySelector('.btn-card-exclude')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        await toggleExcludeTouchLead(lead.conversationId);
      });

      card.querySelector('.btn-card-read')?.addEventListener('click', (e) => {
        e.stopPropagation();
        markLeadAsRead(lead.conversationId);
      });

      const btnMenu = card.querySelector('.btn-card-menu');
      const dropdown = card.querySelector('.lead-menu-dropdown');

      dropdown?.querySelector('.btn-menu-exclude-touch')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        dropdown.classList.add('hidden');
        card.classList.remove('menu-open');
        btnMenu?.classList.remove('active');
        await toggleExcludeTouchLead(lead.conversationId);
      });

      btnMenu?.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpening = dropdown?.classList.contains('hidden');

        document.querySelectorAll('.lead-menu-dropdown').forEach(d => {
          if (d !== dropdown) d.classList.add('hidden');
        });
        document.querySelectorAll('.lead-card').forEach(c => {
          if (c !== card) c.classList.remove('menu-open');
        });
        document.querySelectorAll('.btn-card-menu').forEach(b => {
          if (b !== btnMenu) b.classList.remove('active');
        });

        if (isOpening && dropdown) {
          const btnRect = btnMenu.getBoundingClientRect();
          if (btnRect.bottom + 220 > window.innerHeight) {
            dropdown.classList.add('open-upwards');
          } else {
            dropdown.classList.remove('open-upwards');
          }
          dropdown.classList.remove('hidden');
          card.classList.add('menu-open');
          btnMenu.classList.add('active');
        } else if (dropdown) {
          dropdown.classList.add('hidden');
          card.classList.remove('menu-open');
          btnMenu.classList.remove('active');
        }
      });

      dropdown?.querySelectorAll('.btn-menu-plan').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const newPlan = btn.dataset.plan;
          await setLeadPlan(lead.conversationId, newPlan);
        });
      });

      dropdown?.querySelectorAll('.btn-menu-stage').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const newStage = btn.dataset.stage;
          await setLeadStage(lead.conversationId, newStage);
        });
      });

      dropdown?.querySelectorAll('.btn-menu-qdate').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const q = getQuickFollowUpDate(btn.dataset.qdate);
          if (q) {
            await setLeadFollowUp(lead.conversationId, q.date, q.label);
          }
        });
      });

      dropdown?.querySelector('.btn-menu-clear-date')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        await clearLeadFollowUp(lead.conversationId);
      });

      dropdown?.querySelector('.btn-menu-sale')?.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.add('hidden');
        card.classList.remove('menu-open');
        btnMenu?.classList.remove('active');
        openSaleModal(lead.conversationId);
      });

      dropdown?.querySelector('.btn-menu-trash')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        dropdown.classList.add('hidden');
        card.classList.remove('menu-open');
        btnMenu?.classList.remove('active');
        if (confirm(`¿Quitar a "${lead.name}" del radar?`)) {
          await removeLead(lead.conversationId);
        }
      });

      listEl.appendChild(card);
    });
  }

  renderSalesCustomList();
}

function renderSalesCustomList() {
  const salesListEl = document.getElementById('sales-custom-list');
  const salesCountEl = document.getElementById('sales-section-count');
  if (!salesListEl) return;

  const allSoldLeads = Object.values(watchedLeads).filter(l => l.sale && l.sale.isSold);
  const curMonthKey = getCurrentMonthKey();

  const filteredSoldLeads = allSoldLeads.filter(l => {
    if (selectedSalesMonth === 'all') return true;
    const lKey = getLeadMonthKey(l);
    if (selectedSalesMonth === 'current') {
      return (lKey === curMonthKey || !lKey);
    }
    return (lKey === selectedSalesMonth);
  });

  if (salesCountEl) salesCountEl.innerText = filteredSoldLeads.length;

  salesListEl.innerHTML = '';
  if (filteredSoldLeads.length === 0) {
    salesListEl.innerHTML = `
      <div class="empty-state" style="padding: 24px 10px;">
        <div class="empty-icon">${window.RadarIcons?.render('diamond', 28, 'text-cyan') || ''}</div>
        <p class="empty-title">Sin ventas en este periodo</p>
        <p class="empty-desc">No hay ventas registradas para el filtro seleccionado. Selecciona "Todo el Histórico" o registra una nueva venta.</p>
      </div>`;
    return;
  }

  filteredSoldLeads.sort((a, b) => {
    const dateA = new Date(a.sale.soldAt || a.addedAt || 0).getTime();
    const dateB = new Date(b.sale.soldAt || b.addedAt || 0).getTime();
    return dateB - dateA;
  });

  const currSym = commissionConfig.currency === 'USD' ? '$' : '€';

  filteredSoldLeads.forEach(lead => {
    const card = document.createElement('div');
    card.className = 'sales-lead-card';

    const initials = (lead.name || 'L')
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    const plan = lead.sale.plan || 'Pro';
    const planClass = plan.toLowerCase();
    let earnedComm = commissionConfig.pro || 20;
    if (planClass === 'starter') earnedComm = commissionConfig.starter || 10;
    else if (planClass === 'black') earnedComm = commissionConfig.black || 50;

    const planSym = planPricesConfig.currency === 'USD' ? '$' : '€';
    const defaultAmount = plan === 'Starter'
      ? `${planSym}${planPricesConfig.starter || 29}`
      : plan === 'Pro'
        ? `${planSym}${planPricesConfig.pro || 59}`
        : `${planSym}${planPricesConfig.black || 130}`;
    const amount = lead.sale.amount ? lead.sale.amount : defaultAmount;
    const isAbono = lead.sale.isInstallment;
    const soldDate = lead.sale.soldAt ? new Date(lead.sale.soldAt).toLocaleDateString([], { day: '2-digit', month: 'short' }) : 'Reciente';

    card.innerHTML = `
      <div class="sales-card-left">
        <div class="sales-avatar">${escapeHtml(initials)}</div>
        <div class="sales-meta">
          <div class="sales-lead-name" title="${escapeHtml(lead.name)}">${escapeHtml(lead.name)}</div>
          <div class="sales-date-line">
            ${window.RadarIcons?.render('calendar', 11) || ''}
            <span>${soldDate} · ${lead.sale.hfmId ? `HFM: ${escapeHtml(lead.sale.hfmId)}` : 'Sin ID'}</span>
          </div>
        </div>
      </div>
      <div class="sales-card-right">
        <div class="sales-financials">
          <div class="sales-amount-tag" title="Tu comisión neta por esta venta">+${currSym}${earnedComm}</div>
          <span class="sales-comm-tag">comisión</span>
        </div>
        <span class="sales-plan-pill ${planClass}">${escapeHtml(plan)}${isAbono ? ' (Abono)' : ''}</span>
        <div class="sales-card-actions">
          <button type="button" class="btn-sales-open" title="Abrir chat">
            <span>Abrir</span>
            ${window.RadarIcons?.render('externalLink', 11) || ''}
          </button>
          <button type="button" class="btn-sales-edit" title="Editar venta">
            ${window.RadarIcons?.render('edit', 12) || ''}
          </button>
        </div>
      </div>
    `;

    card.querySelector('.btn-sales-open')?.addEventListener('click', () => openChat(lead));
    card.querySelector('.btn-sales-edit')?.addEventListener('click', () => openSaleModal(lead.conversationId));

    salesListEl.appendChild(card);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.innerText = text || '';
  return div.innerHTML;
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.watchedLeads) {
      watchedLeads = changes.watchedLeads.newValue || {};
      detectActiveTab();
      render();
    }
    if (changes.widgetHidden !== undefined) {
      isWidgetHidden = changes.widgetHidden.newValue;
      updateWidgetVisibilityUI();
    }
    if (changes.keyboardNavigationEnabled !== undefined) {
      isKeyboardNavEnabled = !!changes.keyboardNavigationEnabled.newValue;
      updateKeyboardNavUI();
    }
    if (changes.planPricesConfig) {
      planPricesConfig = { ...planPricesConfig, ...(changes.planPricesConfig.newValue || {}) };
      render();
    }
    if (changes.commissionConfig) {
      commissionConfig = { ...commissionConfig, ...(changes.commissionConfig.newValue || {}) };
      render();
    }
  }
});
