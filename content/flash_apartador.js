// RespondRadar - Módulo 6: Auto-Apartador Flash ("The King")

function isKingTriggerText(text) {
  if (typeof isFlashTriggerMatch === 'function') {
    return isFlashTriggerMatch(text);
  }
  if (!text) return false;
  const s = String(text).toLowerCase().replace(/^[↙↗↖↘▲▼►◄\s]+/, '').trim();
  if (/\bfx\s*[-_]?\s*(?:k+i+n+g+[s]?|r+e+y+[e]?s?|s+e+c+r+e+t+o+[s]?)\b/i.test(s) || s.includes('fxking') || s.includes('fxkings')) {
    return false;
  }
  return /\b(?:k+i+n+g+[s]?|r+e+y+[e]?s?|s+e+c+r+e+t+o+[s]?)\b/i.test(s) || s.includes('👑');
}

function isCardTimestampOlderThanOneHour(timeText) {
  if (!timeText) return false;
  const s = timeText.toLowerCase().trim();

  if (
    s.includes('ayer') || s.includes('yesterday') ||
    (s.includes('hace') && (s.includes('d') || s.includes('sem'))) ||
    /\b\d+[dw]\b/.test(s) ||
    /\b(?:oct|nov|dic|ene|feb|mar|abr|may|jun|jul|ago|sep)\b/.test(s) ||
    /\b(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.test(s)
  ) {
    return true;
  }

  const hourMatch = s.match(/\b(\d+)\s*(?:h|horas?|hrs?)\b/);
  if (hourMatch) {
    const h = parseInt(hourMatch[1], 10);
    if (h >= 1) return true;
  }

  const minMatch = s.match(/\b(\d+)\s*(?:m|min|mins|minutos?)\b/);
  if (minMatch) {
    const m = parseInt(minMatch[1], 10);
    if (m > 60) return true;
    return false;
  }

  const clockMatch = s.match(/\b(\d{1,2}):(\d{2})(?:\s*(am|pm))?\b/i);
  if (clockMatch) {
    let hour = parseInt(clockMatch[1], 10);
    const minute = parseInt(clockMatch[2], 10);
    const ampm = (clockMatch[3] || '').toLowerCase();

    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;

    const now = new Date();
    const msgDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);

    let diffMinutes = (now.getTime() - msgDate.getTime()) / (1000 * 60);
    if (diffMinutes < -10) {
      diffMinutes += 24 * 60;
    }

    if (diffMinutes > 60) {
      return true;
    }
  }

  return false;
}

function isEligibleUnassignedOrSalesAgent(cardInfo, cardEl) {
  if (!cardEl) return false;

  const cardText = (cardEl.innerText || '').toLowerCase();
  const assigneeEl = cardEl.querySelector('[data-pw="messages-conversation-item-assignee"]');
  const assigneeText = (assigneeEl?.innerText || '').toLowerCase();

  if (cardInfo && (cardInfo.owner === 'Daniela (Mía)' || cardInfo.owner === 'Diego (Mío)' || cardInfo.owner === 'Diego')) {
    console.log('🛡️ [FlashApartador] Tarjeta omitida: Ya pertenece a Daniela o Diego Tacuri.');
    return false;
  }

  if (cardInfo && typeof isTeammateName === 'function' && isTeammateName(cardInfo.owner)) {
    console.log(`🛡️ [FlashApartador] Tarjeta omitida: Asignada a compañero "${cardInfo.owner}".`);
    return false;
  }

  const assigneeAttrs = assigneeEl ? [
    assigneeEl.getAttribute('title') || '',
    assigneeEl.getAttribute('aria-label') || '',
    assigneeEl.getAttribute('data-tooltip') || '',
    assigneeText,
    ...Array.from(assigneeEl.querySelectorAll('img[alt]')).map(i => i.alt || ''),
    ...Array.from(assigneeEl.querySelectorAll('[title]')).map(i => i.title || '')
  ].join(' ').toLowerCase() : '';

  if (
    assigneeAttrs.includes('daniela tacuri') ||
    (assigneeAttrs.includes('daniela') && !assigneeAttrs.includes('moya'))
  ) {
    return false;
  }

  if (
    assigneeAttrs.includes('diego tacuri') ||
    assigneeAttrs.includes('diego tacu') ||
    assigneeAttrs.includes('dutandiego') ||
    assigneeAttrs.includes('1073785') ||
    /\bdiego\b/i.test(assigneeAttrs)
  ) {
    console.log('🛡️ [FlashApartador] Tarjeta omitida: Pertenece a Diego Tacuri.');
    return false;
  }

  if (assigneeAttrs && typeof isTeammateName === 'function' && isTeammateName(assigneeAttrs)) {
    console.log(`🛡️ [FlashApartador] Tarjeta omitida: Compañero de equipo detectado en cesionario.`);
    return false;
  }

  const timeEl = cardEl.querySelector('time, [class*="time"], [data-pw*="time"], [class*="date"]');
  const timeText = (timeEl?.innerText || '').toLowerCase();
  if (isCardTimestampOlderThanOneHour(timeText)) {
    console.log(`🛡️ [FlashApartador] Tarjeta omitida: Mensaje antiguo (> 1h o fecha pasada: "${timeText}").`);
    return false;
  }

  const hasHumanPhoto = !!assigneeEl?.querySelector('img[src*="googleusercontent"], img[src*="avatar"]');
  if (hasHumanPhoto && !assigneeAttrs.includes('sales') && !assigneeAttrs.includes('agent') && !assigneeAttrs.includes('bot')) {
    console.log('🛡️ [FlashApartador] Tarjeta omitida: Foto real de asesor humano en cesionario.');
    return false;
  }

  const hasSquareBotIcon = !!assigneeEl?.querySelector('.icon-custom-user-square-bold, [class*="custom-user"]');
  const hasEmojiInAssignee = /\p{Extended_Pictographic}/u.test(assigneeAttrs) || /\p{Extended_Pictographic}/u.test(assigneeEl?.innerText || '');
  const isSalesAgent = (
    hasSquareBotIcon ||
    hasEmojiInAssignee ||
    assigneeAttrs.includes('sales agent') ||
    assigneeAttrs.includes('sales_agent') ||
    assigneeAttrs.includes('sales') ||
    assigneeAttrs.includes('agent') ||
    assigneeAttrs.includes('bot') ||
    cardText.includes('sales agent') ||
    (cardInfo && cardInfo.owner === 'Sales Agent')
  );
  const isUnassigned = !assigneeEl || hasSquareBotIcon || assigneeAttrs.includes('sin asignar') || assigneeAttrs.includes('unassigned') || (cardInfo && cardInfo.owner === 'Sin asignar');
  const isNewLeadStage = cardText.includes('new lead') || cardText.includes('lead') || (cardInfo && cardInfo.stage === 'New Lead');

  if (isSalesAgent || isUnassigned || (isNewLeadStage && !hasHumanPhoto)) {
    return true;
  }

  if (cardInfo && (cardInfo.isOutgoingArrow || cardText.includes('↗') || cardText.includes('tú:') || cardText.includes('you:'))) {
    if (cardInfo.unreadCount === 0 && !cardText.includes('king')) {
      console.log('🛡️ [FlashApartador] Tarjeta omitida: Asesor humano ya respondió (↗) y 0 no leídos.');
      return false;
    }
  }

  console.log('🛡️ [FlashApartador] Tarjeta omitida: No confirmada como Sales Agent ni Sin Asignar (cesionario humano ajeno).');
  return false;
}

