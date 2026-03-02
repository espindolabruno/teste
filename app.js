async function init() {
    // UI Elements
    const currentStepContainer = document.getElementById('currentStep');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const progressBar = document.getElementById('progressBar');
    const progressBarContainer = document.getElementById('progressBarContainer');
    const dots = document.querySelectorAll('.step-dot');
    const toggleClientsBtn = document.getElementById('toggleClients');
    const savedClientsList = document.getElementById('savedClientsList');
    const wizardNav = document.getElementById('wizardNav');

    // App State
    let database = null;
    let currentStepIndex = 0;
    const TOTAL_STEPS = 6; // 0: Start, 1: Config, 2-5: Campaigns, 6: Dashboard
    let clientData = {
        name: '',
        budget: 0,
        campaignSettings: {}, // { id: { active: true, percentage: X } }
        selections: {
            reconhecimento: { audiences: [], creatives: [] },
            oferta: { audiences: [], creatives: [] },
            remarketing: { audiences: [], creatives: [] },
            prova_social: { audiences: [], creatives: [] }
        }
    };
    let savedClients = JSON.parse(localStorage.getItem('agro_campaigns') || '[]');

    // Loading Database
    try {
        const response = await fetch('database.json');
        database = await response.json();

        // Initialize default settings from database
        database.categories.forEach(cat => {
            clientData.campaignSettings[cat.id] = {
                active: true,
                percentage: cat.percentage
            };
        });

        renderStep();
        renderSavedClients();
    } catch (error) {
        console.error('Erro ao carregar banco de dados:', error);
    }

    // Global Enter Key Listener
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            if (currentStepIndex < TOTAL_STEPS) nextBtn.click();
        }
    });

    // Navigation Events
    nextBtn.addEventListener('click', () => {
        if (currentStepIndex === 0 && !validateStep0()) return;
        if (currentStepIndex === 1 && !validateStep1()) return;

        if (currentStepIndex < TOTAL_STEPS) {
            currentStepIndex++;
            // Skip inactive campaigns
            while (currentStepIndex >= 2 && currentStepIndex <= 5) {
                const cat = database.categories[currentStepIndex - 2];
                if (clientData.campaignSettings[cat.id].active) break;
                currentStepIndex++;
            }
            renderStep();
        } else {
            saveClient();
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentStepIndex > 0) {
            currentStepIndex--;
            // Skip inactive campaigns
            while (currentStepIndex >= 2 && currentStepIndex <= 5) {
                const cat = database.categories[currentStepIndex - 2];
                if (clientData.campaignSettings[cat.id].active) break;
                currentStepIndex--;
            }
            renderStep();
        }
    });

    toggleClientsBtn.addEventListener('click', () => {
        savedClientsList.classList.toggle('hidden');
    });

    // Step Rendering Logic
    function renderStep() {
        updateProgress();
        currentStepContainer.classList.remove('active');

        setTimeout(() => {
            currentStepContainer.innerHTML = '';

            if (currentStepIndex === 0) {
                document.body.classList.remove('dashboard-mode');
                renderStep0();
                progressBarContainer.classList.remove('hidden');
                wizardNav.classList.remove('hidden');
            } else if (currentStepIndex === 1) {
                renderStep1();
                progressBarContainer.classList.remove('hidden');
                wizardNav.classList.remove('hidden');
            } else if (currentStepIndex >= 2 && currentStepIndex <= 5) {
                renderCampaignStep();
                progressBarContainer.classList.remove('hidden');
                wizardNav.classList.remove('hidden');
            } else if (currentStepIndex === 6) {
                document.body.classList.add('dashboard-mode');
                renderDashboard();
                progressBarContainer.classList.add('hidden');
                wizardNav.classList.add('hidden');
            }

            currentStepContainer.classList.add('active');
            updateNavButtons();
        }, 100);
    }

    function updateProgress() {
        const progress = (currentStepIndex / TOTAL_STEPS) * 100;
        progressBar.style.setProperty('--progress', `${progress}%`);
        dots.forEach((dot, idx) => {
            dot.classList.toggle('active', idx === currentStepIndex);
            dot.classList.toggle('completed', idx < currentStepIndex);
        });
    }

    function updateNavButtons() {
        prevBtn.disabled = currentStepIndex === 0;
        nextBtn.innerText = currentStepIndex === 6 ? 'Salvar Estratégia' : 'Próximo';
    }

    // Step 0: Budget & Name
    function renderStep0() {
        currentStepContainer.innerHTML = `
            <div class="step-card">
                <h2 class="step-title">Vamos começar?</h2>
                <p class="step-desc">Insira o nome do cliente e a verba mensal para distribuir.</p>
                <div class="input-group">
                    <label>Nome do Cliente</label>
                    <input type="text" id="inputClientName" value="${clientData.name}" placeholder="Ex: Sítio Bruno">
                </div>
                <div class="input-group">
                    <label>Orçamento Mensal (R$)</label>
                    <input type="number" id="inputBudget" value="${clientData.budget || ''}" placeholder="Ex: 12000">
                </div>
                <button class="recommended-btn" onclick="window.recommendStrategy()">✨ Gerar Estratégia Recomendada</button>
            </div>
        `;

        const nameInp = document.getElementById('inputClientName');
        const budgetInp = document.getElementById('inputBudget');
        nameInp.addEventListener('input', (e) => clientData.name = e.target.value);
        budgetInp.addEventListener('input', (e) => clientData.budget = parseFloat(e.target.value) || 0);
    }

    // Step 1: Campaign Configuration
    function renderStep1() {
        const totalPerc = calculateTotalPerc();

        currentStepContainer.innerHTML = `
            <div class="step-card">
                <h2 class="step-title">Configuração das Campanhas</h2>
                <p class="step-desc">Selecione quais campanhas farão parte da estratégia e ajuste as porcentagens de verba.</p>
                
                <div class="campaign-config-list">
                    ${database.categories.map(cat => {
            const setting = clientData.campaignSettings[cat.id];
            return `
                            <div class="config-row ${setting.active ? '' : 'inactive'}" id="row-${cat.id}">
                                <div class="config-info">
                                    <input type="checkbox" id="check-${cat.id}" ${setting.active ? 'checked' : ''} 
                                        onchange="window.updateCampaignActive('${cat.id}', this.checked)">
                                    <label for="check-${cat.id}">${cat.name}</label>
                                </div>
                                <div class="config-input-group">
                                    <div class="config-slider">
                                        <input type="range" id="slider-${cat.id}" min="0" max="100" step="5" value="${setting.percentage}" ${setting.active ? '' : 'disabled'}
                                            oninput="window.updateCampaignPerc('${cat.id}', this.value, 'slider')">
                                    </div>
                                    <div class="config-value">
                                        <input type="number" id="num-${cat.id}" value="${setting.percentage}" ${setting.active ? '' : 'disabled'}
                                            oninput="window.updateCampaignPerc('${cat.id}', this.value, 'num')">
                                        <span>%</span>
                                    </div>
                                </div>
                            </div>
                        `;
        }).join('')}
                </div>

                <div id="totalIndicator" class="total-indicator ${totalPerc !== 100 ? 'error' : 'success'}">
                    <span>Total Distribuído: <strong id="totalPercValue">${totalPerc}%</strong></span>
                    <p id="totalErrorMessage" class="error-msg ${totalPerc !== 100 ? '' : 'hidden'}">A soma das porcentagens deve ser exatamente 100%.</p>
                </div>
            </div>
        `;
    }

    function calculateTotalPerc() {
        return Object.values(clientData.campaignSettings)
            .filter(s => s.active)
            .reduce((acc, s) => acc + s.percentage, 0);
    }

    window.updateCampaignActive = (id, active) => {
        clientData.campaignSettings[id].active = active;

        // Surgical DOM update for activation
        const row = document.getElementById(`row-${id}`);
        const slider = document.getElementById(`slider-${id}`);
        const num = document.getElementById(`num-${id}`);

        row.classList.toggle('inactive', !active);
        slider.disabled = !active;
        num.disabled = !active;

        updateTotalDisplay();
    };

    window.updateCampaignPerc = (id, val, source) => {
        const perc = parseFloat(val) || 0;
        clientData.campaignSettings[id].percentage = perc;

        // Sync the other input
        if (source === 'slider') {
            document.getElementById(`num-${id}`).value = perc;
        } else {
            document.getElementById(`slider-${id}`).value = perc;
        }

        updateTotalDisplay();
    };

    function updateTotalDisplay() {
        const totalPerc = calculateTotalPerc();
        const indicator = document.getElementById('totalIndicator');
        const valueDisplay = document.getElementById('totalPercValue');
        const errorMsg = document.getElementById('totalErrorMessage');

        if (!indicator) return;

        valueDisplay.innerText = `${totalPerc}%`;

        if (totalPerc !== 100) {
            indicator.className = 'total-indicator error';
            errorMsg.classList.remove('hidden');
        } else {
            indicator.className = 'total-indicator success';
            errorMsg.classList.add('hidden');
        }
    }

    function validateStep1() {
        const totalPerc = calculateTotalPerc();

        if (totalPerc !== 100) {
            alert('A soma das porcentagens das campanhas ativas deve ser 100%. Atualmente é ' + totalPerc + '%.');
            return false;
        }

        const activeCount = Object.values(clientData.campaignSettings).filter(s => s.active).length;
        if (activeCount === 0) {
            alert('Selecione pelo menos uma campanha.');
            return false;
        }

        return true;
    }

    window.recommendStrategy = () => {
        const nameInp = document.getElementById('inputClientName');
        const budgetInp = document.getElementById('inputBudget');
        if (!nameInp.value || !budgetInp.value || parseFloat(budgetInp.value) <= 0) {
            alert('Por favor, preencha o nome e um orçamento válido.');
            return;
        }
        clientData.name = nameInp.value;
        clientData.budget = parseFloat(budgetInp.value);

        // Reset to defaults from database in case user messed up
        database.categories.forEach(cat => {
            clientData.campaignSettings[cat.id] = {
                active: true,
                percentage: cat.percentage
            };
            clientData.selections[cat.id].audiences = cat.audiences.map(a => a.id);
            clientData.selections[cat.id].creatives = cat.creatives.map(c => c.id);
        });

        currentStepIndex = 6;
        renderStep();
    };

    function validateStep0() {
        if (!clientData.name || clientData.budget <= 0) {
            alert('Por favor, preencha o nome e um orçamento válido.');
            return false;
        }
        return true;
    }

    function renderCampaignStep() {
        const cat = database.categories[currentStepIndex - 2];
        const setting = clientData.campaignSettings[cat.id];
        const amount = (clientData.budget * (setting.percentage / 100)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        currentStepContainer.innerHTML = `
            <div class="step-card">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                    <div>
                        <h2 class="step-title">${cat.name}</h2>
                        <span class="perc-badge">${setting.percentage}% da verba</span>
                    </div>
                    <span class="acc-badge" style="font-size:1rem; padding: 0.5rem 1rem;">Verba: ${amount}</span>
                </div>
                <p class="step-desc">Selecione os públicos e criativos ideais para esta etapa.</p>
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                    <div>
                        <h4 style="margin-bottom:1rem; color:#8898AA; font-size:0.75rem; text-transform:uppercase;">Públicos</h4>
                        <ul class="info-list">
                            ${cat.audiences.map(aud => {
            const isSelected = clientData.selections[cat.id].audiences.includes(aud.id);
            return `
                                    <li class="${isSelected ? 'selected' : ''}" onclick="window.toggleSelection(this, '${cat.id}', 'audiences', '${aud.id}')">
                                        <div class="item-checkbox"></div>
                                        <span>${aud.name}</span>
                                    </li>
                                `;
        }).join('')}
                        </ul>
                    </div>
                    <div>
                        <h4 style="margin-bottom:1rem; color:#8898AA; font-size:0.75rem; text-transform:uppercase;">Criativos</h4>
                        <ul class="info-list">
                            ${cat.creatives.map(cre => {
            const isSelected = clientData.selections[cat.id].creatives.includes(cre.id);
            return `
                                    <li class="${isSelected ? 'selected' : ''}" onclick="window.toggleSelection(this, '${cat.id}', 'creatives', '${cre.id}')">
                                        <div class="item-checkbox"></div>
                                        <span>${cre.name}</span>
                                        <a href="${cre.url}" target="_blank" class="creative-link" onclick="event.stopPropagation()">Ver</a>
                                    </li>
                                `;
        }).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }

    window.toggleSelection = (el, catId, type, itemId) => {
        const list = clientData.selections[catId][type];
        const idx = list.indexOf(itemId);
        if (idx > -1) { list.splice(idx, 1); el.classList.remove('selected'); }
        else { list.push(itemId); el.classList.add('selected'); }
    };

    // --- Dashboard View ---
    function renderDashboard() {
        const totalBudgetStr = clientData.budget.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        currentStepContainer.innerHTML = `
            <div class="dashboard-view">
                <header class="dashboard-header">
                    <div class="header-metadata">
                        <div class="meta-item">
                            <span class="meta-label">Método</span>
                            <span class="meta-value">Connect</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Cliente</span>
                            <span class="meta-value">${clientData.name}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Objetivo</span>
                            <span class="meta-value">Geração de Leads</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Período</span>
                            <span class="meta-value">30 Dias</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Verba Total</span>
                            <span class="meta-value">${totalBudgetStr}</span>
                        </div>
                    </div>
                    <div class="header-actions">
                        <button class="action-btn" onclick="window.print()">Exportar PDF</button>
                        <button class="action-btn" onclick="window.goEdit()">Editar Estratégia</button>
                        <button class="action-btn primary" onclick="window.saveStrategy()">Salvar Estratégia</button>
                    </div>
                </header>

                <main class="dashboard-grid">
                    <section class="dist-section">
                        <h3 class="dist-section-title">Distribuição de Verba</h3>
                        <div class="dist-list">
                            ${database.categories
                .filter(cat => clientData.campaignSettings[cat.id].active)
                .map(cat => renderDistCard(cat)).join('')}
                            <div class="dist-card total-card">
                                <span class="dist-name">TOTAL</span>
                                <div class="dist-bar-cont">
                                    <div class="dist-bar-fill" style="width: 100%;"></div>
                                </div>
                                <div class="dist-val-group">
                                    <span class="dist-val">${totalBudgetStr}</span>
                                    <span class="dist-perc">100%</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <aside class="funnel-container">
                        <h3 class="dist-section-title">Funil de Vendas</h3>
                        <div class="funnel-card">
                            <div class="funnel-visual">
                                ${database.categories
                .filter(cat => clientData.campaignSettings[cat.id].active)
                .map(cat => `<div class="funnel-step">${cat.id.toUpperCase().replace('_', ' ')}</div>`).join('')}
                                <div class="funnel-step">CONVERSÃO</div>
                            </div>
                        </div>
                    </aside>

                    <section class="accordion-cont">
                        <h3 class="dist-section-title">Detalhamento por Etapa</h3>
                        <div class="accordion-list">
                            ${database.categories
                .filter(cat => clientData.campaignSettings[cat.id].active)
                .map((cat, i) => renderAccordion(cat, i)).join('')}
                        </div>
                    </section>

                    <section class="flow-section">
                        <h3 class="dist-section-title">Mapa de Fluxo de Público</h3>
                        <div class="flow-card">
                            <div class="flow-node">
                                <div class="flow-icon">🎯</div>
                                <span class="flow-label">Interesses</span>
                            </div>
                            <span class="flow-arrow">→</span>
                            <div class="flow-node">
                                <div class="flow-icon">📱</div>
                                <span class="flow-label">Engajamento</span>
                            </div>
                            <span class="flow-arrow">→</span>
                            <div class="flow-node">
                                <div class="flow-icon">🌐</div>
                                <span class="flow-label">Site</span>
                            </div>
                            <span class="flow-arrow">→</span>
                            <div class="flow-node">
                                <div class="flow-icon">🔄</div>
                                <span class="flow-label">Remarketing</span>
                            </div>
                            <span class="flow-arrow">→</span>
                            <div class="flow-node">
                                <div class="flow-icon">💰</div>
                                <span class="flow-label">Conversão</span>
                            </div>
                        </div>
                    </section>

                </main>
            </div>
        `;
    }

    function renderDistCard(cat) {
        const setting = clientData.campaignSettings[cat.id];
        const val = (clientData.budget * (setting.percentage / 100)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        return `
            <div class="dist-card">
                <span class="dist-name">${cat.name}</span>
                <div class="dist-bar-cont">
                    <div class="dist-bar-fill" style="width: ${setting.percentage}%"></div>
                </div>
                <div class="dist-val-group">
                    <span class="dist-val">${val}</span>
                    <span class="dist-perc">${setting.percentage}%</span>
                </div>
            </div>
        `;
    }

    function renderAccordion(cat, i) {
        const setting = clientData.campaignSettings[cat.id];
        const subData = {
            reconhecimento: { obj: 'Alcance e Engajamento', meta: '45.000 pessoas alcançadas' },
            oferta: { obj: 'Conversão', meta: '2.500 cliques' },
            remarketing: { obj: 'Conversão', meta: '70 leads' },
            prova_social: { obj: 'Autoridade e reforço', meta: 'Visualização completa' }
        };
        const auds = cat.audiences.filter(a => clientData.selections[cat.id].audiences.includes(a.id)).map(a => a.name).join(', ') || 'Padronizado';
        const selectedCreatives = cat.creatives.filter(c => clientData.selections[cat.id].creatives.includes(c.id));
        const cresHtml = selectedCreatives.map(c => `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem; background:#F8F9FA; padding:0.4rem; border-radius:6px;">
                <span style="font-size:0.8rem;">${c.name}</span>
                <button onclick="window.openVideo('${c.url}')" class="creative-link" style="border:none; cursor:pointer;">▶ Player</button>
            </div>
        `).join('') || '<p style="font-size:0.8rem; color:#A0AEC0;">Nenhum selecionado</p>';

        return `
            <div class="acc-item" id="acc-${cat.id}">
                <div class="acc-header" onclick="window.toggleAcc('${cat.id}')">
                    <div class="acc-title">
                        <span class="acc-badge">${setting.percentage}%</span>
                        <span class="acc-label">${cat.name}</span>
                    </div>
                    <span class="flow-arrow">⌄</span>
                </div>
                <div class="acc-content">
                    <div class="acc-inner">
                        <div class="acc-block">
                            <h5>Objetivo</h5>
                            <p>${subData[cat.id]?.obj || 'Geral'}</p>
                        </div>
                        <div class="acc-block">
                            <h5>Públicos</h5>
                            <p>${auds}</p>
                        </div>
                        <div class="acc-block">
                            <h5>Criativos</h5>
                            <div class="acc-creatives-list">
                                ${cresHtml}
                            </div>
                        </div>
                        <div class="acc-block">
                            <h5>Meta Estimada</h5>
                            <p>${subData[cat.id]?.meta || '-'}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    window.toggleAcc = (id) => {
        const el = document.getElementById(`acc-${id}`);
        el.classList.toggle('open');
    };

    window.goEdit = () => { currentStepIndex = 0; renderStep(); };
    window.saveStrategy = saveClient;

    // Video Modal Control
    window.openVideo = (url) => {
        const modal = document.getElementById('videoModal');
        const player = document.getElementById('videoPlayer');

        let embedUrl = url;

        // YouTube Conversion
        if (url.includes('youtube.com/watch?v=')) {
            embedUrl = url.replace('watch?v=', 'embed/') + '?autoplay=1';
        } else if (url.includes('youtu.be/')) {
            embedUrl = url.replace('youtu.be/', 'youtube.com/embed/') + '?autoplay=1';
        }

        // Google Drive Conversion
        // Drive URL: https://drive.google.com/file/d/ID/view?usp=sharing
        // Embed URL: https://drive.google.com/file/d/ID/preview
        if (url.includes('drive.google.com/file/d/')) {
            const fileIdMatch = url.match(/\/d\/([^/]+)/);
            if (fileIdMatch && fileIdMatch[1]) {
                embedUrl = `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
            }
        }

        player.src = embedUrl;
        modal.style.display = 'flex';
    };

    window.closeVideo = () => {
        const modal = document.getElementById('videoModal');
        const player = document.getElementById('videoPlayer');
        modal.style.display = 'none';
        player.src = '';
    };

    // Persistence
    function saveClient() {
        const newClient = JSON.parse(JSON.stringify(clientData));
        newClient.id = Date.now();
        savedClients.push(newClient);
        localStorage.setItem('agro_campaigns', JSON.stringify(savedClients));
        renderSavedClients();
        alert('Estratégia salva com sucesso!');
    }

    function renderSavedClients() {
        savedClientsList.innerHTML = savedClients.map(client => `
            <div class="client-chip" onclick="window.loadClient(${client.id})">
                <span>${client.name}</span>
                <span class="delete-client" onclick="event.stopPropagation(); window.deleteSavedClient(${client.id})">&times;</span>
            </div>
        `).join('') || '<p style="color:#999; margin:auto;">Nenhuma simulação salva.</p>';
    }

    window.loadClient = (id) => {
        const client = savedClients.find(c => c.id === id);
        if (client) {
            clientData = JSON.parse(JSON.stringify(client));
            currentStepIndex = 5;
            renderStep();
            savedClientsList.classList.add('hidden');
        }
    };

    window.deleteSavedClient = (id) => {
        if (!confirm('Excluir esta simulação?')) return;
        savedClients = savedClients.filter(c => c.id !== id);
        localStorage.setItem('agro_campaigns', JSON.stringify(savedClients));
        renderSavedClients();
    };
}

document.addEventListener('DOMContentLoaded', init);
