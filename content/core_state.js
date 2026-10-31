// RespondRadar - Módulo 1
const MAX_NAME_WINDOW_MS = 3 * 60 * 1000;
const DEFAULT_FLASH_GREETING = "Hola, cómo estás? De donde eres y qué edad tienes?";
var FLASH_GREETING_MESSAGE = DEFAULT_FLASH_GREETING;
const VIP_TARGET_CHAT_IDS = [
  "548074609",
  "551846513",
  "550389332",
  "552251307",
  "551322271",
  "550993952",
  "550302302",
  "548238128",
  "550389812",
  "549656101"
];

const TEAMMATE_NAMES = [
  'diego tacuri', 'diego tacu', 'dutandiego', '1073785',
  'gabriela moya',
  'daniela moya',
  'claudia montano', 'claudia montaño',
  'sole reynoso', 'reynoso',
  'meredith',
  'dorian',
  'yeray sibaja', 'yeray',
  'dustin lamar', 'dustin',
  'nico vega moreno', 'nico vega', 'vega moreno',
  'juan francisco acevedo', 'juan francisco', 'acevedo',
  'adrian avivar ramirez', 'adrian avivar', 'avivar',
  'agustina fogel', 'agustina',
  'fxkings twb',
  'aracely', 'yuquita', 'yusabeth', 'rodolfo', 'manrique'
];

const TEAMMATE_SHORT_REGEX = [
  /\bdiego\b/i,
  /\bnico\b/i,
  /\bdanny\b/i,
  /\bdylan\b/i,
  /\bjeremy\b/i,
  /\bpz\b/i,
  /\bmoya\b/i
];

function isTeammateName(text) {
  if (!text) return false;
  const s = text.toLowerCase().trim();
  if (s.includes('daniela tacuri') || (s.includes('daniela') && !s.includes('moya'))) {
    return false;
  }
  for (const name of TEAMMATE_NAMES) {
    if (s.includes(name)) return true;
  }
  return TEAMMATE_SHORT_REGEX.some(re => re.test(s));
}

const LEAD_PROCESS_STAGES = [
  { id: '150', label: '150 ✅', icon: '✅', color: '#10b981' },
  { id: 'registro', label: 'En registro', icon: '📝', color: '#38bdf8' },
  { id: 'fondeo', label: 'En fondeo', icon: '💳', color: '#f59e0b' },
  { id: 'ingresando', label: 'Ingresando', icon: '📲', color: '#a855f7' },
  { id: 'revision', label: 'En revisión', icon: '⚠️', color: '#f97316' },
  { id: 'final', label: 'Final', icon: '🏁', color: '#ec4899' }
];

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
    return { status: 'today', text: '¡Hoy tiene el dinero!', badge: '🚨 Hoy' };
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

var watchedLeads = {};
var phraseTrackedLeads = {};
var autoAssignQueue = {};
var dismissedLeads = {};
var lastDetectedSnippet = {};
var customTrackingPhrases = [];
var DEFAULT_FLASH_KEYWORDS = ['KING', 'REY', 'SECRETO'];
var flashTriggerKeywords = ['KING', 'REY', 'SECRETO'];

function buildFlexibleKeywordPattern(word) {
  const clean = String(word).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  if (!clean) return null;
  const tokens = clean.split(/\s+/).filter(Boolean);
  const tokenPatterns = tokens.map(token => {
    const parts = [];
    for (const ch of token) {
      if (/[a-z0-9]/.test(ch)) {
        parts.push(ch + '+');
      } else {
        parts.push('\\' + ch);
      }
    }
    let p = parts.join('[\\s._-]*');
    if (token.endsWith('y')) {
      p += '(?:es|s)?';
    } else if (token.endsWith('g') || token.endsWith('o') || token.endsWith('a') || token.endsWith('e')) {
      p += '[s]?';
    }
    return p;
  });
  const inner = tokenPatterns.join('[\\s._-]+');
  return new RegExp('(?:^|[^a-z0-9])' + inner + '(?:$|[^a-z0-9])', 'i');
}

