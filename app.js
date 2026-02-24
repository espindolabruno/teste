async function init() {
    // UI Elements
    const currentStepContainer = document.getElementById('currentStep');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const progressBar = document.getElementById('progressBar');
    const dots = document.querySelectorAll('.step-dot');
    const toggleClientsBtn = document.getElementById('toggleClients');
    const savedClientsList = document.getElementById('savedClientsList');

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
        nextBtn.innerText = currentStepIndex === 5 ? 'Salvar Configuração' : 'Próximo';
        if (currentStepIndex === 5) {
            // Check if client is already saved to show "Save" or just "Done"
        }
    }

    // Step 0: Budget & Name
    function renderStep0() {
        currentStepContainer.innerHTML = `
            <div class="step-card">
                <h2 class="step-title">Vamos começar?</h2>
                <p class="step-desc">Insira o nome do cliente e a verba mensal para distribuir.</p>
                <div class="input-group" style="margin-bottom: 1.5rem;">
                    <label>Nome do Cliente</label>
                    <input type="text" id="inputClientName" value="${clientData.name}" placeholder="Ex: Sítio Araruna">
                </div>
                <div class="input-group">
                    <label>Orçamento Mensal (R$)</label>
                    <input type="number" id="inputBudget" value="${clientData.budget || ''}" placeholder="Ex: 5000">
                </div>
            </div>
        `;

        const nameInp = document.getElementById('inputClientName');
        const budgetInp = document.getElementById('inputBudget');

        nameInp.addEventListener('input', (e) => clientData.name = e.target.value);
        budgetInp.addEventListener('input', (e) => clientData.budget = parseFloat(e.target.value) || 0);
    }

    function validateStep0() {
        if (!clientData.name || clientData.budget <= 0) {
            alert('Por favor, preencha o nome e um orçamento válido.');
            return false;
        }
        return true;
    }

    // Steps 1-4: Campaign Pillars
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
            return `
                                    <li class="${isSelected ? 'selected' : ''}" onclick="window.toggleSelection('${cat.id}', 'audiences', '${aud.id}')">
                                        <div class="item-main">
                                            <div class="item-checkbox"></div>
                                            <span>${aud.name}</span>
                                        </div>
                                    </li>
                                `;
        }).join('')}
                        </ul>
                    </div>
                    <div class="info-group">
                        <h3>Criativos</h3>
                        <ul class="info-list">
                            ${cat.creatives.map(cre => {
            const isSelected = clientData.selections[cat.id].creatives.includes(cre.id);
            return `
                                    <li class="${isSelected ? 'selected' : ''}" onclick="window.toggleSelection('${cat.id}', 'creatives', '${cre.id}')">
                                        <div class="item-main">
                                            <div class="item-checkbox"></div>
                                            <span>${cre.name}</span>
                                        </div>
                                        <a href="${cre.url}" target="_blank" class="creative-link" onclick="event.stopPropagation()">Vídeo</a>
                                    </li>
                                `;
        }).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }

    window.toggleSelection = (catId, type, itemId) => {
        const list = clientData.selections[catId][type];
        const idx = list.indexOf(itemId);
        if (idx > -1) list.splice(idx, 1);
        else list.push(itemId);
        renderStep();
    };

    // Step 5: Dashboard Mind Map
    function renderDashboard() {
        currentStepContainer.innerHTML = `
            <div class="mindmap-container">
                <div class="mindmap-root">${clientData.name} | R$ ${clientData.budget}</div>
                <div class="mindmap-branches">
                    ${database.categories.map(cat => {
            const amount = (clientData.budget * (cat.percentage / 100)).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            });
            const audiences = cat.audiences.filter(a => clientData.selections[cat.id].audiences.includes(a.id));
            const creatives = cat.creatives.filter(c => clientData.selections[cat.id].creatives.includes(c.id));

            return `
                            <div class="branch">
                                <div class="branch-title">
                                    <span>${cat.name}</span>
                                    <span class="branch-tag">${amount}</span>
                                </div>
                                <div class="branch-items">
                                    <strong>Públicos:</strong> ${audiences.map(a => a.name).join(', ') || 'Nenhum'}<br>
                                    <strong>Criativos:</strong> ${creatives.map(c => c.name).join(', ') || 'Nenhum'}
                                </div>
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    }

    // Persistence
    function saveClient() {
        const newClient = { ...clientData, id: Date.now() };
        savedClients.push(newClient);
        localStorage.setItem('agro_campaigns', JSON.stringify(savedClients));
        renderSavedClients();
        alert('Estratégia salva com sucesso!');
        currentStepIndex = 0;
        resetClientData();
        renderStep();
    }

    function resetClientData() {
        clientData = {
            name: '',
            budget: 0,
            selections: {
                reconhecimento: { audiences: [], creatives: [] },
                oferta: { audiences: [], creatives: [] },
                remarketing: { audiences: [], creatives: [] },
                prova_social: { audiences: [], creatives: [] }
            }
        };
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
        if (client) {
            clientData = JSON.parse(JSON.stringify(client));
            currentStepIndex = 0;
            renderStep();
            savedClientsList.classList.add('hidden');
        }
    };

    window.deleteSavedClient = (id) => {
        savedClients = savedClients.filter(c => c.id !== id);
        localStorage.setItem('agro_campaigns', JSON.stringify(savedClients));
        renderSavedClients();
    };
}

document.addEventListener('DOMContentLoaded', init);
