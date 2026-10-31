// RespondRadar - Módulo 2
function triggerPointerClick(el) {
  if (!el) return;
  try {
    const opts = { bubbles: true, cancelable: true, view: window };
    el.dispatchEvent(new PointerEvent('pointerdown', opts));
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new PointerEvent('pointerup', opts));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.dispatchEvent(new MouseEvent('click', opts));
    if (typeof el.click === 'function') el.click();
  } catch (e) {
    if (typeof el.click === 'function') el.click();
  }
}

function triggerCtrlMShortcut() {
  const init = {
    key: 'm',
    code: 'KeyM',
    keyCode: 77,
    which: 77,
    ctrlKey: true,
    bubbles: true,
    cancelable: true,
    composed: true,
    view: window
  };
  document.dispatchEvent(new KeyboardEvent('keydown', init));
  window.dispatchEvent(new KeyboardEvent('keydown', init));
}

function triggerRadixClick(el) {
  if (!el) return;
  const opts = {
    bubbles: true,
    cancelable: true,
    view: window,
    button: 0,
    buttons: 1,
    pointerId: 1,
    pointerType: 'mouse',
    isPrimary: true
  };
  try {
    el.focus?.();
    el.dispatchEvent(new PointerEvent('pointerdown', opts));
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new PointerEvent('pointerup', opts));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.dispatchEvent(new MouseEvent('click', opts));
    if (typeof el.click === 'function') el.click();
  } catch (e) {
    if (typeof el.click === 'function') el.click();
  }
}

function clickElementByCoordinates(el) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;

  const cx = Math.round(rect.left + rect.width / 2);
  const cy = Math.round(rect.top + rect.height / 2);

  const eventInit = {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: cx,
    clientY: cy,
    screenX: window.screenX + cx,
    screenY: window.screenY + cy,
    pageX: window.scrollX + cx,
    pageY: window.scrollY + cy,
    button: 0,
    buttons: 1,
    pointerId: 1,
    pointerType: 'mouse',
    isPrimary: true
  };

  const atPoint = document.elementFromPoint(cx, cy);
  const isAtPointValid = atPoint && (atPoint === el || el.contains(atPoint));
  const safeAtPoint = isAtPointValid ? atPoint : null;
  const icon = el.querySelector('i, svg');

  const targets = [safeAtPoint, el, icon].filter(Boolean);
  const uniqueTargets = Array.from(new Set(targets));

  for (const t of uniqueTargets) {
    try {
      t.focus?.();
      t.dispatchEvent(new PointerEvent('pointerdown', eventInit));
      t.dispatchEvent(new MouseEvent('mousedown', eventInit));
      t.dispatchEvent(new PointerEvent('pointerup', eventInit));
      t.dispatchEvent(new MouseEvent('mouseup', eventInit));
      t.dispatchEvent(new MouseEvent('click', eventInit));
      if (typeof t.click === 'function') t.click();
    } catch (e) { }
  }

  return true;
}

function buildUniqueSelector(el) {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return '';
  if (el.id) return `#${el.id}`;

  const pw = el.getAttribute('data-pw');
  if (pw) return `[data-pw="${pw}"]`;
  const testId = el.getAttribute('data-testid');
  if (testId) return `[data-testid="${testId}"]`;

  const tag = el.tagName.toLowerCase();
  const classes = Array.from(el.classList || []).filter(c => !c.startsWith('radar-') && !c.includes('active') && !c.includes('hover') && !c.includes('focus'));
  if (classes.length > 0) {
    const classSelector = `${tag}.${classes.slice(0, 2).join('.')}`;
    try {
      if (document.querySelectorAll(classSelector).length === 1) {
        return classSelector;
      }
    } catch (e) { }
  }

  const aria = el.getAttribute('aria-label');
  if (aria) return `${tag}[aria-label="${aria}"]`;

  if (el.parentElement) {
    const parentSel = buildUniqueSelector(el.parentElement);
    if (parentSel) {
      const idx = Array.from(el.parentElement.children).indexOf(el) + 1;
      return `${parentSel} > ${tag}:nth-child(${idx})`;
    }
  }

  return tag;
}

function isElementVisible(el) {
  if (!el) return false;
  try {
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && (el.offsetWidth > 0 || el.offsetHeight > 0);
  } catch (e) {
    return false;
  }
}

function parseCurrentUrl() {
  const match = window.location.pathname.match(/\/space\/([^/]+)\/inbox\/([^/]+)/);
  if (match) {
    return {
      spaceId: match[1],
      conversationId: match[2]
    };
  }
  const spaceOnlyMatch = window.location.pathname.match(/\/space\/([^/]+)/);
  return {
    spaceId: spaceOnlyMatch ? spaceOnlyMatch[1] : null,
    conversationId: null
  };
}

function getCardTitleElement(card) {
  if (!card) return null;
  return card.querySelector('h6, [data-pw="conversation-name"], .conversation-list-item--title, [class*="convo-name"]')
    || card.querySelector('.dls-truncate')
    || card.querySelector('h5, h4');
}

function getCardContactName(card) {
  if (!card) return '';

  const titleEl = getCardTitleElement(card);
  if (titleEl) {
    const clone = titleEl.cloneNode(true);
    const badges = clone.querySelectorAll('.radar-chat-badge, [class*="chip"], [class*="badge"], [class*="assignee"]');
    badges.forEach(b => b.remove());
    let txt = clone.textContent.trim();
    txt = txt.replace(/\s*[🟢🔵🟣🟠🌸🩵💛⭐👤⏳👑\s]+(?:Dylan|Danny|Juan|Pz|Diego|Aracely|Yuquita|Yusabeth|Mío|Mine|Mio|Sales Agent).*$/i, '').trim();
    if (txt && !isDateString(txt) && !isTagOrRoleLine(txt)) {
      return txt;
    }
  }

  const avatarImg = card.querySelector('[class*="avatar"]:first-child img[alt], img[alt]');
  if (avatarImg && avatarImg.alt) {
    const alt = avatarImg.alt.trim();
    const isTeammate = /^(Dylan|Danny|Juan|Pz|Diego|Diego Tacuri|Daniela|Daniela Tacuri|Aracely|Yuquita|Yusabeth|Sales Agent)$/i.test(alt);
    const isService = /^(instagram|whatsapp|facebook|telegram|channel|avatar|icon)$/i.test(alt);
    if (alt.length > 1 && !isService && !isTeammate) {
      return alt;
    }
  }

  return '';
}

function getActiveContactName() {
  const selectedCard = document.querySelector('a.conversation-list--item[selected="true"], [data-pw="link-convo-item"][selected="true"], .conversation-list--item[aria-selected="true"], a.conversation-list--item.dls-bg-bg-gray');
  if (selectedCard) {
    const name = getCardContactName(selectedCard);
    if (name && name !== 'Lead Seleccionado') {
      return name;
    }
  }

  const mainPane = document.querySelector('main, [class*="chat-pane"], [class*="conversation-view"]');
  if (mainPane) {
    const chatAvatars = mainPane.querySelectorAll('header img[alt], [class*="header"] img[alt], [data-pw*="contact"] img[alt]');
    for (const img of chatAvatars) {
      const alt = img.alt ? img.alt.trim() : '';
      if (alt.length > 1 && !/^(instagram|whatsapp|facebook|telegram|channel|avatar|icon)$/i.test(alt)) {
        if (!/daniela|diego|dylan|danny|aracely|juan|yuquita|yusabeth|pz|mizu/i.test(alt)) {
          return alt;
        }
      }
    }
  }

  const title = document.title || '';
  if (title.includes(' - ')) {
    const parts = title.split(' - ');
    const cand = parts[0].trim();
    if (cand.length > 1 && !cand.toLowerCase().includes('inbox') && !cand.toLowerCase().includes('respond')) {
      return cand;
    }
  }

  const detailsName = document.querySelector('[data-pw="contact-name"], [class*="contact-details"] h5, [class*="contact-details"] h6, [class*="contact-details"] [class*="name"]');
  if (detailsName && detailsName.innerText.trim()) {
    return detailsName.innerText.trim();
  }

  return 'Lead Seleccionado';
}