function recordLeadApartado({ id, name, text, channel, source }) {
  if (!id) return;
  const cId = String(id);
  const existing = flashApartadorState.apartadosList.find(x => x.id === cId);
  if (!existing) {
    const record = {
      id: cId,
      name: name || `Lead #${cId}`,
      text: text || 'King',
      channel: channel || 'instagram',
      source: source || 'Flash 0ms',
      timestamp: Date.now(),
      timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      url: `https://app.respond.io/space/${apiSessionState?.spaceId || '384258'}/inbox/${cId}`,
      locked: true
    };
    flashApartadorState.apartadosList.push(record);
    try {
      localStorage.setItem('__radar_session_apartados', JSON.stringify(flashApartadorState.apartadosList));
    } catch (e) { }
    console.log(`📋 [RespondRadar] Lead registrado en sesión: "${record.name}" (${record.id}) vía ${record.source}`);
  }
}

const socketChannelMap = new Map();

function trigger0msApiTakeover(conversationId, greetingText, name, contactChannelId, channel) {
  return new Promise((resolve) => {
    let resolved = false;

    const handler = (e) => {
      const res = e.detail;
      if (res && String(res.conversationId) === String(conversationId)) {
        window.removeEventListener('RADAR_API_TAKEOVER_RESULT', handler);
        resolved = true;
        resolve(res);
      }
    };

    window.addEventListener('RADAR_API_TAKEOVER_RESULT', handler);

    window.dispatchEvent(new CustomEvent('RADAR_EXEC_API_TAKEOVER', {
      detail: {
        conversationId,
        name: name || '',
        greetingText: greetingText || FLASH_GREETING_MESSAGE,
        contactChannelId,
        channel,
        spaceId: apiSessionState?.spaceId || '384258'
      }
    }));

    setTimeout(() => {
      if (!resolved) {
        window.removeEventListener('RADAR_API_TAKEOVER_RESULT', handler);
        resolve({ ok: false, error: 'timeout' });
      }
    }, 3500);
  });
}

const sentGreetingConversationIds = new Set();
const countedApartadosIds = new Set();
const lockedTurboNames = new Set();

async function sendFlashKingGreeting(conversationId = null) {
  const GREETING = FLASH_GREETING_MESSAGE || (typeof DEFAULT_FLASH_GREETING !== 'undefined' ? DEFAULT_FLASH_GREETING : "Hola, cómo estás? De donde eres y qué edad tienes?");
  let sent = false;
  let assigned = false;
  const urlConvId = (typeof parseCurrentUrl === 'function' && parseCurrentUrl().conversationId) ? String(parseCurrentUrl().conversationId) : null;
  const cIdStr = (conversationId && !String(conversationId).startsWith('tmp_'))
    ? String(conversationId)
    : (urlConvId || (conversationId ? String(conversationId) : null));
  const activeNameLower = (typeof getActiveContactName === 'function' ? (getActiveContactName() || '') : '').toLowerCase().trim();

  if (
    (cIdStr && sentGreetingConversationIds.has(cIdStr)) ||
    (urlConvId && sentGreetingConversationIds.has(urlConvId)) ||
    (activeNameLower && lockedTurboNames.has(activeNameLower))
  ) {
    console.log(`🛡️ [FlashApartador Anti-Doble] Conversación ${cIdStr || urlConvId} (${activeNameLower}) ya recibió saludo por Turbo/sesión. Evitando envío doble.`);
    if (cIdStr) sentGreetingConversationIds.add(cIdStr);
    if (urlConvId) sentGreetingConversationIds.add(urlConvId);
    assigned = await assignConversationToMe();
    return { ok: true, sent: true, assigned, alreadySent: true };
  }

  const checkIds = Array.from(new Set([cIdStr, urlConvId].filter(Boolean)));
  for (const idToCheck of checkIds) {
    try {
      const lockKey = `__radar_king_lock_${idToCheck}`;
      const lockVal = localStorage.getItem(lockKey);
      if (lockVal) {
        const lockTime = parseInt(lockVal, 10);
        if (Date.now() - lockTime < 45000) {
          console.log(`🛡️ [FlashApartador Candado Atómico] Conversación ${idToCheck} ya fue reclamada por Turbo/otra pestaña. Cancelando saludo DOM.`);
          sentGreetingConversationIds.add(idToCheck);
          if (cIdStr) sentGreetingConversationIds.add(cIdStr);
          assigned = await assignConversationToMe();
          return { ok: true, sent: true, assigned, alreadySent: true };
        }
      }
      localStorage.setItem(lockKey, String(Date.now()));
    } catch (e) { }
  }

  if (typeof hasGreetingAlreadyBeenSent === 'function' && hasGreetingAlreadyBeenSent(GREETING)) {
    console.log('🛡️ [FlashApartador Anti-Doble] Saludo ya fue enviado previamente en este chat según el DOM.');
    if (cIdStr) sentGreetingConversationIds.add(cIdStr);
    assigned = await assignConversationToMe();
    return { ok: true, sent: true, assigned, alreadySent: true };
  }

  console.log('⚡⚡ [FlashApartador] Asegurando Takeover y preparando envío único...');

  const composer = await ensureTakeoverAndComposerReady(1800);
  if (!composer) {
    console.warn('⚠️ [FlashApartador] No se encontró el editor de mensajes tras esperar Takeover.');
    return { ok: false, sent: false, assigned: false, reason: 'composer_not_found' };
  }

  if (typeof hasGreetingAlreadyBeenSent === 'function' && hasGreetingAlreadyBeenSent(GREETING)) {
    console.log('🛡️ [FlashApartador Anti-Doble] Saludo detectado tras Takeover en el chat. Abortando envío duplicado.');
    if (cIdStr) sentGreetingConversationIds.add(cIdStr);
    assigned = await assignConversationToMe();
    return { ok: true, sent: true, assigned, alreadySent: true };
  }

  composer.focus();
  await writeTextIntoComposer(composer, GREETING);

  await new Promise(r => setTimeout(r, 80));

  sent = await triggerMessageSend(composer);

  if (sent && cIdStr) {
    sentGreetingConversationIds.add(cIdStr);
  }

  assigned = await assignConversationToMe();

  const ok = sent;
  console.log(`🏁 [FlashApartador] Resultado final DOM: Sent=${sent}, Assigned=${assigned}, OK=${ok}`);
  return { ok, sent, assigned };
}

let flashHudTimerInterval = null;

