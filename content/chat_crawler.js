// RespondRadar - Módulo 4
function getInboxCards() {
  const selectors = [
    'a[href*="/inbox/"]',
    '[data-pw="link-convo-item"]',
    'a.conversation-list--item',
    '.v-virtual-scroll__item',
    '[class*="conversation-list-item"]'
  ];
  const candidates = Array.from(document.querySelectorAll(selectors.join(', ')));
  const validCards = [];
  const seenKeys = new Set();

  for (const el of candidates) {
    if (el.closest('#respond-radar-widget') || el.closest('#radar-dom-scan-modal') || el.closest('#radar-crawl-result-modal') || el.closest('#radar-inpage-sale-modal')) continue;

    const cardEl = el.matches('a[href*="/inbox/"], a.conversation-list--item, [data-pw="link-convo-item"]')
      ? el
      : (el.querySelector('a[href*="/inbox/"], [data-pw="link-convo-item"]') || el);

    const rect = cardEl.getBoundingClientRect();
    if (rect.width < 100 || rect.left > 480) continue;

    const convId = extractCardConversationId(cardEl);
    const name = getCardContactName(cardEl);

    if (!name || name === 'Desconocido' || name === 'Lead Seleccionado') continue;
    if (convId === 'inbox' || convId === 'space') continue;

    const key = convId || `name_${name.toLowerCase().trim()}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    validCards.push(cardEl);
  }

  return validCards;
}

function analyzeInboxCard(card) {
  if (!card) return null;
  const text = (card.innerText || '').trim();
  let name = getCardContactName(card);
  let convId = extractCardConversationId(card);
  if (!convId) {
    const link = card.querySelector('a[href*="/inbox/"]') || card.closest('a[href*="/inbox/"]');
    if (link && link.href) {
      const m = link.href.match(/\/inbox\/([^/?#]+)/);
      if (m) convId = m[1];
    }
  }

  let unreadCount = 0;
  const badges = card.querySelectorAll('[class*="badge"], [class*="Badge"], [class*="counter"], [class*="unread"], [class*="rounded-full"], span, div');
  for (const b of badges) {
    if (b.classList?.contains('radar-chat-badge')) continue;
    const val = (b.textContent || '').trim();
    if (/^\d{1,3}$/.test(val) && b.children.length === 0) {
      const num = parseInt(val, 10);
      if (num > 0 && num < 100) {
        const parentText = (b.parentElement?.textContent || '').trim();
        if (!parentText.includes(':') && !/\b(?:oct|sep|ago|jul|jun|may|abr|mar|feb|ene)\b/i.test(parentText)) {
          unreadCount = num;
          break;
        }
      }
    }
  }

  let isOutgoingArrow = false;
  let isIncomingArrow = false;

  if (text.includes('↗') || text.includes('Tú:') || text.includes('You:')) {
    isOutgoingArrow = true;
  }
  if (text.includes('↙')) {
    isIncomingArrow = true;
  }

  const svgs = card.querySelectorAll('svg');
  svgs.forEach(svg => {
    if (svg.closest('[class*="channel"], [class*="avatar"]')) return;

    const elementsToCheck = [svg, svg.parentElement, ...Array.from(svg.querySelectorAll('*'))];
    elementsToCheck.forEach(el => {
      if (!el) return;
      const s = window.getComputedStyle(el);
      const str = `${s.color} ${s.fill} ${s.stroke} ${el.getAttribute('fill') || ''} ${el.getAttribute('stroke') || ''} ${el.getAttribute('class') || ''}`.toLowerCase();

      if (
        str.includes('rgb(0,') || str.includes('rgb(2,') || str.includes('rgb(14,') || str.includes('rgb(56,') ||
        str.includes('rgb(59,') || str.includes('rgb(96,') || str.includes('rgb(147,') || str.includes('rgb(37,') ||
        str.includes('#38bdf8') || str.includes('#60a5fa') || str.includes('#3b82f6') || str.includes('#2563eb') ||
        str.includes('blue') || str.includes('sky') || str.includes('primary')
      ) {
        isOutgoingArrow = true;
      }

      if (
        str.includes('rgb(245,') || str.includes('rgb(249,') || str.includes('rgb(251,') || str.includes('rgb(234,') ||
        str.includes('rgb(217,') || str.includes('rgb(255, 1') || str.includes('rgb(234, 88') ||
        str.includes('#f59e0b') || str.includes('#fb923c') || str.includes('#f97316') || str.includes('#ea580c') ||
        str.includes('amber') || str.includes('orange') || str.includes('warning')
      ) {
        isIncomingArrow = true;
      }

      const allAttrs = `${el.getAttribute('class') || ''} ${el.getAttribute('aria-label') || ''} ${el.getAttribute('data-pw') || ''}`.toLowerCase();
      if (allAttrs.includes('outgoing') || allAttrs.includes('sent') || allAttrs.includes('arrow-up-right') || allAttrs.includes('rotate-45')) {
        isOutgoingArrow = true;
      }
      if (allAttrs.includes('incoming') || allAttrs.includes('received') || allAttrs.includes('arrow-down-left') || allAttrs.includes('-rotate-45')) {
        isIncomingArrow = true;
      }

      const points = el.getAttribute('points') || '';
      const d = el.getAttribute('d') || '';
      if (points.includes('7 7 17 7 17 17') || d.includes('M7 17L17 7')) isOutgoingArrow = true;
      if (points.includes('17 17 7 17 7 7') || d.includes('M17 7L7 17')) isIncomingArrow = true;
    });
  });

  const timeStr = extractCardTime(text);

  let owner = 'Desconocido';

  const assigneeEl = card.querySelector('[data-pw="messages-conversation-item-assignee"]');
  const assigneeAttrs = assigneeEl ? [
    assigneeEl.getAttribute('title') || '',
    assigneeEl.getAttribute('aria-label') || '',
    assigneeEl.getAttribute('data-tooltip') || '',
    assigneeEl.innerText || '',
    ...Array.from(assigneeEl.querySelectorAll('img[alt]')).map(i => i.alt || ''),
    ...Array.from(assigneeEl.querySelectorAll('[title]')).map(i => i.title || '')
  ].join(' ').toLowerCase() : '';

  const teammatesList = typeof TEAMMATE_NAMES !== 'undefined' ? TEAMMATE_NAMES : [];

  if (assigneeEl) {
    if (assigneeEl.querySelector('.icon-custom-user-square-bold, [class*="custom-user"]')) {
      owner = 'Sales Agent';
    } else {
      if (
        assigneeAttrs.includes('daniela tacuri') ||
        (assigneeAttrs.includes('daniela') && !assigneeAttrs.includes('moya'))
      ) {
        owner = 'Daniela (Mía)';
      } else if (
        assigneeAttrs.includes('diego tacuri') ||
        assigneeAttrs.includes('diego')
      ) {
        owner = 'Diego';
      } else if (
        assigneeAttrs.includes('sales agent') ||
        assigneeAttrs.includes('sales_agent') ||
        assigneeAttrs.includes('sales') ||
        assigneeAttrs.includes('agent') ||
        assigneeAttrs.includes('bot') ||
        /\p{Extended_Pictographic}/u.test(assigneeAttrs) ||
        /\p{Extended_Pictographic}/u.test(assigneeEl?.innerText || '')
      ) {
        owner = 'Sales Agent';
      } else if (assigneeAttrs.includes('sin asignar') || assigneeAttrs.includes('unassigned')) {
        owner = 'Sin asignar';
      } else {
        for (const tm of teammatesList) {
          if (assigneeAttrs.includes(tm)) {
            owner = tm;
            break;
          }
        }
      }
    }
  }

  if (owner === 'Desconocido') {
    const textWithoutName = (card.innerText || '').replace(name, '').toLowerCase();
    if (
      textWithoutName.includes('sales agent') ||
      textWithoutName.includes('sales_agent') ||
      textWithoutName.includes('🤑') ||
      textWithoutName.includes('😎')
    ) {
      owner = 'Sales Agent';
    } else if (textWithoutName.includes('sin asignar') || textWithoutName.includes('unassigned')) {
      owner = 'Sin asignar';
    } else if (
      textWithoutName.includes('daniela tacuri') ||
      (textWithoutName.includes('daniela') && !textWithoutName.includes('moya')) ||
      textWithoutName.includes('mía')
    ) {
      owner = 'Daniela (Mía)';
    } else if (
      textWithoutName.includes('diego tacuri') ||
      textWithoutName.includes('diego')
    ) {
      owner = 'Diego';
    } else {
      if (assigneeAttrs && typeof isTeammateName === 'function' && isTeammateName(assigneeAttrs)) {
        owner = assigneeAttrs;
      }
    }
  }

  let stage = 'Lead';
  if (text.includes('Customer')) stage = 'Customer';
  else if (text.includes('New Lead')) stage = 'New Lead';
  else if (text.includes('Assigned')) stage = 'Assigned';
  else if (text.includes('Process')) stage = 'Process';

  const isTrulyUnread = unreadCount > 0 && !isOutgoingArrow;

  let snippet = extractCardSnippet(card, name, timeStr);
  if (isDateString(snippet)) {
    snippet = '';
  }

  return {
    conversationId: convId || `tmp_${(name || 'chat').replace(/\s+/g, '_')}`,
    name: name || 'Desconocido',
    timeStr,
    unreadCount,
    isOutgoingArrow,
    isIncomingArrow,
    isTrulyUnread,
    owner,
    stage,
    snippet: snippet.slice(0, 120),
    url: convId ? `https://app.respond.io/space/${parseCurrentUrl().spaceId || '384258'}/inbox/${convId}` : ''
  };
}

