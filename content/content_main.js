// RespondRadar - Módulo 7: Orquestador Principal, Ciclo de Vida y Event Listeners
// content/content_main.js

// -------------------------------------------------------------------------
// Escaneo del DOM con Debounce y MutationObserver
// -------------------------------------------------------------------------

function requestScan() {
  if (!isExtensionValid()) {
    try { observer.disconnect(); } catch (e) {}
    return;
  }
  if (window.__radarFlashActive || (typeof flashApartadorState !== 'undefined' && flashApartadorState.active)) return;
  if (isInternalDomUpdate) return;
  if (scanDebounceTimer) return;
  scanDebounceTimer = setTimeout(() => {
    scanDebounceTimer = null;
    if (window.__radarFlashActive || (typeof flashApartadorState !== 'undefined' && flashApartadorState.active)) return;
    if (typeof scanInboxSidebar === 'function') scanInboxSidebar();
  }, 250);
}

const observer = new MutationObserver((mutations) => {
  if (!isExtensionValid()) {
    try { observer.disconnect(); } catch (e) {}
    return;
  }
  if (window.__radarFlashActive || (typeof flashApartadorState !== 'undefined' && flashApartadorState.active)) return;
  if (isInternalDomUpdate) return;

  let shouldScan = false;
  for (const m of mutations) {
    const target = m.target;
    if (target) {
      if (target.id === 'respond-radar-widget' || target.closest?.('#respond-radar-widget')) continue;
      if (target.classList?.contains('radar-chat-badge') || target.classList?.contains('radar-has-badge')) continue;
    }
    shouldScan = true;
    break;
  }

  if (shouldScan) {
    requestScan();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// -------------------------------------------------------------------------
// Manejadores de Mensajes y Eventos en Tiempo Real
// -------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'SMOOTH_NAVIGATE_TO_CHAT') {
    const { url, conversationId } = message.payload || {};
    if (typeof performSmoothNavigation === 'function') {
      performSmoothNavigation(conversationId, url).then((success) => {
        sendResponse({ success: !!success });
      });
    } else {
      sendResponse({ success: false });
    }
    return true; // Asíncrono
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.watchedLeads) {
      watchedLeads = changes.watchedLeads.newValue || {};
      if (typeof updateWidgetUI === 'function') updateWidgetUI();
      if (typeof updateChatListBadges === 'function') updateChatListBadges();
    }
    if (changes.phraseTrackedLeads !== undefined) {
      phraseTrackedLeads = changes.phraseTrackedLeads.newValue || {};
    }
    if (changes.autoAssignQueue !== undefined) {
      autoAssignQueue = changes.autoAssignQueue.newValue || {};
      if (typeof updateChatListBadges === 'function') updateChatListBadges();
    }
    if (changes.soundEnabled !== undefined) {
      isSoundEnabled = changes.soundEnabled.newValue;
    }
    if (changes.widgetHidden !== undefined) {
      isWidgetHidden = changes.widgetHidden.newValue;
      if (typeof updateWidgetUI === 'function') updateWidgetUI();
    }
    if (changes.dismissedLeads !== undefined) {
      dismissedLeads = changes.dismissedLeads.newValue || {};
    }
    if (changes.customTrackingPhrases !== undefined) {
      customTrackingPhrases = changes.customTrackingPhrases.newValue || [];
      try {
        localStorage.setItem('__radar_tracking_phrases', JSON.stringify(customTrackingPhrases));
      } catch (e) {}
      window.dispatchEvent(new CustomEvent('RADAR_SET_TRACKING_PHRASES', { detail: { phrases: customTrackingPhrases } }));
    }
    if (changes.flashGreetingMessage !== undefined) {
      const newGreeting = changes.flashGreetingMessage.newValue;
      FLASH_GREETING_MESSAGE = (typeof newGreeting === 'string' && newGreeting.trim()) ? newGreeting.trim() : DEFAULT_FLASH_GREETING;
      try {
        localStorage.setItem('__radar_flash_greeting', FLASH_GREETING_MESSAGE);
      } catch (e) {}
      window.dispatchEvent(new CustomEvent('RADAR_SET_FLASH_GREETING', { detail: { greeting: FLASH_GREETING_MESSAGE } }));
    }
    if (changes.flashTriggerKeywords !== undefined) {
      flashTriggerKeywords = (Array.isArray(changes.flashTriggerKeywords.newValue) && changes.flashTriggerKeywords.newValue.length)
        ? changes.flashTriggerKeywords.newValue
        : DEFAULT_FLASH_KEYWORDS;
      try {
        localStorage.setItem('__radar_flash_keywords', JSON.stringify(flashTriggerKeywords));
      } catch (e) {}
      window.dispatchEvent(new CustomEvent('RADAR_SET_FLASH_KEYWORDS', { detail: { keywords: flashTriggerKeywords } }));
      console.log('⚡ [RespondRadar] Palabras clave de campaña actualizadas:', flashTriggerKeywords);
    }
    if (changes.keyboardNavigationEnabled !== undefined) {
      keyboardNavigationEnabled = !!changes.keyboardNavigationEnabled.newValue;
    }
    if (changes.planPricesConfig !== undefined) {
      planPricesConfig = { ...planPricesConfig, ...(changes.planPricesConfig.newValue || {}) };
      if (typeof updateWidgetUI === 'function') updateWidgetUI();
    }
  }
});