function isFlashTriggerMatch(text, customKeywords = null) {
  if (!text) return false;
  const raw = String(text);
  const norm = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^[↙↗↖↘▲▼►◄\s]+/, '').trim();

  if (/\bfx\s*[-_]?\s*(?:k+i+n+g+[s]?|r+e+y+[e]?s?|s+e+c+r+e+t+o+[s]?)\b/i.test(norm) || norm.includes('fxking') || norm.includes('fxkings')) {
    return false;
  }

  const isCrown = raw.includes('👑') && (norm.length <= 4 || /^[👑\s¡!¿?._-]+$/.test(raw));
  if (isCrown) return true;

  const keywords = (Array.isArray(customKeywords) && customKeywords.length) ? customKeywords : flashTriggerKeywords;
  for (const kw of keywords) {
    if (!kw) continue;
    if (!/[a-z0-9]/i.test(kw)) {
      if (raw.includes(kw)) return true;
      continue;
    }
    const rgx = buildFlexibleKeywordPattern(kw);
    if (rgx && rgx.test(norm)) return true;
  }
  return false;
}
var planPricesConfig = {
  starter: 29,
  pro: 59,
  black: 130,
  currency: 'EUR'
};

function matchesTrackingPhrase(text) {
  if (!text || typeof text !== 'string' || !customTrackingPhrases || !customTrackingPhrases.length) return false;
  const clean = text.toLowerCase().replace(/\s+/g, ' ').trim();
  if (clean.length < 5) return false;

  for (const phrase of customTrackingPhrases) {
    if (!phrase) continue;
    const cleanPhrase = phrase.toLowerCase().replace(/\s+/g, ' ').trim();
    if (cleanPhrase.length >= 4 && clean.includes(cleanPhrase)) {
      return true;
    }
  }
  return false;
}
var isSoundEnabled = true;
var keyboardNavigationEnabled = true;
var isWidgetHidden = false;
var isWidgetExpanded = false;
var isFollowPopoverOpen = false;
var isMenuOpen = false;
var activeFloatingMenuTab = 'pipeline';
var activeFollowPopoverTab = 'planes';
var isBridgeOnline = true;
var isSyncingBridge = false;
var isInternalDomUpdate = false;
var scanDebounceTimer = null;
var sequentialSession = null;
var crawlAbortController = null;
var lastUrl = window.location.href;

var flashApartadorState = {
  active: false,
  get running() { return this.active; },
  set running(v) { this.active = !!v; },
  timerId: null,
  apartadosCount: 0,
  scannedCount: 0,
  skippedCount: 0,
  statusText: 'Iniciando Auto-Apartador Flash...',
  processedIds: new Set(),
  isProcessingCandidate: false,
  priorityCandidateId: null,
  targetAdvisorName: 'Daniela Tacuri',
  apartadosList: []
};

var apiSessionState = {
  token: null,
  spaceId: '384258',
  userId: '76248775',
  userName: 'Daniela Tacuri',
  hasEndpoints: false,
  lastUpdated: 0
};

window.addEventListener('RADAR_API_SESSION_UPDATED', (e) => {
  if (e && e.detail) {
    const d = e.detail;
    apiSessionState.token = d.token || apiSessionState.token;
    apiSessionState.spaceId = d.spaceId || apiSessionState.spaceId;
    apiSessionState.userId = d.userId || apiSessionState.userId;
    apiSessionState.userName = d.userName || apiSessionState.userName;
    apiSessionState.hasEndpoints = !!(d.endpoints && (d.endpoints.assign || d.endpoints.takeover || d.endpoints.sendMessage));
    apiSessionState.lastUpdated = Date.now();
  }
});

setTimeout(() => {
  window.dispatchEvent(new CustomEvent('RADAR_REQUEST_API_SESSION'));
}, 60);

function isExtensionValid() {
  return typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime.id;
}

function safeStorageSet(data) {
  if (!isExtensionValid()) return Promise.resolve();
  try {
    return chrome.storage.local.set(data).catch(() => { });
  } catch (e) {
    return Promise.resolve();
  }
}

function safeSendMessage(msg, callback) {
  if (!isExtensionValid()) return;
  try {
    chrome.runtime.sendMessage(msg, (response) => {
      if (chrome.runtime?.lastError) {
        if (typeof callback === 'function') callback(null);
        return;
      }
      if (typeof callback === 'function') callback(response);
    });
  } catch (e) {
    if (typeof callback === 'function') callback(null);
  }
}

var sharedAudioCtx = null;
var hasUserInteracted = false;

function unlockAudioContext() {
  hasUserInteracted = true;
  try {
    const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtxClass) return;
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioCtxClass();
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => { });
    }
  } catch (e) { }
}

['click', 'keydown', 'pointerdown', 'mousedown', 'touchstart'].forEach(evt => {
  window.addEventListener(evt, unlockAudioContext, { passive: true, capture: true });
});

