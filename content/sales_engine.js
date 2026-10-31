// RespondRadar Standalone - Módulo 5: Motor Auxiliar & Control Flash
// content/sales_engine.js

// Stubs para compatibilidad de ciclo de vida (Standalone: sin backend Bridge ni IA externa)
function syncBridgeViaBackground() {}
function ensureComposerAiButton() {}
function requestSalesSuggestion() {}
function startSequentialAttention() {}
function renderCopilotHUD() {}

// -------------------------------------------------------------------------
// Escáner Estructural del DOM de Respond.io (Modo Inspección Local)
// -------------------------------------------------------------------------

function scanRespondStructure() {
  const urlInfo = parseCurrentUrl();
  const report = {
    scannedAt: new Date().toISOString(),
    url: window.location.href,
    spaceId: urlInfo.spaceId,
    conversationId: urlInfo.conversationId,
    salesAgent: null,
    composer: null,
    sendButton: null,
    header: null,
    contactPanel: null,
    messagesList: null
  };

  safeStorageSet({ domScanReport: report });
  return report;
}

// -------------------------------------------------------------------------
// Atajos y Eventos para Auto-Apartador Flash
// -------------------------------------------------------------------------

window.addEventListener('RADAR_EXEC_START_FLASH', () => {
  if (typeof startFlashApartador === 'function') startFlashApartador();
});

window.addEventListener('RADAR_EXEC_STOP_FLASH', () => {
  if (typeof stopFlashApartador === 'function') stopFlashApartador();
});