function extractCardConversationId(card) {
  if (!card) return null;
  const dataId = card.getAttribute('data-id') || (card.dataset && card.dataset.id);
  if (dataId) return dataId;

  if (card.tagName === 'A' && card.href) {
    const match = card.href.match(/\/inbox\/([^/?#]+)/);
    if (match) return match[1];
  }

  const link = card.querySelector ? card.querySelector('a[href*="/inbox/"]') : null;
  if (link && link.href) {
    const match = link.href.match(/\/inbox\/([^/?#]+)/);
    if (match) return match[1];
  }
  const parent = card.closest ? card.closest('a[href*="/inbox/"], [data-id]') : null;
  if (parent) {
    return parent.getAttribute('data-id') || (parent.dataset && parent.dataset.id) || parent.href?.match(/\/inbox\/([^/?#]+)/)?.[1];
  }

  return null;
}

function extractCardTime(text) {
  if (!text) return '';
  const dayMatch = text.match(/\b(?:domingo|s[aá]bado|sabado|viernes|jueves|mi[eé]rcoles|miercoles|martes|lunes|sunday|saturday|friday|thursday|wednesday|tuesday|monday)(?:\s*,?\s*\d{1,2}:\d{2}(?:\s*(?:AM|PM|am|pm))?)?\b/i);
  if (dayMatch) return dayMatch[0];

  const timeMatch = text.match(/\b\d{1,2}:\d{2}(?:\s*(?:AM|PM|am|pm))?\b/);
  if (timeMatch) return timeMatch[0];

  const relMatch = text.match(/\b(?:Ayer|Yesterday|Hoy|Today)(?:\s*,?\s*\d{1,2}:\d{2}(?:\s*(?:AM|PM|am|pm))?)?\b/i);
  if (relMatch) return relMatch[0];

  const calMatch = text.match(/\b(?:\d{1,2}\s+(?:oct|nov|dic|sep|ago|jul|jun|may|abr|mar|feb|ene)|(?:oct|nov|dic|sep|ago|jul|jun|may|abr|mar|feb|ene)\s+\d{1,2})\b/i);
  if (calMatch) return calMatch[0];

  const agoMatch = text.match(/\bhace\s*\d+\s*(?:d|días|dias|h|horas|m|min)\b/i);
  if (agoMatch) return agoMatch[0];

  return '';
}

function isRecentMessageTimestamp(timeText) {
  if (!timeText) return false;
  const s = String(timeText).toLowerCase().trim();

  if (
    s.includes('ayer') || s.includes('yesterday') ||
    (s.includes('hace') && (s.includes('d') || s.includes('sem'))) ||
    /\b\d+[dw]\b/.test(s) ||
    /\b(?:oct|nov|dic|ene|feb|mar|abr|may|jun|jul|ago|sep)\b/.test(s) ||
    /\b(?:lunes|martes|mi[eé]rcoles|miercoles|jueves|viernes|s[aá]bado|sabado|domingo|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.test(s)
  ) {
    return false;
  }

  const hourMatch = s.match(/\b(\d+)\s*(?:h|horas?|hrs?)\b/);
  if (hourMatch) {
    return false;
  }

  const minMatch = s.match(/\b(\d+)\s*(?:m|min|mins|minutos?)\b/);
  if (minMatch) {
    const m = parseInt(minMatch[1], 10);
    return m <= 15;
  }

  if (s.includes('ahora') || s.includes('now') || s.includes('momento')) {
    return true;
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

    const diffMinutes = (now.getTime() - msgDate.getTime()) / (1000 * 60);

    return diffMinutes >= -1 && diffMinutes <= 15;
  }

  return false;
}

function extractCardSnippet(card, contactName, timeStr) {
  if (!card) return '';

  const directSelectors = [
    '[data-pw*="snippet"]',
    '[data-pw*="preview"]',
    '[data-pw*="message"]',
    '.conversation-list-item--message',
    '.conversation-list-item--snippet',
    '[class*="snippet"]',
    '[class*="convo-preview"]',
    '[class*="message-preview"]',
    '[class*="preview-text"]',
    '[class*="message-body"]'
  ];

  for (const sel of directSelectors) {
    const el = card.querySelector(sel);
    if (el) {
      const t = (el.innerText || el.textContent || '').replace(/^[↙↗\s]+/, '').trim();
      if (t && t.length > 1 && !isDateString(t) && !isTagOrRoleLine(t) && !isNameMatch(t, contactName)) {
        return t.slice(0, 120);
      }
    }
  }

  try {
    const clone = card.cloneNode(true);
    clone.querySelectorAll('h6, h5, h4, [data-pw="conversation-name"], .conversation-list-item--title, [class*="convo-name"]').forEach(e => e.remove());
    clone.querySelectorAll('time, [class*="time"], [class*="Time"], [data-pw*="time"], [class*="timestamp"]').forEach(e => e.remove());
    clone.querySelectorAll('[class*="badge"], [class*="Badge"], [class*="counter"], [class*="unread"], [class*="rounded-full"], .radar-chat-badge').forEach(e => e.remove());
    clone.querySelectorAll('[class*="chip"], [class*="tag"], [class*="status"], [class*="assignee"], [class*="user"]').forEach(e => e.remove());
    clone.querySelectorAll('img, svg, [class*="avatar"], [class*="channel"]').forEach(e => e.remove());

    const remainingLines = (clone.innerText || '').split('\n').map(l => l.trim()).filter(Boolean);
    for (const l of remainingLines) {
      const clean = l.replace(/^[↙↗\s]+/, '').trim();
      if (!clean || clean.length <= 1) continue;
      if (isDateString(clean) || isDateString(l)) continue;
      if (timeStr && (clean.toLowerCase() === timeStr.toLowerCase() || clean.toLowerCase().includes(timeStr.toLowerCase()) || timeStr.toLowerCase().includes(clean.toLowerCase()))) continue;
      if (isTagOrRoleLine(clean) || isTagOrRoleLine(l)) continue;
      if (/^\d{1,3}$/.test(clean)) continue;
      if (isNameMatch(clean, contactName)) continue;

      return clean.slice(0, 120);
    }
  } catch (e) { }

  const text = (card.innerText || '').trim();
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  for (const l of lines) {
    const cleanL = l.replace(/^[↙↗\s]+/, '').trim();
    if (!cleanL || cleanL.length <= 1) continue;

    if (isNameMatch(cleanL, contactName)) continue;
    if (isDateString(cleanL) || isDateString(l)) continue;
    if (timeStr && (cleanL.toLowerCase() === timeStr.toLowerCase() || cleanL.toLowerCase().includes(timeStr.toLowerCase()) || timeStr.toLowerCase().includes(cleanL.toLowerCase()))) continue;
    if (isTagOrRoleLine(cleanL) || isTagOrRoleLine(l)) continue;
    if (/^\d{1,3}$/.test(cleanL)) continue;

    return cleanL.slice(0, 120);
  }

  return '';
}

function isCardActivityWithinWindow(card, maxMinutes = 720) {
  if (!card) return false;

  const timeEl = card.querySelector('time, [class*="time"], [class*="Time"], [data-pw*="time"], [class*="timestamp"]');
  if (timeEl) {
    const dt = timeEl.getAttribute('datetime') || timeEl.getAttribute('title') || timeEl.textContent || '';
    const mins = parseTimeMinutesAgo(dt);
    if (mins !== null) {
      return mins <= maxMinutes;
    }
  }

  const fullText = (card.textContent || '') + ' ' + (card.innerText || '');
  const mins = parseTimeMinutesAgo(fullText);
  if (mins !== null) {
    return mins <= maxMinutes;
  }

  const parent = card.parentElement;
  if (parent && parent.children) {
    const siblings = Array.from(parent.children);
    const idx = siblings.indexOf(card);
    if (idx >= 0 && idx < 2) {
      return true;
    }
  }

  return false;
}

function findActiveScrollContainer() {
  const cards = typeof getInboxCards === 'function' ? getInboxCards() : [];
  if (cards.length > 0) {
    const card = cards[Math.min(2, cards.length - 1)];
    let curr = card.parentElement;
    while (curr && curr !== document.body && curr !== document.documentElement) {
      const prev = curr.scrollTop;
      curr.scrollTop = prev + 5;
      if (curr.scrollTop > prev) {
        curr.scrollTop = prev;
        return curr;
      }
      const s = window.getComputedStyle(curr);
      if (/auto|scroll|overlay/.test(s.overflowY + s.overflow) && curr.clientHeight > 180) {
        return curr;
      }
      curr = curr.parentElement;
    }
  }

  const candidates = Array.from(document.querySelectorAll('*')).filter(el => {
    if (el.closest('#respond-radar-widget') || el.closest('#radar-dom-scan-modal') || el.closest('#radar-crawl-result-modal') || el.closest('#radar-inpage-sale-modal')) return false;
    const r = el.getBoundingClientRect();
    if (r.left < 0 || r.left > 480 || r.width < 180 || r.height < 200) return false;
    const s = window.getComputedStyle(el);
    const hasScrollStyle = /auto|scroll|overlay/.test(s.overflowY || '') || /auto|scroll|overlay/.test(s.overflow || '');
    return hasScrollStyle && el.scrollHeight > el.clientHeight;
  });

  if (candidates.length > 0) {
    candidates.sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight));
    return candidates[0];
  }

  return document.querySelector('.v-virtual-scroll, [class*="inbox-conversation-list"], [class*="conversation-list"]') || document.documentElement;
}

function findChatScrollContainer() {
  const centerMessageCandidates = Array.from(document.querySelectorAll('[id^="message-item-"], [class*="message-item"], [data-pw*="message-item"], [class*="chat-message"]'))
    .filter(el => {
      const r = el.getBoundingClientRect();
      return r.left >= 300 && r.width > 20 && r.height > 10;
    });

  if (centerMessageCandidates.length > 0) {
    const sampleMsg = centerMessageCandidates[0];
    let curr = sampleMsg.parentElement;
    while (curr && curr !== document.body && curr !== document.documentElement) {
      const r = curr.getBoundingClientRect();
      if (r.left >= 280) {
        if (curr.classList.contains('v-virtual-scroll')) {
          return curr;
        }
        const style = window.getComputedStyle(curr);
        if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && curr.clientHeight > 180) {
          return curr;
        }
      }
      curr = curr.parentElement;
    }
  }

  const scrollers = Array.from(document.querySelectorAll('.v-virtual-scroll, [data-pw="conversation-messages-list"], [class*="chat-history"], [class*="conversation-view"] [class*="scroll"], main [class*="scroll"]'))
    .filter(el => {
      const r = el.getBoundingClientRect();
      return r.left >= 320 && r.width >= 250 && r.height >= 180;
    });

  for (const s of scrollers) {
    if (s.scrollHeight > s.clientHeight || s.classList.contains('v-virtual-scroll')) {
      return s;
    }
  }

  const allDivs = Array.from(document.querySelectorAll('main div, [class*="conversation-view"] div, [class*="chat-pane"] div'));
  for (const div of allDivs) {
    const r = div.getBoundingClientRect();
    if (r.left < 320 || r.width < 250 || r.height < 180) continue;
    if (div.closest('.inbox-conversation-list, [class*="contact-list"], [class*="conversation-list"], aside, nav')) continue;
    const style = window.getComputedStyle(div);
    if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && div.scrollHeight > div.clientHeight + 20) {
      return div;
    }
  }

  return scrollers[0] || null;
}

function findChatComposer() {
  const exactPendo = document.querySelector('[data-pendo="messages-composer-input"] .ql-editor[contenteditable="true"], [data-pendo="messages-composer-input"] [contenteditable="true"]');
  if (exactPendo && isElementVisible(exactPendo)) return exactPendo;

  const byQuill = document.querySelector('.respond-text-area.ql-container .ql-editor[contenteditable="true"], .composer-input .ql-editor[contenteditable="true"], .ql-editor[contenteditable="true"]');
  if (byQuill && isElementVisible(byQuill)) return byQuill;

  const byAttr = Array.from(document.querySelectorAll('[placeholder*="fragmentos"], [data-placeholder*="fragmentos"], [placeholder*="variables"], [data-placeholder*="variables"], [data-placeholder*="emoji"], [placeholder*="emoji"], [data-placeholder*="snippets"]'));
  for (const el of byAttr) {
    if (el.closest('#respond-radar-widget, #radar-dom-scan-modal, #radar-flash-hud')) continue;
    const r = el.getBoundingClientRect();
    if (r.top > 200 && r.left > 260) {
      return el;
    }
  }

  const allTexts = Array.from(document.querySelectorAll('span, p, div, label')).filter(el => {
    if (el.children.length > 0) return false;
    const t = (el.innerText || el.textContent || '').trim().toLowerCase();
    return t.includes('fragmentos') || t.includes('variables') || t.includes('snippets');
  });
  for (const t of allTexts) {
    const parentContainer = t.closest('.composer-input, [class*="composer"], #mention, [contenteditable="true"]') || t.parentElement;
    if (parentContainer) {
      const ed = parentContainer.querySelector('[contenteditable="true"], textarea') || (parentContainer.isContentEditable ? parentContainer : null);
      if (ed) return ed;
    }
  }

  const byClass = Array.from(document.querySelectorAll('.composer-input [contenteditable="true"], .ql-editor[contenteditable="true"], .ProseMirror[contenteditable="true"], .tiptap[contenteditable="true"], #mention [contenteditable="true"], [data-pw*="composer"] [contenteditable="true"], [class*="composer"] [contenteditable="true"]'));
  const validByClass = byClass.filter(el => {
    if (el.closest('#respond-radar-widget, #radar-dom-scan-modal, #radar-flash-hud')) return false;
    const r = el.getBoundingClientRect();
    return r.top > 250 && r.left > 260 && r.height >= 18;
  });
  if (validByClass.length > 0) {
    return validByClass[0];
  }

  const allEditables = Array.from(document.querySelectorAll('[contenteditable="true"], textarea, [role="textbox"]')).filter(el => {
    if (el.closest('#respond-radar-widget, #radar-dom-scan-modal, #radar-flash-hud, #radar-sales-suggestion-box')) return false;
    const r = el.getBoundingClientRect();
    return r.top > 250 && r.left > 260 && r.width >= 120 && r.height >= 18;
  });

  if (allEditables.length > 0) {
    allEditables.sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top);
    return allEditables[0];
  }

  return null;
}

function hasGreetingAlreadyBeenSent(greetingText) {
  try {
    const targetPhrase = (greetingText || FLASH_GREETING_MESSAGE || "Hola, cómo estás").toLowerCase().slice(0, 20).trim();

    const chatPane = findChatScrollContainer() ||
      document.querySelector('[data-pw="conversation-messages-list"], [class*="chat-history"], [class*="conversation-view"], [class*="chat-messages"]');

    if (!chatPane) return false;

    const bubbles = Array.from(chatPane.querySelectorAll(
      '[class*="justify-end"], [class*="items-end"], [class*="flex-row-reverse"], ' +
      '[class*="message--sent"], [class*="status--sent"], [class*="status--delivered"], [class*="status--read"], ' +
      '[class*="message-bubble"], [id^="message-item-"], [class*="message-item"], [data-pw*="message-item"]'
    ));

    for (const b of bubbles) {
      if (b.closest('.messenger-event-row, [is-event="true"], [data-pw*="event"]')) continue;
      const text = (b.innerText || b.textContent || '').toLowerCase().trim();
      if (!text) continue;

      if (
        text.includes(targetPhrase) ||
        text.includes('hola, cómo estás') ||
        text.includes('de donde eres y qué edad')
      ) {
        console.log(`🛡️ [Anti-Doble Envío] Saludo previo ya detectado en burbuja saliente: "${text.slice(0, 50)}..."`);
        return true;
      }
    }
  } catch (err) {
    console.warn('⚠️ [Anti-Doble Envío] Error comprobando saludo en historial:', err);
  }
  return false;
}

async function writeTextIntoComposer(composer, text) {
  if (!composer) return false;

  composer.focus();
  await new Promise(r => setTimeout(r, 4));

  window.dispatchEvent(new CustomEvent('RADAR_PAGE_INSERT_TEXT', {
    detail: { text }
  }));

  let p = composer.querySelector('p');
  if (!p) {
    p = document.createElement('p');
    p.style.margin = '0px';
    composer.appendChild(p);
  }

  try {
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(p);
    sel.removeAllRanges();
    sel.addRange(range);
  } catch (e) { }

  let execSuccess = false;
  try {
    execSuccess = document.execCommand('insertText', false, text);
  } catch (e) { }

  if (!execSuccess || !(composer.innerText || composer.textContent || '').includes('Hola')) {
    p.textContent = text;
    composer.classList.remove('ql-blank');
  }

  try {
    composer.dispatchEvent(new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      composed: true,
      inputType: 'insertText',
      data: text
    }));
    composer.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      composed: true,
      inputType: 'insertText',
      data: text
    }));
  } catch (e) { }

  composer.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  composer.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

  const sendBtn = findChatSendButton(composer);
  if (sendBtn) {
    try {
      sendBtn.removeAttribute('disabled');
      sendBtn.setAttribute('data-disabled', 'false');
      sendBtn.disabled = false;
      sendBtn.style.pointerEvents = 'auto';
    } catch (e) { }
  }

  await new Promise(r => setTimeout(r, 8));

  const currentVal = (composer.innerText || composer.textContent || composer.value || '').trim();
  return currentVal.length > 0;
}