function formatFlashElapsedTime(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min >= 60) {
    const hrs = Math.floor(min / 60);
    const remMin = min % 60;
    return `${String(hrs).padStart(2, '0')}:${String(remMin).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function renderFlashApartadorHUD() {
  let hud = document.getElementById('radar-flash-hud');

  if (!flashApartadorState.active) {
    if (hud) hud.remove();
    return;
  }

  if (!hud) {
    hud = document.createElement('div');
    hud.id = 'radar-flash-hud';
    hud.className = 'radar-flash-hud';

    const iconRadio = window.RadarIcons?.render('radio', 13, 'radar-icon-pulse') || '';
    const iconList = window.RadarIcons?.render('list', 13) || '';
    const iconStop = window.RadarIcons?.render('stopCircle', 13) || '';
    const elapsedStr = formatFlashElapsedTime(flashApartadorState.startTime ? (Date.now() - flashApartadorState.startTime) : 0);

    hud.innerHTML = `
      <div class="radar-flash-header">
        <div class="radar-flash-title-wrap">
          <span class="radar-flash-pulsing-dot"></span>
          <span class="radar-flash-title">${iconRadio} RespondRadar Flash</span>
        </div>
        <span class="radar-flash-running-badge">
          ACTIVO <span class="radar-flash-timer" id="radar-flash-timer">${elapsedStr}</span>
        </span>
      </div>
      <div class="radar-flash-stats">
        <div class="radar-flash-stat">
          <span class="stat-label">Apartados</span>
          <span class="stat-val apartados-count">0</span>
        </div>
        <div class="radar-stat-divider"></div>
        <div class="radar-flash-stat">
          <span class="stat-label">Velocidad</span>
          <span class="stat-val stat-speed-val">--</span>
        </div>
        <div class="radar-stat-divider"></div>
        <div class="radar-flash-stat">
          <span class="stat-label">Omitidos</span>
          <span class="stat-val skipped-count">0</span>
        </div>
      </div>
      <div class="radar-flash-status-text" id="radar-flash-status-msg">
        <span class="radar-status-icon-box"></span>
        <span class="radar-status-content">Monitoreando leads en tiempo real</span>
      </div>
      <div class="radar-flash-actions">
        <button type="button" id="radar-flash-view-list-btn" class="radar-flash-btn-list" title="Ver leads de la sesión">
          ${iconList} <span>Leads</span> <span class="radar-flash-badge-pill apartados-count-btn">0</span>
        </button>
        <button type="button" id="radar-flash-stop-btn" class="radar-flash-btn-stop" title="Detener Radar">
          ${iconStop} <span>Detener</span>
        </button>
      </div>
    `;

    hud.querySelector('#radar-flash-view-list-btn')?.addEventListener('click', () => {
      showApartadosSummaryModal();
    });

    hud.querySelector('#radar-flash-stop-btn')?.addEventListener('click', () => {
      stopFlashApartador();
    });

    document.body.appendChild(hud);
  }

  const statusEl = hud.querySelector('#radar-flash-status-msg');
  if (statusEl) {
    const rawText = flashApartadorState.statusText || 'Monitoreando leads en tiempo real';
    const isScanning = /escaneando|esperando/i.test(rawText);
    const isCandidate = /candidato|verificando/i.test(rawText);
    const isSuccess = /capturado|apartado|éxito/i.test(rawText);
    const isError = /error|falló/i.test(rawText);

    let iconName = 'radio';
    let iconClass = 'radar-status-icon-svg';
    if (isScanning) {
      iconName = 'eye';
      iconClass = 'radar-status-icon-svg icon-eye-pulse';
    } else if (isCandidate || isSuccess) {
      iconName = 'zap';
      iconClass = 'radar-status-icon-svg icon-zap-glow';
    } else if (isError) {
      iconName = 'alertCircle';
      iconClass = 'radar-status-icon-svg icon-error';
    }

    const iconSvg = window.RadarIcons?.render(iconName, 13, iconClass) || '';
    const cleanText = rawText.replace(/^[👁️⚡⚠️🛑\s]+/, '').replace(/[👁️⚡]/g, '').trim();

    statusEl.innerHTML = `
      <span class="radar-status-icon-box">${iconSvg}</span>
      <span class="radar-status-content">${escapeHtml(cleanText)}</span>
    `;
    statusEl.title = cleanText;
  }

  const apEl = hud.querySelector('.apartados-count');
  if (apEl && apEl.textContent !== String(flashApartadorState.apartadosCount)) {
    apEl.textContent = String(flashApartadorState.apartadosCount);
  }

  const apBtnEl = hud.querySelector('.apartados-count-btn');
  if (apBtnEl && apBtnEl.textContent !== String(flashApartadorState.apartadosCount)) {
    apBtnEl.textContent = String(flashApartadorState.apartadosCount);
  }

  const skipEl = hud.querySelector('.skipped-count');
  if (skipEl && skipEl.textContent !== String(flashApartadorState.skippedCount)) {
    skipEl.textContent = String(flashApartadorState.skippedCount);
  }

  const speedValEl = hud.querySelector('.stat-speed-val');
  if (speedValEl) {
    const zapIcon = window.RadarIcons?.render('zap', 11, 'radar-icon-speed') || '';
    if (flashApartadorState.lastDurationMs) {
      const cleanMs = String(flashApartadorState.lastDurationMs).replace(/ms/gi, '');
      speedValEl.innerHTML = `${zapIcon} <span>${cleanMs}ms</span>`;
    } else {
      speedValEl.innerHTML = '--';
    }
  }

  const timerEl = hud.querySelector('#radar-flash-timer');
  if (timerEl && flashApartadorState.startTime) {
    timerEl.textContent = formatFlashElapsedTime(Date.now() - flashApartadorState.startTime);
  }
}

function openInboxCard(cardEl) {
  if (!cardEl) return false;
  const linkEl = cardEl.matches('a[href*="/inbox/"]') ? cardEl : (cardEl.closest('a[href*="/inbox/"]') || cardEl.querySelector('a[href*="/inbox/"]'));
  const innerClickable = cardEl.querySelector('[data-pw="link-convo-item"]') || cardEl;

  triggerPointerClick(innerClickable);
  if (linkEl && linkEl !== innerClickable) {
    triggerPointerClick(linkEl);
  }

  if (typeof innerClickable.click === 'function') innerClickable.click();
  if (linkEl && typeof linkEl.click === 'function') linkEl.click();

  return true;
}

let lastOmissionTime = 0;
let lastGlobalScanTakeoverClickTime = 0;

async function runFlashApartadorStep() {
  if (!flashApartadorState.active) return;
  if (flashApartadorState.isProcessingCandidate) return;

  flashApartadorState.timerId = null;

  try {
    try { ensureTodosFolderActive(); } catch (e) { }

    let cards = [];
    if (typeof getInboxCards === 'function') {
      try {
        cards = getInboxCards();
      } catch (e) {
        console.warn('⚠️ [FlashApartador] Error en getInboxCards:', e);
      }
    }
    if (!cards || cards.length === 0) {
      const rawCardEls = Array.from(document.querySelectorAll('a[href*="/inbox/"], [data-pw="link-convo-item"], a.conversation-list--item, .v-virtual-scroll__item, [class*="conversation-list-item"]'));
      const seenKeys = new Set();
      cards = [];
      for (const el of rawCardEls) {
        const cardEl = el.closest('a[href*="/inbox/"], a.conversation-list--item, .v-virtual-scroll__item') || el;
        const convId = extractCardConversationId(cardEl);
        const key = convId || cardEl;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          cards.push(cardEl);
        }
      }
    }

    let targetCard = null;
    let targetInfo = null;

    if (flashApartadorState.priorityCandidateId) {
      const pId = String(flashApartadorState.priorityCandidateId);
      if (!flashApartadorState.processedIds.has(pId)) {
        for (const card of cards) {
          let info = null;
          try { info = analyzeInboxCard(card); } catch (e) { }
          if (info && String(info.conversationId) === pId) {
            if (isEligibleUnassignedOrSalesAgent(info, card)) {
              targetCard = card;
              targetInfo = info;
              console.log(`🚀 [FlashApartador TURBO] ¡Candidato prioritario de Socket ${pId} localizado en el DOM!`);
              break;
            }
          }
        }

        if (!targetCard) {
          const scrollContainer = document.querySelector('.v-virtual-scroll, [class*="inbox-conversation-list"], [class*="conversation-list"]');
          if (scrollContainer && scrollContainer.scrollTop === 0) {
            scrollContainer.scrollTop = 70;
            setTimeout(() => { if (scrollContainer) scrollContainer.scrollTop = 0; }, 200);
          }
        }
      }
    }

    if (!targetCard) {
      for (const card of cards) {
        let info = null;
        try {
          info = analyzeInboxCard(card);
        } catch (e) {
          continue;
        }
        if (!info || !info.conversationId) continue;
        const infoNameLower = (info.name || '').toLowerCase().trim();
        if (
          flashApartadorState.processedIds.has(info.conversationId) ||
          sentGreetingConversationIds.has(info.conversationId) ||
          (infoNameLower && lockedTurboNames.has(infoNameLower))
        ) {
          continue;
        }

        const previewEl = card.querySelector('[data-pw="messages-conversation-item-preview"], .conversation-list-item--message, [class*="preview"], [class*="snippet"]');
        const previewText = (previewEl?.innerText || previewEl?.textContent || '').trim();
        const snippetText = (info.snippet || '').trim();

        let candidateMsgText = previewText || snippetText;
        if (!candidateMsgText) {
          const contactName = info.name || getCardContactName(card) || '';
          let cardClean = (card.innerText || '').trim();
          if (contactName) {
            cardClean = cardClean.split(contactName).join('');
          }
          candidateMsgText = cardClean;
        }

        if (!isKingTriggerText(candidateMsgText)) continue;

        if (!isEligibleUnassignedOrSalesAgent(info, card)) {
          continue;
        }

        targetCard = card;
        targetInfo = info;
        break;
      }
    }

    if (!targetCard) {
      const cur = parseCurrentUrl();
      if (cur.conversationId && !flashApartadorState.processedIds.has(String(cur.conversationId))) {
        let openAssignee = null;
        try { openAssignee = getOpenChatAssigneeStatus(); } catch (e) { }
        if (openAssignee?.isAllowed) {
          const lastMsg = getActiveConversationLastLeadMessage() || '';

          if (isKingTriggerText(lastMsg)) {
            console.log(`🎯 [FlashApartador] ¡El chat actualmente abierto (${cur.conversationId}) es un candidato King legítimo! Mensaje: "${lastMsg}"`);
            targetInfo = {
              conversationId: cur.conversationId,
              name: getActiveContactName() || 'Lead',
              snippet: lastMsg
            };
            targetCard = cards.find(c => extractCardConversationId(c) === cur.conversationId) || document.body;
          }
        } else if (openAssignee && !openAssignee.isAllowed) {

          flashApartadorState.processedIds.add(String(cur.conversationId));
        }
      }
    }

    const activeTakeoverBtn = typeof findAsumirButton === 'function' ? findAsumirButton() : null;
    if (activeTakeoverBtn && (Date.now() - lastGlobalScanTakeoverClickTime > 1500)) {
      const cur = parseCurrentUrl();
      const cIdStr = cur.conversationId ? String(cur.conversationId) : null;
      if (cIdStr && (sentGreetingConversationIds.has(cIdStr) || countedApartadosIds.has(cIdStr) || isKingTriggerText(getActiveConversationLastLeadMessage() || ''))) {
        lastGlobalScanTakeoverClickTime = Date.now();
        console.log(`🛡️ [FlashApartador Scan] Botón Takeover detectado en chat abierto ${cIdStr}. Neutralizando bot...`);
        clickElementByCoordinates(activeTakeoverBtn);
        triggerRadixClick(activeTakeoverBtn);
        if (typeof activeTakeoverBtn.click === 'function') activeTakeoverBtn.click();
        window.dispatchEvent(new CustomEvent('RADAR_CLICK_TAKEOVER_MAIN'));
      }
    }

    if (targetCard && targetInfo) {
      let targetCId = String(targetInfo.conversationId);
      const targetNameLower = (targetInfo.name || '').toLowerCase().trim();

      if (
        sentGreetingConversationIds.has(targetCId) ||
        flashApartadorState.processedIds.has(targetCId) ||
        (targetNameLower && lockedTurboNames.has(targetNameLower))
      ) {
        console.log(`🛡️ [FlashApartador Anti-Doble] Conversación ${targetCId} (${targetInfo.name}) ya fue apartada por Modo Turbo API. Ignorando escaneo DOM.`);
        flashApartadorState.priorityCandidateId = null;
        return;
      }

      flashApartadorState.priorityCandidateId = null;
      flashApartadorState.isProcessingCandidate = true;
      flashApartadorState.statusText = `Abriendo chat de ${targetInfo.name}...`;
      renderFlashApartadorHUD();

      console.log(`🎯 [FlashApartador TURBO] Candidato King detectado: "${targetInfo.name}" (${targetInfo.conversationId}).`);

      try {

        openInboxCard(targetCard);

        let navigated = false;
        const targetName = (targetInfo.name || '').toLowerCase().trim();

        for (let w = 0; w < 60; w++) {
          const cur = parseCurrentUrl();
          const curCId = cur.conversationId ? String(cur.conversationId) : '';
          const curActiveName = (getActiveContactName() || '').toLowerCase().trim();
          const isCardSelected = targetCard.classList?.contains('selected') ||
            targetCard.getAttribute('selected') === 'true' ||
            targetCard.getAttribute('aria-selected') === 'true';

          if (
            (curCId && curCId === targetCId) ||
            window.location.href.includes(targetCId) ||
            (curActiveName && targetName && (curActiveName === targetName || curActiveName.includes(targetName) || targetName.includes(curActiveName))) ||
            isCardSelected
          ) {
            navigated = true;
            break;
          }
          if (w === 5 || w === 20 || w === 40) {
            openInboxCard(targetCard);
          }
          await new Promise(r => setTimeout(r, 20));
        }

        if (!navigated) {
          console.warn(`⚠️ [FlashApartador] No se pudo cambiar la URL a ${targetInfo.conversationId} a tiempo. Reintentando en siguiente ciclo...`);
          flashApartadorState.isProcessingCandidate = false;
          if (flashApartadorState.active) {
            flashApartadorState.timerId = setTimeout(runFlashApartadorStep, 80);
          }
          return;
        }

        const realNavCId = String(parseCurrentUrl().conversationId || '');
        if (realNavCId) {
          if (sentGreetingConversationIds.has(realNavCId) || flashApartadorState.processedIds.has(realNavCId)) {
            console.log(`🛡️ [FlashApartador Anti-Doble] El chat abierto (${realNavCId}) ya fue capturado por Modo Turbo API. Abortando envío duplicado en DOM.`);
            flashApartadorState.processedIds.add(targetCId);
            flashApartadorState.processedIds.add(realNavCId);
            flashApartadorState.isProcessingCandidate = false;
            if (flashApartadorState.active) {
              flashApartadorState.timerId = setTimeout(runFlashApartadorStep, 80);
            }
            return;
          }
          flashApartadorState.processedIds.add(targetCId);
          targetCId = realNavCId;
          targetInfo.conversationId = realNavCId;
        }

        flashApartadorState.processedIds.add(targetCId);

        await new Promise(r => setTimeout(r, 35));

        const assigneeStatus = getOpenChatAssigneeStatus();
        if (!assigneeStatus.isAllowed) {
          console.log(`⏩ [FlashApartador] Omitido: Chat ya asignado en cabecera a ${assigneeStatus.name}.`);
          lastOmissionTime = Date.now();
          flashApartadorState.skippedCount++;
          flashApartadorState.statusText = `⏩ Omitido ${targetInfo.name} (asignado a ${assigneeStatus.name})`;
          renderFlashApartadorHUD();
          flashApartadorState.isProcessingCandidate = false;
          if (flashApartadorState.active) {
            flashApartadorState.timerId = setTimeout(runFlashApartadorStep, 100);
          }
          return;
        }

        const isClean = await checkChatHasCleanFreshHistory(targetInfo.conversationId, assigneeStatus.isSalesAgent);

        if (!isClean) {
          console.log(`⏩ [FlashApartador] Omitido: Historial previo o compañero detectado en ${targetInfo.name}.`);
          lastOmissionTime = Date.now();
          flashApartadorState.skippedCount++;
          flashApartadorState.statusText = `⏩ Omitido ${targetInfo.name} (historial previo o compañero)`;
          renderFlashApartadorHUD();
          flashApartadorState.isProcessingCandidate = false;

          if (flashApartadorState.active) {
            flashApartadorState.timerId = setTimeout(runFlashApartadorStep, 100);
          }
          return;
        }

        const chatLeadMsg = getActiveConversationLastLeadMessage() || '';
        const chatPaneText = (document.querySelector('[data-pw="conversation-messages-list"], [class*="chat-messages"], [class*="conversation-view"]')?.innerText || '');
        const isKingInChat = isKingTriggerText(chatLeadMsg) ||
          isKingTriggerText(targetInfo.snippet) ||
          isKingTriggerText(chatPaneText);

        if (!isKingInChat) {
          console.log(`🛡️ [FlashApartador] ABORTADO: No se encontró la palabra clave King en el chat de ${targetInfo.name}. Ignorando.`);
          lastOmissionTime = Date.now();
          flashApartadorState.skippedCount++;
          flashApartadorState.statusText = `⏩ Omitido ${targetInfo.name} (no es King)`;
          renderFlashApartadorHUD();
          flashApartadorState.isProcessingCandidate = false;

          if (flashApartadorState.active) {
            flashApartadorState.timerId = setTimeout(runFlashApartadorStep, 100);
          }
          return;
        }

        const earlyAsumir = findAsumirButton();
        if (earlyAsumir) {
          clickElementByCoordinates(earlyAsumir);
          triggerRadixClick(earlyAsumir);
          triggerPointerClick(earlyAsumir);
          if (typeof earlyAsumir.click === 'function') earlyAsumir.click();
          window.dispatchEvent(new CustomEvent('RADAR_CLICK_TAKEOVER_MAIN'));
        }

        flashApartadorState.statusText = `🚀 Apartando y asignando a Daniela Tacuri...`;
        renderFlashApartadorHUD();

        if (sentGreetingConversationIds.has(targetCId)) {
          console.log(`🛡️ [FlashApartador Anti-Doble] Conversación ${targetCId} ya recibió saludo por Turbo API. Abortando saludo doble en DOM.`);
          flashApartadorState.isProcessingCandidate = false;
          return;
        }

        const tDomStart = performance.now();
        const domResult = await sendFlashKingGreeting(targetInfo.conversationId);
        const resultOk = domResult && domResult.ok && domResult.sent;
        const domMs = Math.round(performance.now() - tDomStart);
        const domMsText = `${domMs}ms`;

        try {
          window.dispatchEvent(new CustomEvent('RADAR_FORCE_REASSIGN', {
            detail: {
              conversationId: targetInfo.conversationId,
              spaceId: (typeof apiSessionState !== 'undefined' && apiSessionState?.spaceId) ? apiSessionState.spaceId : '384258'
            }
          }));
        } catch (e) { }

        if (resultOk) {
          if (!countedApartadosIds.has(targetCId)) {
            countedApartadosIds.add(targetCId);
            flashApartadorState.apartadosCount++;
          }
          flashApartadorState.lastDurationMs = domMsText;
          flashApartadorState.lastLeadName = targetInfo.name;
          flashApartadorState.statusText = `Apartado en ${domMsText} · ${targetInfo.name}`;
          recordLeadApartado({
            id: targetCId,
            name: targetInfo.name,
            text: targetInfo.snippet || 'King',
            channel: 'instagram',
            source: `DOM Takeover (${domMsText})`,
            duration: domMsText
          });
          renderFlashApartadorHUD();
          playSalesAlertSound();
          if (typeof showCrawlProgressToast === 'function') {
            showCrawlProgressToast(`${targetInfo.name} apartado en ${domMsText} (Total: ${flashApartadorState.apartadosCount})`);
          }

          startDomAntiWorkflowWatchdog(targetCId);
        } else {
          console.warn(`⚠️ [FlashApartador] No se pudo enviar el saludo a ${targetInfo.name}. Permitiendo reintento...`);

          flashApartadorState.processedIds.delete(targetCId);
          flashApartadorState.statusText = `⚠️ No se pudo enviar saludo a ${targetInfo.name}`;
          renderFlashApartadorHUD();
        }
      } catch (err) {
        console.error('❌ [FlashApartador] Error crítico durante procesamiento de candidato:', err);
        flashApartadorState.statusText = `⚠️ Error en ${targetInfo.name}: ${err.message || 'desconocido'}`;
        renderFlashApartadorHUD();
      }

      await new Promise(r => setTimeout(r, 60));
      flashApartadorState.isProcessingCandidate = false;

      if (flashApartadorState.active) {
        flashApartadorState.timerId = setTimeout(runFlashApartadorStep, 120);
      }
      return;
    }

    const now = Date.now();
    if (now - lastOmissionTime > 2500) {
      if (flashApartadorState.statusText !== 'Escaneando "Todos"... esperando nuevo "King"') {
        flashApartadorState.statusText = 'Escaneando "Todos"... esperando nuevo "King"';
        renderFlashApartadorHUD();
      }
    }

    if (flashApartadorState.active) {
      flashApartadorState.timerId = setTimeout(runFlashApartadorStep, 150);
    }
  } catch (err) {
    console.error('❌ [FlashApartador] Error en ciclo runFlashApartadorStep:', err);
  } finally {
    if (flashApartadorState.active && !flashApartadorState.isProcessingCandidate && !flashApartadorState.timerId) {
      flashApartadorState.timerId = setTimeout(runFlashApartadorStep, 150);
    }
  }
}

function startDomAntiWorkflowWatchdog(targetCId) {
  if (!targetCId) return;
  const cIdStr = String(targetCId);
  const startTime = Date.now();
  console.log(`🛡️ [Anti-Workflow Watchdog] Activado guardián DOM de 7s para chat ${cIdStr}...`);

  let lastWatchdogTakeoverClickTime = 0;
  let lastWatchdogReassignDispatch = 0;

  const watchdogInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;

    if (elapsed > 7000) {
      clearInterval(watchdogInterval);
      return;
    }

    try {
      const cur = parseCurrentUrl();

      if (elapsed > 2500 && cur.conversationId && String(cur.conversationId) !== cIdStr) {
        clearInterval(watchdogInterval);
        return;
      }

      const takeoverBtn = typeof findAsumirButton === 'function' ? findAsumirButton() : null;
      if (takeoverBtn && (Date.now() - lastWatchdogTakeoverClickTime > 1500)) {
        lastWatchdogTakeoverClickTime = Date.now();
        console.log(`🛡️ [Anti-Workflow Watchdog] ¡Botón Asumir detectado (+${elapsed}ms)! Neutralizando bot...`);
        clickElementByCoordinates(takeoverBtn);
        triggerRadixClick(takeoverBtn);
        if (typeof takeoverBtn.click === 'function') takeoverBtn.click();
        window.dispatchEvent(new CustomEvent('RADAR_CLICK_TAKEOVER_MAIN'));
      }

      const assignee = typeof getOpenChatAssigneeStatus === 'function' ? getOpenChatAssigneeStatus() : null;
      if (assignee && assignee.isSalesAgent && (Date.now() - lastWatchdogReassignDispatch > 2000)) {
        lastWatchdogReassignDispatch = Date.now();
        console.log(`🛡️ [Anti-Workflow Watchdog] Sales Agent detectado en cesionario (+${elapsed}ms). Re-afirmando a Daniela vía API silenciosa...`);
        window.dispatchEvent(new CustomEvent('RADAR_FORCE_REASSIGN', {
          detail: { conversationId: cIdStr }
        }));
      }
    } catch (e) {}
  }, 150);
}

let flashMutationObserver = null;
let pendingFlashScanRaf = null;

function triggerFlashScanDebounced() {
  if (!flashApartadorState.active || flashApartadorState.isProcessingCandidate) return;
  if (pendingFlashScanRaf) return;

  pendingFlashScanRaf = requestAnimationFrame(() => {
    pendingFlashScanRaf = null;
    if (flashApartadorState.active && !flashApartadorState.isProcessingCandidate) {
      runFlashApartadorStep();
    }
  });
}

function startFlashMutationObserver() {
  if (flashMutationObserver) flashMutationObserver.disconnect();

  const sidebar = document.querySelector('[data-pw*="conversation"], [class*="conversation-list"], aside, nav') ||
    document.querySelector('main') ||
    document.body;

  flashMutationObserver = new MutationObserver((mutations) => {
    if (!flashApartadorState.active || flashApartadorState.isProcessingCandidate) return;

    let isRelevant = false;
    for (let i = 0; i < mutations.length; i++) {
      const target = mutations[i].target;
      if (!target) continue;

      if (
        target.id === 'radar-flash-hud' ||
        (target.closest && target.closest('#radar-flash-hud, #radar-crawl-toast, #respond-radar-widget, .radar-flash-hud'))
      ) {
        continue;
      }
      isRelevant = true;
      break;
    }

    if (isRelevant) {
      triggerFlashScanDebounced();
    }
  });

  try {
    flashMutationObserver.observe(sidebar, {
      childList: true,
      subtree: true,
      characterData: true
    });
    console.log('⚡ [FlashApartador] MutationObserver activo (con frame budgeting 60 FPS).');
  } catch (e) { }
}

function stopFlashMutationObserver() {
  if (flashMutationObserver) {
    flashMutationObserver.disconnect();
    flashMutationObserver = null;
  }
  if (pendingFlashScanRaf) {
    cancelAnimationFrame(pendingFlashScanRaf);
    pendingFlashScanRaf = null;
  }
}

function startFlashApartador() {
  if (flashApartadorState.active) return;

  flashApartadorState.active = true;
  flashApartadorState.startTime = Date.now();
  window.__radarFlashActive = true;
  try { sessionStorage.setItem('__radar_flash_active', 'true'); } catch (e) { }
  window.dispatchEvent(new CustomEvent('RADAR_SET_FLASH_ACTIVE', { detail: { active: true } }));

  flashApartadorState.apartadosCount = 0;
  flashApartadorState.apartadosList = [];
  countedApartadosIds.clear();
  flashApartadorState.scannedCount = 0;
  flashApartadorState.skippedCount = 0;
  flashApartadorState.statusText = 'Radar activo · Esperando leads...';
  flashApartadorState.processedIds.clear();
  flashApartadorState.isProcessingCandidate = false;

  renderFlashApartadorHUD();

  if (flashHudTimerInterval) clearInterval(flashHudTimerInterval);
  flashHudTimerInterval = setInterval(() => {
    const tEl = document.getElementById('radar-flash-timer');
    if (tEl && flashApartadorState.startTime && flashApartadorState.active) {
      tEl.textContent = formatFlashElapsedTime(Date.now() - flashApartadorState.startTime);
    }
  }, 1000);

  if (typeof showCrawlProgressToast === 'function') {
    showCrawlProgressToast('Radar activo · Modo Turbo 0ms');
  }

  ensureTodosFolderActive(true);
  startFlashMutationObserver();
  flashApartadorState.timerId = setTimeout(runFlashApartadorStep, 50);
}

function stopFlashApartador() {
  if (!flashApartadorState.active) return;

  flashApartadorState.active = false;
  window.__radarFlashActive = false;
  try { sessionStorage.setItem('__radar_flash_active', 'false'); } catch (e) { }
  window.dispatchEvent(new CustomEvent('RADAR_SET_FLASH_ACTIVE', { detail: { active: false } }));

  if (flashHudTimerInterval) {
    clearInterval(flashHudTimerInterval);
    flashHudTimerInterval = null;
  }

  stopFlashMutationObserver();
  if (flashApartadorState.timerId) {
    clearTimeout(flashApartadorState.timerId);
    flashApartadorState.timerId = null;
  }
  flashApartadorState.isProcessingCandidate = false;

  renderFlashApartadorHUD();
  if (typeof showCrawlProgressToast === 'function') {
    showCrawlProgressToast(`Radar detenido · ${flashApartadorState.apartadosCount} leads capturados`);
    setTimeout(hideCrawlProgressToast, 3500);
  }

  showApartadosSummaryModal();

  setTimeout(() => {
    if (typeof scanInboxSidebar === 'function') scanInboxSidebar();
    if (typeof updateWidgetUI === 'function') updateWidgetUI();
  }, 150);
}

function toggleFlashApartador() {
  if (flashApartadorState.active) {
    stopFlashApartador();
  } else {
    startFlashApartador();
  }
}

window.addEventListener('RADAR_TURBO_LOCK_CONTACT', (e) => {
  const cId = String(e.detail?.conversationId || '');
  const rawName = String(e.detail?.name || '').trim();
  if (!cId) return;
  flashApartadorState.processedIds.add(cId);
  sentGreetingConversationIds.add(cId);
  if (rawName && !rawName.startsWith('Lead #')) {
    const tmpId = `tmp_${rawName.replace(/\s+/g, '_')}`;
    flashApartadorState.processedIds.add(tmpId);
    sentGreetingConversationIds.add(tmpId);
    lockedTurboNames.add(rawName.toLowerCase());
  }
  if (flashApartadorState.priorityCandidateId === cId) {
    flashApartadorState.priorityCandidateId = null;
  }
  console.log(`🔒 [FlashApartador] Candado Turbo Inmediato (0ms) activado para ${cId} (${rawName}). El DOM NUNCA enviará saludo.`);
});

window.addEventListener('RADAR_TURBO_UNLOCK_CONTACT', (e) => {
  const cId = String(e.detail?.conversationId || '');
  const rawName = String(e.detail?.name || '').trim();
  if (!cId) return;
  if (e.detail?.allowRetryGreeting) {
    flashApartadorState.processedIds.delete(cId);
    sentGreetingConversationIds.delete(cId);
    if (rawName) {
      const tmpId = `tmp_${rawName.replace(/\s+/g, '_')}`;
      flashApartadorState.processedIds.delete(tmpId);
      sentGreetingConversationIds.delete(tmpId);
      lockedTurboNames.delete(rawName.toLowerCase());
    }
    console.log(`🔓 [FlashApartador] Candado liberado para ${cId}. Escáner DOM habilitado.`);
  }
});

window.addEventListener('RADAR_SOCKET_KING_DETECTED', (e) => {
  const detail = e.detail;
  if (!detail || !detail.contactId) return;
  const cId = String(detail.contactId);

  if (detail.contactChannelId) {
    socketChannelMap.set(cId, {
      contactChannelId: detail.contactChannelId,
      channel: detail.channel
    });
  }

  if (flashApartadorState.processedIds.has(cId) || sentGreetingConversationIds.has(cId)) return;

  if (!flashApartadorState.active) return;

  flashApartadorState.priorityCandidateId = cId;

  console.log(`⚡ [RespondRadar Socket] Candidato detectado (${detail.name || cId}). Priorizando verificación en DOM...`);
  flashApartadorState.statusText = `Candidato detectado (${detail.name || cId}) · Verificando historial...`;
  renderFlashApartadorHUD();

  if (!flashApartadorState.isProcessingCandidate) {
    clearTimeout(flashApartadorState.timerId);
    flashApartadorState.timerId = setTimeout(runFlashApartadorStep, 15);
  }
});

window.addEventListener('RADAR_TURBO_KING_APARTADO_SUCCESS', (e) => {
  const detail = e.detail;
  if (!detail || !detail.conversationId) return;
  const cId = String(detail.conversationId);
  const name = detail.name || `Lead #${cId}`;

  if (countedApartadosIds.has(cId) || (flashApartadorState.apartadosList && flashApartadorState.apartadosList.some(x => x.id === cId))) {
    console.log(`ℹ️ [FlashApartador] Lead ${cId} ya fue contabilizado previamente en esta sesión.`);
    return;
  }
  countedApartadosIds.add(cId);

  flashApartadorState.processedIds.add(cId);
  sentGreetingConversationIds.add(cId);
  if (name && !name.startsWith('Lead #')) {
    const tmpId = `tmp_${name.trim().replace(/\s+/g, '_')}`;
    flashApartadorState.processedIds.add(tmpId);
    sentGreetingConversationIds.add(tmpId);
    lockedTurboNames.add(name.toLowerCase().trim());
  }

  const msText = detail.durationMs ? `${detail.durationMs}ms` : '20ms';
  flashApartadorState.apartadosCount++;
  flashApartadorState.lastDurationMs = msText;
  flashApartadorState.lastLeadName = name;
  flashApartadorState.statusText = `Capturado en ${msText} · ${name}`;
  renderFlashApartadorHUD();

  recordLeadApartado({
    id: cId,
    name: name,
    text: detail.text || 'King',
    channel: detail.channel?.source || 'instagram',
    source: `Turbo API (${msText})`,
    duration: msText
  });

  playSalesAlertSound();
  if (typeof showCrawlProgressToast === 'function') {
    showCrawlProgressToast(`${name} apartado en ${msText} (Total: ${flashApartadorState.apartadosCount})`);
  }

  try {
    const cur = parseCurrentUrl();
    if (!cur.conversationId || cur.conversationId !== cId) {
      const rawCards = Array.from(document.querySelectorAll('a.conversation-list--item, [data-pw="link-convo-item"]'));
      const card = rawCards.find(c => extractCardConversationId(c) === cId);
      if (card) {
        openInboxCard(card);
      }
    }
  } catch (err) { }

  startDomAntiWorkflowWatchdog(cId);
});