function isFlashRunningNow() {
  return !!(window.__radarFlashActive || (typeof flashApartadorState !== 'undefined' && flashApartadorState.active));
}

function updateChatListBadges() {
  if (isFlashRunningNow()) return;

  const cards = document.querySelectorAll('a.conversation-list--item, a[href*="/inbox/"], [data-pw="link-convo-item"]');
  if (!cards || cards.length === 0) return;

  isInternalDomUpdate = true;
  try {
    let storageChanged = false;
    let queueChanged = false;

    cards.forEach(card => {
      const cardConvId = extractCardConversationId(card);
      const titleEl = getCardTitleElement(card);
      if (!titleEl) return;

      let lead = cardConvId ? watchedLeads[cardConvId] : null;

      if (!lead && cardConvId && !dismissedLeads[cardConvId]) {
        const contactName = getCardContactName(card);
        if (contactName && Object.keys(autoAssignQueue).length > 0) {
          const now = Date.now();
          const isCardFresh = isCardActivityWithinWindow(card);

          for (const key in autoAssignQueue) {
            const item = autoAssignQueue[key];
            const age = now - (item.createdAt || item.assignedAt || 0);

            if (age > MAX_NAME_WINDOW_MS) {
              delete autoAssignQueue[key];
              queueChanged = true;
              continue;
            }

            if (!isCardFresh) {
              continue;
            }

            if (isContactNameMatch(contactName, item.leadName) || isContactNameMatch(contactName, key)) {
              delete autoAssignQueue[key];
              queueChanged = true;

              const prev = watchedLeads[cardConvId] || {};
              watchedLeads[cardConvId] = {
                ...prev,
                conversationId: cardConvId,
                spaceId: parseCurrentUrl().spaceId || prev.spaceId || '384258',
                name: contactName || prev.name,
                owner: item.assignee,
                targetPlan: item.plan || prev.targetPlan || 'Starter',
                addedAt: prev.addedAt || new Date().toISOString(),
                lastMessage: prev.lastMessage || '',
                lastMessageTime: prev.lastMessageTime || new Date().toISOString(),
                unreadCount: prev.unreadCount || 0
              };
              storageChanged = true;
              showAutoAssignToast(contactName, item.assignee, item.plan);
              lead = watchedLeads[cardConvId];
              break;
            }
          }
        }
      }

      const existingBadge = titleEl.querySelector('.radar-chat-badge');

      if (lead) {
        const owner = lead.owner || 'mine';
        const isSold = lead.sale && lead.sale.isSold;

        let badgeClass = 'radar-chat-badge';
        let badgeText = '';

        if (isSold) {
          badgeClass += ' team-sold';
          badgeText = (lead.sale && lead.sale.plan) ? `👑 Venta · ${lead.sale.plan}` : '👑 Venta';
        } else {
          const followUp = typeof getFollowUpStatus === 'function' ? getFollowUpStatus(lead.followUpDate) : null;
          const followUpSuffix = followUp ? ` · ${followUp.badge}` : '';

          if (lead.processStage) {
            const stageSlug = typeof getStageSlug === 'function' ? getStageSlug(lead.processStage) : '';
            badgeClass += ` team-mine stage-${stageSlug}`;
            if (followUp && (followUp.status === 'today' || followUp.status === 'overdue')) {
              badgeClass += ' has-urgent-followup';
            }
            badgeText = `⭐ Mío · ${lead.processStage}${followUpSuffix}`;
          } else {
            badgeClass += ' team-mine';
            if (followUp && (followUp.status === 'today' || followUp.status === 'overdue')) {
              badgeClass += ' has-urgent-followup';
            }
            const planText = (lead.targetPlan && lead.targetPlan !== 'Starter') ? ` · ${lead.targetPlan}` : '';
            badgeText = `⭐ Mío${planText}${followUpSuffix}`;
          }
        }

        if (existingBadge) {
          if (existingBadge.className !== badgeClass || existingBadge.textContent !== badgeText) {
            existingBadge.className = badgeClass;
            existingBadge.textContent = badgeText;
          }
        } else {
          const badgeSpan = document.createElement('span');
          badgeSpan.className = badgeClass;
          badgeSpan.textContent = badgeText;
          titleEl.appendChild(badgeSpan);
        }

        if (!titleEl.classList.contains('radar-has-badge')) {
          titleEl.classList.add('radar-has-badge');
        }
      } else {
        if (existingBadge) {
          existingBadge.remove();
        }
        if (titleEl.classList.contains('radar-has-badge')) {
          titleEl.classList.remove('radar-has-badge');
        }
      }
    });

    if (storageChanged || queueChanged) {
      safeStorageSet({
        ...(storageChanged ? { watchedLeads } : {}),
        ...(queueChanged ? { autoAssignQueue } : {})
      });
      if (storageChanged) {
        safeSendMessage({ type: 'UPDATE_BADGE' });
        updateWidgetUI();
      }
    }
  } finally {
    setTimeout(() => {
      isInternalDomUpdate = false;
    }, 50);
  }
}

const CRAWLER_START_TIME = Date.now();
const CRAWLER_WARMUP_MS = 4500;
let lastGlobalAlertSoundTime = 0;
const lastSocketNotifyMap = new Map();