function insertTextIntoComposer(text) {
  let composer = document.querySelector('[data-pendo="messages-composer-input"] .ql-editor[contenteditable="true"], .composer-input [contenteditable="true"], .ql-editor[contenteditable="true"], .ProseMirror[contenteditable="true"], .tiptap[contenteditable="true"], #mention [contenteditable="true"], [contenteditable="true"], textarea');
  if (!composer) return false;
  if (!composer.isContentEditable && composer.querySelector('.ql-editor, [contenteditable="true"]')) {
    composer = composer.querySelector('.ql-editor, [contenteditable="true"]');
  }

  composer.focus();

  if (composer.isContentEditable) {
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, text);
    composer.dispatchEvent(new Event('input', { bubbles: true }));
    composer.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    composer.value = text;
    composer.dispatchEvent(new Event('input', { bubbles: true }));
    composer.dispatchEvent(new Event('change', { bubbles: true }));
  }
  return true;
}

function findChatSendButton(composer) {
  const directPendo = document.querySelector('button[data-pendo="messages-message-composer-send"], [data-pendo="messages-message-composer-send"]');
  if (directPendo && isElementVisible(directPendo)) return directPendo;

  const pendoCandidates = Array.from(document.querySelectorAll('button[data-pendo="messages-message-composer-send"], [data-pendo*="composer-send"]')).filter(b => {
    const r = b.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.top > 150;
  });
  if (pendoCandidates.length > 0) {
    pendoCandidates.sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top);
    return pendoCandidates[0];
  }

  if (composer) {
    const composerRoot = composer.closest('.dls-rounded-rectangular-8, [class*="rounded-rectangular"], [data-v-78048c2d], [class*="composer"], div.dls-flex-col') ||
      composer.parentElement?.parentElement?.parentElement?.parentElement;
    if (composerRoot) {
      const rootPendo = composerRoot.querySelector('button[data-pendo="messages-message-composer-send"]');
      if (rootPendo) return rootPendo;

      const rootIcon = composerRoot.querySelector('i.icon-send-bold, i.icon-send, [class*="icon-send"], [class*="icon-paper-plane"], svg[class*="send"]');
      if (rootIcon) {
        const b = rootIcon.closest('button, [role="button"], div[class*="cursor-pointer"]');
        if (b) return b;
      }

      const rootPrimary = composerRoot.querySelector('button[data-color="primary"][data-variant="primary"], button.dls-bg-button-primary, button[data-variant="primary"]');
      if (rootPrimary) return rootPrimary;

      const allBoxButtons = Array.from(composerRoot.querySelectorAll('button, [role="button"]')).filter(b => {
        if (b.closest('#respond-radar-widget, #radar-dom-scan-modal, #radar-flash-hud')) return false;
        const r = b.getBoundingClientRect();
        return r.width > 12 && r.height > 12 && r.top >= composer.getBoundingClientRect().top;
      });

      for (const b of allBoxButtons) {
        const txt = (b.innerText || b.getAttribute('aria-label') || b.getAttribute('title') || '').toLowerCase();
        if (txt.includes('enviar') || txt.includes('send')) return b;
      }

      if (allBoxButtons.length > 0) {
        allBoxButtons.sort((a, b) => b.getBoundingClientRect().right - a.getBoundingClientRect().right);
        return allBoxButtons[0];
      }
    }
  }

  const iconCandidates = Array.from(document.querySelectorAll('i.icon-send-bold, i.icon-send, [class*="icon-send"], [class*="icon-paper-plane"]')).filter(i => {
    const r = i.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.top > 150;
  });
  for (const ic of iconCandidates) {
    const b = ic.closest('button, [role="button"], div');
    if (b && !b.id?.includes('radar')) return b;
  }

  const ariaCandidates = Array.from(document.querySelectorAll('button[aria-label*="enviar" i], button[title*="enviar" i], button[aria-label*="send" i], button[title*="send" i]')).filter(b => {
    const r = b.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.top > 150;
  });
  if (ariaCandidates.length > 0) return ariaCandidates[0];

  return null;
}

