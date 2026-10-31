// RespondRadar - Módulo 3: Interfaz de Usuario, Widget Flotante, Modales y Notificaciones

async function toggleWidgetVisibility() {
  isWidgetHidden = !isWidgetHidden;
  await safeStorageSet({ widgetHidden: isWidgetHidden });
  updateWidgetUI();
}

function updateWidgetUI() {
  let widget = document.getElementById('respond-radar-widget');
  if (!widget) {
    widget = document.createElement('div');
    widget.id = 'respond-radar-widget';
    document.body.appendChild(widget);

    document.addEventListener('click', (e) => {
      if (!widget.contains(e.target) && isFollowPopoverOpen) {
        isFollowPopoverOpen = false;
        updateWidgetUI();
      }
    });
  }

  if (isWidgetHidden) {
    widget.style.display = 'none';
    return;
  } else {
    widget.style.display = 'flex';
  }

  const { spaceId, conversationId } = parseCurrentUrl();
  const count = Object.keys(watchedLeads).length;

  if (!conversationId) {
    const iconRadio = window.RadarIcons?.render('radio', 12, 'radar-icon-pulse') || '';
    const iconSearch = window.RadarIcons?.render('search', 11) || '';
    const iconClock = window.RadarIcons?.render('clock', 11) || '';

    widget.innerHTML = `
      <div class="radar-logo" title="RespondRadar Standalone Activo">
        <span class="radar-pulse-dot online"></span>
        <span class="radar-logo-text">${iconRadio} Radar</span>
      </div>
      <span class="radar-lead-counter">${count} leads</span>
    `;
    return;
  }

  const isWatched = !!watchedLeads[conversationId];
  const isDismissed = !!dismissedLeads[conversationId];
  const contactName = isWatched ? watchedLeads[conversationId].name : getActiveContactName();

  if (!isWatched) {
    const initials = (contactName || 'L')
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'L';

    const iconStar = window.RadarIcons?.render('star', 12) || '';
    const iconTarget = window.RadarIcons?.render('target', 12) || '';
    const iconZap = window.RadarIcons?.render('zap', 12) || '';
    const iconX = window.RadarIcons?.render('x', 13) || '';
    const iconDiamond = window.RadarIcons?.render('diamond', 13) || '';
    const iconCrown = window.RadarIcons?.render('crown', 13) || '';
    const iconStop = window.RadarIcons?.render('stopCircle', 12) || '';
    const iconBotOff = window.RadarIcons?.render('botOff', 13) || '';

    const currSym = (typeof planPricesConfig !== 'undefined' && planPricesConfig.currency === 'USD') ? '$' : '€';
    const priceStarter = (typeof planPricesConfig !== 'undefined' && planPricesConfig.starter !== undefined) ? planPricesConfig.starter : 29;
    const pricePro = (typeof planPricesConfig !== 'undefined' && planPricesConfig.pro !== undefined) ? planPricesConfig.pro : 59;
    const priceBlack = (typeof planPricesConfig !== 'undefined' && planPricesConfig.black !== undefined) ? planPricesConfig.black : 130;

    widget.innerHTML = `
      <div class="radar-inpage-pill unwatched">
        <button class="radar-inpage-btn btn-watch" id="radar-watch-btn">${iconStar} <span>Seguir</span></button>
        ${isFollowPopoverOpen ? `
          <div class="radar-popover rf-popover-cute" id="radar-follow-popover">
            <!-- Header Elegante Slate -->
            <div class="rf-header">
              <div class="rf-header-lead">
                <div class="rf-avatar">${initials}</div>
                <div class="rf-lead-meta">
                  <span class="rf-lead-name" title="${escapeHtml(contactName || 'Nuevo Prospecto')}">${escapeHtml(truncate(contactName || 'Nuevo Prospecto', 16))}</span>
                  <span class="rf-lead-sub">${iconStar} Apartar en Radar</span>
                </div>
              </div>
              <button type="button" class="rf-close-btn" id="radar-follow-close-btn" title="Cerrar">${iconX}</button>
            </div>

            <!-- Navegación Segmentada -->
            <div class="rf-nav-tabs">
              <button type="button" class="rf-tab-btn ${activeFollowPopoverTab === 'planes' ? 'active' : ''}" data-popover-tab="planes">
                ${iconTarget} <span>Planes</span>
              </button>
              <button type="button" class="rf-tab-btn ${activeFollowPopoverTab === 'tools' ? 'active' : ''}" data-popover-tab="tools">
                ${iconZap} <span>Herramientas</span>
              </button>
            </div>

            <!-- TAB 1: PLANES A APARTAR -->
            <div class="rf-tab-content ${activeFollowPopoverTab === 'planes' ? 'active' : ''}" id="rf-popover-tab-planes">
              <div class="rf-module-card">
                <span class="rf-section-tag">¿Qué plan va a comprar?</span>
                <div class="rf-popover-plans-stack">
                  <button type="button" class="rf-popover-plan-card plan-starter" data-plan="Starter">
                    <div class="rf-plan-left">
                      <span class="rf-plan-icon-wrap starter">${iconStar}</span>
                      <div class="rf-plan-info">
                        <span class="rf-plan-title">Starter</span>
                        <span class="rf-plan-desc">Básico · ${currSym}${priceStarter}</span>
                      </div>
                    </div>
                    <span class="rf-plan-badge">${iconZap} Apartar</span>
                  </button>
                  <button type="button" class="rf-popover-plan-card plan-pro" data-plan="Pro">
                    <div class="rf-plan-left">
                      <span class="rf-plan-icon-wrap pro">${iconDiamond}</span>
                      <div class="rf-plan-info">
                        <span class="rf-plan-title">Pro</span>
                        <span class="rf-plan-desc">Recomendado · ${currSym}${pricePro}</span>
                      </div>
                    </div>
                    <span class="rf-plan-badge">${iconZap} Apartar</span>
                  </button>
                  <button type="button" class="rf-popover-plan-card plan-black" data-plan="Black">
                    <div class="rf-plan-left">
                      <span class="rf-plan-icon-wrap black">${iconCrown}</span>
                      <div class="rf-plan-info">
                        <span class="rf-plan-title">Black</span>
                        <span class="rf-plan-desc">VIP Exclusivo · ${currSym}${priceBlack}</span>
                      </div>
                    </div>
                    <span class="rf-plan-badge">${iconZap} Apartar</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- TAB 2: HERRAMIENTAS Y FLASH -->
            <div class="rf-tab-content ${activeFollowPopoverTab === 'tools' ? 'active' : ''}" id="rf-popover-tab-tools">
              <div class="rf-module-card">
                <span class="rf-section-tag">Automatización & Bot</span>
                <button type="button" class="rf-tool-btn rf-btn-stop-ai" id="radar-popover-bot-off-btn" style="width: 100%; margin-bottom: 8px;" title="Apagar el bot completamente para este chat (Bot Status: OFF)">
                  <span style="display: flex; align-items: center; gap: 7px;">${iconBotOff} <span>Apagar Bot (Bot Off)</span></span>
                  <span class="rf-tool-status stop-ai">BOT OFF</span>
                </button>
                <button type="button" class="rf-tool-btn rf-btn-flash" id="radar-popover-flash-btn" style="width: 100%;">
                  ${flashApartadorState.running ? iconStop : iconZap} <span>${flashApartadorState.running ? 'Detener Apartador Flash' : 'Auto-Apartador Flash ("King")'}</span>
                </button>
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    document.getElementById('radar-watch-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      isFollowPopoverOpen = !isFollowPopoverOpen;
      isMenuOpen = false;
      updateWidgetUI();
    });

    if (isFollowPopoverOpen) {
      document.getElementById('radar-follow-close-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        isFollowPopoverOpen = false;
        updateWidgetUI();
      });

      document.querySelectorAll('#radar-follow-popover .rf-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          activeFollowPopoverTab = btn.dataset.popoverTab || 'planes';
          updateWidgetUI();
        });
      });

      document.querySelectorAll('#radar-follow-popover [data-plan]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const targetPlan = btn.dataset.plan;
          await watchCurrentLead(spaceId, conversationId, { targetPlan, owner: 'mine' });
          isFollowPopoverOpen = false;
          updateWidgetUI();
          if (typeof showCrawlProgressToast === 'function') {
            showCrawlProgressToast(`⭐ ${contactName || 'Lead'} apartado en ${targetPlan} (Seguimiento activo)`);
            setTimeout(hideCrawlProgressToast, 2500);
          }
        });
      });

      document.getElementById('radar-popover-bot-off-btn')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        isFollowPopoverOpen = false;
        updateWidgetUI();
        if (typeof executeSetContactBotStatus === 'function') {
          await executeSetContactBotStatus(conversationId, false, spaceId);
        } else if (typeof executeDeactivateSalesAgentAi === 'function') {
          await executeDeactivateSalesAgentAi(conversationId, spaceId);
        }
      });

      document.getElementById('radar-popover-flash-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        isFollowPopoverOpen = false;
        updateWidgetUI();
        if (typeof toggleFlashApartador === 'function') toggleFlashApartador();
      });
    }
    return;
  }

  const lead = watchedLeads[conversationId];
  if (!lead) return;
  const owner = lead.owner || 'mine';
  const isSold = lead.sale && lead.sale.isSold;
  const currentPlan = isSold ? lead.sale.plan : (lead.targetPlan || 'Starter');
  const processStage = lead.processStage || '';
  const followUp = typeof getFollowUpStatus === 'function' ? getFollowUpStatus(lead.followUpDate) : null;

  const initials = (contactName || 'L')
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'L';

  let pillClass = 'watched';
  let pillIcon = window.RadarIcons?.render('star', 12, 'chip-icon-svg') || '';
  let ownerPrefix = `★ Mío · ${currentPlan} · `;

  if (isSold) {
    pillClass += ' is-sold';
    pillIcon = window.RadarIcons?.render('crown', 12, 'chip-icon-svg icon-sold') || '';
    ownerPrefix = `👑 Venta · ${currentPlan} · `;
  }

  const iconStar = window.RadarIcons?.render('star', 12) || '';
  const iconTarget = window.RadarIcons?.render('target', 12) || '';
  const iconZap = window.RadarIcons?.render('zap', 12) || '';
  const iconX = window.RadarIcons?.render('x', 13) || '';
  const iconDiamond = window.RadarIcons?.render('diamond', 12) || '';
  const iconCrown = window.RadarIcons?.render('crown', 12) || '';
  const iconCheck = window.RadarIcons?.render('checkCircle', 12) || '';
  const iconFile = window.RadarIcons?.render('fileText', 12) || '';
  const iconCard = window.RadarIcons?.render('creditCard', 12) || '';
  const iconPhone = window.RadarIcons?.render('smartphone', 12) || '';
  const iconAlertTriangle = window.RadarIcons?.render('alertTriangle', 12) || '⚠️';
  const iconFlag = window.RadarIcons?.render('flag', 12) || '🏁';
  const iconCal = window.RadarIcons?.render('calendar', 12) || '';
  const iconBell = window.RadarIcons?.render('bell', 13) || '';
  const iconBellOff = window.RadarIcons?.render('bellOff', 12) || '';
  const iconSave = window.RadarIcons?.render('save', 12) || '';
  const iconDollar = window.RadarIcons?.render('dollarSign', 13) || '';
  const iconTrash = window.RadarIcons?.render('trash', 12) || '';
  const iconBotOff = window.RadarIcons?.render('botOff', 13) || '';

  widget.innerHTML = `
    <div class="radar-inpage-pill ${pillClass}">
      <button class="radar-lead-chip-btn" id="radar-watched-chip-btn" title="Lead vigilado: ${escapeHtml(contactName)}. Clic para abrir menú">
        <span class="chip-icon">${pillIcon}</span>
        <span class="chip-name">${ownerPrefix}${escapeHtml(truncate(contactName, 13))}</span>
      </button>
      ${lead.muted ? `
        <span class="radar-pill-muted-indicator" title="Notificaciones de este lead silenciadas">${iconBellOff}</span>
      ` : ''}
      ${isSold ? `
        <button type="button" class="radar-pill-stage-btn stage-sold" id="radar-sale-quick-btn" title="Venta Cerrada (${escapeHtml(currentPlan)}). Clic para abrir opciones">
          👑 Venta
        </button>
      ` : (owner === 'mine' && processStage ? `
        <button type="button" class="radar-pill-stage-btn stage-${getStageSlug(processStage)}" id="radar-stage-quick-btn" title="Etapa: ${escapeHtml(processStage)}. Clic para abrir opciones">
          ${escapeHtml(processStage)}
        </button>
      ` : '')}
      ${owner === 'mine' && !isSold && followUp ? `
        <button type="button" class="radar-pill-followup-btn is-${followUp.status}" id="radar-followup-quick-btn" title="Tiene el dinero: ${escapeHtml(followUp.text)}. Clic para abrir opciones">
          ${escapeHtml(followUp.badge)}
        </button>
      ` : ''}
      ${isMenuOpen ? `
        <div class="radar-floating-menu" id="radar-floating-menu">
          <!-- Header Elegante Slate -->
          <div class="rf-header">
            <div class="rf-header-lead">
              <div class="rf-avatar ${isSold ? 'avatar-sold' : ''}">${isSold ? '👑' : initials}</div>
              <div class="rf-lead-meta">
                <span class="rf-lead-name" title="${escapeHtml(contactName)}">${escapeHtml(truncate(contactName, 17))}</span>
                <span class="rf-lead-sub">
                  ${isSold
                    ? `👑 <strong class="rf-plan-highlight rf-sold-highlight">Venta Cerrada (${currentPlan})</strong> · <span class="rf-stage-pill stage-sold">👑 Venta</span>`
                    : `${iconStar} Mío · <strong class="rf-plan-highlight">${currentPlan}</strong>${processStage ? ` · <span class="rf-stage-pill stage-${getStageSlug(processStage)}">${processStage}</span>` : ''}`
                  }
                </span>
              </div>
            </div>
            <button type="button" class="rf-close-btn" id="rf-close-btn" title="Cerrar">${iconX}</button>
          </div>

          <!-- Pestañas de Navegación Segmentadas -->
          <div class="rf-nav-tabs">
            <button type="button" class="rf-tab-btn ${activeFloatingMenuTab === 'pipeline' ? 'active' : ''}" data-tab="pipeline">
              ${iconTarget} <span>Cierre & Etapas</span>
            </button>
            <button type="button" class="rf-tab-btn ${activeFloatingMenuTab === 'tools' ? 'active' : ''}" data-tab="tools">
              ${iconZap} <span>Herramientas</span>
            </button>
          </div>

          <!-- TAB 1: PIPELINE & FECHA DINERO -->
          <div class="rf-tab-content ${activeFloatingMenuTab === 'pipeline' ? 'active' : ''}" id="rf-tab-pipeline">
            ${isSold ? `
              <!-- Módulo Resumen de Venta Cerrada -->
              <div class="rf-module-card rf-sale-summary-card">
                <div class="rf-sale-summary-header">
                  <span class="rf-sale-badge">👑 VENTA REGISTRADA</span>
                  <span class="rf-sale-plan-tag">${escapeHtml(currentPlan)}</span>
                </div>
                <div class="rf-sale-details-grid">
                  <div class="rf-sale-detail-item">
                    <span class="rf-sd-label">Modalidad</span>
                    <span class="rf-sd-value">${(lead.sale && lead.sale.isInstallment) ? `Abono (${escapeHtml(lead.sale.amount || 'Pendiente')})` : 'Pago Completo'}</span>
                  </div>
                  ${(lead.sale && lead.sale.hfmId) ? `
                    <div class="rf-sale-detail-item">
                      <span class="rf-sd-label">ID HFM</span>
                      <span class="rf-sd-value"><code>${escapeHtml(lead.sale.hfmId)}</code></span>
                    </div>
                  ` : ''}
                  ${(lead.sale && lead.sale.soldAt) ? `
                    <div class="rf-sale-detail-item">
                      <span class="rf-sd-label">Fecha</span>
                      <span class="rf-sd-value">${new Date(lead.sale.soldAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
                    </div>
                  ` : ''}
                </div>
              </div>
            ` : (owner === 'mine' ? `
              <!-- Módulo 1: Paquete y Etapa -->
              <div class="rf-module-card">
                <div class="rf-card-section">
                  <span class="rf-section-tag">Paquete Apartado</span>
                  <div class="rf-plan-grid">
                    <button type="button" class="rf-plan-chip ${currentPlan === 'Starter' ? 'active' : ''}" data-plan="Starter">${iconStar} <span>Starter</span></button>
                    <button type="button" class="rf-plan-chip ${currentPlan === 'Pro' ? 'active' : ''}" data-plan="Pro">${iconDiamond} <span>Pro</span></button>
                    <button type="button" class="rf-plan-chip ${currentPlan === 'Black' ? 'active' : ''}" data-plan="Black">${iconCrown} <span>Black</span></button>
                  </div>
                </div>

                <div class="rf-card-divider"></div>

                <div class="rf-card-section">
                  <span class="rf-section-tag">Etapa del Proceso</span>
                  <div class="rf-stage-grid">
                    <button type="button" class="rf-stage-chip stage-150 ${processStage === '150 ✅' ? 'active' : ''}" data-stage="150 ✅">${iconCheck} <span>150</span></button>
                    <button type="button" class="rf-stage-chip stage-registro ${processStage === 'En registro' ? 'active' : ''}" data-stage="En registro">${iconFile} <span>Registro</span></button>
                    <button type="button" class="rf-stage-chip stage-fondeo ${processStage === 'En fondeo' ? 'active' : ''}" data-stage="En fondeo">${iconCard} <span>Fondeo</span></button>
                    <button type="button" class="rf-stage-chip stage-ingresando ${processStage === 'Ingresando' ? 'active' : ''}" data-stage="Ingresando">${iconPhone} <span>Ingresando</span></button>
                    <button type="button" class="rf-stage-chip stage-revision ${processStage === 'En revisión' ? 'active' : ''}" data-stage="En revisión">${iconAlertTriangle} <span>Revisión</span></button>
                    <button type="button" class="rf-stage-chip stage-final ${processStage === 'Final' ? 'active' : ''}" data-stage="Final">${iconFlag} <span>Final</span></button>
                  </div>
                </div>
              </div>

              <!-- Módulo 2: ¿Cuándo tiene el dinero? / Seguimiento -->
              <div class="rf-module-card rf-followup-card">
                <div class="rf-card-header">
                  <span class="rf-section-tag">${iconCal} <span>¿Cuándo tiene el dinero?</span></span>
                  ${lead.followUpDate ? `
                    <button type="button" class="rf-btn-clear-date" id="rf-clear-followup-btn" title="Quitar fecha">${iconX} <span>Quitar</span></button>
                  ` : ''}
                </div>

                ${lead.followUpDate ? `
                  <div class="rf-active-followup ${followUp ? followUp.status : ''}">
                    <span class="rf-af-icon">${iconBell}</span>
                    <div class="rf-af-body">
                      <strong>${followUp ? followUp.text : lead.followUpDate}</strong>
                      ${lead.followUpNote ? `<span>${escapeHtml(lead.followUpNote)}</span>` : ''}
                    </div>
                  </div>
                ` : ''}

                <div class="rf-quick-dates-grid">
                  <button type="button" class="rf-qdate-chip" data-qdate="tomorrow">${iconZap} <span>Mañana</span></button>
                  <button type="button" class="rf-qdate-chip" data-qdate="saturday">${iconCal} <span>Sábado</span></button>
                  <button type="button" class="rf-qdate-chip" data-qdate="week1">${iconCal} <span>1 sem</span></button>
                  <button type="button" class="rf-qdate-chip" data-qdate="week2">${iconCal} <span>2 sem</span></button>
                  <button type="button" class="rf-qdate-chip" data-qdate="month_end">${iconDollar} <span>Fin de mes</span></button>
                  <button type="button" class="rf-qdate-chip" data-qdate="month1">${iconCal} <span>1 mes</span></button>
                </div>

                <div class="rf-custom-date-row">
                  <input type="date" class="rf-date-input" id="rf-custom-date-input" value="${lead.followUpDate || ''}" title="Elegir fecha exacta">
                  <input type="text" class="rf-note-input" id="rf-custom-note-input" placeholder="Nota (ej: cobra sueldo)" value="${escapeHtml(lead.followUpNote || '')}">
                  <button type="button" class="rf-btn-save-note" id="rf-save-date-note-btn" title="Guardar fecha y nota">${iconSave}</button>
                </div>
              </div>
            ` : '')}

            <!-- Módulo 3: Acciones Principales -->
            <div class="rf-module-card rf-actions-card">
              <button type="button" class="rf-action-btn rf-btn-sale ${isSold ? 'is-sold-btn' : ''}" id="rf-sale-btn">
                <span class="rf-btn-icon">${isSold ? iconCrown : iconDollar}</span>
                <span class="rf-btn-text">${isSold ? '👑 Ver / Editar Venta' : '💰 Registrar Venta'}</span>
              </button>
              <button type="button" class="rf-action-btn rf-btn-mute ${lead.muted ? 'is-muted' : ''}" id="rf-mute-btn" title="${lead.muted ? 'Notificaciones silenciadas (clic para reactivar)' : 'Silenciar notificaciones de este lead'}">
                <span class="rf-btn-icon">${lead.muted ? iconBellOff : iconBell}</span>
                <span class="rf-btn-text">${lead.muted ? 'Reactivar Notificaciones' : 'Silenciar Notificaciones'}</span>
              </button>
            </div>
          </div>

          <!-- TAB 2: HERRAMIENTAS RADAR -->
          <div class="rf-tab-content ${activeFloatingMenuTab === 'tools' ? 'active' : ''}" id="rf-tab-tools">
            <div class="rf-module-card">
              <span class="rf-section-tag">Asistente & Auto-Apartador</span>
              <div class="rf-tools-list">
                <button class="rf-tool-btn rf-btn-stop-ai" id="rf-bot-off-btn" title="Apagar el bot completamente para este chat (Bot Status: OFF)">
                  <span style="display: flex; align-items: center; gap: 7px;">${iconBotOff} <span>Apagar Bot (Bot Off)</span></span>
                  <span class="rf-tool-status stop-ai">BOT OFF</span>
                </button>
                <button class="rf-tool-btn" id="rf-flash-apartador-btn">
                  <span>${iconZap} Auto-Apartador Flash ("King")</span>
                  <span class="rf-tool-status ${flashApartadorState.running ? 'on' : 'off'}">${flashApartadorState.running ? 'ACTIVO' : 'PAUSA'}</span>
                </button>
              </div>
            </div>

            <div class="rf-module-card rf-danger-card">
              <button class="rf-tool-btn rf-btn-unwatch" id="rf-unwatch-btn">
                <span>${iconTrash} Dejar de Seguir Lead</span>
              </button>
            </div>
          </div>
        </div>
      ` : ''}
    </div>
  `;

  document.getElementById('radar-watched-chip-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    isMenuOpen = !isMenuOpen;
    updateWidgetUI();
  });

  document.getElementById('radar-sale-quick-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    activeFloatingMenuTab = 'pipeline';
    isMenuOpen = true;
    updateWidgetUI();
  });

  document.getElementById('radar-stage-quick-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    activeFloatingMenuTab = 'pipeline';
    isMenuOpen = true;
    updateWidgetUI();
  });

  document.getElementById('radar-followup-quick-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    activeFloatingMenuTab = 'pipeline';
    isMenuOpen = true;
    updateWidgetUI();
  });

  document.getElementById('rf-close-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    isMenuOpen = false;
    updateWidgetUI();
  });

  document.querySelectorAll('.rf-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      activeFloatingMenuTab = btn.dataset.tab;
      updateWidgetUI();
    });
  });

  document.querySelectorAll('.rf-plan-chip').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const newPlan = btn.dataset.plan;
      lead.targetPlan = newPlan;
      if (lead.sale && lead.sale.isSold) {
        lead.sale.plan = newPlan;
      }
      await safeStorageSet({ watchedLeads });
      updateWidgetUI();
      if (typeof updateChatListBadges === 'function') updateChatListBadges();
      showApartadoStatusToast(`⭐ Plan actualizado a ${newPlan}`, 2000);
    });
  });

  document.querySelectorAll('.rf-stage-chip').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const stage = btn.dataset.stage;
      if (lead.processStage === stage) {
        delete lead.processStage;
        showApartadoStatusToast('Etapa removida', 1800);
      } else {
        lead.processStage = stage;
        showApartadoStatusToast(`Etapa: ${stage}`, 2200);
      }
      await safeStorageSet({ watchedLeads });
      updateWidgetUI();
      if (typeof updateChatListBadges === 'function') updateChatListBadges();
      safeSendMessage({ type: 'UPDATE_BADGE' });
    });
  });

  document.querySelectorAll('.rf-qdate-chip').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const q = typeof getQuickFollowUpDate === 'function' ? getQuickFollowUpDate(btn.dataset.qdate) : null;
      if (q) {
        lead.followUpDate = q.date;
        lead.followUpLabel = q.label;
        await safeStorageSet({ watchedLeads });
        updateWidgetUI();
        if (typeof updateChatListBadges === 'function') updateChatListBadges();
        showApartadoStatusToast(`⏰ Fecha guardada: ${q.label} (${q.date})`, 2500);
        safeSendMessage({ type: 'UPDATE_BADGE' });
      }
    });
  });

  document.getElementById('rf-save-date-note-btn')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const dateVal = document.getElementById('rf-custom-date-input')?.value;
    const noteVal = document.getElementById('rf-custom-note-input')?.value?.trim();
    if (dateVal) {
      lead.followUpDate = dateVal;
      lead.followUpNote = noteVal || '';
      await safeStorageSet({ watchedLeads });
      updateWidgetUI();
      if (typeof updateChatListBadges === 'function') updateChatListBadges();
      showApartadoStatusToast(`⏰ Seguimiento guardado para ${dateVal}`, 2200);
      safeSendMessage({ type: 'UPDATE_BADGE' });
    }
  });

  document.getElementById('rf-clear-followup-btn')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    delete lead.followUpDate;
    delete lead.followUpNote;
    delete lead.followUpLabel;
    await safeStorageSet({ watchedLeads });
    updateWidgetUI();
    if (typeof updateChatListBadges === 'function') updateChatListBadges();
    showApartadoStatusToast('Fecha de seguimiento quitada', 1800);
    safeSendMessage({ type: 'UPDATE_BADGE' });
  });

  document.getElementById('rf-sale-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    isMenuOpen = false;
    updateWidgetUI();
    openInPageSaleModal(conversationId);
  });

  document.getElementById('rf-mute-btn')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    lead.muted = !lead.muted;
    await safeStorageSet({ watchedLeads });
    updateWidgetUI();
    if (typeof showCrawlProgressToast === 'function') {
      showCrawlProgressToast(lead.muted ? `🔕 Notificaciones silenciadas para ${contactName}` : `🔔 Notificaciones reactivadas para ${contactName}`);
      setTimeout(hideCrawlProgressToast, 2500);
    }
  });

  document.getElementById('rf-bot-off-btn')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    isMenuOpen = false;
    updateWidgetUI();
    if (typeof executeSetContactBotStatus === 'function') {
      await executeSetContactBotStatus(conversationId, false, spaceId);
    } else if (typeof executeDeactivateSalesAgentAi === 'function') {
      await executeDeactivateSalesAgentAi(conversationId, spaceId);
    }
  });

  document.getElementById('rf-flash-apartador-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    isMenuOpen = false;
    updateWidgetUI();
    if (typeof toggleFlashApartador === 'function') toggleFlashApartador();
  });

  document.getElementById('rf-unwatch-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    isMenuOpen = false;
    unwatchCurrentLead(conversationId);
  });
}

