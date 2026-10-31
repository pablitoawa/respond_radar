

(function () {
  if (window.__respondRadarBridgeLoaded) return;
  window.__respondRadarBridgeLoaded = true;

  const apiSession = {
    token: null,
    spaceId: null,
    userId: null,
    userName: null,
    authHeaders: {},
    endpoints: {
      assign: null,
      takeover: null,
      sendMessage: null
    },
    samplePayloads: {},
    lastCapturedAt: null
  };

  try {
    const cached = sessionStorage.getItem('__radar_api_session');
    if (cached) {
      const parsed = JSON.parse(cached);

      Object.assign(apiSession, parsed);
    }
  } catch (e) { }

  function persistSession() {
    apiSession.lastCapturedAt = Date.now();
    try {
      sessionStorage.setItem('__radar_api_session', JSON.stringify(apiSession));
    } catch (e) { }
    window.dispatchEvent(new CustomEvent('RADAR_API_SESSION_UPDATED', { detail: { ...apiSession } }));
  }

  const PROTECTED_TEAMMATES_NAMES = [
    'diego tacuri', 'dutandiego', 'diego tacu', '1073785',
    'gabriela moya', 'daniela moya',
    'claudia montano', 'claudia montaño',
    'sole reynoso', 'soledad reynoso',
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

  const PROTECTED_TEAMMATES_REGEX = [
    /\bdiego\b/i,
    /\bnico\b/i,
    /\bdanny\b/i,
    /\bdylan\b/i,
    /\bjeremy\b/i,
    /\bpz\b/i,
    /\bmoya\b/i
  ];

  function isTeammateCheck(text) {
    if (!text) return false;
    const s = String(text).toLowerCase().trim();
    if (apiSession.userName && s.includes(apiSession.userName.toLowerCase())) return false;
    if (s.includes('daniela tacuri') || (s.includes('daniela') && !s.includes('moya'))) return false;
    if (PROTECTED_TEAMMATES_NAMES.some(tm => s.includes(tm))) return true;
    return PROTECTED_TEAMMATES_REGEX.some(re => re.test(s));
  }
  function parseTimestampMs(val) {
    if (!val) return null;
    if (typeof val === 'number') {
      return val < 10000000000 ? val * 1000 : val;
    }
    if (typeof val === 'string') {
      if (/^\d+$/.test(val)) {
        const num = Number(val);
        return num < 10000000000 ? num * 1000 : num;
      }
      const parsed = new Date(val).getTime();
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  function scanLocalStorage() {
    try {
      const pathMatch = window.location.pathname.match(/\/space\/([^/]+)/);
      if (pathMatch) apiSession.spaceId = pathMatch[1];

      const ajsTraits = localStorage.getItem('ajs_user_traits');
      if (ajsTraits) {
        try {
          const traits = JSON.parse(ajsTraits);
          if (traits.userId) apiSession.userId = String(traits.userId);
          if (traits.displayName) apiSession.userName = traits.displayName;
          if (traits.currentSpaceId) apiSession.spaceId = String(traits.currentSpaceId);
          console.log(`👤 [RespondRadar API] Asesor identificado vía ajs_user_traits: "${apiSession.userName}" (ID: ${apiSession.userId})`);
        } catch (e) { }
      }

      const ajsUserId = localStorage.getItem('ajs_user_id');
      if (ajsUserId && !apiSession.userId) {
        try {
          apiSession.userId = String(JSON.parse(ajsUserId));
        } catch (e) {
          apiSession.userId = String(ajsUserId).replace(/^"|"$/g, '');
        }
      }

      const idToken = localStorage.getItem('ID_TOKEN');
      if (idToken) {
        apiSession.token = `Bearer ${idToken}`;
        apiSession.authHeaders['authorization'] = apiSession.token;
      }

      const storageList = [localStorage, sessionStorage];
      for (const st of storageList) {
        if (!st) continue;
        for (let i = 0; i < st.length; i++) {
          const key = st.key(i);
          if (!key) continue;
          const val = st.getItem(key);
          if (!val || typeof val !== 'string') continue;

          if (!apiSession.token) {
            const jwtMatch = val.match(/eyJh[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+/);
            if (jwtMatch) {
              apiSession.token = `Bearer ${jwtMatch[0]}`;
              apiSession.authHeaders['authorization'] = apiSession.token;
              console.log(`🔑 [RespondRadar API] Token JWT Bearer detectado en ${st === localStorage ? 'localStorage' : 'sessionStorage'} (${key})`);
            } else if (val.startsWith('Bearer ') && val.length > 30) {
              apiSession.token = val;
              apiSession.authHeaders['authorization'] = val;
              console.log('🔑 [RespondRadar API] Token Bearer detectado:', key);
            }
          }

          if (!apiSession.userId && (val.includes('Daniela Tacuri') || val.includes('Diego Tacuri'))) {
            try {
              const parsed = JSON.parse(val);
              findAdvisorUserId(parsed);
            } catch (e) { }
          }
        }
      }
      persistSession();
    } catch (e) { }
  }

  function findAdvisorUserId(obj) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      obj.forEach(findAdvisorUserId);
      return;
    }
    const name = obj.name || obj.displayName || obj.fullName || obj.firstName;
    if (typeof name === 'string' && (name.toLowerCase().includes('daniela') || name.toLowerCase().includes('diego'))) {
      const id = obj.id || obj._id || obj.userId || obj.user_id;
      if (id) {
        apiSession.userId = String(id);
        apiSession.userName = name;
        console.log(`👤 [RespondRadar API] ID de usuario detectado: ${apiSession.userName} (${apiSession.userId})`);
      }
    }
    for (const k in obj) {
      if (typeof obj[k] === 'object') findAdvisorUserId(obj[k]);
    }
  }

  scanLocalStorage();

  function extractHeaders(rawHeaders) {
    const res = {};
    if (!rawHeaders) return res;
    if (typeof rawHeaders.forEach === 'function') {
      rawHeaders.forEach((val, key) => { res[key.toLowerCase()] = val; });
    } else if (typeof rawHeaders === 'object') {
      for (const k in rawHeaders) {
        res[k.toLowerCase()] = rawHeaders[k];
      }
    }
    return res;
  }

  function analyzeNetworkRequest(url, method, headers, body) {
    if (!url || typeof url !== 'string') return;
    const lowerUrl = url.toLowerCase();

    if (headers && headers['authorization']) {
      const auth = headers['authorization'];
      if (auth.startsWith('Bearer ') && auth !== apiSession.token) {
        apiSession.token = auth;
        apiSession.authHeaders = { ...headers };
        console.log('🔑 [RespondRadar API] Nuevo Bearer token capturado de petición HTTP.');
        persistSession();
      }
    }

    const spaceMatch = url.match(/\/space\/([^\/?#]+)/i);
    if (spaceMatch && spaceMatch[1]) {
      apiSession.spaceId = spaceMatch[1];
    }

    if (lowerUrl.includes('/assign') || lowerUrl.includes('/assignee') || lowerUrl.includes('assignconversation') || (body && typeof body === 'string' && (body.includes('assigneeId') || body.includes('AssignConversation') || body.includes('assignConversation')))) {
      apiSession.endpoints.assign = {
        url,
        method: method || 'POST',
        headers: { ...headers }
      };
      if (body) {
        try {
          const parsed = JSON.parse(body);
          apiSession.samplePayloads.assign = parsed;
          if (parsed.assigneeId || parsed.userId) {
            apiSession.userId = String(parsed.assigneeId || parsed.userId);
          } else if (parsed.variables?.assigneeId || parsed.variables?.userId) {
            apiSession.userId = String(parsed.variables.assigneeId || parsed.variables.userId);
          }
        } catch (e) { }
      }
      console.log('🎯 [RespondRadar API] Endpoint de Asignación capturado:', url);
      persistSession();
    }

    if (lowerUrl.includes('/takeover') || lowerUrl.includes('/take-over') || lowerUrl.includes('/pause') || (body && typeof body === 'string' && (body.includes('takeover') || body.includes('take_over') || body.includes('pauseBot') || body.includes('PauseBot')))) {
      apiSession.endpoints.takeover = {
        url,
        method: method || 'POST',
        headers: { ...headers }
      };
      console.log('🛑 [RespondRadar API] Endpoint de Asumir/Takeover capturado:', url);
      persistSession();
    }

    if (lowerUrl.includes('/message') || lowerUrl.includes('/send') || lowerUrl.includes('sendmessage') || (body && typeof body === 'string' && (body.includes('SendMessage') || body.includes('sendMessage') || (body.includes('message') && body.includes('text'))))) {
      apiSession.endpoints.sendMessage = {
        url,
        method: method || 'POST',
        headers: { ...headers }
      };
      if (body) {
        try {
          apiSession.samplePayloads.sendMessage = JSON.parse(body);
        } catch (e) { }
      }
      console.log('💬 [RespondRadar API] Endpoint de Envío de Mensaje capturado:', url);
      persistSession();
    }
  }

  const originalFetch = window.fetch;
  window.fetch = async function (resource, init) {
    try {
      const url = typeof resource === 'string' ? resource : (resource?.url || '');
      const method = (init?.method || (typeof resource === 'object' ? resource?.method : 'GET')) || 'GET';
      const headers = extractHeaders(init?.headers || (typeof resource === 'object' ? resource?.headers : null));
      const body = init?.body || (typeof resource === 'object' ? resource?.body : null);
      analyzeNetworkRequest(url, method, headers, typeof body === 'string' ? body : null);
    } catch (e) { }

    const response = await originalFetch.apply(this, arguments);

    try {
      const url = typeof resource === 'string' ? resource : (resource?.url || '');
      if (url.includes('/user') || url.includes('/me') || url.includes('/profile') || url.includes('/member')) {
        response.clone().json().then(data => {
          findAdvisorUserId(data);
          if (apiSession.userId) persistSession();
        }).catch(() => { });
      }
    } catch (e) { }

    return response;
  };

  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSetHeader = XMLHttpRequest.prototype.setRequestHeader;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this.__radarMethod = method;
    this.__radarUrl = url;
    this.__radarHeaders = {};
    return originalXHROpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.setRequestHeader = function (header, value) {
    if (this.__radarHeaders) {
      this.__radarHeaders[header.toLowerCase()] = value;
    }
    return originalXHRSetHeader.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    try {
      analyzeNetworkRequest(this.__radarUrl, this.__radarMethod, this.__radarHeaders, typeof body === 'string' ? body : null);
    } catch (e) { }
    return originalXHRSend.apply(this, arguments);
  };

  const processedTakeoverIds = new Set();
  const recentReassigns = new Map();
  const crossTabLockChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('radar_king_cross_tab_lock') : null;

  function tryAcquireCrossTabKingLock(cIdStr) {
    if (!cIdStr) return false;
    const now = Date.now();
    const lockKey = `__radar_king_lock_${cIdStr}`;
    try {
      const existing = localStorage.getItem(lockKey);
      if (existing) {
        const timestamp = parseInt(existing, 10);
        if (now - timestamp < 45000) {
          return false;
        }
      }
      localStorage.setItem(lockKey, String(now));
    } catch (e) { }

    try {
      if (crossTabLockChannel) {
        crossTabLockChannel.postMessage({ type: 'KING_LOCKED', conversationId: cIdStr, timestamp: now });
      }
    } catch (e) { }

    return true;
  }

  function releaseCrossTabKingLock(cIdStr) {
    if (!cIdStr) return;
    try { localStorage.removeItem(`__radar_king_lock_${cIdStr}`); } catch (e) { }
    try {
      if (crossTabLockChannel) {
        crossTabLockChannel.postMessage({ type: 'KING_UNLOCKED', conversationId: cIdStr });
      }
    } catch (e) { }
  }

  if (crossTabLockChannel) {
    crossTabLockChannel.onmessage = (event) => {
      const data = event.data;
      if (data && data.type === 'KING_LOCKED' && data.conversationId) {
        const cId = String(data.conversationId);
        processedTakeoverIds.add(cId);
        window.dispatchEvent(new CustomEvent('RADAR_TURBO_LOCK_CONTACT', {
          detail: { conversationId: cId, externalTab: true }
        }));
      } else if (data && data.type === 'KING_UNLOCKED' && data.conversationId) {
        const cId = String(data.conversationId);
        processedTakeoverIds.delete(cId);
      }
    };
  }

  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('__radar_king_lock_')) {
      const cId = e.key.replace('__radar_king_lock_', '');
      if (e.newValue) {
        processedTakeoverIds.add(cId);
        window.dispatchEvent(new CustomEvent('RADAR_TURBO_LOCK_CONTACT', {
          detail: { conversationId: cId, externalTab: true }
        }));
      } else {
        processedTakeoverIds.delete(cId);
      }
    }
  });

  let isFlashApartadorActive = false;
  try {
    isFlashApartadorActive = sessionStorage.getItem('__radar_flash_active') === 'true';
  } catch (e) { }

  window.addEventListener('RADAR_SET_FLASH_ACTIVE', (e) => {
    isFlashApartadorActive = !!(e.detail?.active);
    console.log(`⚡ [RespondRadar Bridge] Estado de Auto-Apartador Flash actualizado: ${isFlashApartadorActive ? 'ACTIVO' : 'INACTIVO'}`);
  });

  let activeRespondWebSocket = null;
  const OriginalWebSocket = window.WebSocket;

  window.WebSocket = function (...args) {
    const ws = new OriginalWebSocket(...args);
    try {
      const url = args[0] || '';
      if (typeof url === 'string' && (url.includes('service.respond.io/socket') || url.includes('/socket/v2/ws') || url.includes('respond.io'))) {
        activeRespondWebSocket = ws;
        console.log('⚡ [RespondRadar Socket] Respond.io WebSocket interceptado con éxito en MAIN world!');
        ws.addEventListener('message', (event) => {
          try {
            handleIncomingSocketFrame(event.data);
          } catch (e) {
            console.error('⚠️ [RespondRadar Socket Error]:', e);
          }
        });
      }
    } catch (e) { }
    return ws;
  };
  window.WebSocket.prototype = OriginalWebSocket.prototype;
  window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
  window.WebSocket.OPEN = OriginalWebSocket.OPEN;
  window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
  window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;

  let customTrackingPhrases = [];
  try {
    const rawP = localStorage.getItem('__radar_tracking_phrases');
    if (rawP) customTrackingPhrases = JSON.parse(rawP);
  } catch (e) { }

  window.addEventListener('RADAR_SET_TRACKING_PHRASES', (e) => {
    if (Array.isArray(e.detail?.phrases)) {
      customTrackingPhrases = e.detail.phrases;
    }
  });

  window.addEventListener('storage', (e) => {
    if (e.key === '__radar_tracking_phrases') {
      try {
        customTrackingPhrases = JSON.parse(e.newValue || '[]');
      } catch (err) { }
    }
  });

  const DEFAULT_FLASH_GREETING = "Hola, cómo estás? De donde eres y qué edad tienes?";
  let currentFlashGreeting = DEFAULT_FLASH_GREETING;
  try {
    const rawG = localStorage.getItem('__radar_flash_greeting');
    if (rawG && typeof rawG === 'string' && rawG.trim()) currentFlashGreeting = rawG.trim();
  } catch (e) { }

  window.addEventListener('RADAR_SET_FLASH_GREETING', (e) => {
    if (e.detail?.greeting && typeof e.detail.greeting === 'string') {
      currentFlashGreeting = e.detail.greeting.trim() || DEFAULT_FLASH_GREETING;
    }
  });

  window.addEventListener('storage', (e) => {
    if (e.key === '__radar_flash_greeting') {
      currentFlashGreeting = (e.newValue && typeof e.newValue === 'string' && e.newValue.trim()) ? e.newValue.trim() : DEFAULT_FLASH_GREETING;
    }
  });

  const DEFAULT_FLASH_KEYWORDS_BRIDGE = ['KING', 'REY', 'SECRETO'];
  let flashTriggerKeywordsBridge = [...DEFAULT_FLASH_KEYWORDS_BRIDGE];
  try {
    const rawK = localStorage.getItem('__radar_flash_keywords');
    if (rawK) {
      const parsed = JSON.parse(rawK);
      if (Array.isArray(parsed) && parsed.length > 0) flashTriggerKeywordsBridge = parsed;
    }
  } catch (e) { }

  window.addEventListener('RADAR_SET_FLASH_KEYWORDS', (e) => {
    if (Array.isArray(e.detail?.keywords) && e.detail.keywords.length > 0) {
      flashTriggerKeywordsBridge = e.detail.keywords;
    }
  });

  window.addEventListener('storage', (e) => {
    if (e.key === '__radar_flash_keywords') {
      try {
        const parsed = JSON.parse(e.newValue || '[]');
        if (Array.isArray(parsed) && parsed.length > 0) flashTriggerKeywordsBridge = parsed;
      } catch (err) { }
    }
  });

  function buildFlexibleKeywordPatternBridge(word) {
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

  function isFlashTriggerMatchBridge(text) {
    if (!text) return false;
    const raw = String(text);
    const norm = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^[↙↗↖↘▲▼►◄\s]+/, '').trim();

    if (/\bfx\s*[-_]?\s*(?:k+i+n+g+[s]?|r+e+y+[e]?s?|s+e+c+r+e+t+o+[s]?)\b/i.test(norm) || norm.includes('fxking') || norm.includes('fxkings')) {
      return false;
    }

    const isCrown = raw.includes('👑') && (norm.length <= 4 || /^[👑\s¡!¿?._-]+$/.test(raw));
    if (isCrown) return true;

    for (const kw of flashTriggerKeywordsBridge) {
      if (!kw) continue;
      if (!/[a-z0-9]/i.test(kw)) {
        if (raw.includes(kw)) return true;
        continue;
      }
      const rgx = buildFlexibleKeywordPatternBridge(kw);
      if (rgx && rgx.test(norm)) return true;
    }
    return false;
  }

  function matchesTrackingPhraseBridge(text) {
    return false;
  }

  function handleIncomingSocketFrame(rawData) {
    if (!rawData || typeof rawData !== 'string') return;
    try {
      const parsed = JSON.parse(rawData);

      const eventData = parsed.data || parsed;
      if (eventData?.type === 'OnChatActivity' || parsed.type === 'OnChatActivity') {
        const activity = eventData.payload?.chatActivity || eventData.chatActivity || parsed.payload?.chatActivity;
        if (!activity) return;

        const anyContactId = String(activity.contactId || activity.payload?.contactId || activity.conversationId || '');
        if (anyContactId && processedTakeoverIds.has(anyContactId)) {
          const actType = String(activity.type || '').toLowerCase();
          const newAssigneeId = String(
            activity.payload?.assigneeUserId ||
            activity.payload?.userId ||
            activity.contact?.assigneeUserId ||
            activity.contact?.assignee?.id ||
            ''
          );
          const newAssigneeName = String(
            activity.payload?.assigneeName ||
            activity.contact?.assignee?.name ||
            activity.contact?.assigneeName ||
            ''
          ).toLowerCase();
          const myUid = String(apiSession.userId || '76248775');

          const isWorkflowOrBotSteal =
            actType.includes('assign') ||
            actType.includes('workflow') ||
            (newAssigneeId && newAssigneeId !== myUid && (newAssigneeId === '1073778' || newAssigneeId === '0' || newAssigneeName.includes('sales') || newAssigneeName.includes('agent') || newAssigneeName.includes('bot')));

          if (isWorkflowOrBotSteal) {
            const nowRe = Date.now();
            const lastRe = recentReassigns.get(`wf_${anyContactId}`) || 0;
            if (nowRe - lastRe > 600) {
              recentReassigns.set(`wf_${anyContactId}`, nowRe);
              const token = apiSession.token || (localStorage.getItem('ID_TOKEN') ? `Bearer ${localStorage.getItem('ID_TOKEN')}` : null);
              const targetSpace = apiSession.spaceId || '384258';
              console.log(`🛡️ [RespondRadar Socket Anti-Workflow 0ms] Detectada interferencia de Workflow/Sales Agent en King ${anyContactId}. Re-afirmando a Daniela Tacuri...`);
              originalFetch(`https://app.respond.io/api/v2/contact/${anyContactId}/assign`, {
                method: 'PUT',
                headers: {
                  'content-type': 'application/json',
                  'accept': 'application/json, text/plain, */*',
                  'x-requested-with': 'XMLHttpRequest',
                  ...(token ? { 'authorization': token } : {}),
                  'botid': String(targetSpace),
                  'orgid': '378238',
                  'timezone': 'America/Bogota'
                },
                credentials: 'include',
                body: JSON.stringify({ assigneeUserId: Number(myUid) })
              }).catch(() => {});
            }
          }
        }

        if (!isFlashApartadorActive && activity.traffic === 'outgoing' && activity.type === 'message') {
          const outContactId = activity.contactId || activity.payload?.contactId || activity.conversationId;
          if (outContactId) {
            const outText = activity.payload?.message?.text || activity.payload?.message?.content || activity.text || '';
            window.dispatchEvent(new CustomEvent('RADAR_SOCKET_CHAT_ACTIVITY', {
              detail: {
                traffic: 'outgoing',
                contactId: String(outContactId),
                text: outText,
                createdAt: activity.createdAt || activity.payload?.message?.createdAt || new Date().toISOString(),
                spaceId: apiSession.spaceId || '384258'
              }
            }));

            if (matchesTrackingPhraseBridge(outText)) {
              console.log(`🛡️ [RespondRadar Phrase Tracker 0ms] ¡Frase de Dey enviada en chat ${outContactId}! Blindando lead...`);
              window.dispatchEvent(new CustomEvent('RADAR_PHRASE_MATCH_DETECTED', {
                detail: {
                  conversationId: String(outContactId),
                  name: activity.contact?.name || `Lead #${outContactId}`,
                  text: outText,
                  traffic: 'outgoing'
                }
              }));
            }
          }
        }

        if (activity.traffic === 'incoming' && activity.type === 'message') {
          const rawText = (activity.payload?.message?.text || activity.payload?.message?.content || activity.text || '').toLowerCase().trim();
          const contactId = activity.contactId || activity.payload?.contactId || activity.conversationId;
          const contactChannelId = activity.contactChannelId;
          const channel = activity.payload?.channel || activity.channel;
          const contactName = activity.contact?.name || activity.contact?.firstName || activity.sender?.name || `Lead #${contactId}`;

          if (!isFlashApartadorActive && contactId) {
            let msgText = activity.payload?.message?.text || activity.payload?.message?.content || activity.text || activity.payload?.text || '';
            if (!msgText) {
              const mType = activity.messageType || activity.payload?.message?.type || activity.payload?.type || '';
              if (mType === 'audio' || mType === 'voice') msgText = '🎤 [Nota de voz]';
              else if (mType === 'image' || mType === 'photo') msgText = '📷 [Foto]';
              else if (mType === 'video') msgText = '🎥 [Video]';
              else if (mType === 'document' || mType === 'file') msgText = '📎 [Archivo adjunto]';
              else if (mType === 'sticker') msgText = '✨ [Sticker]';
              else msgText = '💬 [Nuevo mensaje]';
            }
            const msgCreatedAt = activity.createdAt || activity.payload?.message?.createdAt || activity.timestamp || new Date().toISOString();
            const msgMs = parseTimestampMs(msgCreatedAt) || 0;
            const isFreshSocketMsg = !msgMs || (Date.now() - msgMs <= 15 * 60 * 1000);

            if (isFreshSocketMsg) {
              window.dispatchEvent(new CustomEvent('RADAR_SOCKET_CHAT_ACTIVITY', {
                detail: {
                  traffic: 'incoming',
                  contactId: String(contactId),
                  text: msgText,
                  name: contactName,
                  createdAt: msgCreatedAt,
                  spaceId: apiSession.spaceId || '384258'
                }
              }));

              if (matchesTrackingPhraseBridge(msgText)) {
                console.log(`🛡️ [RespondRadar Phrase Tracker 0ms] ¡Frase de Dey recibida en chat ${contactId}! Blindando lead...`);
                window.dispatchEvent(new CustomEvent('RADAR_PHRASE_MATCH_DETECTED', {
                  detail: {
                    conversationId: String(contactId),
                    name: contactName,
                    text: msgText,
                    traffic: 'incoming'
                  }
                }));
              }
            }
          }

          const isKingMatch = isFlashTriggerMatchBridge(rawText);

          if (isKingMatch && contactId) {
            console.log(`👑 [RespondRadar Socket 0ms] ¡LEAD DE CAMPAÑA DETECTADO! Contacto ID: ${contactId} | Nombre: "${contactName}" | Texto: "${rawText}"`);

            const myUserId = String(apiSession.userId || '76248775');
            const contactAssigneeId = String(
              activity.contact?.assigneeUserId ||
              activity.contact?.assignee?.id ||
              activity.conversation?.assigneeUserId ||
              activity.conversation?.assignee?.id ||
              activity.payload?.conversation?.assigneeUserId ||
              activity.payload?.conversation?.assignee?.id ||
              ''
            );
            const assigneeObjName = (
              activity.contact?.assignee?.name ||
              activity.contact?.assigneeName ||
              activity.conversation?.assignee?.name ||
              activity.conversation?.assigneeName ||
              activity.payload?.conversation?.assignee?.name ||
              ''
            ).toLowerCase().trim();

            if (
              contactAssigneeId === '1073785' ||
              assigneeObjName.includes('diego tacuri') ||
              assigneeObjName.includes('diego') ||
              assigneeObjName.includes('dutandiego') ||
              assigneeObjName.includes('tacuri')
            ) {
              console.log(`🛡️ [RespondRadar Socket] OMITIDO: Contacto ${contactId} pertenece a Diego Tacuri (ID: 1073785). ¡PROHIBIDO!`);
              return;
            }

            if (isTeammateCheck(assigneeObjName)) {
              console.log(`🛡️ [RespondRadar Socket] OMITIDO: Contacto ${contactId} (${contactName}) ya pertenece al compañero "${assigneeObjName}". ¡PROHIBIDO!`);
              return;
            }

            const isBotOrSales = (
              assigneeObjName.includes('sales agent') ||
              assigneeObjName.includes('sales_agent') ||
              assigneeObjName.includes('sales') ||
              assigneeObjName.includes('bot') ||
              assigneeObjName.includes('agent')
            );
            const hasAssigneeId = contactAssigneeId && contactAssigneeId !== '0' && contactAssigneeId !== 'null' && contactAssigneeId !== 'undefined';
            const hasAssigneeName = assigneeObjName && !assigneeObjName.includes('sin asignar') && !assigneeObjName.includes('unassigned');
            const isUnassigned = (!hasAssigneeId && !hasAssigneeName) || assigneeObjName.includes('sin asignar') || assigneeObjName.includes('unassigned');
            const isMineAlready = (
              (myUserId && contactAssigneeId === myUserId) ||
              (apiSession.userName && assigneeObjName.includes(apiSession.userName.toLowerCase())) ||
              assigneeObjName.includes('daniela tacuri') ||
              (assigneeObjName.includes('daniela') && !assigneeObjName.includes('moya'))
            );

            if (isMineAlready) {
              console.log(`🛡️ [RespondRadar Socket] OMITIDO: Contacto ${contactId} ya está asignado a nosotros. Evitando saludo duplicado.`);
              return;
            }

            if (!isUnassigned && !isBotOrSales) {
              console.log(`🛡️ [RespondRadar Socket] OMITIDO: Contacto ${contactId} (${contactName}) asignado a asesor humano ("${assigneeObjName || contactAssigneeId}"). ¡PROHIBIDO ROBAR!`);
              return;
            }

            const convoStatus = (
              activity.conversation?.status ||
              activity.payload?.conversation?.status ||
              activity.contact?.conversationStatus ||
              activity.status ||
              ''
            ).toLowerCase();
            const hasClosedIndicator =
              convoStatus === 'closed' ||
              activity.conversation?.closedAt ||
              activity.payload?.conversation?.closedAt ||
              (activity.contact?.conversationsCount && activity.contact.conversationsCount > 1) ||
              (activity.contact?.conversationCount && activity.contact.conversationCount > 1);

            if (hasClosedIndicator) {
              console.log(`🛡️ [RespondRadar Socket] OMITIDO: Contacto ${contactId} (${contactName}) tiene conversación cerrada previa. Pertenece al asesor anterior.`);
              return;
            }

            const msgTimestamp = activity.createdAt || activity.payload?.message?.createdAt;
            if (msgTimestamp) {
              const msgMs = parseTimestampMs(msgTimestamp);
              if (msgMs) {
                const msgAgeMinutes = (Date.now() - msgMs) / (1000 * 60);
                if (msgAgeMinutes > 60 && msgAgeMinutes < 525600) {
                  console.log(`🛡️ [RespondRadar Socket] OMITIDO: Mensaje recibido en socket es antiguo (${msgAgeMinutes.toFixed(1)} min).`);
                  return;
                }
              }
            }

            const contactCreatedAt = activity.contact?.createdAt || activity.payload?.contact?.createdAt || activity.conversation?.createdAt;
            if (contactCreatedAt) {
              const createdMs = parseTimestampMs(contactCreatedAt);
              if (createdMs) {
                const contactAgeMinutes = (Date.now() - createdMs) / (1000 * 60);
                if (contactAgeMinutes > 45 && contactAgeMinutes < 525600) {
                  console.log(`📜 [RespondRadar Socket] OMITIDO TURBO: Contacto "${contactName}" (${contactId}) creado hace ${contactAgeMinutes.toFixed(0)} min. Derivando a verificación DOM.`);
                  window.dispatchEvent(new CustomEvent('RADAR_SOCKET_KING_DETECTED', {
                    detail: { contactId, name: contactName, text: rawText, contactChannelId, channel, isRecycled: true }
                  }));
                  return;
                }
              }
            }

            const cIdStr = String(contactId);
            const rawCards = Array.from(document.querySelectorAll('a.conversation-list--item, [data-pw="link-convo-item"]'));
            const matchingCard = rawCards.find(c => {
              const href = c.getAttribute('href') || '';
              return href.includes(`/${cIdStr}`) || (c.dataset && c.dataset.id === cIdStr);
            });
            if (matchingCard) {
              const cardText = (matchingCard.innerText || '').toLowerCase();
              const assigneeEl = matchingCard.querySelector('[data-pw="messages-conversation-item-assignee"]');
              const assigneeAttrs = assigneeEl ? `${assigneeEl.getAttribute('title') || ''} ${assigneeEl.getAttribute('aria-label') || ''}`.toLowerCase() : '';

              if (
                assigneeAttrs.includes('diego') ||
                assigneeAttrs.includes('dutandiego') ||
                assigneeAttrs.includes('1073785')
              ) {
                console.log(`🛡️ [RespondRadar Socket Turbo] OMITIDO: Tarjeta en sidebar pertenece a Diego Tacuri (${contactName}). ¡PROHIBIDO!`);
                return;
              }

              if (assigneeAttrs && isTeammateCheck(assigneeAttrs)) {
                console.log(`🛡️ [RespondRadar Socket Turbo] OMITIDO: Tarjeta en sidebar pertenece a compañero (${contactName}).`);
                return;
              }

              const hasOutgoingArrow = matchingCard.querySelector('[class*="outgoing"], [class*="arrow-up-right"]') || cardText.includes('↗');
              if (hasOutgoingArrow) {
                console.log(`🛡️ [RespondRadar Socket Turbo] OMITIDO: Tarjeta en sidebar ya tiene respuestas salientes previas (↗).`);
                return;
              }
            }

            if (isFlashApartadorActive && !processedTakeoverIds.has(cIdStr)) {

              if (!tryAcquireCrossTabKingLock(cIdStr)) {
                console.log(`🛡️ [RespondRadar Multi-Pestaña] Contacto ${cIdStr} (${contactName}) ya fue reclamado por otra pestaña abierta. Bloqueando saludo duplicado.`);
                processedTakeoverIds.add(cIdStr);
                return;
              }

              processedTakeoverIds.add(cIdStr);
              const tSocketStart = performance.now();

              window.dispatchEvent(new CustomEvent('RADAR_TURBO_LOCK_CONTACT', {
                detail: { conversationId: cIdStr, name: contactName }
              }));

              console.log(`🚀 [RespondRadar Socket TURBO 0ms] ¡King Virgen Detectado! Disparando Asignación y Saludo Flash en 15ms para "${contactName}" (${contactId})...`);

              executeApiFlashTakeover({
                conversationId: contactId,
                name: contactName,
                contactChannelId,
                channel,
                spaceId: apiSession.spaceId,
                greetingText: currentFlashGreeting || DEFAULT_FLASH_GREETING
              }).then((result) => {
                const durationMs = Math.max(1, Math.round(performance.now() - tSocketStart));
                if (result && result.ok) {
                  console.log(`⚡ [RespondRadar Socket TURBO] ¡Capturado con éxito en ${durationMs}ms! "${contactName}" (${contactId})`);
                  window.dispatchEvent(new CustomEvent('RADAR_TURBO_KING_APARTADO_SUCCESS', {
                    detail: {
                      conversationId: String(contactId),
                      name: contactName,
                      text: rawText,
                      contactChannelId,
                      channel,
                      durationMs,
                      result
                    }
                  }));
                } else {
                  console.warn(`⚠️ [RespondRadar Turbo] No se concretó apartado para ${cIdStr} (${result?.error || 'fallo'}).`);

                  if (!result?.attemptedSend) {
                    processedTakeoverIds.delete(cIdStr);
                    releaseCrossTabKingLock(cIdStr);
                    window.dispatchEvent(new CustomEvent('RADAR_TURBO_UNLOCK_CONTACT', {
                      detail: { conversationId: cIdStr, name: contactName, allowRetryGreeting: true }
                    }));
                    window.dispatchEvent(new CustomEvent('RADAR_SOCKET_KING_DETECTED', {
                      detail: { contactId, name: contactName, text: rawText, contactChannelId, channel }
                    }));
                  }
                }
              }).catch(() => {

              });
            } else if (!isFlashApartadorActive) {

              window.dispatchEvent(new CustomEvent('RADAR_SOCKET_KING_DETECTED', {
                detail: { contactId, name: contactName, text: rawText, contactChannelId, channel }
              }));
            }
          }
        }
      }
    } catch (e) { }
  }

  async function executeApiFlashTakeover({ conversationId, name, contactChannelId, channel, spaceId, greetingText, skipMessage = false }) {
    if (!conversationId) {
      return { ok: false, error: 'Falta conversationId' };
    }

    const cIdStr = String(conversationId);
    processedTakeoverIds.add(cIdStr);

    const targetSpace = spaceId || apiSession.spaceId || '384258';
    const GREETING = greetingText || currentFlashGreeting || DEFAULT_FLASH_GREETING;
    const token = apiSession.token || (localStorage.getItem('ID_TOKEN') ? `Bearer ${localStorage.getItem('ID_TOKEN')}` : null);
    const userId = Number(apiSession.userId || '76248775');

    const headers = {
      'content-type': 'application/json',
      'accept': 'application/json, text/plain, */*',
      'x-requested-with': 'XMLHttpRequest',
      ...(token ? { 'authorization': token } : {}),
      'botid': String(targetSpace),
      'orgid': '378238',
      'timezone': 'America/Bogota'
    };

    try {
      const verifyRes = await originalFetch(`https://app.respond.io/api/v2/contact/${cIdStr}`, {
        method: 'GET',
        headers,
        credentials: 'include'
      });
      if (verifyRes && verifyRes.ok) {
        const rawJson = await verifyRes.json();
        const contactData = rawJson?.data || rawJson || {};
        const assigneeObj = contactData.assignee || {};
        const cAssigneeId = String(contactData.assigneeUserId || assigneeObj.id || contactData.assigneeId || '');
        const cAssigneeName = [
          assigneeObj.displayName || '',
          assigneeObj.name || '',
          assigneeObj.firstName || '',
          assigneeObj.lastName || '',
          contactData.assigneeName || '',
          assigneeObj.email || ''
        ].join(' ').toLowerCase().trim();

        if (
          cAssigneeId === '1073785' ||
          cAssigneeName.includes('diego tacuri') ||
          cAssigneeName.includes('diego tacu') ||
          cAssigneeName.includes('dutandiego') ||
          /\bdiego\b/i.test(cAssigneeName)
        ) {
          console.warn(`🛡️ [RespondRadar API Turbo] BLOQUEADO: El contacto ${cIdStr} pertenece a Diego Tacuri (ID: 1073785). ¡TAKEOVER ABORTADO!`);
          processedTakeoverIds.delete(cIdStr);
          window.dispatchEvent(new CustomEvent('RADAR_TURBO_UNLOCK_CONTACT', { detail: { conversationId: cIdStr } }));
          return { ok: false, error: 'Pertenece a Diego Tacuri' };
        }

        if (cAssigneeName && isTeammateCheck(cAssigneeName)) {
          console.warn(`🛡️ [RespondRadar API Turbo] BLOQUEADO: El contacto ${cIdStr} pertenece a compañero "${cAssigneeName}". ¡TAKEOVER ABORTADO!`);
          processedTakeoverIds.delete(cIdStr);
          window.dispatchEvent(new CustomEvent('RADAR_TURBO_UNLOCK_CONTACT', { detail: { conversationId: cIdStr } }));
          return { ok: false, error: `Pertenece a compañero ${cAssigneeName}` };
        }

        const isMineAlready = (
          (userId && cAssigneeId === String(userId)) ||
          (apiSession.userName && cAssigneeName.includes(apiSession.userName.toLowerCase())) ||
          cAssigneeName.includes('daniela tacuri') ||
          (cAssigneeName.includes('daniela') && !cAssigneeName.includes('moya'))
        );
        if (isMineAlready) {
          console.log(`🛡️ [RespondRadar API Turbo] Contacto ${cIdStr} ya está asignado a nosotros. Evitando envío repetido.`);
          return { ok: true, alreadyMine: true };
        }

        const KNOWN_BOT_IDS = ['1073778', '0', 'null', 'undefined', ''];
        const isBot = (
          KNOWN_BOT_IDS.includes(cAssigneeId) ||
          cAssigneeName.includes('sales agent') ||
          cAssigneeName.includes('bot') ||
          cAssigneeName.includes('agent') ||
          assigneeObj.type === 'bot' ||
          assigneeObj.role === 'bot' ||
          assigneeObj.isBot === true ||
          !cAssigneeName
        );

        if (cAssigneeId && !KNOWN_BOT_IDS.includes(cAssigneeId) && cAssigneeId !== String(userId) && !isBot) {
          console.warn(`🛡️ [RespondRadar API Turbo] BLOQUEADO: Contacto ${cIdStr} asignado a asesor humano ajeno (ID: ${cAssigneeId}, Nombre: "${cAssigneeName}"). ¡ABORTANDO!`);
          processedTakeoverIds.delete(cIdStr);
          window.dispatchEvent(new CustomEvent('RADAR_TURBO_UNLOCK_CONTACT', { detail: { conversationId: cIdStr } }));
          return { ok: false, error: 'Asignado a otro asesor' };
        }

        const cCreated = contactData.createdAt || contactData.created_at || contactData.createdDate;
        if (cCreated) {
          const createdMs = parseTimestampMs(cCreated);
          if (createdMs) {
            const ageMin = (Date.now() - createdMs) / 60000;
            if (ageMin > 45 && ageMin < 525600) {
              console.warn(`📜 [RespondRadar API Turbo] Contacto ${cIdStr} no es virgen (${ageMin.toFixed(0)} min). Liberando candado para rescate DOM.`);
              processedTakeoverIds.delete(cIdStr);
              window.dispatchEvent(new CustomEvent('RADAR_TURBO_UNLOCK_CONTACT', { detail: { conversationId: cIdStr } }));
              window.dispatchEvent(new CustomEvent('RADAR_SOCKET_KING_DETECTED', {
                detail: { contactId: cIdStr, name: name || '', isRecycled: true }
              }));
              return { ok: false, error: 'Contacto no virgen' };
            }
          }
        }

        if (
          (contactData.conversationsCount && contactData.conversationsCount > 1) ||
          (contactData.conversationCount && contactData.conversationCount > 1) ||
          (Array.isArray(contactData.conversations) && contactData.conversations.some(cv => cv.status === 'closed' || cv.closedAt))
        ) {
          console.warn(`🛡️ [RespondRadar API Turbo] BLOQUEADO: El contacto ${cIdStr} tiene conversaciones previas. Pertenece al asesor original.`);
          processedTakeoverIds.delete(cIdStr);
          window.dispatchEvent(new CustomEvent('RADAR_TURBO_UNLOCK_CONTACT', { detail: { conversationId: cIdStr } }));
          return { ok: false, error: 'Tiene conversaciones previas' };
        }
      }
    } catch (e) {
      console.log('ℹ️ [RespondRadar Turbo] Pre-verificación API:', e.message);
    }

    window.dispatchEvent(new CustomEvent('RADAR_TURBO_LOCK_CONTACT', {
      detail: { conversationId: cIdStr, name: name || '' }
    }));

    console.log(`⚡ [RespondRadar API Turbo 15ms] Asignando a Daniela Tacuri (ID: ${userId}) y enviando saludo único en chat ${cIdStr}...`);

    const assignUrl = `https://app.respond.io/api/v2/contact/${cIdStr}/assign`;
    const assignPromise = originalFetch(assignUrl, {
      method: 'PUT',
      headers,
      credentials: 'include',
      body: JSON.stringify({ assigneeUserId: userId })
    }).then(r => r.ok).catch(() => false);

    let sendPromise = Promise.resolve(true);
    if (!skipMessage && greetingText !== false && GREETING) {
      const resolvedChannelId = contactChannelId ||
        apiSession.samplePayloads.sendMessage?.contactChannelId ||
        517692485;
      const now = Date.now();
      const sendBody = {
        id: now,
        timestamp: now,
        type: 'message',
        traffic: 'outgoing',
        contactId: Number(cIdStr),
        contactChannelId: Number(resolvedChannelId),
        messageType: 'text',
        payload: {
          message: {
            type: 'text',
            text: GREETING
          },
          sender: {
            source: 'user',
            type: 'message',
            userId: userId,
            teamId: 52147
          },
          replyTo: null,
          limit: 1000,
          channel: channel || { id: 541885, source: 'instagram' },
          status: [],
          meta: { traceId: now }
        }
      };

      sendPromise = originalFetch(`https://app.respond.io/messaging/ajax/message/send`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(sendBody)
      }).then(r => r.ok).catch(() => false);
    }

    const [assignedOk, sentOk] = await Promise.all([assignPromise, sendPromise]);

    const results = {
      takeover: true,
      assigned: assignedOk,
      messageSent: sentOk
    };

    const overallOk = assignedOk || sentOk;
    console.log(`🚀 [RespondRadar API Takeover] Resultado para chat ${cIdStr}:`, results);

    function scheduleAntiWorkflowLock(delayMs, waveNum) {
      const jitter = Math.floor(Math.random() * 40);
      setTimeout(async () => {
        try {
          console.log(`🛡️ [RespondRadar Lock] Ola #${waveNum} (+${delayMs + jitter}ms): Re-afirmando asignación de Daniela Tacuri en ${cIdStr}...`);
          originalFetch(`https://app.respond.io/api/v2/contact/${cIdStr}/assign`, {
            method: 'PUT',
            headers,
            credentials: 'include',
            body: JSON.stringify({ assigneeUserId: userId })
          }).catch(() => { });

          window.dispatchEvent(new CustomEvent('RADAR_CLICK_TAKEOVER_MAIN'));
        } catch (e) { }
      }, delayMs + jitter);
    }

    scheduleAntiWorkflowLock(1200, 1);
    scheduleAntiWorkflowLock(2800, 2);
    scheduleAntiWorkflowLock(4500, 3);
    scheduleAntiWorkflowLock(6500, 4);

    return {
      ok: overallOk,
      attemptedSend: true,
      details: results,
      conversationId: cIdStr,
      name: name || `Lead #${cIdStr}`
    };
  }

  window.addEventListener('RADAR_EXEC_API_TAKEOVER', async (e) => {
    const detail = e.detail || {};
    const result = await executeApiFlashTakeover(detail);
    window.dispatchEvent(new CustomEvent('RADAR_API_TAKEOVER_RESULT', { detail: result }));
  });

  window.addEventListener('RADAR_FORCE_REASSIGN', async (e) => {
    const detail = e.detail || {};
    const conversationId = detail.conversationId;
    if (!conversationId) return;

    const cIdStr = String(conversationId);
    const lastReassign = recentReassigns.get(cIdStr) || 0;
    if (Date.now() - lastReassign < 2000) {
      return;
    }
    recentReassigns.set(cIdStr, Date.now());

    const targetSpace = detail.spaceId || apiSession.spaceId || '384258';
    const token = apiSession.token || (localStorage.getItem('ID_TOKEN') ? `Bearer ${localStorage.getItem('ID_TOKEN')}` : null);
    const userId = Number(apiSession.userId || '76248775');

    const headers = {
      'content-type': 'application/json',
      'accept': 'application/json, text/plain, */*',
      'x-requested-with': 'XMLHttpRequest',
      ...(token ? { 'authorization': token } : {}),
      'botid': String(targetSpace),
      'orgid': '378238',
      'timezone': 'America/Bogota'
    };

    const openAssignContainer = document.querySelector('[data-pendo="messages-assignment"]');
    const openAssignText = (openAssignContainer?.innerText || '').toLowerCase().trim();
    if (openAssignText) {
      if (
        openAssignText.includes('diego tacuri') ||
        openAssignText.includes('dutandiego') ||
        /\bdiego\b/i.test(openAssignText)
      ) {
        console.warn(`🛡️ [RespondRadar Reassign] ABORTADO: Chat ${cIdStr} pertenece a Diego Tacuri.`);
        return;
      }
      if (isTeammateCheck(openAssignText)) {
        console.warn(`🛡️ [RespondRadar Reassign] ABORTADO: Chat ${cIdStr} pertenece a compañero "${openAssignText}".`);
        return;
      }
    }

    console.log(`⚡ [RespondRadar] Re-asignando chat ${cIdStr} limpiamente a Daniela Tacuri (sin bot-status)...`);

    const pAssign = originalFetch(`https://app.respond.io/api/v2/contact/${cIdStr}/assign`, {
      method: 'PUT',
      headers,
      credentials: 'include',
      body: JSON.stringify({ assigneeUserId: userId })
    }).then(r => r.ok).catch(() => false);

    const aOk = await pAssign;
    console.log(`✅ [RespondRadar] Resultado re-asignación chat ${cIdStr}: Asignado=${aOk}`);

    function scheduleAntiWorkflowLock(delayMs, waveNum) {
      setTimeout(async () => {
        try {
          console.log(`🛡️ [RespondRadar Lock] Ola #${waveNum} (+${delayMs}ms): Re-afirmando asignación de Daniela Tacuri en ${cIdStr}...`);
          originalFetch(`https://app.respond.io/api/v2/contact/${cIdStr}/assign`, {
            method: 'PUT',
            headers,
            credentials: 'include',
            body: JSON.stringify({ assigneeUserId: userId })
          }).catch(() => { });
        } catch (e) { }
      }, delayMs);
    }

    scheduleAntiWorkflowLock(1500, 2);

    window.dispatchEvent(new CustomEvent('RADAR_FORCE_REASSIGN_RESULT', {
      detail: { conversationId: cIdStr, success: aOk, assigned: aOk }
    }));
  });

  window.addEventListener('RADAR_REQUEST_API_SESSION', () => {
    window.dispatchEvent(new CustomEvent('RADAR_API_SESSION_UPDATED', { detail: { ...apiSession } }));
  });

  window.addEventListener('RADAR_PAGE_INSERT_TEXT', (e) => {
    try {
      const text = e.detail?.text;
      if (!text) return;
      const qlContainer = document.querySelector('.ql-container');
      const quill = qlContainer?.__quill;
      if (quill) {
        quill.focus();
        quill.setText(text);
        quill.setSelection(text.length, 0);
        console.log('⚡ [RespondRadar Bridge] Texto inyectado con éxito en __quill (MAIN world).');
      }
      const sendBtn = document.querySelector('button[data-pendo="messages-message-composer-send"], [data-pendo="messages-message-composer-send"]');
      if (sendBtn) {
        sendBtn.removeAttribute('disabled');
        sendBtn.setAttribute('data-disabled', 'false');
        sendBtn.disabled = false;
        sendBtn.style.pointerEvents = 'auto';
      }
    } catch (err) {
      console.warn('⚠️ [RespondRadar Bridge] Error inyectando texto en Quill:', err);
    }
  });

  window.addEventListener('RADAR_PAGE_CLICK_SEND', () => {
    try {
      const sendBtn = document.querySelector('button[data-pendo="messages-message-composer-send"], [data-pendo="messages-message-composer-send"]');
      if (sendBtn) {
        sendBtn.removeAttribute('disabled');
        sendBtn.setAttribute('data-disabled', 'false');
        sendBtn.disabled = false;
        sendBtn.style.pointerEvents = 'auto';
        sendBtn.click();
        console.log('🚀 [RespondRadar Bridge] Clic nativo disparado en botón de enviar (MAIN world).');
      }
    } catch (err) {
      console.warn('⚠️ [RespondRadar Bridge] Error clickeando botón de enviar:', err);
    }
  });

  window.addEventListener('RADAR_TURBO_DISPATCH_GREETING', (e) => {
    try {
      const text = e.detail?.text || currentFlashGreeting || DEFAULT_FLASH_GREETING;
      const qlContainer = document.querySelector('.ql-container');
      const quill = qlContainer?.__quill;
      if (quill) {
        quill.focus();
        quill.setText(text);
        quill.setSelection(text.length, 0);
        console.log('⚡ [RespondRadar Turbo] Texto inyectado instantáneamente en __quill (0 ms).');
      }
      const sendBtn = document.querySelector('button[data-pendo="messages-message-composer-send"], [data-pendo="messages-message-composer-send"]');
      if (sendBtn) {
        sendBtn.removeAttribute('disabled');
        sendBtn.setAttribute('data-disabled', 'false');
        sendBtn.disabled = false;
        sendBtn.style.pointerEvents = 'auto';
        sendBtn.click();
        console.log('🚀 [RespondRadar Turbo] Mensaje disparado instantáneamente en 0 ms.');
      }
    } catch (err) {
      console.warn('⚠️ [RespondRadar Turbo] Error en disparo turbo:', err);
    }
  });

  window.addEventListener('RADAR_CLICK_TAKEOVER_MAIN', () => {
    try {

      const directCandidates = Array.from(document.querySelectorAll(
        'button, [role="button"], a.v-btn, a[class*="btn"], [data-pw*="takeover"], [data-testid*="takeover"], [data-pendo*="takeover"]'
      ));

      for (const el of directCandidates) {
        if (el.closest('#respond-radar-widget, #radar-flash-hud')) continue;
        const t = (el.innerText || el.textContent || el.getAttribute('aria-label') || '').trim().toLowerCase();
        if (
          t === 'takeover' ||
          t === 'asumir' ||
          t === 'take over' ||
          t.includes('takeover') ||
          t.includes('asumir') ||
          t.includes('tomar control') ||
          t.includes('stop workflow') ||
          t.includes('detener flujo')
        ) {
          const btn = el.closest('button, [role="button"], a') || el;
          btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
          btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
          btn.click();
          console.log('🚀 [RespondRadar Bridge] Clic nativo Takeover disparado en MAIN world:', t.slice(0, 30));
          return;
        }
      }

      const banners = Array.from(document.querySelectorAll('[class*="banner"], [class*="alert"], [class*="callout"], div[role="alert"]'));
      for (const b of banners) {
        if (b.closest('#respond-radar-widget, #radar-flash-hud')) continue;
        const bText = (b.innerText || '').toLowerCase();
        if (bText.includes('sales agent') || bText.includes('sales is typing') || bText.includes('workflow') || bText.includes('handling')) {
          const actionBtn = b.querySelector('button, [role="button"], a');
          if (actionBtn) {
            actionBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            actionBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
            actionBtn.click();
            console.log('🚀 [RespondRadar Bridge] Clic nativo Takeover en banner disparado en MAIN world.');
            return;
          }
        }
      }
    } catch (e) { }
  });

  async function executeSetContactBotStatus({ conversationId, botStatus = false, spaceId }) {
    if (!conversationId) {
      return { ok: false, error: 'Falta conversationId' };
    }

    const cIdStr = String(conversationId);
    const targetSpace = spaceId || apiSession.spaceId || '384258';
    const token = apiSession.token || (localStorage.getItem('ID_TOKEN') ? `Bearer ${localStorage.getItem('ID_TOKEN')}` : null);

    const headers = {
      'content-type': 'application/json',
      'accept': 'application/json, text/plain, */*',
      'x-requested-with': 'XMLHttpRequest',
      ...(token ? { 'authorization': token } : {}),
      'botid': String(targetSpace),
      'orgid': '378238',
      'timezone': 'America/Bogota'
    };

    const targetVal = Boolean(botStatus);
    console.log(`🛑 [RespondRadar] Modificando botStatus a ${targetVal ? 'ON (true)' : 'OFF (false)'} para contacto ${cIdStr}...`);

    let ok = false;
    let resStatus = null;

    try {
      const res = await originalFetch('https://app.respond.io/api/v2/contact/bot-status', {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          id: Number(cIdStr),
          name: 'botStatus',
          value: targetVal
        })
      });
      resStatus = res ? res.status : null;
      ok = !!(res && (res.ok || res.status === 200 || res.status === 204));
      console.log(`📡 [RespondRadar] PUT /api/v2/contact/bot-status status=${resStatus}, ok=${ok}`);
    } catch (e) {
      console.warn('⚠️ [RespondRadar] Error en PUT /api/v2/contact/bot-status:', e);
    }

    if (!ok) {
      try {
        const resAlt = await originalFetch('https://app.respond.io/api/v2/contact/bot-status', {
          method: 'PUT',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            id: Number(cIdStr),
            name: 'botStatus',
            value: targetVal ? 'on' : 'off'
          })
        });
        if (resAlt && (resAlt.ok || resAlt.status === 200 || resAlt.status === 204)) ok = true;
      } catch (e) {}
    }

    if (!ok) {
      try {
        const resContact = await originalFetch(`https://app.respond.io/api/v2/contact/${cIdStr}`, {
          method: 'PUT',
          headers,
          credentials: 'include',
          body: JSON.stringify({ botStatus: targetVal })
        });
        if (resContact && resContact.ok) ok = true;
      } catch (e) {}
    }

    window.dispatchEvent(new CustomEvent('RADAR_SET_BOT_STATUS_RESULT', {
      detail: { conversationId: cIdStr, botStatus: targetVal, success: ok, status: resStatus }
    }));
    window.dispatchEvent(new CustomEvent('RADAR_DEACTIVATE_AI_RESULT', {
      detail: { conversationId: cIdStr, success: ok }
    }));

    return { ok, conversationId: cIdStr, botStatus: targetVal };
  }

  window.addEventListener('RADAR_EXEC_SET_BOT_STATUS', async (e) => {
    const detail = e.detail || {};
    await executeSetContactBotStatus(detail);
  });

  window.addEventListener('RADAR_EXEC_DEACTIVATE_AI', async (e) => {
    const detail = e.detail || {};
    await executeSetContactBotStatus({ conversationId: detail.conversationId, botStatus: false, spaceId: detail.spaceId });
  });

  if (apiSession.token) {
    persistSession();
  }

  console.log('%c⚡ [RespondRadar] Consola conectada (contexto top). Comandos disponibles:\n👉 RespondRadarBotOff("547237638")       - Apagar el bot (Bot Off) para un chat en 0ms\n👉 RespondRadarBotOn("547237638")        - Re-encender el bot (Bot On) para un chat\n👉 RespondRadarSimulateKingSocket("547237638") - Simular King entrante por WebSocket en 0ms\n👉 RespondRadarShowApiSession()  - Ver token y endpoints capturados de Respond.io\n👉 RespondRadarLearnVIPChats()   - Analizar y aprender de los 9 chats VIP\n👉 RespondRadarLearnActiveChat()  - Aprender del chat abierto en pantalla\n👉 RespondRadarCrawl(5)           - Rastrear chats de 5 días atrás\n👉 RespondRadarScan()             - Escanear estructura del DOM\n👉 RespondRadarStartFlashApartador() - Iniciar Auto-Apartador Flash', 'color: #38bdf8; font-weight: bold; font-size: 11px;');

  window.RespondRadarSetKeywords = function (keywords) {
    let list = [];
    if (typeof keywords === 'string') {
      list = keywords.split(/[,\n]+/).map(k => k.trim()).filter(Boolean);
    } else if (Array.isArray(keywords)) {
      list = keywords.map(k => String(k).trim()).filter(Boolean);
    }
    if (list.length > 0) {
      flashTriggerKeywordsBridge = list;
      try {
        localStorage.setItem('__radar_flash_keywords', JSON.stringify(list));
      } catch (e) {}
      window.dispatchEvent(new CustomEvent('RADAR_SET_FLASH_KEYWORDS', { detail: { keywords: list } }));
      return `✅ Palabras clave actualizadas a: ${list.join(', ')}`;
    }
    return '⚠️ Proporciona palabras válidas (ej: RespondRadarSetKeywords("KING, REY, SECRETO"))';
  };

  window.RespondRadarGetKeywords = function () {
    return flashTriggerKeywordsBridge;
  };

  window.RespondRadarBotOff = async function (convoId) {
    if (!convoId) {
      const match = window.location.pathname.match(/\/inbox\/(\d+)/);
      if (match) convoId = match[1];
    }
    if (!convoId) return '👉 Pasa el ID del chat: RespondRadarBotOff("541479536") o abre un chat';
    const res = await executeSetContactBotStatus({ conversationId: convoId, botStatus: false });
    return res.ok ? `🛑 Bot APAGADO (Bot Off) con éxito para chat ${convoId}` : `⚠️ Solicitud de Bot Off enviada para chat ${convoId} (ver consola)`;
  };

  window.RespondRadarBotOn = async function (convoId) {
    if (!convoId) {
      const match = window.location.pathname.match(/\/inbox\/(\d+)/);
      if (match) convoId = match[1];
    }
    if (!convoId) return '👉 Pasa el ID del chat: RespondRadarBotOn("541479536") o abre un chat';
    const res = await executeSetContactBotStatus({ conversationId: convoId, botStatus: true });
    return res.ok ? `🟢 Bot ENCENDIDO (Bot On) con éxito para chat ${convoId}` : `⚠️ Solicitud de Bot On enviada para chat ${convoId} (ver consola)`;
  };

  window.RespondRadarSetBotStatus = executeSetContactBotStatus;

  window.RespondRadarDeactivateAi = async function (convoId) {
    return window.RespondRadarBotOff(convoId);
  };

  window.RespondRadarShowApiSession = function () {
    console.log('%c🔍 [RespondRadar] Estado actual de la sesión de la API:', 'color: #38bdf8; font-weight: bold;');
    console.table({
      'Token Detectado': apiSession.token ? '🟢 Sí (' + apiSession.token.slice(0, 20) + '...)' : '🔴 Aún no (realiza una acción en Respond.io)',
      'Asesor Activo': apiSession.userId ? `${apiSession.userName} (${apiSession.userId})` : 'Buscando...',
      'Space ID': apiSession.spaceId || 'No detectado',
      'Endpoint Asignar': apiSession.endpoints.assign?.url || 'Esperando captura',
      'Endpoint Asumir/Takeover': apiSession.endpoints.takeover?.url || 'Esperando captura',
      'Endpoint Mensaje': apiSession.endpoints.sendMessage?.url || 'Esperando captura'
    });
    return apiSession;
  };

  window.RespondRadarSimulateKingSocket = function (convoId = "547237638", name = "Lead de Prueba Turbo", text = "King", assigneeUserId = 0, assigneeName = "") {
    const fakeFrame = JSON.stringify({
      channel: `events.${apiSession.spaceId || '384258'}`,
      name: "PlatformEvent",
      data: {
        type: "OnChatActivity",
        module: "messages",
        payload: {
          chatActivity: {
            traffic: "incoming",
            type: "message",
            contactId: Number(convoId),
            contactChannelId: 517692485,
            createdAt: new Date().toISOString(),
            payload: {
              message: { text: text },
              channel: { id: 541885, source: "instagram" }
            },
            contact: {
              name: name,
              assigneeUserId: Number(assigneeUserId) || 0,
              assignee: { id: assigneeUserId || null, name: assigneeName || "" }
            }
          }
        }
      }
    });
    handleIncomingSocketFrame(fakeFrame);
    return `⚡ [RespondRadar] Simulación de socket disparada para chat ${convoId} ("${name}", Asignado a: "${assigneeName || 'Sin asignar'}") con mensaje "${text}"`;
  };

  window.RespondRadarSimulateLeadMessage = function (convoId = "547237638", text = "Hola, ya tengo el dinero listo!", name = "Lead Apartado") {
    const fakeFrame = JSON.stringify({
      channel: `events.${apiSession.spaceId || '384258'}`,
      name: "PlatformEvent",
      data: {
        type: "OnChatActivity",
        module: "messages",
        payload: {
          chatActivity: {
            traffic: "incoming",
            type: "message",
            contactId: Number(convoId),
            createdAt: new Date().toISOString(),
            payload: {
              message: { text: text },
              channel: { id: 541885, source: "instagram" }
            },
            contact: {
              name: name
            }
          }
        }
      }
    });
    handleIncomingSocketFrame(fakeFrame);
    return `⚡ [RespondRadar] Simulación de mensaje entrante disparada para chat ${convoId} con texto: "${text}"`;
  };

  window.RespondRadarTestApiTakeover = async function (convoId) {
    if (!convoId) return '⚠️ Pasa el ID del chat: RespondRadarTestApiTakeover("541479536")';
    return await executeApiFlashTakeover({ conversationId: convoId });
  };

  window.RespondRadarLearnVIPChats = function (ids = null) {
    window.dispatchEvent(new CustomEvent('RADAR_EXEC_LEARN_TARGETS', { detail: { chatIds: ids } }));
    return '⏳ Iniciando navegación y extracción de chats VIP...';
  };

  window.RespondRadarLearnActiveChat = function () {
    window.dispatchEvent(new CustomEvent('RADAR_EXEC_LEARN_CURRENT'));
    return '⏳ Extrayendo mensajes del chat activo y enviando a la IA...';
  };

  window.RespondRadarCrawl = function (days = 5) {
    const targetDays = Number(days) || 5;
    window.dispatchEvent(new CustomEvent('RADAR_EXEC_CRAWL', { detail: { days: targetDays } }));
    return `⏳ Rastreando chats de los últimos ${targetDays} días...`;
  };

  window.RespondRadarScan = function () {
    window.dispatchEvent(new CustomEvent('RADAR_EXEC_SCAN'));
    return '⏳ Analizando elementos de la interfaz de Respond.io...';
  };

  window.RespondRadarStartFlashApartador = function () {
    window.dispatchEvent(new CustomEvent('RADAR_EXEC_START_FLASH'));
    return '⚡ Auto-Apartador Flash activado.';
  };

  window.RespondRadarStopFlashApartador = function () {
    window.dispatchEvent(new CustomEvent('RADAR_EXEC_STOP_FLASH'));
    return '🛑 Auto-Apartador Flash detenido.';
  };

  window.RespondRadarDump = function () {
    try {
      const html = document.documentElement.outerHTML;
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `respond_dump_${Date.now()}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      console.log('✅ [RespondRadar] Dump HTML del DOM exportado y descargado con éxito.');
      return '✅ Dump descargado con éxito.';
    } catch (e) {
      console.error('❌ Error al exportar dump:', e);
      return '❌ Error: ' + e.message;
    }
  };

  window.addEventListener('RADAR_EXEC_DUMP', () => {
    window.RespondRadarDump();
  });

  window.addEventListener('RADAR_SPA_NAVIGATE', (e) => {
    const detail = e.detail || {};
    const conversationId = String(detail.conversationId || '');
    const rawUrl = detail.url || '';

    let targetPath = '';
    try {
      if (rawUrl.startsWith('http')) {
        targetPath = new URL(rawUrl).pathname;
      } else if (rawUrl.startsWith('/')) {
        targetPath = rawUrl;
      }
    } catch (err) { }

    if (!targetPath && conversationId) {
      const spaceId = apiSession.spaceId || '384258';
      targetPath = `/space/${spaceId}/inbox/${conversationId}`;
    }

    console.log(`🚀 [RespondRadar Bridge] Solicitud de navegación suave SPA a: ${targetPath}`);
    let success = false;

    try {
      let router = null;

      const rootEl = document.querySelector('#root') || document.querySelector('[data-v-app]') || document.getElementById('app');
      const vueApp = rootEl?.__vue_app__;

      if (vueApp) {
        if (vueApp.config?.globalProperties?.$router) {
          router = vueApp.config.globalProperties.$router;
        } else if (vueApp._context?.provides) {
          for (const sym of Object.getOwnPropertySymbols(vueApp._context.provides)) {
            const val = vueApp._context.provides[sym];
            if (val && typeof val.push === 'function' && typeof val.replace === 'function') {
              router = val;
              break;
            }
          }
        }
      }

      if (!router) {
        const candidateEls = [
          document.querySelector('.v-application'),
          document.querySelector('.messages-page'),
          document.querySelector('main'),
          document.body.firstElementChild
        ].filter(Boolean);

        for (const el of candidateEls) {
          const comp = el.__vueParentComponent;
          if (comp) {
            const r = comp.appContext?.config?.globalProperties?.$router || comp.proxy?.$router;
            if (r && typeof r.push === 'function') {
              router = r;
              break;
            }
            const provides = comp.appContext?.provides || comp.provides;
            if (provides) {
              for (const sym of Object.getOwnPropertySymbols(provides)) {
                const val = provides[sym];
                if (val && typeof val.push === 'function' && typeof val.replace === 'function') {
                  router = val;
                  break;
                }
              }
            }
          }
          if (router) break;
        }
      }

      if (router && typeof router.push === 'function') {
        console.log('⚡ [RespondRadar Bridge] Vue Router detectado. Ejecutando router.push nativo...');
        router.push(targetPath).then(() => {
          console.log('✅ [RespondRadar Bridge] router.push completado con éxito.');
        }).catch((err) => {
          console.log('ℹ️ [RespondRadar Bridge] router.push info:', err?.message || err);
        });
        success = true;
      }
    } catch (err) {
      console.warn('⚠️ [RespondRadar Bridge] Error intentando Vue Router:', err);
    }

    if (!success && targetPath) {
      try {
        if (window.location.pathname !== targetPath) {
          window.history.pushState(window.history.state || {}, '', targetPath);
          window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
          console.log('✅ [RespondRadar Bridge] pushState + popstate disparado con éxito.');
          success = true;
        } else {
          success = true;
        }
      } catch (err) {
        console.warn('⚠️ [RespondRadar Bridge] Error en pushState:', err);
      }
    }

    window.dispatchEvent(new CustomEvent('RADAR_SPA_NAVIGATE_RESULT', {
      detail: { conversationId, path: targetPath, success }
    }));
  });
})();