async function triggerMessageSend(composer) {
  if (!composer) return false;

  const initialText = (composer.innerText || composer.textContent || composer.value || '').trim();
  if (!initialText || initialText.length === 0) {
    console.warn('⚠️ [FlashApartador] No se puede enviar porque el compositor está vacío antes de iniciar.');
    return false;
  }

  let sendBtn = findChatSendButton(composer);
  if (sendBtn) {
    try {
      sendBtn.removeAttribute('disabled');
      sendBtn.setAttribute('data-disabled', 'false');
      sendBtn.disabled = false;
      sendBtn.style.pointerEvents = 'auto';
    } catch (e) { }

    console.log('⚡ [FlashApartador] Disparando envío por clic en sendBtn...');
    if (typeof sendBtn.click === 'function') {
      sendBtn.click();
    } else {
      triggerPointerClick(sendBtn);
    }
  } else {
    console.log('⚡ [FlashApartador] Disparando envío vía MAIN world...');
    window.dispatchEvent(new CustomEvent('RADAR_PAGE_CLICK_SEND'));
  }

  await new Promise(r => setTimeout(r, 150));

  let remainingText = (composer.innerText || composer.textContent || composer.value || '').trim();
  if (!remainingText || remainingText === '' || remainingText === '\n') {
    console.log('🚀 [FlashApartador] ¡Mensaje confirmado enviado con éxito (caja vacía tras clic)!');
    return true;
  }

  console.log('🔄 [FlashApartador] El texto aún sigue en la caja. Intentando envío con Enter...');
  const enterOpts = {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true,
    composed: true,
    view: window
  };

  composer.focus();
  composer.dispatchEvent(new KeyboardEvent('keydown', enterOpts));
  composer.dispatchEvent(new KeyboardEvent('keyup', enterOpts));

  await new Promise(r => setTimeout(r, 180));

  remainingText = (composer.innerText || composer.textContent || composer.value || '').trim();
  if (!remainingText || remainingText === '' || remainingText === '\n') {
    console.log('🚀 [FlashApartador] ¡Mensaje confirmado enviado con éxito (caja vacía tras Enter)!');
    return true;
  }

  console.log('🔄 [FlashApartador] Último intento de clic en MAIN world...');
  window.dispatchEvent(new CustomEvent('RADAR_PAGE_CLICK_SEND'));
  await new Promise(r => setTimeout(r, 200));

  remainingText = (composer.innerText || composer.textContent || composer.value || '').trim();
  if (!remainingText || remainingText === '' || remainingText === '\n') {
    console.log('🚀 [FlashApartador] ¡Mensaje confirmado enviado con éxito (caja vacía tras MAIN world)!');
    return true;
  }

  if (!remainingText.toLowerCase().includes('hola')) {
    return true;
  }

  return false;
}