function showApartadosSummaryModal() {
  document.getElementById('radar-apartados-summary-modal')?.remove();

  const list = flashApartadorState.apartadosList || [];
  console.log(`📋 [RespondRadar] Resumen de sesión: ${list.length} leads apartados:`);
  console.table(list.map(l => ({
    ID: l.id,
    Nombre: l.name,
    Hora: l.timeFormatted,
    Origen: l.source,
    URL: l.url
  })));

  const modal = document.createElement('div');
  modal.id = 'radar-apartados-summary-modal';
  modal.className = 'radar-apartados-modal-overlay';

  const iconList = window.RadarIcons?.render('list', 15) || '';
  const iconClose = window.RadarIcons?.render('x', 14) || '&times;';
  const iconExternal = window.RadarIcons?.render('externalLink', 12) || '';
  const iconShield = window.RadarIcons?.render('shieldCheck', 12) || '';
  const iconCopy = window.RadarIcons?.render('copy', 13) || '';
  const iconRefresh = window.RadarIcons?.render('refresh', 13) || '';
  const iconClock = window.RadarIcons?.render('clock', 11) || '';
  const iconZap = window.RadarIcons?.render('zap', 11) || '';
  const iconRadio = window.RadarIcons?.render('radio', 30) || '📡';

  if (list.length === 0) {
    modal.innerHTML = `
      <div class="radar-apartados-modal-window">
        <div class="radar-apartados-modal-header">
          <div class="radar-apartados-modal-title">
            ${iconList}
            <span>Leads Apartados en esta Sesión</span>
            <span class="radar-apartados-badge zero">0 leads</span>
          </div>
          <button type="button" class="radar-apartados-close-btn" id="radar-summary-close-btn" title="Cerrar">${iconClose}</button>
        </div>
        <div class="radar-apartados-empty-state">
          <div class="radar-empty-icon-box">${iconRadio}</div>
          <p class="radar-empty-title">No se capturaron nuevos leads durante esta sesión.</p>
          <span class="radar-empty-desc">Los nuevos prospectos que digan "King" aparecerán aquí en tiempo real en cuanto actives el Auto-Apartador.</span>
        </div>
        <div class="radar-apartados-modal-footer">
          <button type="button" class="radar-apartados-btn-secondary" id="radar-summary-close-btn-bottom">Cerrar</button>
        </div>
      </div>
    `;
  } else {
    const itemsHtml = list.map((lead, idx) => `
      <div class="radar-apartados-item" data-id="${escapeHtml(lead.id)}">
        <div class="radar-apartados-item-main">
          <div class="radar-apartados-avatar">${escapeHtml((lead.name || 'L').slice(0, 2).toUpperCase())}</div>
          <div class="radar-apartados-details">
            <div class="radar-apartados-lead-name">
              <span>${escapeHtml(lead.name || 'Lead sin nombre')}</span>
              <span class="radar-apartados-channel-tag ${(lead.channel || 'IG').toLowerCase()}">${escapeHtml(lead.channel || 'IG')}</span>
            </div>
            <div class="radar-apartados-meta">
              <span class="radar-meta-item">${iconClock} ${escapeHtml(lead.timeFormatted || '')}</span>
              <span class="radar-meta-sep">•</span>
              <span class="radar-meta-item">ID: ${escapeHtml(lead.id)}</span>
              <span class="radar-meta-sep">•</span>
              <span class="radar-apartados-source-tag">${iconZap} ${escapeHtml(lead.source || 'Turbo API')}</span>
            </div>
          </div>
        </div>
        <div class="radar-apartados-item-actions">
          <button type="button" class="radar-apartados-action-btn btn-open" data-url="${escapeHtml(lead.url)}" data-id="${escapeHtml(lead.id)}" title="Abrir chat en Respond.io">
            ${iconExternal} <span>Abrir Chat</span>
          </button>
          <button type="button" class="radar-apartados-action-btn btn-reassign" data-id="${escapeHtml(lead.id)}" title="Asegurar asignación a Daniela Tacuri">
            ${iconShield} <span>Asegurar</span>
          </button>
        </div>
      </div>
    `).join('');

    modal.innerHTML = `
      <div class="radar-apartados-modal-window">
        <div class="radar-apartados-modal-header">
          <div class="radar-apartados-modal-title">
            ${iconList}
            <span>Leads de la Sesión</span>
            <span class="radar-apartados-badge">${list.length} leads</span>
          </div>
          <button type="button" class="radar-apartados-close-btn" id="radar-summary-close-btn" title="Cerrar">${iconClose}</button>
        </div>
        <div class="radar-apartados-modal-subtitle">
          <span class="radar-sub-user">Daniela Tacuri</span>
          <span class="radar-meta-sep">·</span>
          <span class="radar-sub-status">${iconShield} Asignados a tu cuenta</span>
        </div>
        <div class="radar-apartados-list-container">
          ${itemsHtml}
        </div>
        <div class="radar-apartados-modal-footer">
          <button type="button" class="radar-apartados-btn-secondary" id="radar-summary-copy-btn">
            ${iconCopy} <span>Copiar Lista</span>
          </button>
          <button type="button" class="radar-apartados-btn-primary" id="radar-summary-reassign-all-btn">
            ${iconRefresh} <span>Reasignar Todos</span>
          </button>
          <button type="button" class="radar-apartados-btn-secondary" id="radar-summary-close-btn-bottom">Cerrar</button>
        </div>
      </div>
    `;
  }

  const closeModal = () => modal.remove();
  modal.querySelector('#radar-summary-close-btn')?.addEventListener('click', closeModal);
  modal.querySelector('#radar-summary-close-btn-bottom')?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  modal.querySelectorAll('.btn-open').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const url = btn.getAttribute('data-url');
      if (id || url) {
        if (typeof performSmoothNavigation === 'function') {
          performSmoothNavigation(id, url);
        } else {
          const card = document.querySelector(`a[href*="/inbox/${id}"], [data-id="${id}"]`);
          if (card && typeof openInboxCard === 'function') {
            openInboxCard(card);
          } else if (url) {
            history.pushState(null, '', url);
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
        }
      }
    });
  });

  modal.querySelectorAll('.btn-reassign').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (!id) return;
      btn.textContent = '⏳ Asegurando...';
      btn.disabled = true;
      window.dispatchEvent(new CustomEvent('RADAR_FORCE_REASSIGN', { detail: { conversationId: id } }));
      setTimeout(() => {
        btn.textContent = '✅ Asegurado';
        btn.classList.add('success');
      }, 500);
    });
  });

  modal.querySelector('#radar-summary-reassign-all-btn')?.addEventListener('click', () => {
    const reassignBtn = modal.querySelector('#radar-summary-reassign-all-btn');
    if (reassignBtn) {
      reassignBtn.textContent = '⏳ Asegurando todos...';
      reassignBtn.disabled = true;
    }
    list.forEach(lead => {
      window.dispatchEvent(new CustomEvent('RADAR_FORCE_REASSIGN', { detail: { conversationId: lead.id } }));
    });
    setTimeout(() => {
      if (reassignBtn) {
        reassignBtn.textContent = '✅ ¡Todos Asegurados!';
      }
      modal.querySelectorAll('.btn-reassign').forEach(b => {
        b.textContent = '✅ Asegurado';
        b.classList.add('success');
      });
    }, 600);
  });

  modal.querySelector('#radar-summary-copy-btn')?.addEventListener('click', () => {
    const spaceId = apiSessionState?.spaceId || '384258';
    const textLines = list.map((l, i) => `${i + 1}. ${l.name} (${l.timeFormatted}) - https://app.respond.io/space/${spaceId}/inbox/${l.id}`).join('\n');
    const header = `📋 Resumen de Leads Apartados ("King") - Daniela Tacuri (${list.length} leads):\n`;
    navigator.clipboard.writeText(header + textLines).then(() => {
      const copyBtn = modal.querySelector('#radar-summary-copy-btn');
      if (copyBtn) {
        copyBtn.textContent = '✅ ¡Copiado al Portapapeles!';
        setTimeout(() => { copyBtn.textContent = '📋 Copiar Lista (Texto)'; }, 2500);
      }
    });
  });

  document.body.appendChild(modal);
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const summaryModal = document.getElementById('radar-apartados-summary-modal');
    if (summaryModal) {
      summaryModal.remove();
      return;
    }
    if (flashApartadorState.active) {
      stopFlashApartador();
    }
  }
});

window.RespondRadarStartFlashApartador = startFlashApartador;
window.RespondRadarStopFlashApartador = stopFlashApartador;
window.RespondRadarToggleFlashApartador = toggleFlashApartador;
window.RespondRadarShowApartadosSummary = showApartadosSummaryModal;