// -------------------------------------------------------------------------
// Atajos de Teclado y Cierres Globales
// -------------------------------------------------------------------------

window.addEventListener('keydown', (e) => {
  if (e.altKey && (e.key === 'h' || e.key === 'H')) {
    e.preventDefault();
    if (typeof toggleWidgetVisibility === 'function') toggleWidgetVisibility();
  }
  // Atajos de navegación rápida entre chats (Alt + ↓ siguiente, Alt + ↑ anterior)
  if (keyboardNavigationEnabled && e.altKey && (e.key === 'ArrowDown' || e.key === 'Down')) {
    e.preventDefault();
    e.stopPropagation();
    if (typeof navigateChatList === 'function') navigateChatList('down');
  }
  if (keyboardNavigationEnabled && e.altKey && (e.key === 'ArrowUp' || e.key === 'Up')) {
    e.preventDefault();
    e.stopPropagation();
    if (typeof navigateChatList === 'function') navigateChatList('up');
  }
}, true);

window.addEventListener('click', (e) => {
  if (isMenuOpen && !e.target.closest('#respond-radar-widget')) {
    isMenuOpen = false;
    if (typeof updateWidgetUI === 'function') updateWidgetUI();
  }
  if (isFollowPopoverOpen && !e.target.closest('#respond-radar-widget')) {
    isFollowPopoverOpen = false;
    if (typeof updateWidgetUI === 'function') updateWidgetUI();
  }
});

// -------------------------------------------------------------------------
// Polling SPA y Keep-Alive Heartbeat (Standalone)
// -------------------------------------------------------------------------

const pollInterval = setInterval(() => {
  if (!isExtensionValid()) {
    clearInterval(pollInterval);
    try { observer.disconnect(); } catch (e) {}
    return;
  }
  // Si el Auto-Apartador Flash está activo, pausar todo el polling secundario para darle el 100% de CPU y red
  if (window.__radarFlashActive || (typeof flashApartadorState !== 'undefined' && flashApartadorState.active)) {
    return;
  }
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    if (typeof updateWidgetUI === 'function') updateWidgetUI();
    if (typeof updateChatNavAnchorFromCurrent === 'function') updateChatNavAnchorFromCurrent();
  }
  requestScan();
}, 1200);

// Heartbeat cada 3.5 minutos para evitar suspensión por inactividad
setInterval(() => {
  if (isExtensionValid()) {
    safeSendMessage({ type: 'HEARTBEAT_PULSE' });
  }
}, 3.5 * 60 * 1000);

// -------------------------------------------------------------------------
// Inicialización
// -------------------------------------------------------------------------

loadStoredData();