function findAsumirButton() {
  const directCandidates = Array.from(document.querySelectorAll(
    'button, [role="button"], a.v-btn, a[class*="btn"], [data-pw*="takeover"], [data-pw*="asumir"], [data-testid*="takeover"], [data-pendo*="takeover"], [class*="takeover"]'
  ));

  for (const b of directCandidates) {
    if (b.closest('#respond-radar-widget, #radar-dom-scan-modal, #radar-flash-hud')) continue;
    const txt = (b.innerText || b.textContent || b.getAttribute('aria-label') || '').trim().toLowerCase();
    if (
      txt === 'takeover' ||
      txt === 'asumir' ||
      txt.startsWith('takeover') ||
      txt.startsWith('asumir') ||
      txt.includes('takeover') ||
      txt.includes('asumir') ||
      txt === 'take over' ||
      txt === 'take-over' ||
      txt.includes('tomar control') ||
      txt.includes('stop workflow') ||
      txt.includes('detener flujo') ||
      txt.includes('stop bot') ||
      txt.includes('pause bot') ||
      txt.includes('detener bot') ||
      txt.includes('desactivar')
    ) {
      return b;
    }
    const aria = (b.getAttribute('aria-label') || '').toLowerCase();
    const dataPw = (b.getAttribute('data-pw') || '').toLowerCase();
    const dataTest = (b.getAttribute('data-testid') || '').toLowerCase();
    if (aria.includes('asumir') || dataPw.includes('asumir') || aria.includes('takeover') || dataPw.includes('takeover') || dataTest.includes('takeover')) {
      return b;
    }
  }

  const bannerContainers = Array.from(document.querySelectorAll(
    '[class*="banner"], [class*="alert"], [class*="callout"], [role="alert"], [class*="notice"], [class*="notification"], [class*="handling"], [data-pw*="alert"]'
  ));
  for (const el of bannerContainers) {
    if (el.closest('#respond-radar-widget, #radar-dom-scan-modal, #radar-flash-hud')) continue;
    const t = (el.innerText || el.textContent || '').toLowerCase();
    if (
      t.includes('sales agent') ||
      t.includes('sales is typing') ||
      t.includes('sales está escribiendo') ||
      t.includes('handling') ||
      t.includes('gestionando') ||
      t.includes('workflow') ||
      t.includes('flujo de trabajo') ||
      t.includes('ai agent') ||
      t.includes('stop responding')
    ) {
      const btnInBanner = el.querySelector('button, [role="button"], a');
      if (btnInBanner) return btnInBanner;
    }
  }

  const allLeafs = Array.from(document.querySelectorAll('span, div, a')).filter(el => {
    if (el.closest('#respond-radar-widget, #radar-dom-scan-modal, #radar-flash-hud')) return false;
    if (el.children.length > 0) return false;
    const s = (el.innerText || el.textContent || '').trim().toLowerCase();
    return s === 'takeover' || s === 'asumir' || s === 'take over' || s === 'take-over';
  });
  if (allLeafs.length > 0) {
    return allLeafs[0].closest('button, [role="button"], a') || allLeafs[0];
  }

  return null;
}

async function ensureTakeoverAndComposerReady(maxWaitMs = 1800) {
  const startTime = Date.now();
  let takeoverExecuted = false;

  while (Date.now() - startTime < maxWaitMs) {
    const takeoverBtn = findAsumirButton();
    if (takeoverBtn && isElementVisible(takeoverBtn)) {
      console.log('🤖 [FlashApartador] Botón Takeover / Asumir detectado. Pulsando para detener al Sales Agent...');
      clickElementByCoordinates(takeoverBtn);
      triggerRadixClick(takeoverBtn);
      triggerPointerClick(takeoverBtn);
      if (typeof takeoverBtn.click === 'function') takeoverBtn.click();

      window.dispatchEvent(new CustomEvent('RADAR_CLICK_TAKEOVER_MAIN'));
      takeoverExecuted = true;

      await new Promise(r => setTimeout(r, 140));
    }

    const composer = findChatComposer();
    if (composer && isElementVisible(composer)) {
      const status = typeof getOpenChatAssigneeStatus === 'function' ? getOpenChatAssigneeStatus() : null;
      if (status && status.isSalesAgent && !takeoverExecuted && (Date.now() - startTime < 800)) {
        await new Promise(r => setTimeout(r, 80));
        continue;
      }
      return composer;
    }

    await new Promise(r => setTimeout(r, 35));
  }

  return findChatComposer();
}

async function executeSetContactBotStatus(conversationId, botStatus = false, spaceId) {
  if (!conversationId) {
    const info = typeof parseCurrentUrl === 'function' ? parseCurrentUrl() : {};
    conversationId = info.conversationId;
    spaceId = info.spaceId;
  }
  if (!conversationId) {
    if (typeof showApartadoStatusToast === 'function') {
      showApartadoStatusToast('⚠️ Abre un chat para apagar el bot', 2500);
    }
    return false;
  }

  const cIdStr = String(conversationId);
  const isOff = !botStatus;
  const targetLabel = isOff ? 'Apagando bot (Bot OFF)...' : 'Activando bot (Bot ON)...';
  const successLabel = isOff ? '🛑 Bot APAGADO para este chat (Bot OFF)' : '🟢 Bot ENCENDIDO para este chat (Bot ON)';

  if (typeof showApartadoStatusToast === 'function') {
    showApartadoStatusToast(`⏳ ${targetLabel}`, 1500);
  }

  window.dispatchEvent(new CustomEvent('RADAR_EXEC_SET_BOT_STATUS', {
    detail: { conversationId: cIdStr, botStatus: Boolean(botStatus), spaceId: spaceId || '384258' }
  }));

  setTimeout(() => {
    if (typeof showApartadoStatusToast === 'function') {
      showApartadoStatusToast(successLabel, 3000);
    }
    if (typeof playSoundNotification === 'function') {
      playSoundNotification();
    }
  }, 350);

  return true;
}

