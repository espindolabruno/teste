async function init() {
    // UI Elements
    const currentStepContainer = document.getElementById('currentStep');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const progressBar = document.getElementById('progressBar');
    const dots = document.querySelectorAll('.step-dot');
    const toggleClientsBtn = document.getElementById('toggleClients');
    const savedClientsList = document.getElementById('savedClientsList');
    const wizardHeader = document.querySelector('.wizard-header');
    const wizardNav = document.getElementById('wizardNav');

    // App State
    let database = null;
    let currentStepIndex = 0;
    let clientData = {
        name: '',
        budget: 0,
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
        renderStep();
        renderSavedClients();
    } catch (error) {
        console.error('Erro ao carregar banco de dados:', error);
    }

    // Global Enter Key Listener
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && currentStepIndex < 5) {
            nextBtn.click();
        }
    });

    // Navigation Events
    nextBtn.addEventListener('click', () => {
        if (currentStepIndex === 0 && !validateStep0()) return;

        if (currentStepIndex < 5) {
            currentStepIndex++;
            renderStep();
        } else {
            saveClient();
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentStepIndex > 0) {
            currentStepIndex--;
            renderStep();
        }
    });

    toggleClientsBtn.addEventListener('click', () => {
        savedClientsList.classList.toggle('hidden');
    });

    // Step Rendering Logic
    function renderStep() {
        updateProgress();
        document.body.classList.toggle('dashboard-mode', currentStepIndex === 5);
        if (currentStepIndex === 5) {
            wizardHeader.style.display = 'none';
            wizardNav.style.display = 'none';
        } else {
            wizardHeader.style.display = 'flex';
            wizardNav.style.display = 'flex';
        }

        currentStepContainer.classList.remove('active');

        setTimeout(() => {
            currentStepContainer.innerHTML = '';

            if (currentStepIndex === 0) renderStep0();
            else if (currentStepIndex >= 1 && currentStepIndex <= 4) renderCampaignStep();
            else if (currentStepIndex === 5) renderDashboard();

            currentStepContainer.classList.add('active');
            updateNavButtons();
        }, 100);
    }

    function updateProgress() {
        const progress = (currentStepIndex / 5) * 100;
        progressBar.style.setProperty('--progress', `${progress}%`);

        dots.forEach((dot, idx) => {
            dot.classList.toggle('active', idx === currentStepIndex);
            dot.classList.toggle('completed', idx < currentStepIndex);
        });
    }

    function updateNavButtons() {
        prevBtn.disabled = currentStepIndex === 0;
        nextBtn.innerText = currentStepIndex === 5 ? 'Salvar Estratégia' : 'Próximo';
    }

    // Step 0: Budget & Name
    function renderStep0() {
        currentStepContainer.innerHTML = `
            <div class="step-card">
                <h2 class="step-title">Vamos começar?</h2>
                <p class="step-desc">Insira o nome do cliente e a verba mensal para distribuir.</p>
                <div class="input-group" style="margin-bottom: 1.5rem;">
                    <label>Nome do Cliente</label>
                    <input type="text" id="inputClientName" value="${clientData.name}" placeholder="Ex: Sítio Bruno">
                </div>
                <div class="input-group">
                    <label>Orçamento Mensal (R$)</label>
                    <input type="number" id="inputBudget" value="${clientData.budget || ''}" placeholder="Ex: 5000">
                </div>
                <button class="recommended-btn" onclick="window.recommendStrategy()">✨ Gerar Estratégia Recomendada</button>
            </div>
        `;

        const nameInp = document.getElementById('inputClientName');
        const budgetInp = document.getElementById('inputBudget');

        nameInp.addEventListener('input', (e) => clientData.name = e.target.value);
        budgetInp.addEventListener('input', (e) => clientData.budget = parseFloat(e.target.value) || 0);
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

        database.categories.forEach(cat => {
            clientData.selections[cat.id].audiences = cat.audiences.map(a => a.id);
            clientData.selections[cat.id].creatives = cat.creatives.map(c => c.id);
        });

        currentStepIndex = 5;
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
        const categoryIndex = currentStepIndex - 1;
        const cat = database.categories[categoryIndex];
        const amount = (clientData.budget * (cat.percentage / 100)).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });

        currentStepContainer.innerHTML = `
            <div class="step-card">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h2 class="step-title">${cat.name}</h2>
                    <span class="branch-tag" style="font-size:1rem; padding: 0.5rem 1rem;">Verba: ${amount}</span>
                </div>
                <p class="step-desc">${cat.percentage}% do orçamento. Selecione os públicos e criativos ideais.</p>
                <div class="content-grid">
                    <div class="info-group">
                        <h3>Públicos</h3>
                        <ul class="info-list">
                            ${cat.audiences.map(aud => {
            const isSelected = clientData.selections[cat.id].audiences.includes(aud.id);
            return `<li class="${isSelected ? 'selected' : ''}" onclick="window.toggleSelection(this, '${cat.id}', 'audiences', '${aud.id}')">
                                    <div class="item-main"><div class="item-checkbox"></div><span>${aud.name}</span></div>
                                </li>`;
        }).join('')}
                        </ul>
                    </div>
                    <div class="info-group">
                        <h3>Criativos</h3>
                        <ul class="info-list">
                            ${cat.creatives.map(cre => {
            const isSelected = clientData.selections[cat.id].creatives.includes(cre.id);
            return `<li class="${isSelected ? 'selected' : ''}" onclick="window.toggleSelection(this, '${cat.id}', 'creatives', '${cre.id}')">
                                    <div class="item-main"><div class="item-checkbox"></div><span>${cre.name}</span></div>
                                    <a href="${cre.url}" target="_blank" class="creative-link" onclick="event.stopPropagation()">Vídeo</a>
                                </li>`;
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

    // DASHBOARD RENDERING
    function renderDashboard() {
        const budget = clientData.budget;

        currentStepContainer.innerHTML = `
            <div class="dashboard-view">
                <header class="dash-header">
                    <div class="dash-meta">
                        <h2>Método Connect – Guia Estratégico</h2>
                        <p>Cliente: <strong>${clientData.name}</strong> | Objetivo: Geração de Leads | Período: 30 dias</p>
                    </div>
                    <div class="dash-actions">
                        <button class="dash-btn btn-outline" onclick="window.print()">Exportar PDF</button>
                        <button class="dash-btn btn-outline" onclick="alert('Modo Apresentação Ativado')">Modo Apresentação</button>
                        <button class="dash-btn primary-btn" onclick="window.editStrategy()">Editar Estratégia</button>
                    </div>
                </header>

                <div class="overview-grid">
                    ${database.categories.map(cat => {
            const val = budget * (cat.percentage / 100);
            return `
                            <div class="overview-card">
                                <h4>${cat.name}</h4>
                                <span class="percent">${cat.percentage}%</span>
                                <div class="value">R$ ${val.toLocaleString('pt-BR')}</div>
                                <div class="mini-progress"><div class="mini-progress-bar" style="width: ${cat.percentage}%"></div></div>
                            </div>
                        `;
        }).join('')}
                </div>

                <div class="strategic-grid">
                    <div class="accordion-group">
                        ${database.categories.map((cat, idx) => {
            const selectedAuds = cat.audiences.filter(a => clientData.selections[cat.id].audiences.includes(a.id));
            const selectedCres = cat.creatives.filter(c => clientData.selections[cat.id].creatives.includes(c.id));
            const meta = getMetaForCategory(cat.id, budget * (cat.percentage / 100));

            return `
                                <div class="accordion-item ${idx === 0 ? 'active' : ''}">
                                    <div class="accordion-header" onclick="window.toggleAccordion(this)">
                                        <span>${cat.name}</span>
                                        <span style="font-size:0.8rem; font-weight:400;">R$ ${(budget * (cat.percentage / 100)).toLocaleString('pt-BR')}</span>
                                    </div>
                                    <div class="accordion-content">
                                        <p><strong>Objetivo:</strong> ${getObjective(cat.id)}</p>
                                        <p><strong>Públicos:</strong> ${selectedAuds.map(a => a.name).join(', ') || 'Nenhum'}</p>
                                        <p><strong>Criativos:</strong> ${selectedCres.map(c => c.name).join(', ') || 'Nenhum'}</p>
                                        <p><strong>Meta Estimada:</strong> ${meta}</p>
                                    </div>
                                </div>
                            `;
        }).join('')}
                    </div>

                    <div class="funnel-container">
                        <h4 style="color:var(--text-muted); font-size: 0.8rem;">ESTRUTURA DO FUNIL</h4>
                        <div class="funnel-step">RECONHECIMENTO</div>
                        <div class="funnel-step">OFERTA</div>
                        <div class="funnel-step">REMARKETING</div>
                        <div class="funnel-step">PROVA SOCIAL</div>
                    </div>
                </div>

                <div class="flow-map">
                    <div class="flow-node">Interesses</div>
                    <div class="flow-node">Engajamento</div>
                    <div class="flow-node">Visita ao Site</div>
                    <div class="flow-node">Conversão</div>
                    <div class="flow-node">Remarketing</div>
                </div>

                <div class="strategic-grid">
                    <div class="projection-card">
                        <h4>PROJEÇÃO GERAL DA CAMPANHA</h4>
                        <div class="metrics-list">
                            <div class="metric-box"><h6>Impressões</h6><div class="val">${Math.floor(budget * 12).toLocaleString()}</div></div>
                            <div class="metric-box"><h6>Cliques</h6><div class="val">${Math.floor(budget * 0.3).toLocaleString()}</div></div>
                            <div class="metric-box"><h6>Leads</h6><div class="val">${Math.floor(budget / 100)}</div></div>
                            <div class="metric-box"><h6>CPL Proj.</h6><div class="val">R$ 80 - 100</div></div>
                        </div>
                    </div>
                    <div class="diagnosis-card">
                        <strong>Diagnóstico Estratégico</strong><br><br>
                        “Estratégia com foco equilibrado entre aquisição e conversão. Forte investimento em meio e fundo de funil indica priorização de geração direta de demanda.”
                    </div>
                </div>

                <button class="primary-btn" style="margin-top: 2rem; width:100%;" onclick="window.finalizeAndSave()">Salvar Estratégia Final</button>
            </div>
        `;
    }

    // Helper functions for content
    function getObjective(catId) {
        const obs = { reconhecimento: 'Alcance e Engajamento', oferta: 'Conversão', remarketing: 'Conversão', prova_social: 'Autoridade e Reforço' };
        return obs[catId] || '';
    }

    function getMetaForCategory(catId, val) {
        if (catId === 'reconhecimento') return `${Math.floor(val * 25).toLocaleString()} pessoas alcançadas`;
        if (catId === 'oferta') return `${Math.floor(val * 0.5).toLocaleString()} cliques`;
        if (catId === 'remarketing') return `${Math.floor(val / 60)} leads`;
        return 'Alta autoridade';
    }

    window.toggleAccordion = (header) => {
        const item = header.parentElement;
        const isActive = item.classList.contains('active');
        document.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('active'));
        if (!isActive) item.classList.add('active');
    };

    window.editStrategy = () => { currentStepIndex = 1; renderStep(); };

    window.finalizeAndSave = () => {
        saveClient();
        alert('Estratégia salva no histórico do navegador!');
    };

    // Persistence
    function saveClient() {
        const newClient = JSON.parse(JSON.stringify(clientData));
        newClient.id = Date.now();
        savedClients.push(newClient);
        localStorage.setItem('agro_campaigns', JSON.stringify(savedClients));
        renderSavedClients();
        currentStepIndex = 0;
        resetClientData();
        renderStep();
    }

    function resetClientData() {
        clientData = { name: '', budget: 0, selections: { reconhecimento: { audiences: [], creatives: [] }, oferta: { audiences: [], creatives: [] }, remarketing: { audiences: [], creatives: [] }, prova_social: { audiences: [], creatives: [] } } };
    }

    function renderSavedClients() {
        savedClientsList.innerHTML = savedClients.map(client => `
            <div class="client-chip" onclick="window.loadClient(${client.id})">
                <span>${client.name}</span>
                <span class="delete-client" onclick="event.stopPropagation(); window.deleteSavedClient(${client.id})">&times;</span>
            </div>
        `).join('') || '<p style="color:#999; width:100%;">Nenhuma simulação salva.</p>';
    }

    window.loadClient = (id) => {
        const client = savedClients.find(c => c.id === id);
        if (client) { clientData = JSON.parse(JSON.stringify(client)); currentStepIndex = 5; renderStep(); savedClientsList.classList.add('hidden'); }
    };

    window.deleteSavedClient = (id) => {
        savedClients = savedClients.filter(c => c.id !== id);
        localStorage.setItem('agro_campaigns', JSON.stringify(savedClients));
        renderSavedClients();
    };
}

document.addEventListener('DOMContentLoaded', init);
