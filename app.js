async function init() {
    const budgetInput = document.getElementById('totalBudget');
    const clientNameInput = document.getElementById('clientName');
    const saveBtn = document.getElementById('saveBtn');
    const savedClientsList = document.getElementById('savedClientsList');
    const resultsGrid = document.getElementById('resultsGrid');
    const tabContent = document.getElementById('tabContent');
    const tabBtns = document.querySelectorAll('.tab-btn');

    let database = null;
    let currentTab = 'audiences';
    let savedClients = JSON.parse(localStorage.getItem('agro_campaigns') || '[]');

    try {
        const response = await fetch('database.json');
        database = await response.json();
        renderResults(0);
        renderDetails();
        renderSavedClients();
    } catch (error) {
        console.error('Erro ao carregar banco de dados:', error);
    }

    budgetInput.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value) || 0;
        renderResults(value);
    });

    saveBtn.addEventListener('click', () => {
        const name = clientNameInput.value.trim();
        const budget = parseFloat(budgetInput.value) || 0;

        if (!name || budget === 0) {
            alert('Por favor, insira o nome do cliente e o orçamento.');
            return;
        }

        savedClients.push({ name, budget, id: Date.now() });
        localStorage.setItem('agro_campaigns', JSON.stringify(savedClients));
        renderSavedClients();
        clientNameInput.value = '';
    });

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTab = btn.dataset.tab;
            renderDetails();
        });
    });

    function renderResults(totalBudget) {
        if (!database) return;

        resultsGrid.innerHTML = database.categories.map(cat => {
            const amount = (totalBudget * (cat.percentage / 100)).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            });

            return `
                <div class="result-card ${cat.id}">
                    <div class="card-title">${cat.name}</div>
                    <div class="card-value">${amount}</div>
                    <div class="card-percentage">${cat.percentage}% da verba</div>
                </div>
            `;
        }).join('');
    }

    function renderDetails() {
        if (!database) return;

        tabContent.innerHTML = `
            <div class="content-grid">
                ${database.categories.map(cat => `
                    <div class="info-group">
                        <h3>${cat.name}</h3>
                        <ul class="info-list">
                            ${cat[currentTab].map(item => `<li>${item}</li>`).join('')}
                        </ul>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function renderSavedClients() {
        savedClientsList.innerHTML = savedClients.map(client => `
            <div class="client-chip" onclick="loadClient(${client.budget}, '${client.name}')">
                <span class="client-name">${client.name}</span>
                <span class="client-budget">R$ ${client.budget}</span>
                <span class="delete-client" onclick="event.stopPropagation(); deleteClient(${client.id})">&times;</span>
            </div>
        `).join('');
    }

    window.loadClient = (budget, name) => {
        budgetInput.value = budget;
        clientNameInput.value = name;
        renderResults(budget);
    };

    window.deleteClient = (id) => {
        savedClients = savedClients.filter(c => c.id !== id);
        localStorage.setItem('agro_campaigns', JSON.stringify(savedClients));
        renderSavedClients();
    };
}

document.addEventListener('DOMContentLoaded', init);