const executeDeactivateSalesAgentAi = (conversationId, spaceId) => executeSetContactBotStatus(conversationId, false, spaceId);

window.RespondRadarSetBotStatus = executeSetContactBotStatus;
window.RespondRadarBotOff = (cId) => executeSetContactBotStatus(cId, false);
window.RespondRadarBotOn = (cId) => executeSetContactBotStatus(cId, true);
window.RespondRadarDeactivateSalesAgent = executeDeactivateSalesAgentAi;

let isNavigatingChat = false;
let chatNavAnchor = {
  currentId: null,
  belowId: null,
  aboveId: null,
  visualIndex: -1,
  lastActionTime: 0
};

function getSortedVisibleChatCards() {
  let candidateEls = Array.from(document.querySelectorAll('[data-pw="link-convo-item"]'));
  if (candidateEls.length === 0) {
    candidateEls = Array.from(document.querySelectorAll('.conversation-list-item, a.conversation-list--item'));
  }

  const seenIds = new Set();
  const validCards = [];

  for (const el of candidateEls) {
    const visualEl = el.matches('[data-pw="link-convo-item"], .conversation-list-item')
      ? el
      : (el.querySelector('[data-pw="link-convo-item"], .conversation-list-item') || el);

    const linkEl = el.closest('a.conversation-list--item, a[href*="/inbox/"]') || visualEl.closest('a') || visualEl;
    const convId = extractCardConversationId(visualEl) || extractCardConversationId(linkEl);

    if (!convId || seenIds.has(String(convId))) continue;

    const rect = visualEl.getBoundingClientRect();

    if (rect.left < 680 && rect.bottom > 0) {
      seenIds.add(String(convId));

      const isSelected = (
        visualEl.classList.contains('dls-bg-bg-blue') ||
        visualEl.classList.contains('dls:bg-bg-blue') ||
        visualEl.getAttribute('selected') === 'true' ||
        visualEl.getAttribute('aria-selected') === 'true' ||
        linkEl.getAttribute('selected') === 'true' ||
        linkEl.getAttribute('aria-selected') === 'true' ||
        linkEl.classList.contains('router-link-exact-active') ||
        linkEl.classList.contains('router-link-active')
      );

      let visualTop = rect.top;
      const transMatch = visualEl.style.transform ? visualEl.style.transform.match(/translateY\((\d+(?:\.\d+)?)px\)/) : null;
      if (transMatch) {
        visualTop = parseFloat(transMatch[1]);
      }

      validCards.push({
        el: linkEl || visualEl,
        visualEl: visualEl,
        id: String(convId),
        top: visualTop,
        rectTop: rect.top,
        isSelected
      });
    }
  }

  validCards.sort((a, b) => a.top - b.top);
  return validCards;
}

function updateChatNavAnchorFromCurrent() {
  const currentInfo = typeof parseCurrentUrl === 'function' ? parseCurrentUrl() : {};
  const currentId = currentInfo.conversationId ? String(currentInfo.conversationId) : null;
  if (!currentId) return;

  const validCards = getSortedVisibleChatCards();
  if (validCards.length === 0) return;

  const idx = validCards.findIndex(c => c.id === currentId);
  if (idx !== -1) {
    if (idx === 0 && chatNavAnchor.currentId === currentId && chatNavAnchor.visualIndex > 0) {
      return;
    }

    chatNavAnchor = {
      currentId: currentId,
      belowId: validCards[idx + 1]?.id ? String(validCards[idx + 1].id) : null,
      aboveId: validCards[idx - 1]?.id ? String(validCards[idx - 1].id) : null,
      visualIndex: idx,
      lastActionTime: Date.now()
    };
  }
}

document.addEventListener('click', (e) => {
  const clickedCard = e.target.closest('[data-pw="link-convo-item"], a.conversation-list--item, .conversation-list-item, a[href*="/inbox/"]');
  if (clickedCard) {
    setTimeout(updateChatNavAnchorFromCurrent, 80);
  }
}, true);

function navigateChatList(direction = 'down') {
  if (isNavigatingChat) return;
  isNavigatingChat = true;
  setTimeout(() => { isNavigatingChat = false; }, 180);

  const validCards = getSortedVisibleChatCards();
  if (validCards.length === 0) {
    console.warn('⚠️ [RespondRadar Nav] No se encontraron tarjetas de chat visibles');
    return;
  }

  const currentInfo = typeof parseCurrentUrl === 'function' ? parseCurrentUrl() : {};
  const currentId = currentInfo.conversationId ? String(currentInfo.conversationId) : null;

  let currentIdx = -1;
  if (currentId) {
    currentIdx = validCards.findIndex(c => c.id === currentId);
  }
  if (currentIdx === -1) {
    currentIdx = validCards.findIndex(c => c.isSelected);
  }

  let targetIndex = -1;

  const didJumpToTop = (currentIdx === 0 && chatNavAnchor.visualIndex > 0 && chatNavAnchor.currentId === currentId);

  const didDisappear = (currentIdx === -1 && chatNavAnchor.visualIndex !== -1);

  if (didJumpToTop || didDisappear) {
    if (direction === 'down') {
      if (chatNavAnchor.belowId) {
        targetIndex = validCards.findIndex(c => c.id === String(chatNavAnchor.belowId));
      }
      if (targetIndex === -1 && chatNavAnchor.visualIndex !== -1) {
        targetIndex = Math.min(chatNavAnchor.visualIndex, validCards.length - 1);
      }
    } else {
      if (chatNavAnchor.aboveId) {
        targetIndex = validCards.findIndex(c => c.id === String(chatNavAnchor.aboveId));
      }
      if (targetIndex === -1 && chatNavAnchor.visualIndex !== -1) {
        targetIndex = Math.max(chatNavAnchor.visualIndex - 1, 0);
      }
    }
  } else {
    if (direction === 'down') {
      targetIndex = (currentIdx !== -1) ? currentIdx + 1 : 0;
    } else {
      targetIndex = (currentIdx !== -1) ? currentIdx - 1 : 0;
    }
  }

  if (targetIndex < 0) targetIndex = 0;
  if (targetIndex >= validCards.length) targetIndex = validCards.length - 1;

  if (targetIndex === currentIdx && currentIdx !== -1 && !didJumpToTop && !didDisappear) {
    return;
  }

  const target = validCards[targetIndex];
  if (!target || (!target.el && !target.visualEl)) return;

  chatNavAnchor = {
    currentId: String(target.id),
    belowId: validCards[targetIndex + 1]?.id ? String(validCards[targetIndex + 1].id) : null,
    aboveId: validCards[targetIndex - 1]?.id ? String(validCards[targetIndex - 1].id) : null,
    visualIndex: targetIndex,
    lastActionTime: Date.now()
  };

  try {
    const container = document.querySelector('.conversations-list-wrapper');
    if (targetIndex === 0 && container) {
      container.scrollTop = 0;
    } else if (targetIndex >= validCards.length - 1 && container) {
      container.scrollBy({ top: 98, behavior: 'smooth' });
    }
    const elToScroll = target.visualEl || target.el;
    if (elToScroll && typeof elToScroll.scrollIntoView === 'function') {
      elToScroll.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  } catch (e) {}

  const targetCardEl = target.el || target.visualEl;
  if (typeof openInboxCard === 'function') {
    openInboxCard(targetCardEl);
  } else {
    triggerPointerClick(targetCardEl);
    if (typeof targetCardEl.click === 'function') targetCardEl.click();
  }

  [60, 180, 380].forEach((delay) => {
    setTimeout(() => {
      const composer = findChatComposer();
      if (composer && typeof composer.focus === 'function') {
        composer.focus();
        try {
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(composer);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        } catch (err) {}
      }
    }, delay);
  });
}

window.RespondRadarNavigateChat = navigateChatList;
window.RespondRadarUpdateNavAnchor = updateChatNavAnchorFromCurrent;

let lastTodosCheckTime = 0;
function ensureTodosFolderActive(force = false) {
  try {
    const now = Date.now();
    if (!force && now - lastTodosCheckTime < 10000) {
      return true;
    }
    lastTodosCheckTime = now;

    const navRoot = document.querySelector('nav, aside, [class*="folder"], [class*="drawer"], [class*="sidebar"]') || document.body;
    const candidates = Array.from(navRoot.querySelectorAll('a, button, [role="button"], [role="listitem"], .v-list-item'));
    const todosEl = candidates.find(el => {
      const t = (el.innerText || el.textContent || '').trim();
      return /^(?:todos|all)(?:\s|$|\n)/i.test(t);
    });

    if (todosEl) {
      const clickable = todosEl.closest('a, button, [role="button"], .v-list-item') || todosEl;
      const isActive = clickable.classList.contains('v-list-item--active') ||
        clickable.classList.contains('active') ||
        clickable.classList.contains('selected') ||
        clickable.getAttribute('aria-selected') === 'true' ||
        clickable.getAttribute('selected') === 'true';
      if (!isActive) {
        console.log('⚡ [FlashApartador] Activando carpeta "Todos/All"...');
        clickable.click();
        return true;
      }
      return true;
    }
  } catch (e) { }
  return false;
}

function findHeaderAssigneeElements() {
  const candidates = [];

  const assignmentBtn = document.querySelector('[data-pendo="messages-assignment"] button[role="combobox"], [data-pendo="messages-assignment"] button, button[data-pendo="messages-assignment"]');
  if (assignmentBtn && isElementVisible(assignmentBtn)) {
    candidates.push(assignmentBtn);
  }

  const allCandidates = Array.from(document.querySelectorAll('*')).filter(el => {
    if (el.closest('#respond-radar-widget, #radar-dom-scan-modal, #radar-flash-hud')) return false;
    if (el.closest('[data-pw="btn-collaborators"], [data-pendo*="collaborat"], [aria-label*="colabora"]')) return false;
    if (el.classList?.contains('icon-people') || el.querySelector?.('.icon-people')) return false;

    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.top > 120 || r.left < 150) return false;
    if (r.width > 280 || r.height > 65 || r.height < 15) return false;

    const t = (el.innerText || el.textContent || '').trim().toLowerCase();
    const aria = (el.getAttribute('aria-label') || '').toLowerCase();
    const title = (el.getAttribute('title') || '').toLowerCase();
    const pendo = (el.getAttribute('data-pendo') || '').toLowerCase();

    return (
      pendo.includes('messages-assignment') ||
      t === 'sin asignar' ||
      t.startsWith('sin asignar') ||
      t === 'sales agent' ||
      t.startsWith('sales agent') ||
      t === 'desasignar' ||
      t === 'unassigned' ||
      aria.includes('cesionario') ||
      aria.includes('assignee') ||
      title.includes('cesionario')
    );
  });

  for (const c of allCandidates) {
    if (!candidates.includes(c)) candidates.push(c);
  }

  return candidates;
}