function scanInboxSidebar() {
  if (isFlashRunningNow()) return;

  updateChatListBadges();

  const hasPhrases = Array.isArray(customTrackingPhrases) && customTrackingPhrases.length > 0;
  if (Object.keys(watchedLeads).length === 0 && Object.keys(phraseTrackedLeads).length === 0 && !hasPhrases) return;

  const currentInfo = parseCurrentUrl();
  const isAppFocused = document.hasFocus() && !document.hidden;
  const isWarmup = (Date.now() - CRAWLER_START_TIME) < CRAWLER_WARMUP_MS;

  const chatCards = document.querySelectorAll('a[href*="/inbox/"], [role="listitem"], [class*="conversation-item"], [class*="chat-item"]');
  let hasStorageChanges = false;
  let hasPhraseTrackedChanges = false;

  if (currentInfo.conversationId && !watchedLeads[currentInfo.conversationId]) {
    const activeName = getActiveContactName();
    if (activeName && activeName !== 'Lead Seleccionado') {
      for (const id in watchedLeads) {
        if (id.startsWith('log_') && isContactNameMatch(watchedLeads[id].name, activeName)) {
          const leadData = watchedLeads[id];
          delete watchedLeads[id];
          leadData.conversationId = currentInfo.conversationId;
          leadData.spaceId = currentInfo.spaceId || leadData.spaceId || '384258';
          leadData.url = window.location.href;
          watchedLeads[currentInfo.conversationId] = leadData;
          hasStorageChanges = true;
          break;
        }
      }
    }
  }

  chatCards.forEach(card => {
    const cardConvId = extractCardConversationId(card);
    if (!cardConvId) return;

    if (!watchedLeads[cardConvId]) {
      const cardName = getCardContactName(card);
      if (cardName) {
        for (const id in watchedLeads) {
          if (id.startsWith('log_') && isContactNameMatch(watchedLeads[id].name, cardName)) {
            const leadData = watchedLeads[id];
            delete watchedLeads[id];
            leadData.conversationId = cardConvId;
            leadData.spaceId = currentInfo.spaceId || '384258';
            leadData.url = `https://app.respond.io/space/${leadData.spaceId}/inbox/${cardConvId}`;
            watchedLeads[cardConvId] = leadData;
            hasStorageChanges = true;
            break;
          }
        }
      }
    }

    if (typeof matchesTrackingPhrase === 'function') {
      const cardRawText = card.innerText || '';
      if (matchesTrackingPhrase(cardRawText)) {
        const existingWatched = watchedLeads[cardConvId];
        if (
          existingWatched &&
          existingWatched.owner === 'mine' &&
          !existingWatched.manuallyWatched &&
          !existingWatched.processStage &&
          !existingWatched.followUpDate &&
          !(existingWatched.sale && existingWatched.sale.isSold) &&
          !existingWatched.source
        ) {
          delete watchedLeads[cardConvId];
          hasStorageChanges = true;
        }

        if (!watchedLeads[cardConvId] && !phraseTrackedLeads[cardConvId]) {
          const cardName = getCardContactName(card) || `Lead #${cardConvId}`;
          phraseTrackedLeads[cardConvId] = {
            conversationId: cardConvId,
            spaceId: currentInfo.spaceId || '384258',
            name: cardName,
            trackedByPhrase: true,
            addedAt: new Date().toISOString(),
            lastMessage: '',
            lastMessageTime: new Date().toISOString(),
            unreadCount: 0
          };
          hasPhraseTrackedChanges = true;
        }
      }
    }

    const isWatched = !!watchedLeads[cardConvId];
    const isPhraseTracked = !isWatched && !!phraseTrackedLeads[cardConvId];
    if (!isWatched && !isPhraseTracked) return;

    const matchedLeadId = cardConvId;
    const lead = isWatched ? watchedLeads[matchedLeadId] : phraseTrackedLeads[matchedLeadId];
    const markLeadChanged = () => {
      if (isWatched) hasStorageChanges = true;
      else hasPhraseTrackedChanges = true;
    };

    const cardText = card.innerText || '';
    if (!cardText.trim()) return;

    let hasUnreadBadge = false;
    let unreadCountFound = 0;

    const badges = card.querySelectorAll('[class*="badge"], [class*="Badge"], [class*="counter"], [class*="unread"], span, div');
    for (const b of badges) {
      if (b.classList?.contains('radar-chat-badge')) continue;
      const val = b.innerText.trim();
      if (/^\d{1,3}$/.test(val) && b.children.length === 0) {
        const num = parseInt(val, 10);
        if (num > 0) {
          const rect = b.getBoundingClientRect();
          if (rect.width > 0 && rect.width < 45 && rect.height < 45) {
            hasUnreadBadge = true;
            unreadCountFound = num;
            break;
          }
        }
      }
    }

    const lines = cardText.split('\n').map(l => l.trim()).filter(Boolean);
    let snippet = '';
    if (lines.length >= 2) {
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!/^\d{1,2}:\d{2}/.test(line) && !line.includes('Lead') && line !== lead.name && !line.startsWith('🔵') && !line.startsWith('🟣') && !line.startsWith('🟠') && !line.startsWith('🌸') && !line.startsWith('🟢') && !line.startsWith('⏳') && !line.startsWith('⭐') && !line.startsWith('👑')) {
          snippet = line;
          break;
        }
      }
    }

    const isOutgoing = snippet.includes('↗') || snippet.startsWith('You:') || snippet.startsWith('Tú:') || cardText.includes('↗');

    if (isOutgoing) {
      lastDetectedSnippet[matchedLeadId] = snippet;
      if (lead.lastMessage !== snippet) {
        lead.lastMessage = snippet;
        markLeadChanged();
      }
      if (lead.unreadCount > 0 && !hasUnreadBadge) {
        lead.unreadCount = 0;
        markLeadChanged();
      }
      return;
    }

    const previousSnippet = lastDetectedSnippet[matchedLeadId] || lead.lastMessage;
    const isDifferentSnippet = snippet && snippet !== previousSnippet;
    const isCurrentActiveChat = currentInfo.conversationId === matchedLeadId && isAppFocused;

    if (hasUnreadBadge || (isDifferentSnippet && !isCurrentActiveChat)) {
      if (snippet) lastDetectedSnippet[matchedLeadId] = snippet;

      if (isDifferentSnippet || (unreadCountFound > (lead.unreadCount || 0))) {
        const newUnread = unreadCountFound || ((lead.unreadCount || 0) + 1);
        if (lead.lastMessage !== snippet || lead.unreadCount !== newUnread) {
          lead.lastMessage = snippet || 'Nuevo mensaje';
          lead.lastMessageTime = new Date().toISOString();
          lead.unreadCount = newUnread;
          if (lead.touchExcludedAt) {
            delete lead.touchExcludedAt;
            delete lead.touchExcludedMsgTime;
            delete lead.touchExcludedSnippet;
          }
          markLeadChanged();

          const isMuted = !!lead.muted || (lead.mutedUntil && Date.now() < lead.mutedUntil);

          const hasFutureFollowUp = (() => {
            if (!lead.followUpDate) return false;
            const now = new Date();
            const todayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0, 10);
            return lead.followUpDate > todayStr;
          })();

          const timeEl = card.querySelector('time, [class*="time"], [data-pw*="time"], [class*="date"]');
          const timeText = (timeEl?.innerText || (typeof extractCardTime === 'function' ? extractCardTime(cardText) : '') || '').toLowerCase().trim();
          const isRecent = typeof isRecentMessageTimestamp === 'function' ? isRecentMessageTimestamp(timeText) : true;

          const shouldNotify = !isWarmup && (isPhraseTracked || !lead.owner || lead.owner === 'mine' || lead.owner === 'pending') && !isMuted && !hasFutureFollowUp && isRecent;
          if (shouldNotify) {
            const nowTime = Date.now();
            const lastNotify = lastSocketNotifyMap.get(matchedLeadId) || 0;
            if (nowTime - lastNotify >= 3000) {
              lastSocketNotifyMap.set(matchedLeadId, nowTime);
              if (nowTime - lastGlobalAlertSoundTime >= 3500) {
                lastGlobalAlertSoundTime = nowTime;
                playSalesAlertSound();
              }

              const isPending = lead.owner === 'pending';
              const stageTag = lead.processStage ? ` [${lead.processStage}]` : '';
              const payload = {
                contactName: isPending ? `${lead.name} [Por Asignar]` : `${lead.name}${stageTag}`,
                messageSnippet: lead.lastMessage,
                conversationId: matchedLeadId,
                spaceId: lead.spaceId || currentInfo.spaceId,
                fullUrl: `https://app.respond.io/space/${lead.spaceId || currentInfo.spaceId}/inbox/${matchedLeadId}`
              };

              if (isAppFocused) {
                showInPageToast(payload);
              } else {
                safeSendMessage({
                  type: 'NOTIFY_NEW_MESSAGE',
                  payload
                });
              }
            }
          }
        }
      }
    }

    if (isCurrentActiveChat && lead.unreadCount > 0) {
      lead.unreadCount = 0;
      markLeadChanged();
    }
  });

  if (hasStorageChanges) {
    safeStorageSet({ watchedLeads });
    safeSendMessage({ type: 'UPDATE_BADGE' });
    updateChatListBadges();
    if (typeof updateWidgetUI === 'function') updateWidgetUI();
  }
  if (hasPhraseTrackedChanges) {
    safeStorageSet({ phraseTrackedLeads });
  }
}

function bindAssignmentsToDom(assignments) {
  if (!Array.isArray(assignments) || assignments.length === 0) return;
  let hasChanges = false;
  let queueChanged = false;

  const activeUrl = parseCurrentUrl();
  const currentActiveConvId = activeUrl.conversationId;
  const currentActiveName = currentActiveConvId ? getActiveContactName() : null;
  const cards = document.querySelectorAll('a.conversation-list--item, a[href*="/inbox/"], [data-pw="link-convo-item"]');

  for (const item of assignments) {
    if (!item) continue;

    if (item.conversationId) {
      const prev = watchedLeads[item.conversationId] || {};
      if (prev.sale && prev.sale.isSold) continue;

      if (!watchedLeads[item.conversationId] || watchedLeads[item.conversationId].owner !== item.assignee) {
        watchedLeads[item.conversationId] = {
          ...prev,
          conversationId: item.conversationId,
          spaceId: item.spaceId || activeUrl.spaceId || prev.spaceId || '384258',
          name: item.leadName || prev.name || `Lead ${item.conversationId}`,
          owner: item.assignee,
          targetPlan: item.plan || prev.targetPlan || 'Starter',
          addedAt: prev.addedAt || new Date().toISOString(),
          lastMessage: prev.lastMessage || '',
          lastMessageTime: prev.lastMessageTime || new Date().toISOString(),
          unreadCount: prev.unreadCount || 0
        };
        hasChanges = true;
      }
      continue;
    }

    if (item.leadName) {
      const itemTime = item.createdAt || 0;
      const itemAge = itemTime ? (Date.now() - itemTime) : 0;
      const isSpecificName = /\d{6,}|[a-zA-ZáéíóúÁÉÍÓÚñÑ]{2,}\s+[a-zA-ZáéíóúÁÉÍÓÚñÑ]{2,}/.test(item.leadName);
      const allowedWindow = isSpecificName ? (12 * 60 * 60 * 1000) : (30 * 60 * 1000);
      if (itemAge > allowedWindow) {
        continue;
      }

      let matched = false;

      if (currentActiveConvId && !dismissedLeads[currentActiveConvId] && currentActiveName && currentActiveName !== 'Lead Seleccionado') {
        const activeCard = document.querySelector(`a[href*="/inbox/${currentActiveConvId}"]`)
          || document.querySelector('a.conversation-list--item[selected="true"], [data-pw="link-convo-item"][selected="true"]');
        const isLeadFresh = !activeCard || isCardActivityWithinWindow(activeCard);

        if (isLeadFresh && isContactNameMatch(currentActiveName, item.leadName)) {
          const prev = watchedLeads[currentActiveConvId] || {};
          if (prev.sale && prev.sale.isSold) {
            matched = true;
            continue;
          }

          if (!watchedLeads[currentActiveConvId] || watchedLeads[currentActiveConvId].owner !== item.assignee) {
            watchedLeads[currentActiveConvId] = {
              ...prev,
              conversationId: currentActiveConvId,
              spaceId: activeUrl.spaceId || prev.spaceId || '384258',
              name: currentActiveName || prev.name,
              owner: item.assignee,
              targetPlan: item.plan || prev.targetPlan || 'Starter',
              addedAt: prev.addedAt || new Date().toISOString(),
              lastMessage: prev.lastMessage || '',
              lastMessageTime: prev.lastMessageTime || new Date().toISOString(),
              unreadCount: prev.unreadCount || 0
            };
            hasChanges = true;
            matched = true;
            showAutoAssignToast(currentActiveName, item.assignee, item.plan);
          }
        }
      }

      cards.forEach(card => {
        const cardConvId = extractCardConversationId(card);
        if (!cardConvId || dismissedLeads[cardConvId]) return;

        if (!isCardActivityWithinWindow(card)) return;

        const cardName = getCardContactName(card);
        if (cardName && isContactNameMatch(cardName, item.leadName)) {
          const prev = watchedLeads[cardConvId] || {};
          if (prev.sale && prev.sale.isSold) {
            matched = true;
            return;
          }

          if (!watchedLeads[cardConvId] || watchedLeads[cardConvId].owner !== item.assignee) {
            watchedLeads[cardConvId] = {
              ...prev,
              conversationId: cardConvId,
              spaceId: activeUrl.spaceId || prev.spaceId || '384258',
              name: cardName || prev.name,
              owner: item.assignee,
              targetPlan: item.plan || prev.targetPlan || 'Starter',
              addedAt: prev.addedAt || new Date().toISOString(),
              lastMessage: prev.lastMessage || '',
              lastMessageTime: prev.lastMessageTime || new Date().toISOString(),
              unreadCount: prev.unreadCount || 0
            };
            hasChanges = true;
            matched = true;
            showAutoAssignToast(cardName, item.assignee, item.plan);
          }
        }
      });

      const cleanKey = normalizeContactName(item.leadName);
      if (matched && autoAssignQueue[cleanKey]) {
        delete autoAssignQueue[cleanKey];
        queueChanged = true;
      }
    }
  }

  if (hasChanges) {
    safeStorageSet({ watchedLeads, ...(queueChanged ? { autoAssignQueue } : {}) });
    safeSendMessage({ type: 'UPDATE_BADGE' });
    updateWidgetUI();
    updateChatListBadges();
  } else if (queueChanged) {
    safeStorageSet({ autoAssignQueue });
  }
}