async function watchCurrentLead(spaceId, conversationId, { targetPlan = 'Pro', owner = 'mine' } = {}) {
  const name = getActiveContactName();
  if (dismissedLeads[conversationId]) {
    delete dismissedLeads[conversationId];
  }
  const existing = watchedLeads[conversationId] || {};
  watchedLeads[conversationId] = {
    ...existing,
    conversationId,
    spaceId,
    name: name || existing.name,
    owner,
    targetPlan,
    manuallyWatched: true,
    addedAt: existing.addedAt || new Date().toISOString(),
    lastMessage: existing.lastMessage || '',
    lastMessageTime: existing.lastMessageTime || new Date().toISOString(),
    unreadCount: existing.unreadCount || 0
  };

  await safeStorageSet({ watchedLeads, dismissedLeads });
  isFollowPopoverOpen = false;
  isWidgetExpanded = false;
  updateWidgetUI();
  if (typeof updateChatListBadges === 'function') updateChatListBadges();
  safeSendMessage({ type: 'UPDATE_BADGE' });
}

async function unwatchCurrentLead(conversationId) {
  if (watchedLeads[conversationId]) {
    delete watchedLeads[conversationId];
    dismissedLeads[conversationId] = true;
    await safeStorageSet({ watchedLeads, dismissedLeads });
    isWidgetExpanded = false;
    updateWidgetUI();
    if (typeof updateChatListBadges === 'function') updateChatListBadges();
    safeSendMessage({ type: 'UPDATE_BADGE' });
  }
}