function playSalesAlertSound() {
  if (!isSoundEnabled) return;
  try {
    const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtxClass) return;

    const isActivationActive = typeof navigator !== 'undefined' && navigator.userActivation
      ? navigator.userActivation.hasBeenActive
      : hasUserInteracted;

    if (!isActivationActive && (!sharedAudioCtx || sharedAudioCtx.state !== 'running')) {
      return;
    }

    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioCtxClass();
    }

    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => { });
      if (sharedAudioCtx.state !== 'running') {
        return;
      }
    }

    const ctx = sharedAudioCtx;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(987.77, now + 0.12);
    gain2.gain.setValueAtTime(0.35, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.35);
  } catch (err) { }
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '...' : str;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.innerText = text || '';
  return div.innerHTML;
}

function normalizeContactName(name) {
  if (!name) return '';
  const stripped = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return stripped || name.trim().toLowerCase();
}

function isContactNameMatch(nameA, nameB) {
  if (!nameA || !nameB) return false;
  const cleanA = normalizeContactName(nameA);
  const cleanB = normalizeContactName(nameB);
  if (!cleanA || !cleanB) return false;

  if (cleanA === cleanB) return true;

  const digitsA = cleanA.match(/\d{7,16}/);
  const digitsB = cleanB.match(/\d{7,16}/);
  if (digitsA && digitsB && digitsA[0] === digitsB[0]) {
    return true;
  }

  const wordsA = cleanA.split(/\s+/).filter(w => w.length > 1);
  const wordsB = cleanB.split(/\s+/).filter(w => w.length > 1);
  if (wordsA.length === 0 || wordsB.length === 0) return false;

  if (wordsA.length === 1 || wordsB.length === 1) {
    return wordsA.length === 1 && wordsB.length === 1 && wordsA[0] === wordsB[0];
  }

  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  let commonCount = 0;
  for (const w of setA) {
    if (setB.has(w)) commonCount++;
  }

  if (commonCount >= 2) {
    return true;
  }

  return false;
}

function isDateString(str) {
  if (!str) return false;
  const s = str.trim().toLowerCase();

  const daysRegex = /^(domingo|s[aá]bado|sabado|viernes|jueves|mi[eé]rcoles|miercoles|martes|lunes|sunday|saturday|friday|thursday|wednesday|tuesday|monday|dom|s[aá]b|sab|vie|jue|mi[eé]|mie|mar|lun|ayer|yesterday|hoy|today)[.,\s]*$/i;
  if (daysRegex.test(s)) return true;

  if (/^\d{1,2}:\d{2}(?:\s*(?:am|pm))?[.,\s]*$/i.test(s)) return true;

  if (/^(?:domingo|s[aá]bado|sabado|viernes|jueves|mi[eé]rcoles|miercoles|martes|lunes|sunday|saturday|friday|thursday|wednesday|tuesday|monday|dom|s[aá]b|sab|vie|jue|mi[eé]|mie|mar|lun|ayer|yesterday|hoy|today)[.,\s]+\d{1,2}:\d{2}(?:\s*(?:am|pm))?[.,\s]*$/i.test(s)) return true;

  if (/^(?:\d{1,2}\s+(?:de\s+)?(?:oct|nov|dic|sep|ago|jul|jun|may|abr|mar|feb|ene|octubre|noviembre|diciembre|septiembre|agosto|julio|junio|mayo|abril|marzo|febrero|enero)|(?:oct|nov|dic|sep|ago|jul|jun|may|abr|mar|feb|ene)\s+\d{1,2}|\d{1,2}[\/\-\.]\d{1,2}(?:[\/\-\.]\d{2,4})?)(?:\s+\d{1,2}:\d{2}(?:\s*(?:am|pm))?)?[.,\s]*$/i.test(s)) return true;

  if (/^(?:hace\s*)?\d+\s*(?:d|d[ií]as|dias|h|horas|m|min|minutos|days|hours|mins)(?:\s*ago)?[.,\s]*$/i.test(s)) return true;

  const cleanTokens = s.replace(/^(?:domingo|s[aá]bado|sabado|viernes|jueves|mi[eé]rcoles|miercoles|martes|lunes|sunday|saturday|friday|thursday|wednesday|tuesday|monday|dom|s[aá]b|sab|vie|jue|mi[eé]|mie|mar|lun|ayer|yesterday|hoy|today)\b/i, '')
    .replace(/\b\d{1,2}:\d{2}(?:\s*(?:am|pm))?\b/i, '')
    .replace(/\b(?:am|pm)\b/i, '')
    .replace(/[\d\s.,\/:–\-]/g, '');
  if (cleanTokens.length === 0 && s.length > 0) return true;

  return false;
}