window.addEventListener('RADAR_SOCKET_CHAT_ACTIVITY', async (e) => {
  if (isFlashRunningNow()) return;

  const detail = e.detail;
  if (!detail || !detail.contactId) return;

  const conversationId = String(detail.contactId);
  const isWatched = !!watchedLeads[conversationId];
  const isPhraseTracked = !isWatched && !!phraseTrackedLeads[conversationId];
  const lead = isWatched ? watchedLeads[conversationId] : phraseTrackedLeads[conversationId];

  if (!lead) return;

  const currentInfo = parseCurrentUrl();
  const isAppFocused = typeof document !== 'undefined' && document.hasFocus() && !document.hidden;
  const isCurrentActiveChat = currentInfo.conversationId === conversationId && isAppFocused;

  if (detail.traffic === 'outgoing') {
    const outSnippet = detail.text ? (detail.text.startsWith('Tú:') ? detail.text : `Tú: ${detail.text}`) : lead.lastMessage;
    lead.lastMessage = outSnippet.slice(0, 120);
    lead.lastMessageTime = detail.createdAt || new Date().toISOString();
    lead.unreadCount = 0;
    if (typeof lastDetectedSnippet !== 'undefined') {
      lastDetectedSnippet[conversationId] = lead.lastMessage;
    }
    if (isWatched) {
      await safeStorageSet({ watchedLeads });
      safeSendMessage({ type: 'UPDATE_BADGE' });
      if (typeof updateWidgetUI === 'function') updateWidgetUI();
      if (typeof updateChatListBadges === 'function') updateChatListBadges();
    } else {
      await safeStorageSet({ phraseTrackedLeads });
    }
    return;
  }

  if (detail.traffic === 'incoming') {
    const rawSnippet = (detail.text || 'Nuevo mensaje').trim();
    const snippet = rawSnippet.slice(0, 120);

    const now = Date.now();
    const lastNotify = lastSocketNotifyMap.get(conversationId) || 0;
    const isDuplicateBurst = (lead.lastMessage === snippet && (now - lastNotify < 2500));

    if (detail.name && (!lead.name || lead.name.startsWith('tmp_') || lead.name.startsWith('Lead #'))) {
      lead.name = detail.name;
    }

    lead.lastMessage = snippet;
    lead.lastMessageTime = detail.createdAt || new Date().toISOString();
    if (typeof lastDetectedSnippet !== 'undefined') {
      lastDetectedSnippet[conversationId] = snippet;
    }

    if (!isCurrentActiveChat) {
      if (!isDuplicateBurst) {
        lead.unreadCount = (lead.unreadCount || 0) + 1;
      }
    } else {
      lead.unreadCount = 0;
    }

    if (lead.touchExcludedAt) {
      delete lead.touchExcludedAt;
      delete lead.touchExcludedMsgTime;
      delete lead.touchExcludedSnippet;
    }

    if (isWatched) {
      await safeStorageSet({ watchedLeads });
      safeSendMessage({ type: 'UPDATE_BADGE' });
      if (typeof updateWidgetUI === 'function') updateWidgetUI();
      if (typeof updateChatListBadges === 'function') updateChatListBadges();
    } else {
      await safeStorageSet({ phraseTrackedLeads });
    }

    if (isDuplicateBurst) return;
    lastSocketNotifyMap.set(conversationId, now);

    const isMuted = !!lead.muted || (lead.mutedUntil && Date.now() < lead.mutedUntil);
    const hasFutureFollowUp = (() => {
      if (!lead.followUpDate) return false;
      const nowDate = new Date();
      const todayStr = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).toISOString().slice(0, 10);
      return lead.followUpDate > todayStr;
    })();

    const shouldNotify = (isPhraseTracked || !lead.owner || lead.owner === 'mine' || lead.owner === 'pending') && !isMuted && !hasFutureFollowUp && !isCurrentActiveChat;

    if (shouldNotify) {
      const nowSound = Date.now();
      if (nowSound - lastGlobalAlertSoundTime >= 3500) {
        lastGlobalAlertSoundTime = nowSound;
        playSalesAlertSound();
      }

      const isPending = lead.owner === 'pending';
      const stageTag = lead.processStage ? ` [${lead.processStage}]` : '';
      const payload = {
        contactName: isPending ? `${lead.name} [Por Asignar]` : `${lead.name}${stageTag}`,
        messageSnippet: snippet,
        conversationId: conversationId,
        spaceId: lead.spaceId || currentInfo.spaceId || detail.spaceId || '384258',
        fullUrl: `https://app.respond.io/space/${lead.spaceId || currentInfo.spaceId || detail.spaceId || '384258'}/inbox/${conversationId}`
      };

      if (isAppFocused) {
        showInPageToast(payload);
      } else {
        safeSendMessage({
          type: 'NOTIFY_NEW_MESSAGE',
          payload
        });
      }
    }
  }
});

window.addEventListener('RADAR_PHRASE_MATCH_DETECTED', async (e) => {
  if (isFlashRunningNow()) return;

  const detail = e.detail;
  if (!detail || !detail.conversationId) return;

  const conversationId = String(detail.conversationId);

  if (watchedLeads[conversationId]) return;

  const currentInfo = parseCurrentUrl();
  const existing = phraseTrackedLeads[conversationId] || {};
  const contactName = detail.name || existing.name || getActiveContactName() || `Lead #${conversationId}`;
  const outSnippet = detail.text ? (detail.text.startsWith('Tú:') ? detail.text : `Tú: ${detail.text}`).slice(0, 120) : (existing.lastMessage || '');

  phraseTrackedLeads[conversationId] = {
    ...existing,
    conversationId,
    spaceId: currentInfo.spaceId || existing.spaceId || '384258',
    name: contactName,
    trackedByPhrase: true,
    addedAt: existing.addedAt || new Date().toISOString(),
    lastMessage: outSnippet,
    lastMessageTime: new Date().toISOString(),
    unreadCount: 0
  };

  if (typeof lastDetectedSnippet !== 'undefined' && outSnippet) {
    lastDetectedSnippet[conversationId] = outSnippet;
  }

  await safeStorageSet({ phraseTrackedLeads });
});

async function advanceInboxScroll(container) {
  const cards = getInboxCards();
  const lastCard = cards.length > 0 ? cards[cards.length - 1] : null;

  if (lastCard) {
    try {
      lastCard.scrollIntoView({ block: 'end', inline: 'nearest', behavior: 'instant' });
      lastCard.focus?.();
    } catch (e) { }
  }

  let target = container;
  if (!target || target === document.documentElement || target.scrollHeight <= target.clientHeight) {
    target = findActiveScrollContainer();
  }

  let scrolled = false;
  if (target && target !== document.documentElement) {
    const before = target.scrollTop;
    target.scrollTop += 550;
    if (target.scrollTop > before) {
      scrolled = true;
      target.dispatchEvent(new Event('scroll', { bubbles: true }));
      target.dispatchEvent(new UIEvent('scroll', { bubbles: true }));
    }
  }

  if (lastCard) {
    let p = lastCard.parentElement;
    while (p && p !== document.body && p !== document.documentElement) {
      const before = p.scrollTop;
      p.scrollTop += 550;
      if (p.scrollTop > before) {
        scrolled = true;
        p.dispatchEvent(new Event('scroll', { bubbles: true }));
      }
      p = p.parentElement;
    }
  }

  if (lastCard) {
    try {
      lastCard.dispatchEvent(new WheelEvent('wheel', { deltaY: 800, bubbles: true }));
      lastCard.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', code: 'PageDown', keyCode: 34, bubbles: true }));
    } catch (e) { }
  }

  return scrolled;
}

function clickNativeUnrespondedToggle() {
  const allElements = Array.from(document.querySelectorAll('label, div, span, button, input'));
  const match = allElements.find(el => {
    const t = (el.innerText || el.textContent || '').trim().toLowerCase();
    return t === 'sin responder' || t.startsWith('sin responder');
  });
  if (match) {
    const toggle = match.querySelector('input[type="checkbox"], [role="switch"], .v-switch, .v-selection-control')
      || match.closest('label, button')
      || match;
    toggle.click();
    return true;
  }
  return false;
}

function showCrawlProgressToast(msg) {
  hideCrawlProgressToast();
  const t = document.createElement('div');
  t.id = 'radar-crawl-progress-toast';
  t.className = 'radar-progress-toast';

  const rawMsg = msg || '';
  let iconName = 'zap';
  let iconClass = 'toast-icon-zap';

  if (rawMsg.includes('🛑') || /detenido|parado/i.test(rawMsg)) {
    iconName = 'stopCircle';
    iconClass = 'toast-icon-stop';
  } else if (rawMsg.includes('⏳') || /cargando|subiendo|rastreando/i.test(rawMsg)) {
    iconName = 'clock';
    iconClass = 'toast-icon-clock';
  } else if (rawMsg.includes('🎉') || rawMsg.includes('✅') || /completado|felicidades/i.test(rawMsg)) {
    iconName = 'checkCircle';
    iconClass = 'toast-icon-success';
  } else if (rawMsg.includes('🧠') || /analizando|aprendiendo/i.test(rawMsg)) {
    iconName = 'sparkles';
    iconClass = 'toast-icon-ai';
  } else if (rawMsg.includes('⚠️') || /error/i.test(rawMsg)) {
    iconName = 'alertCircle';
    iconClass = 'toast-icon-alert';
  }

  const iconSvg = window.RadarIcons?.render(iconName, 14, `radar-toast-svg-icon ${iconClass}`) || '';
  const cleanMsg = rawMsg.replace(/^[⚡🛑⏳📜🧠🎉✅⚠️✨👉\s]+/, '').trim();

  t.innerHTML = `
    <span class="radar-toast-icon ${iconClass}">${iconSvg || ''}</span>
    <span class="radar-toast-text">${escapeHtml(cleanMsg)}</span>
  `;
  document.body.appendChild(t);
}