function openInPageSaleModal(conversationId) {
  const resolvedConvId = conversationId || (typeof parseCurrentUrl === 'function' ? parseCurrentUrl().conversationId : null);
  const activeName = typeof getActiveContactName === 'function' ? getActiveContactName() : '';

  let targetKey = resolvedConvId;
  let lead = resolvedConvId ? watchedLeads[resolvedConvId] : null;

  if (!lead && activeName) {
    for (const [k, v] of Object.entries(watchedLeads)) {
      if (v && v.name && isContactNameMatch(v.name, activeName)) {
        lead = v;
        targetKey = k;
        break;
      }
    }
  }

  if (!lead) {
    targetKey = resolvedConvId || `lead_${Date.now()}`;
    lead = {
      conversationId: resolvedConvId || targetKey,
      spaceId: (typeof parseCurrentUrl === 'function' ? parseCurrentUrl().spaceId : null) || '384258',
      name: activeName || 'Lead Seleccionado',
      owner: 'mine',
      targetPlan: 'Starter',
      addedAt: new Date().toISOString()
    };
    watchedLeads[targetKey] = lead;
  }

  const existing = document.getElementById('radar-inpage-sale-modal');
  if (existing) existing.remove();

  const sale = lead.sale || {};
  const isAlreadySold = !!(lead.sale && lead.sale.isSold);
  let currentPlan = sale.plan || lead.targetPlan || 'Starter';
  let isInstallment = sale.isInstallment !== undefined ? sale.isInstallment : true;

  const overlay = document.createElement('div');
  overlay.id = 'radar-inpage-sale-modal';
  overlay.className = 'radar-modal-overlay';

  const iconDollar = window.RadarIcons?.render('dollarSign', 15) || '';
  const iconClose = window.RadarIcons?.render('x', 14) || '';
  const iconStar = window.RadarIcons?.render('star', 12) || '';
  const iconDiamond = window.RadarIcons?.render('diamond', 12) || '';
  const iconCrown = window.RadarIcons?.render('crown', 14) || '';
  const iconCheck = window.RadarIcons?.render('check', 13) || '';

  const modalCurrSym = (typeof planPricesConfig !== 'undefined' && planPricesConfig.currency === 'USD') ? '$' : '€';
  const modalBlackPrice = (typeof planPricesConfig !== 'undefined' && planPricesConfig.black) ? planPricesConfig.black : '130';

  overlay.innerHTML = `
    <div class="radar-modal-box">
      <div class="radar-modal-header">
        <h3 class="radar-modal-title">${iconCrown} <span>${isAlreadySold ? 'Ver / Editar Venta' : 'Registrar Venta'}</span></h3>
        <button class="radar-modal-close" id="modal-close-btn" title="Cerrar">${iconClose}</button>
      </div>

      <div class="radar-field-group">
        <label class="radar-field-label">Paquete Comprado</label>
        <div class="radar-pill-selector" id="modal-plan-selector">
          <button type="button" class="radar-pill-choice ${currentPlan === 'Starter' ? 'active' : ''}" data-plan="Starter">${iconStar} Starter</button>
          <button type="button" class="radar-pill-choice ${currentPlan === 'Pro' ? 'active' : ''}" data-plan="Pro">${iconDiamond} Pro</button>
          <button type="button" class="radar-pill-choice ${currentPlan === 'Black' ? 'active' : ''}" data-plan="Black">${iconCrown} Black</button>
        </div>
      </div>

      <div class="radar-field-group">
        <label class="radar-field-label">Tipo de Pago</label>
        <div class="radar-pill-selector" id="modal-mode-selector">
          <button type="button" class="radar-pill-choice ${isInstallment ? 'active' : ''}" data-mode="abono">Abono</button>
          <button type="button" class="radar-pill-choice ${!isInstallment ? 'active' : ''}" data-mode="completo">Pago Completo</button>
        </div>
      </div>

      <div class="radar-field-group" id="modal-amount-group" style="${!isInstallment ? 'display:none;' : ''}">
        <label class="radar-field-label">Monto del Abono</label>
        <input type="text" class="radar-field-input" id="modal-sale-amount" placeholder="Ej: ${modalCurrSym}25.00 o ${modalCurrSym}${modalBlackPrice}.00" value="${escapeHtml(sale.amount || '')}">
      </div>

      <div class="radar-field-group">
        <label class="radar-field-label">ID HFM</label>
        <input type="text" class="radar-field-input" id="modal-sale-hfm" placeholder="Ej: 68508627" value="${escapeHtml(sale.hfmId || '')}">
      </div>

      <div class="radar-field-group">
        <label class="radar-field-label">URL de Factura</label>
        <input type="text" class="radar-field-input" id="modal-sale-invoice" placeholder="https://pay.stripe.com/..." value="${escapeHtml(sale.invoiceUrl || '')}">
      </div>

      <div class="radar-field-group">
        <label class="radar-field-label">URL QR Telegram</label>
        <input type="text" class="radar-field-input" id="modal-sale-qr" placeholder="https://..." value="${escapeHtml(sale.telegramQrUrl || '')}">
      </div>

      <div class="radar-modal-actions" style="display: flex; gap: 8px; align-items: center;">
        <button type="button" class="radar-modal-btn-save" id="modal-btn-save" style="flex: 1;">${iconCheck} <span>${isAlreadySold ? 'Actualizar Venta' : 'Guardar Venta'}</span></button>
        ${isAlreadySold ? `
          <button type="button" class="radar-modal-btn-revert" id="modal-btn-revert" title="Desmarcar esta venta y devolver a prospecto activo" style="background: rgba(239, 68, 68, 0.18); border: 1px solid rgba(239, 68, 68, 0.5); color: #fca5a5; padding: 7px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer;">
            Desmarcar
          </button>
        ` : ''}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#modal-close-btn').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  overlay.querySelectorAll('#modal-plan-selector .radar-pill-choice').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('#modal-plan-selector .radar-pill-choice').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPlan = btn.dataset.plan;
    });
  });

  overlay.querySelectorAll('#modal-mode-selector .radar-pill-choice').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('#modal-mode-selector .radar-pill-choice').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      isInstallment = btn.dataset.mode === 'abono';
      const amountGroup = overlay.querySelector('#modal-amount-group');
      if (amountGroup) {
        amountGroup.style.display = isInstallment ? 'flex' : 'none';
      }
    });
  });

  overlay.querySelector('#modal-btn-save').addEventListener('click', async () => {
    const amount = overlay.querySelector('#modal-sale-amount')?.value?.trim() || '';
    const hfmId = overlay.querySelector('#modal-sale-hfm')?.value?.trim() || '';
    const invoiceUrl = overlay.querySelector('#modal-sale-invoice')?.value?.trim() || '';
    const telegramQrUrl = overlay.querySelector('#modal-sale-qr')?.value?.trim() || '';

    let freshWatched = {};
    try {
      const storage = await chrome.storage.local.get(['watchedLeads']);
      freshWatched = storage.watchedLeads || {};
    } catch (e) {
      freshWatched = { ...watchedLeads };
    }

    let finalKey = targetKey;
    let finalLead = freshWatched[finalKey];

    if (!finalLead && resolvedConvId) {
      finalLead = freshWatched[resolvedConvId];
      if (finalLead) finalKey = resolvedConvId;
    }

    if (!finalLead && activeName) {
      for (const [k, v] of Object.entries(freshWatched)) {
        if (v && v.name && isContactNameMatch(v.name, activeName)) {
          finalLead = v;
          finalKey = k;
          break;
        }
      }
    }

    if (!finalLead) {
      finalLead = {
        conversationId: resolvedConvId || finalKey,
        spaceId: (typeof parseCurrentUrl === 'function' ? parseCurrentUrl().spaceId : null) || '384258',
        name: activeName || lead.name || 'Lead',
        owner: 'mine',
        targetPlan: currentPlan,
        addedAt: new Date().toISOString()
      };
      freshWatched[finalKey] = finalLead;
    }

    finalLead.sale = {
      isSold: true,
      plan: currentPlan,
      isInstallment,
      amount,
      hfmId,
      invoiceUrl,
      telegramQrUrl,
      soldAt: (finalLead.sale && finalLead.sale.soldAt) ? finalLead.sale.soldAt : new Date().toISOString()
    };
    finalLead.processStage = 'Venta';
    finalLead.targetPlan = currentPlan;
    delete finalLead.followUpDate;
    delete finalLead.followUpNote;
    delete finalLead.followUpLabel;

    watchedLeads = freshWatched;
    await safeStorageSet({ watchedLeads: freshWatched });

    overlay.remove();
    updateWidgetUI();
    if (typeof updateChatListBadges === 'function') updateChatListBadges();
    safeSendMessage({ type: 'UPDATE_BADGE' });

    if (typeof showApartadoStatusToast === 'function') {
      showApartadoStatusToast(`👑 ¡Venta de ${currentPlan} guardada para ${finalLead.name || 'el lead'}!`, 3200);
    }

    try {
      setTimeout(() => {
        if (typeof learnCurrentActiveChat === 'function') learnCurrentActiveChat();
      }, 500);
    } catch (e) {}
  });

  overlay.querySelector('#modal-btn-revert')?.addEventListener('click', async () => {
    if (!confirm('¿Desmarcar esta venta y volver a dejar el lead como prospecto activo?')) return;

    let freshWatched = {};
    try {
      const storage = await chrome.storage.local.get(['watchedLeads']);
      freshWatched = storage.watchedLeads || {};
    } catch (e) {
      freshWatched = { ...watchedLeads };
    }

    let finalKey = targetKey;
    let finalLead = freshWatched[finalKey];
    if (!finalLead && resolvedConvId) {
      finalLead = freshWatched[resolvedConvId];
      if (finalLead) finalKey = resolvedConvId;
    }

    if (finalLead) {
      delete finalLead.sale;
      if (finalLead.processStage === 'Venta') {
        finalLead.processStage = 'Final';
      }
      watchedLeads = freshWatched;
      await safeStorageSet({ watchedLeads: freshWatched });
    }

    overlay.remove();
    updateWidgetUI();
    if (typeof updateChatListBadges === 'function') updateChatListBadges();
    safeSendMessage({ type: 'UPDATE_BADGE' });

    if (typeof showApartadoStatusToast === 'function') {
      showApartadoStatusToast('↩️ Venta desmarcada. Lead devuelto a prospecto.', 2500);
    }
  });
}

function showInPageToast({ contactName, messageSnippet, conversationId, spaceId, fullUrl }) {
  let container = document.getElementById('radar-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'radar-toast-container';
    container.className = 'radar-toast-container';
    document.body.appendChild(container);
  }

  const activeToasts = Array.from(container.querySelectorAll('.radar-inpage-toast:not(.toast-hiding)'));
  if (activeToasts.length >= 2) {
    const oldest = activeToasts[0];
    oldest.classList.add('toast-hiding');
    setTimeout(() => oldest.remove(), 250);
  }

  const existing = document.getElementById(`radar-toast-${conversationId}`);
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = `radar-toast-${conversationId}`;
  toast.className = 'radar-inpage-toast';

  const initials = (contactName || 'L')
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const iconMsg = window.RadarIcons?.render('messageSquare', 12, 'radar-icon-msg') || '💬';
  const iconArrow = window.RadarIcons?.render('arrowRight', 11, 'radar-icon-arrow') || '→';
  const iconBellOff = window.RadarIcons?.render('bellOff', 11, 'radar-icon-bell') || '🔕';
  const iconClose = window.RadarIcons?.render('x', 12, 'radar-icon-close') || '✕';

  const lead = watchedLeads[conversationId];
  const stage = lead?.processStage || '';

  toast.innerHTML = `
    <div class="radar-toast-avatar">${initials}</div>
    <div class="radar-toast-body">
      <div class="radar-toast-header">
        <div class="radar-toast-title-wrap">
          <span style="color: #38bdf8; display: inline-flex; align-items: center;">${iconMsg}</span>
          <span class="radar-toast-title">${escapeHtml(contactName)}</span>
          ${stage ? `<span class="radar-toast-stage-chip">${escapeHtml(stage)}</span>` : ''}
        </div>
        <span class="radar-toast-time">Ahora</span>
      </div>
      <div class="radar-toast-msg">${escapeHtml(messageSnippet || 'Nuevo mensaje recibido')}</div>
      <div class="radar-toast-actions">
        <button type="button" class="radar-toast-btn-open">
          <span>Responder</span> ${iconArrow}
        </button>
        <button type="button" class="radar-toast-btn-mute" title="Silenciar notificaciones de este lead">
          ${iconBellOff} <span>Silenciar</span>
        </button>
        <button type="button" class="radar-toast-close" title="Cerrar">${iconClose}</button>
      </div>
    </div>
  `;

  const goToChat = () => {
    toast.classList.add('toast-hiding');
    setTimeout(() => toast.remove(), 250);

    const targetPath = `/space/${spaceId}/inbox/${conversationId}`;
    if (window.location.pathname !== targetPath) {
      if (typeof performSmoothNavigation === 'function') {
        performSmoothNavigation(conversationId, targetPath);
      } else {
        const link = document.querySelector(`a[href*="/inbox/${conversationId}"]`);
        if (link) {
          link.click();
        } else {
          window.location.href = targetPath;
        }
      }
    }

    if (watchedLeads[conversationId]) {
      watchedLeads[conversationId].unreadCount = 0;
      safeStorageSet({ watchedLeads });
      safeSendMessage({ type: 'UPDATE_BADGE' });
    } else if (typeof phraseTrackedLeads !== 'undefined' && phraseTrackedLeads[conversationId]) {
      phraseTrackedLeads[conversationId].unreadCount = 0;
      safeStorageSet({ phraseTrackedLeads });
    }
  };

  toast.querySelector('.radar-toast-btn-open')?.addEventListener('click', (e) => {
    e.stopPropagation();
    goToChat();
  });

  toast.querySelector('.radar-toast-btn-mute')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (watchedLeads[conversationId]) {
      watchedLeads[conversationId].muted = true;
      await safeStorageSet({ watchedLeads });
    } else if (typeof phraseTrackedLeads !== 'undefined' && phraseTrackedLeads[conversationId]) {
      phraseTrackedLeads[conversationId].muted = true;
      await safeStorageSet({ phraseTrackedLeads });
    }
    toast.classList.add('toast-hiding');
    setTimeout(() => toast.remove(), 250);
    if (typeof showCrawlProgressToast === 'function') {
      showCrawlProgressToast(`🔕 Notificaciones silenciadas para ${contactName}`);
      setTimeout(hideCrawlProgressToast, 2500);
    }
  });

  toast.addEventListener('click', () => {
    goToChat();
  });

  toast.querySelector('.radar-toast-close')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toast.classList.add('toast-hiding');
    setTimeout(() => toast.remove(), 250);
  });

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add('toast-hiding');
      setTimeout(() => toast.remove(), 250);
    }
  }, 7000);
}

function showAutoAssignToast(leadName, assignee, plan) {
  let container = document.getElementById('radar-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'radar-toast-container';
    container.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      z-index: 999999;
      pointer-events: none;
    `;
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.style.cssText = `
    background: rgba(15, 23, 42, 0.95);
    border: 1px solid rgba(56, 189, 248, 0.6);
    color: #f8fafc;
    padding: 10px 16px;
    border-radius: 12px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    font-weight: 500;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5), 0 0 15px rgba(56, 189, 248, 0.25);
    display: flex;
    align-items: center;
    gap: 10px;
    backdrop-filter: blur(8px);
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    transform: translateY(20px);
    opacity: 0;
    pointer-events: auto;
  `;

  const displayAssignee = (assignee === 'mine' || !assignee) ? 'Dey (Mí)' : assignee === 'pending' ? 'Por Asignar' : assignee;

  const iconZap = window.RadarIcons?.render('zap', 18, 'radar-autoassign-icon-svg') || '⚡';

  toast.innerHTML = `
    <span style="display: inline-flex; align-items: center; justify-content: center; color: #38bdf8; flex-shrink: 0; filter: drop-shadow(0 0 6px rgba(56, 189, 248, 0.5));">${iconZap}</span>
    <div>
      <div style="font-weight: 700; color: #38bdf8;">Auto-Asignado a ${escapeHtml(displayAssignee)}</div>
      <div style="color: #cbd5e1; font-size: 12px;">${escapeHtml(leadName)} · <span style="color: #fbbf24;">${escapeHtml(plan)}</span></div>
    </div>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

function showApartadoStatusToast(msg, duration = 2500) {
  let container = document.getElementById('radar-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'radar-toast-container';
    container.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      z-index: 999999;
      pointer-events: none;
    `;
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.style.cssText = `
    background: rgba(15, 23, 42, 0.95);
    border: 1px solid rgba(56, 189, 248, 0.6);
    color: #f8fafc;
    padding: 8px 14px;
    border-radius: 10px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 12px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    gap: 8px;
    backdrop-filter: blur(8px);
    transition: all 0.3s ease;
    transform: translateY(15px);
    opacity: 0;
  `;
  toast.innerText = msg;
  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function showApartadoSuccessToast(leadName, captionText) {
  if (typeof showCrawlProgressToast === 'function') {
    showCrawlProgressToast(`⭐ ${leadName || 'Lead'} apartado correctamente.`);
    setTimeout(hideCrawlProgressToast, 2500);
  }
}

async function handleApartarLeadLocal(plan = 'Starter') {
  const { spaceId, conversationId } = parseCurrentUrl();
  if (!conversationId) {
    if (typeof showCrawlProgressToast === 'function') {
      showCrawlProgressToast('⚠️ Abre una conversación en Respond.io antes de apartar.');
      setTimeout(hideCrawlProgressToast, 3000);
    }
    return;
  }
  const contactName = getActiveContactName();
  await watchCurrentLead(spaceId, conversationId, { targetPlan: plan, owner: 'mine' });
  isMenuOpen = false;
  isFollowPopoverOpen = false;
  updateWidgetUI();
  if (typeof showCrawlProgressToast === 'function') {
    showCrawlProgressToast(`⭐ ${contactName || 'Lead'} apartado en ${plan} (Seguimiento activo)`);
    setTimeout(hideCrawlProgressToast, 2500);
  }
}

const handleApartarLeadWithScreenshot = handleApartarLeadLocal;

function showDomScanModal(report) {
  const existing = document.getElementById('radar-dom-scan-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'radar-dom-scan-modal';
  overlay.className = 'radar-scan-modal-overlay';

  const hasSalesAgent = report.salesAgent && report.salesAgent.found;
  const salesAgentHtml = hasSalesAgent
    ? report.salesAgent.items.map(item => `
        <div class="radar-scan-code-block" style="margin-bottom: 6px;">
          <strong>&lt;${escapeHtml(item.tag)}&gt;</strong> "${escapeHtml(item.text)}"
          <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">
            Selector: <code>${escapeHtml(item.selector)}</code>
            ${item.dataPw ? ` · data-pw: <code>${escapeHtml(item.dataPw)}</code>` : ''}
            · Visible: ${item.visible ? '🟢 Sí' : '⚪ No'}
          </div>
        </div>
      `).join('')
    : '<div style="color: #94a3b8; font-size: 12px;">No se detectaron elementos explícitos de "Sales Agent" o IA en la vista actual.</div>';

  const iconSearch = window.RadarIcons?.render('search', 15) || '';
  const iconClose = window.RadarIcons?.render('x', 14) || '';
  const iconBot = window.RadarIcons?.render('bot', 13) || '';
  const iconEdit = window.RadarIcons?.render('edit', 13) || '';
  const iconSend = window.RadarIcons?.render('send', 13) || '';
  const iconUser = window.RadarIcons?.render('user', 13) || '';
  const iconFile = window.RadarIcons?.render('fileText', 13) || '';
  const iconMsg = window.RadarIcons?.render('messageSquare', 13) || '';
  const iconCopy = window.RadarIcons?.render('copy', 13) || '';
  const iconClock = window.RadarIcons?.render('clock', 13) || '';
  const iconCheck = window.RadarIcons?.render('check', 13) || '';

  overlay.innerHTML = `
    <div class="radar-scan-modal-box">
      <div class="radar-scan-modal-header">
        <h3 class="radar-scan-modal-title">
          ${iconSearch} <span>RespondRadar · Inspector Estructural</span>
        </h3>
        <button class="radar-scan-modal-close" id="scan-modal-close-btn" title="Cerrar">${iconClose}</button>
      </div>

      <div class="radar-scan-modal-body">
        <div class="radar-scan-card ${hasSalesAgent ? 'highlight' : ''}">
          <div class="radar-scan-card-header">
            <span class="radar-scan-card-title">${iconBot} Detección de "Sales Agent" & IA</span>
            <span class="radar-scan-badge ${hasSalesAgent ? 'warning' : 'success'}">
              ${hasSalesAgent ? `⚠️ ${report.salesAgent.count} detectado(s)` : 'Ninguno en pantalla'}
            </span>
          </div>
          ${salesAgentHtml}
        </div>

        <div class="radar-scan-card">
          <div class="radar-scan-card-header">
            <span class="radar-scan-card-title">${iconEdit} Editor de Mensajes (Composer)</span>
            <span class="radar-scan-badge ${report.composer?.found ? 'success' : 'danger'}">
              ${report.composer?.found ? `Detectado (${report.composer.tag})` : 'No encontrado'}
            </span>
          </div>
          ${report.composer?.found ? `
            <div class="radar-scan-code-block">
              Selector: <code>${escapeHtml(report.composer.selector)}</code><br>
              Tipo: ${report.composer.isContentEditable ? 'contenteditable (Rich Text)' : report.composer.tag}
              ${report.composer.placeholder ? ` · Placeholder: "${escapeHtml(report.composer.placeholder)}"` : ''}
            </div>
          ` : '<div style="color: #f87171; font-size: 12px;">Abre un chat activo para visualizar la caja de texto.</div>'}
        </div>

        <div class="radar-scan-card">
          <div class="radar-scan-card-header">
            <span class="radar-scan-card-title">${iconSend} Botón de Enviar</span>
            <span class="radar-scan-badge ${report.sendButton?.found ? 'success' : 'danger'}">
              ${report.sendButton?.found ? 'Detectado' : 'No encontrado'}
            </span>
          </div>
          ${report.sendButton?.found ? `
            <div class="radar-scan-code-block">
              Selector: <code>${escapeHtml(report.sendButton.selector)}</code><br>
              Estado: ${report.sendButton.disabled ? 'Deshabilitado (Caja vacía)' : 'Habilitado'}
              ${report.sendButton.ariaLabel ? ` · aria-label: "${escapeHtml(report.sendButton.ariaLabel)}"` : ''}
            </div>
          ` : '<div style="color: #f87171; font-size: 12px;">No se identificó el botón de envío en pantalla.</div>'}
        </div>

        <div class="radar-scan-card">
          <div class="radar-scan-card-header">
            <span class="radar-scan-card-title">${iconUser} Contacto & Asignatario</span>
            <span class="radar-scan-badge success">
              ${escapeHtml(report.header?.contactName || 'Sin contacto activo')}
            </span>
          </div>
          <div class="radar-scan-code-block">
            Asignado a: <strong>${escapeHtml(report.header?.assigneeDetected || 'No detectado')}</strong><br>
            Teléfono: ${escapeHtml(report.contactPanel?.phone || 'No detectado')}${report.contactPanel?.countryCode ? ` (Prefijo +${escapeHtml(report.contactPanel.countryCode)})` : ''}<br>
            Canal: ${escapeHtml(report.header?.channelDetected || 'No detectado')}<br>
            Tags: ${report.contactPanel?.tags?.length ? report.contactPanel.tags.join(', ') : 'Sin tags visibles'}
          </div>
        </div>

        <div class="radar-scan-card">
          <div class="radar-scan-card-header">
            <span class="radar-scan-card-title">${iconFile} Panel de Datos (Custom Fields)</span>
            <span class="radar-scan-badge ${report.contactPanel?.fields?.length ? 'success' : 'warning'}">
              ${report.contactPanel?.fields?.length ? `${report.contactPanel.fields.length} campos` : 'Sin campos detectados'}
            </span>
          </div>
          <div class="radar-scan-code-block">
            ${report.contactPanel?.fields?.length ? report.contactPanel.fields.slice(0, 8).map(f => `• ${escapeHtml(f)}`).join('<br>') : 'Abre el panel derecho de detalles para listar los campos personalizados.'}
          </div>
        </div>

        <div class="radar-scan-card">
          <div class="radar-scan-card-header">
            <span class="radar-scan-card-title">${iconMsg} Historial de Chat</span>
            <span class="radar-scan-badge ${report.messagesList?.visibleMessageCount ? 'success' : 'warning'}">
              ${report.messagesList?.visibleMessageCount || 0} burbujas visibles
            </span>
          </div>
          <div class="radar-scan-code-block">
            ${report.messagesList?.lastMessage ? `
              Último mensaje: <strong>${escapeHtml(report.messagesList.lastMessage.direction)}</strong><br>
              Texto: "${escapeHtml(report.messagesList.lastMessage.textSnippet)}"<br>
              Selector: <code>${escapeHtml(report.messagesList.lastMessage.selector)}</code>
            ` : 'No hay mensajes en pantalla.'}
          </div>
        </div>
      </div>

      <div class="radar-scan-modal-footer">
        <button type="button" class="radar-scan-btn-copy" id="btn-copy-scan-json">
          ${iconCopy} <span>Copiar Reporte JSON</span>
        </button>
        <button type="button" class="radar-scan-btn-copy" id="btn-crawl-inbox-modal" title="Hacer auto-scroll para cargar chats de 3 días atrás y encontrar el último sin responder">
          ${iconClock} <span>Rastrear 3 Días</span>
        </button>
        <button type="button" class="radar-modal-btn-save" id="btn-close-scan-modal" style="padding: 6px 14px; font-size: 12px;">
          ${iconCheck} <span>Listo</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#scan-modal-close-btn').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#btn-close-scan-modal').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#btn-crawl-inbox-modal')?.addEventListener('click', () => {
    overlay.remove();
    if (typeof crawlInboxHistory === 'function') crawlInboxHistory(3);
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  overlay.querySelector('#btn-copy-scan-json').addEventListener('click', () => {
    const jsonStr = JSON.stringify(report, null, 2);
    navigator.clipboard.writeText(jsonStr).then(() => {
      const btn = overlay.querySelector('#btn-copy-scan-json');
      btn.innerText = '✅ ¡JSON Copiado!';
      setTimeout(() => {
        btn.innerText = '📋 Copiar Reporte JSON';
      }, 2000);
    }).catch(err => {
      alert('Error al copiar JSON: ' + err.message);
    });
  });
}