async function openAssigneeMenu() {
  if (findAsignarAMiMenuItem()) return true;

  if (document.activeElement && typeof document.activeElement.blur === 'function') {
    document.activeElement.blur();
  }

  const primaryTrigger = document.querySelector('[data-pendo="messages-assignment"] button[role="combobox"], [data-pendo="messages-assignment"] button, button[data-pendo="messages-assignment"]');
  if (primaryTrigger) {
    clickElementByCoordinates(primaryTrigger);
    triggerRadixClick(primaryTrigger);
    if (typeof primaryTrigger.click === 'function') primaryTrigger.click();
    await new Promise(r => setTimeout(r, 6));
    if (findAsignarAMiMenuItem()) return true;
  }

  const candidates = findHeaderAssigneeElements();

  for (const el of candidates) {
    clickElementByCoordinates(el);
    triggerRadixClick(el);
    const clickable = el.closest('button, [role="button"], [data-state], div') || el;
    clickElementByCoordinates(clickable);
    triggerRadixClick(clickable);

    await new Promise(r => setTimeout(r, 6));
    if (findAsignarAMiMenuItem()) return true;
  }

  const dropdownTriggers = Array.from(document.querySelectorAll('button[role="combobox"], [data-pendo*="assignment"] button')).filter(b => {
    if (b.closest('[data-pw="btn-collaborators"], [data-pendo*="collaborat"], [aria-label*="colabora"]')) return false;
    if (b.querySelector('.icon-people, .icon-user-add')) return false;
    const r = b.getBoundingClientRect();
    return r.top < 100 && r.left > 150 && r.left < 850;
  });

  for (const trigger of dropdownTriggers) {
    clickElementByCoordinates(trigger);
    triggerRadixClick(trigger);
    await new Promise(r => setTimeout(r, 6));
    if (findAsignarAMiMenuItem()) return true;
  }

  triggerCtrlMShortcut();
  await new Promise(r => setTimeout(r, 8));
  if (findAsignarAMiMenuItem()) return true;

  return false;
}

function findAsignarAMiMenuItem() {
  const direct = document.querySelector('[role="option"][label="Asignar a mí"], [role="option"][label*="Asignar a m" i], [role="option"][label*="Assign to me" i], [role="option"][label*="Daniela Tacuri" i], [data-radix-vue-collection-item][label="Asignar a mí"]');
  if (direct && isElementVisible(direct)) return direct;

  const options = Array.from(document.querySelectorAll('[role="option"], [data-radix-vue-collection-item], [role="listbox"] div'));

  for (const opt of options) {
    if (!isElementVisible(opt)) continue;
    const lbl = (opt.getAttribute('label') || '').toLowerCase().trim();
    const txt = (opt.innerText || opt.textContent || '').toLowerCase().trim();

    if (
      lbl === 'asignar a mí' ||
      lbl === 'asignar a mi' ||
      lbl.startsWith('asignar a mí') ||
      lbl.startsWith('asignar a mi') ||
      lbl === 'assign to me' ||
      lbl.startsWith('assign to me') ||
      lbl.includes('daniela tacuri') ||
      (lbl.includes('daniela') && !lbl.includes('moya')) ||
      txt === 'asignar a mí' ||
      txt === 'asignar a mi' ||
      txt.startsWith('asignar a mí') ||
      txt.startsWith('asignar a mi') ||
      txt === 'assign to me' ||
      txt.startsWith('assign to me') ||
      txt.includes('daniela tacuri') ||
      (txt.includes('daniela') && !txt.includes('moya'))
    ) {
      return opt.closest('[role="option"], [data-radix-vue-collection-item]') || opt;
    }
  }

  return null;
}

async function assignConversationToMe() {
  let item = findAsignarAMiMenuItem();
  if (item) {
    clickElementByCoordinates(item);
    triggerRadixClick(item);
    if (typeof item.click === 'function') item.click();
    return true;
  }

  await openAssigneeMenu();

  for (let attempt = 0; attempt < 35; attempt++) {
    item = findAsignarAMiMenuItem();
    if (item) {
      clickElementByCoordinates(item);
      triggerRadixClick(item);
      if (typeof item.click === 'function') item.click();
      return true;
    }
    if (attempt === 6) {
      await openAssigneeMenu();
    }
    await new Promise(r => setTimeout(r, 12));
  }

  return false;
}