function hideCrawlProgressToast() {
  const existing = document.getElementById('radar-crawl-progress-toast');
  if (existing) existing.remove();
}

function showCrawlResultModal(report) {
  const existing = document.getElementById('radar-crawl-result-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'radar-crawl-result-modal';
  overlay.className = 'radar-scan-modal-overlay';

  const oldest = report.oldestUnreadBottomUp;
  const list = report.trulyUnreadList || [];

  overlay.innerHTML = `
    <div class="radar-scan-modal-box" style="max-width: 680px;">
      <div class="radar-scan-modal-header">
        <h3 class="radar-scan-modal-title">
          📜 Chats Sin Responder (Últimos ${report.targetDays} días)
        </h3>
        <button class="radar-scan-modal-close" id="crawl-modal-close-btn">✕</button>
      </div>

      <div class="radar-scan-modal-body">
        <div style="font-size: 12px; color: #94a3b8; display: flex; justify-content: space-between;">
          <span>Chats analizados: <strong>${report.totalChatsInspected}</strong></span>
          <span>Chats reales pendientes: <strong style="color: #34d399;">${report.totalTrulyUnread}</strong></span>
        </div>

        ${list.length > 0 ? `
          <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 8px; padding: 10px 12px; margin: 10px 0; display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;">
            <div style="font-size: 11.5px; color: #cbd5e1;">
              🎯 <strong>Atención Secuencial:</strong> Elige por dónde empezar a responder:
            </div>
            <div style="display: flex; gap: 6px;">
              <button type="button" class="radar-scan-btn-filter" id="btn-start-queue-oldest" style="background: #0284c7; border: 1px solid #38bdf8; color: #fff; padding: 5px 12px; border-radius: 6px; font-size: 11px; cursor: pointer; font-weight: bold;">
                ⬆️ Antiguos Primero
              </button>
              <button type="button" class="radar-scan-btn-filter" id="btn-start-queue-newest" style="background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #6ee7b7; padding: 5px 12px; border-radius: 6px; font-size: 11px; cursor: pointer; font-weight: bold;">
                ⬇️ Recientes Primero
              </button>
            </div>
          </div>
        ` : ''}

        ${oldest ? `
          <div class="radar-crawl-highlight-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 13px; font-weight: 700; color: #34d399;">
                👉 Chat Más Antiguo Esperando Respuesta (De abajo hacia arriba):
              </span>
              <span class="radar-scan-badge success">${oldest.unreadCount} no leído(s)</span>
            </div>
            <div style="font-size: 14px; font-weight: 700; color: #f8fafc; margin-bottom: 4px;">
              👤 ${escapeHtml(oldest.name)}
              <span style="font-size: 11px; font-weight: normal; color: #94a3b8; margin-left: 8px;">${escapeHtml(oldest.timeStr)}</span>
            </div>
            <div style="font-size: 12px; color: #e2e8f0; margin-bottom: 12px; font-style: italic; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 6px;">
              "${escapeHtml(oldest.snippet)}"
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 11px; color: #94a3b8;">Asesor: <strong>${escapeHtml(oldest.owner)}</strong> · Etapa: <strong>${escapeHtml(oldest.stage)}</strong></span>
              ${oldest.url ? `
                <button type="button" class="radar-crawl-btn-go" data-url="${escapeHtml(oldest.url)}">
                  Ir al Chat ↗
                </button>
              ` : ''}
            </div>
          </div>
        ` : `
          <div class="radar-scan-card">
            <div style="color: #34d399; font-weight: 600; text-align: center; padding: 12px;">
              ✅ ¡Excelente! No hay chats pendientes con mensajes entrantes del lead en los últimos ${report.targetDays} días.
            </div>
          </div>
        `}

        ${list.length > 1 ? `
          <div style="margin-top: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 12px; font-weight: 700; color: #cbd5e1;">
                Todos los chats pendientes detectados (${list.length}):
              </span>
              <input type="text" id="radar-crawl-search" placeholder="🔍 Buscar nombre o mensaje..." style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(56, 189, 248, 0.4); color: #f8fafc; font-size: 11px; padding: 4px 8px; border-radius: 4px; outline: none; width: 180px;">
            </div>
            <div id="radar-crawl-items-container" style="display: flex; flex-direction: column; gap: 6px; max-height: 240px; overflow-y: auto;">
              ${list.map(c => `
                <div class="radar-crawl-item-row" data-search="${escapeHtml((c.name + ' ' + (c.snippet || '') + ' ' + (c.timeStr || '') + ' ' + (c.owner || '')).toLowerCase())}">
                  <div>
                    <strong style="color: #f8fafc; font-size: 12.5px;">${escapeHtml(c.name)}</strong>
                    <span style="font-size: 10px; color: #94a3b8; margin-left: 6px;">${escapeHtml(c.timeStr)}</span>
                    <div style="font-size: 11px; color: #cbd5e1; max-width: 440px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      "${escapeHtml(c.snippet || '(Sin mensaje)')}"
                    </div>
                  </div>
                  ${c.url ? `
                    <button type="button" class="radar-crawl-btn-go" data-url="${escapeHtml(c.url)}" style="padding: 3px 8px; font-size: 10.5px;">
                      Abrir
                    </button>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>

      <div class="radar-scan-modal-footer">
        <button type="button" class="radar-scan-btn-filter" id="btn-toggle-unresponded-filter" style="margin-right: auto; background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.5); color: #93c5fd; padding: 6px 12px; border-radius: 6px; font-size: 11px; cursor: pointer;">
          ⚡ Filtrar 'Sin responder' en Respond.io
        </button>
        <button type="button" class="radar-scan-btn-copy" id="btn-copy-crawl-json">
          📋 Copiar Reporte JSON
        </button>
        <button type="button" class="radar-modal-btn-save" id="btn-close-crawl-modal" style="padding: 6px 16px; font-size: 12px;">
          Entendido
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const searchInput = overlay.querySelector('#radar-crawl-search');
  const itemsContainer = overlay.querySelector('#radar-crawl-items-container');
  if (searchInput && itemsContainer) {
    searchInput.addEventListener('input', (e) => {
      const q = (e.target.value || '').toLowerCase().trim();
      const rows = itemsContainer.querySelectorAll('.radar-crawl-item-row');
      rows.forEach(r => {
        const val = r.getAttribute('data-search') || '';
        r.style.display = (!q || val.includes(q)) ? 'flex' : 'none';
      });
    });
  }

  overlay.querySelector('#crawl-modal-close-btn').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#btn-close-crawl-modal').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  overlay.querySelector('#btn-start-queue-oldest')?.addEventListener('click', () => {
    overlay.remove();
    if (typeof startSequentialAttention === 'function') {
      startSequentialAttention(list, 'oldest');
    }
  });

  overlay.querySelector('#btn-start-queue-newest')?.addEventListener('click', () => {
    overlay.remove();
    if (typeof startSequentialAttention === 'function') {
      startSequentialAttention(list, 'newest');
    }
  });

  overlay.querySelector('#btn-toggle-unresponded-filter')?.addEventListener('click', () => {
    clickNativeUnrespondedToggle();
    overlay.remove();
    setTimeout(() => {
      crawlInboxHistory(report.targetDays || 3);
    }, 600);
  });

  overlay.querySelectorAll('.radar-crawl-btn-go').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = btn.dataset.url;
      if (url) {
        overlay.remove();
        const cIdMatch = url.match(/\/inbox\/(\d+)/);
        const cId = cIdMatch ? cIdMatch[1] : null;
        if (typeof performSmoothNavigation === 'function') {
          performSmoothNavigation(cId, url);
        } else {
          window.location.href = url;
        }
      }
    });
  });

  overlay.querySelector('#btn-copy-crawl-json').addEventListener('click', () => {
    navigator.clipboard.writeText(JSON.stringify(report, null, 2)).then(() => {
      const b = overlay.querySelector('#btn-copy-crawl-json');
      b.innerText = '✅ ¡Copiado!';
      setTimeout(() => { b.innerText = '📋 Copiar Reporte JSON'; }, 2000);
    });
  });
}

