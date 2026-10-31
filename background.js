

const notificationToChatMap = new Map();

async function updateBadge() {
  try {
    const data = await chrome.storage.local.get(['watchedLeads']);
    const leads = data.watchedLeads || {};
    let totalUnread = 0;
    let myActiveCount = 0;

    for (const id in leads) {
      const lead = leads[id];
      if (!lead) continue;

      if (lead.unreadCount) {
        totalUnread += lead.unreadCount;
      }
      if (!lead.isSold && lead.processStage !== 'Venta') {
        myActiveCount++;
      }
    }

    if (totalUnread > 0) {
      await chrome.action.setBadgeText({ text: totalUnread > 99 ? '99+' : String(totalUnread) });
      await chrome.action.setBadgeBackgroundColor({ color: '#EF4444' });
    } else if (myActiveCount > 0) {
      await chrome.action.setBadgeText({ text: String(myActiveCount) });
      await chrome.action.setBadgeBackgroundColor({ color: '#0EA5E9' });
    } else {
      await chrome.action.setBadgeText({ text: '' });
    }
  } catch (err) {
    console.error('Error updating badge:', err);
  }
}

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

  if (request.type === 'HEARTBEAT_PULSE') {
    sendResponse({ alive: true, timestamp: Date.now() });
    return true;
  }

  return false;
});

async function handleNewMessageNotification(payload) {
  const { contactName, messageSnippet, conversationId, spaceId, fullUrl } = payload;

  const data = await chrome.storage.local.get(['watchedLeads', 'soundEnabled']);
  const leads = data.watchedLeads || {};
  const lead = leads[conversationId];

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
    requireInteraction: true
  };

  chrome.notifications.create(notificationId, options, () => {
    updateBadge();
  });
}

chrome.notifications.onClicked.addListener(async (notificationId) => {
  const target = notificationToChatMap.get(notificationId);
  if (target) {
    await navigateToChat(target);
    chrome.notifications.clear(notificationId);
    notificationToChatMap.delete(notificationId);
  }
});

async function navigateToChat({ url, conversationId }) {
  try {
    const tabs = await chrome.tabs.query({ url: '*://app.respond.io/*' });

    if (tabs.length > 0) {
      const targetTab = tabs.find(t => t.active) || tabs[0];

      await chrome.tabs.update(targetTab.id, { active: true });
      await chrome.windows.update(targetTab.windowId, { focused: true });

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

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.watchedLeads) {
    updateBadge();
  }
});

updateBadge();