function getOpenChatAssigneeStatus() {
  const assignmentContainer = document.querySelector('[data-pendo="messages-assignment"]');
  const triggerEl = assignmentContainer ? (
    assignmentContainer.querySelector('[variant="trigger"][label]') ||
    assignmentContainer.querySelector('[label]') ||
    assignmentContainer.querySelector('button')
  ) : null;
  const label = (triggerEl?.getAttribute('label') || '').trim();
  const truncText = (assignmentContainer?.querySelector('.dls\\:truncate, [class*="truncate"]')?.innerText || '').trim();
  const rawAssignText = (assignmentContainer?.innerText || '').trim();
  const fullAssigneeText = `${label} ${truncText} ${rawAssignText}`.toLowerCase();

  const chatHeader = document.querySelector('[data-pw="conversation-header"], [class*="conversation-view"] header, [class*="chat-header"], [class*="conversation-header"]');
  const chatHeaderText = (chatHeader?.innerText || '').toLowerCase();

  const hasBotIcon = !!assignmentContainer?.querySelector('.icon-custom-user-square-bold, [class*="custom-user"]');
  const earlyTakeover = findAsumirButton();

  if (
    fullAssigneeText.includes('sin asignar') ||
    fullAssigneeText.includes('unassigned') ||
    fullAssigneeText.includes('desasignar') ||
    (chatHeaderText.includes('unassigned') && !chatHeaderText.includes('assigned to')) ||
    (hasBotIcon && !label)
  ) {
    return { isAllowed: true, isUnassigned: true, isSalesAgent: false, isOtherHuman: false, name: 'Sin asignar' };
  }

  if (
    fullAssigneeText.includes('sales agent') ||
    fullAssigneeText.includes('sales_agent') ||
    (hasBotIcon && fullAssigneeText.includes('agent')) ||
    fullAssigneeText.includes('🤑') ||
    earlyTakeover
  ) {
    return { isAllowed: true, isSalesAgent: true, isUnassigned: false, isOtherHuman: false, name: 'Sales agent' };
  }

  if (
    fullAssigneeText.includes('daniela tacuri') ||
    (fullAssigneeText.includes('daniela') && !fullAssigneeText.includes('moya'))
  ) {
    return { isAllowed: false, isMine: true, isOtherHuman: false, isSalesAgent: false, isUnassigned: false, name: 'Daniela Tacuri' };
  }

  if (
    fullAssigneeText.includes('diego tacuri') ||
    fullAssigneeText.includes('diego tacu') ||
    fullAssigneeText.includes('diego') ||
    fullAssigneeText.includes('dutandiego') ||
    fullAssigneeText.includes('1073785')
  ) {
    console.log('🛡️ [FlashApartador] Chat asignado a Diego Tacuri detectado. Pertenece a Diego, NO TOCAR.');
    return { isAllowed: false, isMine: false, isOtherHuman: true, isSalesAgent: false, isUnassigned: false, name: 'Diego Tacuri' };
  }

  if (typeof isTeammateName === 'function' && isTeammateName(fullAssigneeText)) {
    console.log(`🛡️ [FlashApartador] Chat asignado a compañero ("${fullAssigneeText}") detectado en cesionario. RECHAZADO.`);
    return { isAllowed: false, isOtherHuman: true, isUnassigned: false, isSalesAgent: false, name: fullAssigneeText };
  }

  if (label.length >= 2 && !label.toLowerCase().includes('agent') && !label.toLowerCase().includes('asignar') && !label.toLowerCase().includes('sales') && !label.toLowerCase().includes('unassigned')) {
    console.log(`🛡️ [FlashApartador] Chat asignado a asesor humano "${label}". RECHAZADO.`);
    return { isAllowed: false, isOtherHuman: true, isUnassigned: false, isSalesAgent: false, name: label };
  }

  const hasHumanAvatarImg = !!assignmentContainer?.querySelector('img[src*="avatar"], img[src*="googleusercontent"]');
  if (hasHumanAvatarImg && !hasBotIcon && !fullAssigneeText.includes('sales') && !fullAssigneeText.includes('agent')) {
    console.log('🛡️ [FlashApartador] Avatar humano de compañero detectado en asignación. RECHAZADO.');
    return { isAllowed: false, isOtherHuman: true, isUnassigned: false, isSalesAgent: false, name: 'Asesor Humano' };
  }

  const checkedOption = document.querySelector('[role="option"][aria-selected="true"], [role="option"][data-state="checked"]');
  if (checkedOption) {
    const optLabel = (checkedOption.getAttribute('label') || checkedOption.innerText || '').toLowerCase().trim();
    if (optLabel && !optLabel.includes('sin asignar') && !optLabel.includes('desasignar') && !optLabel.includes('unassigned') && !optLabel.includes('sales agent') && !optLabel.includes('sales')) {
      console.log(`🛡️ [FlashApartador] Asesor seleccionado actualmente en menú: "${optLabel}". RECHAZADO.`);
      return { isAllowed: false, isOtherHuman: true, isUnassigned: false, name: optLabel };
    }
  }

  console.log('🛡️ [FlashApartador] Cabecera no confirmada como "Sin asignar" ni "Sales agent". Omitido por seguridad.');
  return { isAllowed: false, isOtherHuman: true, isUnassigned: false, name: 'Asignado a tercero' };
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

async function performSmoothNavigation(conversationId, targetUrl) {
  const cIdStr = String(conversationId || '');
  console.log(`🚀 [RespondRadar] Solicitud de navegación suave SPA: ${cIdStr || targetUrl}`);

  if (cIdStr) {
    const rawCards = Array.from(document.querySelectorAll('a.conversation-list--item, [data-pw="link-convo-item"], a[href*="/inbox/"]'));
    const card = rawCards.find(c => {
      const href = c.getAttribute('href') || '';
      return href.endsWith(`/${cIdStr}`) || href.includes(`/${cIdStr}?`) || href.includes(`/${cIdStr}/`);
    });

    if (card) {
      console.log(`✨ [RespondRadar] Tarjeta encontrada en lista lateral. Abriendo directamente en 0ms.`);
      openInboxCard(card);
      return true;
    }
  }

  const bridgePromise = new Promise((resolve) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        window.removeEventListener('RADAR_SPA_NAVIGATE_RESULT', onResult);
        resolve(false);
      }
    }, 1200);

    const onResult = (e) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        window.removeEventListener('RADAR_SPA_NAVIGATE_RESULT', onResult);
        resolve(e.detail?.success || false);
      }
    };

    window.addEventListener('RADAR_SPA_NAVIGATE_RESULT', onResult);
    window.dispatchEvent(new CustomEvent('RADAR_SPA_NAVIGATE', {
      detail: { conversationId: cIdStr, url: targetUrl }
    }));
  });

  const bridgeOk = await bridgePromise;
  if (bridgeOk) {
    console.log(`✨ [RespondRadar] Navegación completada vía Bridge Vue Router.`);

    setTimeout(() => {
      if (cIdStr) {
        const rawCards = Array.from(document.querySelectorAll('a.conversation-list--item, [data-pw="link-convo-item"], a[href*="/inbox/"]'));
        const card = rawCards.find(c => {
          const href = c.getAttribute('href') || '';
          return href.endsWith(`/${cIdStr}`) || href.includes(`/${cIdStr}?`) || href.includes(`/${cIdStr}/`);
        });
        if (card) openInboxCard(card);
      }
    }, 150);
    return true;
  }

  try {
    const path = targetUrl && targetUrl.startsWith('http') ? new URL(targetUrl).pathname : targetUrl;
    if (path && window.location.pathname !== path) {
      window.history.pushState(window.history.state || {}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
      return true;
    }
  } catch (err) { }

  return false;
}