async function crawlInboxHistory(targetDays = 5) {
  const listContainer = findActiveScrollContainer();
  const initialScrollTop = listContainer ? listContainer.scrollTop : 0;
  const discoveredMap = new Map();
  const maxScrollSteps = Math.max(targetDays * 25, 90);
  let step = 0;
  let idleRoundsAtBottom = 0;
  const maxIdleRounds = 14;
  let previousTotalCards = 0;

  showCrawlProgressToast(`⏳ Rastreando chats de los últimos ${targetDays} días...`);

  while (step < maxScrollSteps) {
    step++;
    const visibleCards = getInboxCards();

    visibleCards.forEach(card => {
      try {
        const info = analyzeInboxCard(card);
        if (info && info.conversationId && !discoveredMap.has(info.conversationId)) {
          discoveredMap.set(info.conversationId, info);
        }
      } catch (err) { }
    });

    const currentTotalCards = discoveredMap.size;
    showCrawlProgressToast(`⏳ Rastreando... ${currentTotalCards} chats cargados (Paso ${step})`);

    let maxAgeDays = 0;
    for (const c of discoveredMap.values()) {
      const age = estimateChatAgeDays(c.timeStr);
      if (age > maxAgeDays) maxAgeDays = age;
    }

    if (maxAgeDays >= targetDays && currentTotalCards >= 25 && step >= 10) {
      break;
    }

    await advanceInboxScroll(listContainer);
    await new Promise(res => setTimeout(res, 450));

    if (currentTotalCards === previousTotalCards) {
      idleRoundsAtBottom++;
      await advanceInboxScroll(listContainer);
      await new Promise(res => setTimeout(res, 850));

      if (idleRoundsAtBottom >= maxIdleRounds) {
        break;
      }
    } else {
      idleRoundsAtBottom = 0;
      previousTotalCards = currentTotalCards;
    }
  }

  if (listContainer) {
    try { listContainer.scrollTop = initialScrollTop; } catch (e) { }
  }

  const allCards = Array.from(discoveredMap.values());
  const trulyUnreadCards = allCards.filter(c => c.isTrulyUnread);
  const oldestUnread = trulyUnreadCards.length > 0 ? trulyUnreadCards[trulyUnreadCards.length - 1] : null;
  const newestUnread = trulyUnreadCards.length > 0 ? trulyUnreadCards[0] : null;

  const crawlReport = {
    crawledAt: new Date().toISOString(),
    targetDays,
    totalChatsInspected: allCards.length,
    totalTrulyUnread: trulyUnreadCards.length,
    oldestUnreadBottomUp: oldestUnread,
    newestUnreadTopDown: newestUnread,
    trulyUnreadList: trulyUnreadCards,
    allChatsSample: allCards.slice(0, 50)
  };

  hideCrawlProgressToast();
  showCrawlResultModal(crawlReport);

  return crawlReport;
}

function isSystemEventText(text) {
  if (!text) return true;
  const s = text.trim().toLowerCase();
  if (isDateString(s)) return true;

  const systemPatterns = [

    /^conversaci[oó]n abierta/i,
    /^etapa de ciclo de vida/i,
    /^añadido$/i,
    /^añadida$/i,
    /^asignado a/i,
    /^cerrada por/i,
    /^contacto asignado/i,
    /^nota interna/i,
    /^etiqueta añadida/i,
    /^canal conectado/i,
    /^respondi[oó] a tu historia\s*king/i,
    /^respondi[oó] a tu historia/i,
    /^historia respondida/i,
    /^enlace de la historia/i,
    /^ver historia/i,
    /^envi[oó] un archivo/i,
    /^contacto creado/i,
    /^v[ií]a instagram/i,
    /^v[ií]a whatsapp/i,
    /^v[ií]a telegram/i,
    /^v[ií]a web/i,
    /est[aá]\s+escribiendo/i,
    /flujo\s+trabajo/i,
    /sales\s+agent\s+est[aá]\s+gestionando/i,
    /agente\s+de\s+ia\s+dejar[aá]\s+de\s+responder/i,

    /^conversation opened/i,
    /^lifecycle stage/i,
    /^workflow/i,
    /^assigned to/i,
    /^closed by/i,
    /^contact assigned/i,
    /^internal note/i,
    /^tag added/i,
    /^channel connected/i,
    /^replied to your story/i,
    /^story link/i,
    /^view story/i,
    /^sent a file/i,
    /^contact created/i,
    /^via instagram/i,
    /^via whatsapp/i,
    /^via telegram/i,
    /^via web/i,
    /is typing/i,
    /is managing/i,
    /ai agent will stop responding/i
  ];

  for (const pat of systemPatterns) {
    if (pat.test(s)) return true;
  }
  return false;
}

function parseMessageBubbleElement(item, contactName, scrollEl) {
  if (!item) return null;

  if (item.closest?.('[class*="event"], [class*="activity"], [data-pw*="activity"]') ||
    item.matches?.('[class*="event"], [class*="activity"]')) {
    return null;
  }

  const clone = item.cloneNode(true);
  clone.querySelectorAll('time, [class*="time"], [class*="status"], [class*="avatar"], svg, button, [class*="menu"], [class*="icon"], [class*="badge"], [data-pw="message-status"]').forEach(n => n.remove());

  clone.querySelectorAll('[class*="story"], [class*="header"], [class*="reply-to"]').forEach(n => {
    const txt = (n.innerText || '').toLowerCase();
    if (txt.includes('historia') || txt.includes('story')) {
      n.remove();
    }
  });

  let cleanText = (clone.innerText || '').trim();
  cleanText = cleanText
    .replace(/\b\d{1,2}:\d{2}(?:\s*(?:am|pm))?\b/gi, '')
    .replace(/\b(?:entregado|leído|enviado|failed|sending|delivered|read|sent)\b/gi, '')
    .replace(/^respondi[oó]\s+(?:a\s+tu\s+)?historia[:\s]*/i, '')
    .trim();

  if (!cleanText || cleanText.length < 1 || isSystemEventText(cleanText)) {
    return null;
  }

  const isKingLeadTrigger = (typeof isFlashTriggerMatch === 'function')
    ? isFlashTriggerMatch(cleanText)
    : /\b(?:k+i+n+g+[s]?|r+e+y+[e]?s?|s+e+c+r+e+t+o+[s]?)\b/i.test(cleanText);

  const rowCls = ((item.className || '') + ' ' + (item.parentElement?.className || '') + ' ' + (item.firstElementChild?.className || '')).toLowerCase();
  const isExplicitOutgoing = /\b(?:outgoing|message--sent|sender--me|justify-end|flex-row-reverse|items-end)\b/i.test(rowCls);
  const isExplicitIncoming = /\b(?:incoming|message--received|sender--them|justify-start|items-start)\b/i.test(rowCls);

  const hasDeliveryTicks = !!item.querySelector?.('[data-pw="message-status"], [class*="message-status"], [class*="status--sent"], [class*="status--delivered"], [class*="status--read"], .q-icon[name*="done"], .v-icon[class*="check"], svg[data-icon*="check"]');

  let isRightSide = false;
  let isLeftSide = false;
  const bubble = item.querySelector('[class*="bubble"], [class*="content"], [class*="text"], div:not([class*="row"]):not([class*="flex"])') || item;
  const bRect = bubble.getBoundingClientRect();

  let contRect = null;
  if (scrollEl && typeof scrollEl.getBoundingClientRect === 'function') {
    const sRect = scrollEl.getBoundingClientRect();
    if (sRect.left >= 280 && sRect.width > 200) {
      contRect = sRect;
    }
  }

  if (!contRect) {
    contRect = {
      left: 360,
      right: Math.min(window.innerWidth - 80, 1200),
      width: Math.min(window.innerWidth - 80, 1200) - 360
    };
  }

  if (contRect.width > 80 && bRect.width > 0) {
    const bubbleCenter = bRect.left + bRect.width / 2;
    const contCenter = contRect.left + contRect.width / 2;

    const distFromLeft = bRect.left - contRect.left;
    const distFromRight = contRect.right - bRect.right;

    if (distFromRight + 35 < distFromLeft || bubbleCenter > contCenter + 25) {
      isRightSide = true;
    } else if (distFromLeft + 35 < distFromRight || bubbleCenter < contCenter - 25) {
      isLeftSide = true;
    }
  }

  let isAdvisorColor = false;
  try {
    const bg = window.getComputedStyle(bubble).backgroundColor || '';
    if (bg.includes('rgb(0,') || bg.includes('rgb(3,') || bg.includes('rgb(14,') || bg.includes('rgb(59,') || bg.includes('rgb(37, 99, 235)')) {
      isAdvisorColor = true;
    }
  } catch (e) { }

  let isAdvisor = false;
  if (isKingLeadTrigger) {
    isAdvisor = false;
  } else if (hasDeliveryTicks) {
    isAdvisor = true;
  } else if (isExplicitOutgoing) {
    isAdvisor = true;
  } else if (isExplicitIncoming) {
    isAdvisor = false;
  } else if (isRightSide && !isLeftSide) {
    isAdvisor = true;
  } else if (isLeftSide && !isRightSide) {
    isAdvisor = false;
  } else if (isAdvisorColor) {
    isAdvisor = true;
  }

  return {
    sender: isAdvisor ? 'Asesor' : 'Lead',
    speakerLabel: isAdvisor ? 'Asesor' : `Lead (${contactName})`,
    text: cleanText
  };
}

function getActiveConversationHistory(limit = 20) {
  const contactName = getActiveContactName() || 'Lead';
  const scrollEl = findChatScrollContainer();

  let rawItems = [];
  if (scrollEl) {
    rawItems = Array.from(scrollEl.querySelectorAll('[id^="message-item-"], [class*="message-item"], [data-pw*="message-item"], .v-virtual-scroll__item'));
  }
  if (rawItems.length === 0) {
    const main = document.querySelector('main') || document.body;
    rawItems = Array.from(main.querySelectorAll('[id^="message-item-"], [class*="message-item"], [data-pw*="message-item"]'));
  }

  rawItems = rawItems.filter(el => {
    const r = el.getBoundingClientRect();
    if (r.left < 300 || r.width < 20 || r.height < 10) return false;
    return !el.closest('.v-virtual-scroll__item--avatar, .conversation-list, [class*="inbox-conversation-list"], [class*="conversation-list--item"], aside, nav');
  });

  const messages = [];
  if (rawItems.length > 0) {
    rawItems.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    for (const item of rawItems) {
      const parsed = parseMessageBubbleElement(item, contactName, scrollEl);
      if (parsed) {
        messages.push(parsed);
      }
    }
  }

  if (messages.length === 0) {
    const lastMsg = getActiveConversationLastLeadMessage();
    if (lastMsg) {
      messages.push({
        sender: 'Lead',
        speakerLabel: `Lead (${contactName})`,
        text: lastMsg
      });
    }
  }

  return messages.slice(-limit);
}