function isTagOrRoleLine(str) {
  if (!str) return false;
  const s = str.trim();
  if (/^(New Lead|Lead|Customer|Assigned|Process|Follow-up|Offer|Booked|Lost|FU|Abierta|Cerrada)$/i.test(s)) return true;
  if (/^(?:[🟢🔵🟣🟠🌸🩵💛⭐👤⏳👑\s]*)(?:Dylan|Danny|Juan|Pz|Diego|Aracely|Yuquita|Yusabeth|Mío|Mine|Mio|Sales Agent|Sin asignar)(?:[🟢🔵🟣🟠🌸🩵💛⭐👤⏳👑\s]*)$/i.test(s)) return true;
  if (/^(instagram|whatsapp|facebook|telegram|web|email)$/i.test(s)) return true;
  return false;
}

function isNameMatch(text, contactName) {
  if (!text || !contactName) return false;
  const lowerT = text.toLowerCase().trim();
  const lowerN = contactName.toLowerCase().trim();
  if (lowerT === lowerN) return true;
  if (lowerT.startsWith(lowerN) && lowerT.length < lowerN.length + 20) return true;

  const normT = normalizeContactName(text);
  const normN = normalizeContactName(contactName);
  if (normN && (normT === normN || normT.startsWith(normN) || normT.includes(normN)) && normT.length < normN.length + 20) return true;

  return false;
}

function parseTimeMinutesAgo(text) {
  if (!text) return null;
  if (/(?:just now|ahora|hace instantes|hace un momento|right now)/i.test(text)) return 0;

  const minMatch = text.match(/(?:hace\s+)?(\d+)\s*(?:m|min|mins|minutos?)(?:\s+ago)?/i);
  if (minMatch) return parseInt(minMatch[1], 10);

  if (/(?:yesterday|ayer|d[ií]as?|days?|semanas?|weeks?|meses?|months?|\b202\d\b)/i.test(text)) return 9999;
  const hrMatch = text.match(/(?:hace\s+)?(\d+)\s*(?:h|hr|hrs|horas?)(?:\s+ago)?/i);
  if (hrMatch) return parseInt(hrMatch[1], 10) * 60;

  const timeMatch = text.match(/\b(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?\b/);
  if (timeMatch) {
    let [_, hh, mm, ampm] = timeMatch;
    let h = parseInt(hh, 10);
    const m = parseInt(mm, 10);
    if (ampm) {
      ampm = ampm.toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
    }
    const now = new Date();
    let cardDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
    let diffMs = now.getTime() - cardDate.getTime();

    if (!ampm && h < 12 && diffMs < -120000) {
      const altCardDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h + 12, m, 0);
      const altDiffMs = now.getTime() - altCardDate.getTime();
      if (altDiffMs >= -120000) {
        cardDate = altCardDate;
        diffMs = altDiffMs;
      }
    }

    if (diffMs < -120000) {
      cardDate.setDate(cardDate.getDate() - 1);
      diffMs = now.getTime() - cardDate.getTime();
    }

    if (diffMs < 0 && diffMs >= -120000) return 0;
    return diffMs / 60000;
  }
  return null;
}

function estimateChatAgeDays(timeStr) {
  if (!timeStr) return 0;
  const s = timeStr.toLowerCase().replace(/[.,]/g, '').trim();

  if (/^\d{1,2}:\d{2}/.test(s) || s.includes('am') || s.includes('pm') || s.includes('hoy') || s.includes('today')) {
    return 0;
  }

  if (s.includes('ayer') || s.includes('yesterday')) {
    return 1;
  }

  if (s.includes('dom') || s.includes('sun')) return 1;
  if (s.includes('sáb') || s.includes('sab') || s.includes('sat')) return 2;
  if (s.includes('vie') || s.includes('fri')) return 3;
  if (s.includes('jue') || s.includes('thu')) return 4;
  if (s.includes('mié') || s.includes('mie') || s.includes('wed')) return 5;
  if (s.includes('mar') || s.includes('tue')) return 6;

  const agoMatch = s.match(/(?:hace\s*)?(\d+)\s*(?:d|días|dias|days)/);
  if (agoMatch) {
    return parseInt(agoMatch[1], 10);
  }

  const months = {
    ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
    jan: 0, apr: 3, aug: 7, dec: 11
  };

  for (const [mName, mIdx] of Object.entries(months)) {
    if (s.includes(mName)) {
      const dayMatch = s.match(/\b(\d{1,2})\b/);
      if (dayMatch) {
        const day = parseInt(dayMatch[1], 10);
        const now = new Date();
        const refDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let year = now.getFullYear();
        let chatDate = new Date(year, mIdx, day);
        if (chatDate > refDate) {
          chatDate = new Date(year - 1, mIdx, day);
        }
        const diffMs = refDate.getTime() - chatDate.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays >= 0) return diffDays;
      }
    }
  }

  return 0;
}

