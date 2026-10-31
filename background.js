// Background Service Worker (Manifest V3)
// RespondRadar Standalone - Lead Watcher & Sales Monitor

const notificationToChatMap = new Map();

// Helper to update extension badge based on local watchedLeads
async function updateBadge() {
  try {
    const data = await chrome.storage.local.get(['watchedLeads']);
    const leads = data.watchedLeads || {};
    let totalUnread = 0;
    let myActiveCount = 0;
    
    for (const id in leads) {
      const lead = leads[id];
      if (!lead) continue;
      // All leads in this standalone installation belong to the current user
      if (lead.unreadCount) {
        totalUnread += lead.unreadCount;
      }
      if (!lead.isSold && lead.processStage !== 'Venta') {
        myActiveCount++;
      }
    }

    if (totalUnread > 0) {
      await chrome.action.setBadgeText({ text: totalUnread > 99 ? '99+' : String(totalUnread) });
      await chrome.action.setBadgeBackgroundColor({ color: '#EF4444' }); // Red-500
    } else if (myActiveCount > 0) {
      await chrome.action.setBadgeText({ text: String(myActiveCount) });
      await chrome.action.setBadgeBackgroundColor({ color: '#0EA5E9' }); // Sky-500
    } else {
      await chrome.action.setBadgeText({ text: '' });
    }
  } catch (err) {
    console.error('Error updating badge:', err);
  }
}

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'NOTIFY_NEW_MESSAGE') {
    handleNewMessageNotification(request.payload);
    sendResponse({ success: true });
    return true;
  }

  if (request.type === 'NAVIGATE_TO_CHAT') {
    navigateToChat(request.payload);
    sendResponse({ success: true });
    return true;
  }

  // Heartbeat keep-alive para mantener sesión viva y evitar suspensión del service worker
  if (request.type === 'HEARTBEAT_PULSE') {
    sendResponse({ alive: true, timestamp: Date.now() });
    return true;
  }

  return false;
});

// Show native desktop notification for watched leads
async function handleNewMessageNotification(payload) {
  const { contactName, messageSnippet, conversationId, spaceId, fullUrl } = payload;

  const data = await chrome.storage.local.get(['watchedLeads', 'soundEnabled']);
  const leads = data.watchedLeads || {};
  const lead = leads[conversationId];

  // Si el lead está silenciado, no emitir notificación de escritorio
  if (lead && lead.muted) {
    return;
  }

  const notificationId = `lead_msg_${conversationId}_${Date.now()}`;
  notificationToChatMap.set(notificationId, {
    url: fullUrl || `https://app.respond.io/space/${spaceId}/inbox/${conversationId}`,
    conversationId
  });

  const options = {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: `🔥 [Lead] ${contactName} te escribió`,
    message: messageSnippet || 'Nuevo mensaje recibido',
    priority: 2,
    requireInteraction: true // Keep toast visible until user clicks or dismisses
  };

  chrome.notifications.create(notificationId, options, () => {
    updateBadge();
  });
}

// When user clicks the Windows toast notification, focus Chrome and open that chat
chrome.notifications.onClicked.addListener(async (notificationId) => {
  const target = notificationToChatMap.get(notificationId);
  if (target) {
    await navigateToChat(target);
    chrome.notifications.clear(notificationId);
    notificationToChatMap.delete(notificationId);
  }
});

// Open or switch to chat in the EXISTING Respond.io tab (sin recargar la página SPA)
async function navigateToChat({ url, conversationId }) {
  try {
    const tabs = await chrome.tabs.query({ url: '*://app.respond.io/*' });

    if (tabs.length > 0) {
      const targetTab = tabs.find(t => t.active) || tabs[0];
      
      await chrome.tabs.update(targetTab.id, { active: true });
      await chrome.windows.update(targetTab.windowId, { focused: true });

      // Disparar navegación suave interna en la SPA de Respond.io
      chrome.tabs.sendMessage(targetTab.id, {
        type: 'SMOOTH_NAVIGATE_TO_CHAT',
        payload: { url, conversationId }
      }, (resp) => {
        if (chrome.runtime.lastError || !resp || !resp.success) {
          console.warn('[RespondRadar] Fallback a tabs.update con recarga:', chrome.runtime.lastError?.message);
          chrome.tabs.update(targetTab.id, { url });
        }
      });
    } else {
      await chrome.tabs.create({ url, active: true });
    }

    // Reset unread count for this lead in storage
    if (conversationId) {
      const data = await chrome.storage.local.get(['watchedLeads']);
      const leads = data.watchedLeads || {};
      if (leads[conversationId]) {
        leads[conversationId].unreadCount = 0;
        await chrome.storage.local.set({ watchedLeads: leads });
        updateBadge();
      }
    }
  } catch (err) {
    console.error('Error navigating to chat:', err);
  }
}

// Listen to storage changes to update badge dynamically
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.watchedLeads) {
    updateBadge();
  }
});

// Initial badge update on worker start
updateBadge();