async function crawlAndExtractCompleteConversation(contactName = 'Lead') {
  let scrollEl = findChatScrollContainer();

  if (!scrollEl) {
    await new Promise(r => setTimeout(r, 600));
    scrollEl = findChatScrollContainer();
  }

  function getVisibleItems() {
    let items = [];
    if (scrollEl) {
      items = Array.from(scrollEl.querySelectorAll('[id^="message-item-"], [class*="message-item"], [data-pw*="message-item"], .v-virtual-scroll__item'));
    }
    if (items.length === 0) {
      const main = document.querySelector('main') || document.body;
      items = Array.from(main.querySelectorAll('[id^="message-item-"], [class*="message-item"], [data-pw*="message-item"]'));
    }
    return items.filter(el => {
      const r = el.getBoundingClientRect();
      if (r.left < 300 || r.width < 20 || r.height < 10) return false;
      return !el.closest('.v-virtual-scroll__item--avatar, .conversation-list, [class*="inbox-conversation-list"], [class*="conversation-list--item"], aside, nav');
    });
  }

  showCrawlProgressToast('📜 Subiendo al inicio del chat para cargar el 100% del historial...');

  if (scrollEl && typeof scrollEl.scrollTop !== 'undefined') {
    let prevH = 0;
    let unchanged = 0;
    for (let i = 0; i < 18; i++) {
      const items = getVisibleItems();
      if (items.length > 0) {
        try {
          items[0].scrollIntoView({ block: 'start', behavior: 'instant' });
        } catch (e) { }
      }

      scrollEl.scrollTop = 0;
      scrollEl.dispatchEvent(new Event('scroll', { bubbles: true }));
      scrollEl.dispatchEvent(new UIEvent('scroll'));

      const loadMoreBtn = scrollEl.querySelector('button[class*="load"], [class*="more-messages"], [data-pw*="load-more"]');
      if (loadMoreBtn && typeof loadMoreBtn.click === 'function') {
        loadMoreBtn.click();
      }

      await new Promise(r => setTimeout(r, 550));

      const newH = scrollEl.scrollHeight;
      if (newH === prevH && scrollEl.scrollTop === 0) {
        unchanged++;
        if (unchanged >= 3) break;
      } else {
        unchanged = 0;
        prevH = newH;
      }
    }
  }

  const collectedMap = new Map();

  function scanCurrentView() {
    const items = getVisibleItems();
    items.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

    for (const el of items) {
      const parsed = parseMessageBubbleElement(el, contactName, scrollEl);
      if (parsed && parsed.text) {
        const msgId = el.id || el.getAttribute('data-id') || el.getAttribute('data-message-id') || '';
        const key = msgId ? `id::${msgId}` : `txt::${parsed.sender}::${parsed.text.slice(0, 80)}`;
        if (!collectedMap.has(key)) {
          collectedMap.set(key, parsed);
        }
      }
    }
  }

  scanCurrentView();

  showCrawlProgressToast(`📜 Extrayendo mensajes: ${collectedMap.size} capturados...`);

  if (scrollEl && typeof scrollEl.scrollTop !== 'undefined') {
    const clientH = scrollEl.clientHeight || 500;
    const step = Math.min(220, Math.floor(clientH * 0.42));
    let currentScroll = 0;
    let lastScrollTop = -1;
    let stuck = 0;
    const maxSteps = 120;

    for (let stepIdx = 0; stepIdx < maxSteps; stepIdx++) {
      const items = getVisibleItems();
      if (items.length > 0) {
        try {
          items[items.length - 1].scrollIntoView({ block: 'end', behavior: 'instant' });
        } catch (e) { }
      }

      currentScroll += step;
      scrollEl.scrollTop = currentScroll;
      scrollEl.dispatchEvent(new Event('scroll', { bubbles: true }));
      scrollEl.dispatchEvent(new UIEvent('scroll'));

      await new Promise(r => setTimeout(r, 260));
      scanCurrentView();

      showCrawlProgressToast(`📜 Extrayendo mensajes: ${collectedMap.size} capturados...`);

      const atBottom = scrollEl.scrollTop + clientH >= scrollEl.scrollHeight - 25;
      if (scrollEl.scrollTop === lastScrollTop) {
        stuck++;
        if (stuck >= 3 || atBottom) break;
      } else {
        stuck = 0;
        lastScrollTop = scrollEl.scrollTop;
      }

      if (atBottom) break;
    }

    scrollEl.scrollTop = scrollEl.scrollHeight;
    scrollEl.dispatchEvent(new Event('scroll', { bubbles: true }));
    await new Promise(r => setTimeout(r, 400));
    scanCurrentView();
  }

  const allMessages = Array.from(collectedMap.values());
  return allMessages;
}

function getActiveConversationLastLeadMessage() {
  const bubbles = Array.from(document.querySelectorAll('[id^="message-item-"], [class*="message-item"]'));
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    const cls = (b.className || '') + ' ' + (b.firstElementChild?.className || '');
    if (!cls.includes('justify-end') && !cls.includes('items-end') && !cls.includes('flex-row-reverse')) {
      const text = (b.innerText || '').trim();
      if (text && text.length > 1) return text;
    }
  }

  const selectedCard = document.querySelector('a.conversation-list--item[selected="true"], [data-pw="link-convo-item"][selected="true"]');
  if (selectedCard) {
    const cardInfo = analyzeInboxCard(selectedCard);
    if (cardInfo && cardInfo.snippet) return cardInfo.snippet;
  }

  return '';
}