async function loadStoredData() {
  try {
    const data = await chrome.storage.local.get(['watchedLeads', 'phraseTrackedLeads', 'autoAssignQueue', 'dismissedLeads', 'soundEnabled', 'widgetHidden', 'bridgeOnline', 'customTrackingPhrases', 'flashGreetingMessage', 'planPricesConfig', 'flashTriggerKeywords', 'keyboardNavigationEnabled']);
    watchedLeads = data.watchedLeads || {};
    phraseTrackedLeads = data.phraseTrackedLeads || {};
    autoAssignQueue = data.autoAssignQueue || {};
    dismissedLeads = data.dismissedLeads || {};
    if (data.bridgeOnline !== undefined) isBridgeOnline = !!data.bridgeOnline;
    if (data.keyboardNavigationEnabled !== undefined) keyboardNavigationEnabled = !!data.keyboardNavigationEnabled;
    if (data.planPricesConfig) {
      planPricesConfig = { ...planPricesConfig, ...data.planPricesConfig };
    }
    if (Array.isArray(data.flashTriggerKeywords) && data.flashTriggerKeywords.length > 0) {
      flashTriggerKeywords = data.flashTriggerKeywords;
    } else {
      flashTriggerKeywords = [...DEFAULT_FLASH_KEYWORDS];
    }
    try {
      localStorage.setItem('__radar_flash_keywords', JSON.stringify(flashTriggerKeywords));
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('RADAR_SET_FLASH_KEYWORDS', { detail: { keywords: flashTriggerKeywords } }));

    if (Array.isArray(data.customTrackingPhrases)) {
      customTrackingPhrases = data.customTrackingPhrases;
      try {
        localStorage.setItem('__radar_tracking_phrases', JSON.stringify(customTrackingPhrases));
      } catch (e) {}
    }
    if (typeof data.flashGreetingMessage === 'string' && data.flashGreetingMessage.trim()) {
      FLASH_GREETING_MESSAGE = data.flashGreetingMessage.trim();
    } else {
      FLASH_GREETING_MESSAGE = DEFAULT_FLASH_GREETING;
    }
    try {
      localStorage.setItem('__radar_flash_greeting', FLASH_GREETING_MESSAGE);
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('RADAR_SET_FLASH_GREETING', { detail: { greeting: FLASH_GREETING_MESSAGE } }));

    let cleaned = false;
    for (const id in watchedLeads) {
      const l = watchedLeads[id];
      const clean = normalizeContactName(l.name);
      if (clean.includes('12224464') || clean.includes('vantage')) {
        delete watchedLeads[id];
        cleaned = true;
        continue;
      }
      if (
        l.owner === 'mine' &&
        !l.manuallyWatched &&
        !l.processStage &&
        !l.followUpDate &&
        !(l.sale && l.sale.isSold) &&
        !l.source &&
        typeof matchesTrackingPhrase === 'function' &&
        matchesTrackingPhrase(l.lastMessage)
      ) {
        phraseTrackedLeads[id] = {
          conversationId: id,
          spaceId: l.spaceId || '384258',
          name: l.name,
          trackedByPhrase: true,
          addedAt: l.addedAt || new Date().toISOString(),
          lastMessage: l.lastMessage || '',
          lastMessageTime: l.lastMessageTime || new Date().toISOString(),
          unreadCount: 0
        };
        delete watchedLeads[id];
        cleaned = true;
      }
    }
    for (const qKey in autoAssignQueue) {
      if (qKey.includes('12224464') || qKey.includes('vantage')) {
        delete autoAssignQueue[qKey];
        cleaned = true;
      }
    }
    if (cleaned) {
      await safeStorageSet({ watchedLeads, phraseTrackedLeads, autoAssignQueue, dismissedLeads });
    }

    if (typeof updateWidgetUI === 'function') updateWidgetUI();
    if (typeof updateChatListBadges === 'function') updateChatListBadges();
  } catch (e) {
    console.error('Error loading stored data:', e);
  }
}