async function checkChatHasCleanFreshHistory(targetConversationId = null, isSalesAgent = false) {
  let scrollEl = findChatScrollContainer();
  let items = [];

  for (let attempt = 0; attempt < 10; attempt++) {
    scrollEl = findChatScrollContainer();
    if (scrollEl) {
      items = Array.from(scrollEl.querySelectorAll('[id^="message-item-"], [class*="message-item"], [data-pw*="message-item"]'));
      if (items.length > 0) break;
    }
    await new Promise(r => setTimeout(r, 25));
  }

  if (scrollEl && (scrollEl.scrollTop > 40 || scrollEl.scrollHeight > scrollEl.clientHeight + 150)) {
    console.log(`📜 [FlashApartador] Historial previo detectado (scrollTop = ${scrollEl.scrollTop}). Desplazando arriba para inspeccionar eventos iniciales...`);
    scrollEl.scrollTop = 0;
    await new Promise(r => setTimeout(r, 60));
  }

  const chatMessagesPane = scrollEl ||
    document.querySelector('[data-pw="conversation-messages-list"], [class*="conversation-view"] [class*="scroll"], [class*="chat-messages"]');

  if (!chatMessagesPane) {
    console.log('⚡ [FlashApartador] Sin historial previo montado en DOM (chat limpio).');
    return true;
  }

  const chatText = (chatMessagesPane.innerText || '').toLowerCase();

  if (
    chatText.includes('diego tacuri') ||
    chatText.includes('diego tacu') ||
    chatText.includes('assigned to diego') ||
    chatText.includes('asignado a diego') ||
    chatText.includes('dutandiego') ||
    chatText.includes('1073785')
  ) {
    console.log('🛡️ [FlashApartador] OMITIDO: Chat contiene historial o asignación a Diego Tacuri. ¡Pertenece a Diego!');
    return false;
  }

  if (
    chatText.includes('conversation closed') ||
    chatText.includes('conversación cerrada') ||
    chatText.includes('closed by auto-close') ||
    chatText.includes('closed by') ||
    chatText.includes('cerrada por') ||
    chatText.includes('auto-close') ||
    chatText.includes('closed the conversation') ||
    chatText.includes('cerró la conversación') ||
    chatText.includes('cerrado por auto-close') ||
    chatText.includes('cerrada automáticamente')
  ) {
    console.log('🛡️ [FlashApartador] OMITIDO: El contacto tiene una conversación cerrada previamente. Sigue perteneciendo al asesor original.');
    return false;
  }

  if (
    chatText.includes('unassigned this person') ||
    chatText.includes('unassigned this contact') ||
    chatText.includes('desasignó a esta persona') ||
    chatText.includes('desasignó este contacto') ||
    chatText.includes('unassigned by') ||
    chatText.includes('desasignado por') ||
    (chatText.includes('desasignó') && !chatText.includes('desasignar'))
  ) {
    console.log('⏩ [FlashApartador] OMITIDO: El contacto fue desasignado previamente (lead descartado por un asesor).');
    return false;
  }

  if (typeof TEAMMATE_NAMES !== 'undefined') {
    for (const tm of TEAMMATE_NAMES) {
      if (tm.length >= 3) {
        if (
          chatText.includes(`asignado a ${tm}`) ||
          chatText.includes(`assigned to ${tm}`) ||
          chatText.includes(`assigned this person to ${tm}`) ||
          chatText.includes(`assigned this contact to ${tm}`) ||
          chatText.includes(`asignó a esta persona a ${tm}`) ||
          chatText.includes(`asignó este contacto a ${tm}`) ||
          chatText.includes(`${tm} assigned`) ||
          chatText.includes(`${tm} asignó`) ||
          chatText.includes(`${tm} unassigned`) ||
          chatText.includes(`${tm} desasignó`)
        ) {
          console.log(`⏩ [FlashApartador] OMITIDO: Historial contiene interacción previa con compañero "${tm}".`);
          return false;
        }
      }
    }
  }

  const assignRegex = /(?:assigned(?:\s+this\s+(?:person|contact|conversation))?\s+to|asignado\s+a|asignó(?:\s+a\s+esta\s+persona|\s+este\s+contacto)?\s+a)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+){0,3})/gi;
  let assignMatch;
  while ((assignMatch = assignRegex.exec(chatText)) !== null) {
    const assignee = assignMatch[1].trim().toLowerCase();
    if (
      !assignee.includes('daniela tacuri') &&
      !assignee.includes('sales agent') &&
      !assignee.includes('you') &&
      !assignee.includes('ti') &&
      !assignee.includes('sin asignar')
    ) {
      console.log(`⏩ [FlashApartador] OMITIDO: Historial contiene asignación previa a compañero ("${assignee}").`);
      return false;
    }
  }

  const months = {
    ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
    jan: 0, apr: 3, aug: 7, dec: 11
  };
  const dateRegex = /\b(?:(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|jan|apr|aug|dec)[a-z]*\.?\s+(\d{1,2})|(\d{1,2})\s+(?:de\s+)?(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|jan|apr|aug|dec)[a-z]*\.?)(?:[,\s]+(\d{4}))?\b/gi;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const systemDateDividers = Array.from(chatMessagesPane.querySelectorAll(
    '.date-divider, [class*="date-divider"], [class*="divider-text"], [data-pw*="date-divider"], ' +
    '.messenger-event-row, [is-event="true"], [data-pw*="event"], ' +
    '[class*="sticky"] .v-chip, [class*="sticky"] [class*="chip"], .feature-variant, [class*="rounded-modal"], ' +
    '[class*="date"], [class*="chip"], [class*="badge"], [class*="pill"], [class*="divider"], [class*="separator"], ' +
    'time, [data-pw*="time"], [class*="text-caption"], [class*="caption"], [class*="rounded"]'
  ));

  const allShortPills = Array.from(chatMessagesPane.querySelectorAll('*')).filter(el => {
    if (el.children.length > 2) return false;
    const t = (el.innerText || '').trim();
    return t.length >= 3 && t.length <= 40;
  });

  const elementsToCheckForDates = Array.from(new Set([...systemDateDividers, ...allShortPills]));

  for (const div of elementsToCheckForDates) {
    const divText = (div.innerText || '').toLowerCase().trim();
    if (!divText) continue;

    if (
      divText.includes('ayer') ||
      divText.includes('yesterday') ||
      divText.includes('hace 1 d') ||
      divText.includes('hace 2 d') ||
      divText.includes('hace 3 d') ||
      divText.includes('1 day ago') ||
      divText.includes('2 days ago') ||
      divText.includes('days ago') ||
      divText.includes('last week') ||
      divText.includes('semana pasada')
    ) {
      console.log(`⏩ [FlashApartador] OMITIDO: Divisor de fecha pasada en el historial ("${divText}").`);
      return false;
    }

    let dMatch;
    dateRegex.lastIndex = 0;
    while ((dMatch = dateRegex.exec(divText)) !== null) {
      const mStr = (dMatch[1] || dMatch[4] || '').slice(0, 3).toLowerCase();
      const dNum = parseInt(dMatch[2] || dMatch[3], 10);
      const yNum = dMatch[5] ? parseInt(dMatch[5], 10) : now.getFullYear();
      const mIdx = months[mStr];
      if (mIdx !== undefined && !isNaN(dNum)) {
        if (dNum === now.getDate() && mIdx === now.getMonth() && yNum === now.getFullYear()) {
          continue;
        }
        const targetD = new Date(yNum, mIdx, dNum);
        if (targetD < todayStart) {
          console.log(`⏩ [FlashApartador] OMITIDO: Divisor con fecha pasada confirmada en el historial: "${dMatch[0]}"`);
          return false;
        }
      }
    }
  }

  const outgoingElements = Array.from(chatMessagesPane.querySelectorAll(
    '[class*="justify-end"], [class*="items-end"], [class*="flex-row-reverse"], ' +
    '[class*="message--sent"], [class*="status--sent"], [class*="status--delivered"], [class*="status--read"], ' +
    '[data-pw*="message-outgoing"], [class*="bubble-outgoing"]'
  ));

  for (const el of outgoingElements) {
    if (el.closest('.messenger-event-row, [is-event="true"], [data-pw*="event"]')) continue;
    const t = (el.innerText || '').toLowerCase().trim();
    if (!t || t.length <= 1) continue;

    const isBotWorkflowNotice = (
      t.includes('flujo de trabajo') ||
      t.includes('flujo trabajo') ||
      t.includes('workflow') ||
      t.includes('conversation opened') ||
      t.includes('conversación abierta') ||
      t.includes('lifecycle') ||
      t.includes('etapa de ciclo') ||
      t.includes('sales agent') ||
      t.includes('sales is typing') ||
      t.includes('sales está escribiendo') ||
      t.includes('takeover') ||
      t.includes('asumir') ||
      t.includes('click \'takeover\'') ||
      t.includes('replied to your story') ||
      t.includes('respondió a tu historia') ||
      t.includes('vi tu comentario') ||
      t.includes('tu comentario') ||
      t.includes('responde a este mensaje') ||
      t.includes('responde con la palabra') ||
      t.includes('palabra king') ||
      t.includes('si realmente estás interesado') ||
      t.includes('assigned to sales agent') ||
      t.includes('assigned to you') ||
      t.includes('🤑') ||
      t.includes('😎') ||
      t.includes('today') ||
      t.includes('hoy') ||
      ((typeof isFlashTriggerMatch === 'function') ? isFlashTriggerMatch(t) : /\b(?:k+i+n+g+[s]?|r+e+y+[e]?s?|s+e+c+r+e+t+o+[s]?)\b/i.test(t))
    );

    if (isBotWorkflowNotice) continue;

    console.log(`⏩ [FlashApartador] OMITIDO: Mensaje saliente previo de asesor detectado en chat: "${t.slice(0, 50)}"`);
    return false;
  }

  for (const banned of TEAMMATE_NAMES) {
    if (banned.length >= 3) {
      if (
        chatText.includes(`asignado a ${banned}`) ||
        chatText.includes(`assigned to ${banned}`) ||
        chatText.includes(`assigned this person to ${banned}`) ||
        chatText.includes(`assigned this contact to ${banned}`) ||
        chatText.includes(`asignó a esta persona a ${banned}`) ||
        chatText.includes(`asignó este contacto a ${banned}`) ||
        chatText.includes(`${banned} assigned`) ||
        chatText.includes(`${banned} asignó`) ||
        chatText.includes(`${banned} unassigned`) ||
        chatText.includes(`${banned} desasignó`) ||
        chatText.includes(`to ${banned}`) ||
        chatText.includes(`a ${banned}`)
      ) {
        console.log(`⏩ [FlashApartador] OMITIDO: Asignación o interacción previa con compañero "${banned}".`);
        return false;
      }
    }
  }

  const isStoryReply = chatText.includes('respondió a tu historia') || chatText.includes('replied to your story');

  let nonSystemBubbleCount = 0;
  for (const item of items) {
    if (item.closest?.('.messenger-event-row, [is-event="true"]') || item.querySelector?.('.messenger-event-row, [is-event="true"]')) {
      continue;
    }

    const itemText = (item.innerText || '').toLowerCase();
    if (
      itemText.includes('flujo trabajo') ||
      itemText.includes('flujo de trabajo') ||
      itemText.includes('workflow') ||
      itemText.includes('etapa de ciclo') ||
      itemText.includes('lifecycle') ||
      itemText.includes('conversación abierta') ||
      itemText.includes('conversation opened') ||
      itemText.includes('asignado a sales agent') ||
      itemText.includes('assigned to sales agent') ||
      itemText.includes('assigned to you') ||
      itemText.includes('sales está escribiendo') ||
      itemText.includes('sales is typing') ||
      itemText.includes('sales agent') ||
      itemText.includes('takeover') ||
      itemText.includes('asumir') ||
      itemText.includes('replied to your story') ||
      itemText.includes('respondió a tu historia') ||
      itemText.includes('vi tu comentario') ||
      itemText.includes('tu comentario') ||
      itemText.includes('responde a este mensaje') ||
      itemText.includes('palabra king') ||
      itemText.includes('si realmente estás interesado') ||
      itemText.includes('qué edad tienes y en qué país') ||
      itemText.includes('🤑') ||
      itemText.includes('😎')
    ) {
      continue;
    }

    if (isSalesAgent) {
      continue;
    }

    nonSystemBubbleCount++;

    const parsed = parseMessageBubbleElement(item, 'Lead', scrollEl);
    if (parsed && parsed.sender === 'Asesor') {
      const pText = (parsed.text || '').toLowerCase();
      const isKnownBot = pText.includes('vi tu comentario') || pText.includes('responde a este mensaje') || pText.includes('palabra king') || pText.includes('qué edad tienes');
      if (!isKnownBot) {
        console.log('⏩ [FlashApartador] OMITIDO: Burbuja saliente de asesor detectada:', parsed.text);
        return false;
      }
    }
  }

  if (isStoryReply) {
    console.log(`📸 [FlashApartador] Respuesta a historia de Instagram con King verificada (${nonSystemBubbleCount} mensajes). ¡PERMITIDO!`);
  }

  if (nonSystemBubbleCount >= 6) {
    console.log(`⏩ [FlashApartador] OMITIDO: Conversación acumulada con ${nonSystemBubbleCount} mensajes (no es lead nuevo de primer contacto).`);
    return false;
  }

  return true;
}

async function startVipChatsLearning() {}
async function processNextVipChatStep() {}
async function learnCurrentActiveChat() {}
