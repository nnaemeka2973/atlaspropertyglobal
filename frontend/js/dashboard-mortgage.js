const DASHBOARD_MORTGAGE_KEY = 'atlasMortgageCalculations';

function readMortgageCalculations() {
    return JSON.parse(localStorage.getItem(DASHBOARD_MORTGAGE_KEY) || '[]');
}

function writeMortgageCalculations(items) {
    localStorage.setItem(DASHBOARD_MORTGAGE_KEY, JSON.stringify(items));
}

function getDashboardMortgagePanel() {
    const saved = readMortgageCalculations();
    const panel = document.createElement('section');
    panel.id = 'panel-mortgage';
    panel.className = 'dashboard-panel';
    panel.setAttribute('aria-labelledby', 'mortgage-panel-title');
    panel.innerHTML = `
        <div class="section-header">
            <div>
                <p class="section-label">Finance</p>
                <h2 id="mortgage-panel-title">Mortgage Calculator</h2>
            </div>
        </div>

        <div class="mortgage-panel">
            <div class="panel-grid">
                <div class="card-panel">
                    <h3>Create a new calculation</h3>
                    <div class="form-grid">
                        <label class="field-group">Home price<input id="dashboard-home-price" type="number" min="1000" step="1000" value="450000"></label>
                        <label class="field-group">Down payment $<input id="dashboard-down-amount" type="number" min="0" step="1000" value="90000"></label>
                        <label class="field-group">Down payment %<input id="dashboard-down-percent" type="number" min="0" max="100" step="0.1" value="20"></label>
                        <label class="field-group">Interest rate %<input id="dashboard-interest-rate" type="number" min="0" step="0.01" value="6.5"></label>
                        <label class="field-group">Loan term<select id="dashboard-loan-term"><option value="15">15 years</option><option value="20">20 years</option><option value="30" selected>30 years</option></select></label>
                        <label class="field-group">Annual property tax<input id="dashboard-property-tax" type="number" min="0" step="100" value="5400"></label>
                        <label class="field-group">Annual insurance<input id="dashboard-insurance" type="number" min="0" step="50" value="1800"></label>
                        <label class="field-group">Monthly HOA<input id="dashboard-hoa" type="number" min="0" step="10" value="0"></label>
                    </div>
                    <div class="btn-group" style="margin-top:16px;">
                        <button type="button" class="btn btn-primary" id="dashboard-calculate-btn">Calculate</button>
                        <button type="button" class="btn btn-outline" id="dashboard-save-mortgage-btn">Save</button>
                    </div>
                </div>

                <div class="card-panel summary-card">
                    <h3>Monthly payment</h3>
                    <div class="summary-list">
                        <div class="summary-item"><span>Loan amount</span><strong id="dashboard-loan-amount">$0.00</strong></div>
                        <div class="summary-item"><span>Principal & interest</span><strong id="dashboard-principal-interest">$0.00</strong></div>
                        <div class="summary-item"><span>Property tax</span><strong id="dashboard-property-tax-monthly">$0.00</strong></div>
                        <div class="summary-item"><span>Insurance</span><strong id="dashboard-insurance-monthly">$0.00</strong></div>
                        <div class="summary-item"><span>HOA</span><strong id="dashboard-hoa-monthly">$0.00</strong></div>
                        <div class="summary-item"><span>PMI</span><strong id="dashboard-pmi-monthly">$0.00</strong></div>
                        <div class="summary-item"><span>Total monthly payment</span><strong id="dashboard-total-monthly">$0.00</strong></div>
                        <div class="summary-item"><span>Total interest paid</span><strong id="dashboard-total-interest">$0.00</strong></div>
                        <div class="summary-item"><span>Total cost of loan</span><strong id="dashboard-total-cost">$0.00</strong></div>
                    </div>
                </div>
            </div>

            <div class="chart-shell">
                <h3>Payment distribution</h3>
                <div id="dashboard-payment-pie" class="chart-widget"></div>
            </div>

            <div class="chart-shell">
                <h3>Balance over time</h3>
                <svg id="dashboard-balance-chart" viewBox="0 0 640 260" class="chart-widget" aria-label="Loan balance over time"></svg>
            </div>

            <div class="schedule-shell">
                <h3>Amortization schedule</h3>
                <div style="overflow-x:auto;">
                    <table class="schedule-table" aria-label="Mortgage payment schedule">
                        <thead><tr><th>Month</th><th>Payment</th><th>Principal</th><th>Interest</th><th>Balance</th></tr></thead>
                        <tbody id="dashboard-schedule-body"></tbody>
                    </table>
                </div>
            </div>

            <div class="saved-shell">
                <h3>Saved calculations</h3>
                <div id="dashboard-saved-list" class="saved-list"></div>
            </div>
        </div>
    `;

    return panel;
}

function formatDashboardCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
}

function calculateDashboardMortgage() {
    const homePrice = Number(document.getElementById('dashboard-home-price').value) || 0;
    const downAmount = Number(document.getElementById('dashboard-down-amount').value) || 0;
    const downPercent = Number(document.getElementById('dashboard-down-percent').value) || 0;
    const annualInterestRate = Number(document.getElementById('dashboard-interest-rate').value) / 100 || 0;
    const loanTerm = Number(document.getElementById('dashboard-loan-term').value) || 30;
    const annualTax = Number(document.getElementById('dashboard-property-tax').value) || 0;
    const annualInsurance = Number(document.getElementById('dashboard-insurance').value) || 0;
    const monthlyHoa = Number(document.getElementById('dashboard-hoa').value) || 0;
    const effectiveDownAmount = downAmount > 0 ? downAmount : homePrice * (downPercent / 100);
    const loanAmount = Math.max(homePrice - effectiveDownAmount, 0);
    const monthlyRate = annualInterestRate / 12;
    const totalMonths = loanTerm * 12;
    const monthlyPmi = effectiveDownAmount / homePrice < 0.2 ? Math.max(loanAmount * 0.005 / 12, 0) : 0;
    const monthlyTax = annualTax / 12;
    const monthlyInsurance = annualInsurance / 12;
    const monthlyPayment = monthlyRate > 0
        ? (loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -totalMonths))
        : loanAmount / totalMonths;
    const totalMonthly = monthlyPayment + monthlyTax + monthlyInsurance + monthlyHoa + monthlyPmi;
    let balance = loanAmount;
    let totalInterest = 0;
    const schedule = [];

    for (let month = 1; month <= totalMonths; month += 1) {
        const interest = balance * monthlyRate;
        const principal = monthlyPayment - interest;
        balance = Math.max(balance - principal, 0);
        totalInterest += interest;
        schedule.push({ month, payment: monthlyPayment, principal, interest, balance });
    }

    const totalCost = loanAmount + totalInterest + annualTax * loanTerm + annualInsurance * loanTerm + monthlyHoa * totalMonths + monthlyPmi * totalMonths;

    return {
        homePrice,
        downAmount: effectiveDownAmount,
        downPercent: homePrice > 0 ? (effectiveDownAmount / homePrice) * 100 : 0,
        interestRate: annualInterestRate,
        loanTerm,
        annualTax,
        annualInsurance,
        loanAmount,
        monthlyPayment,
        monthlyTax,
        monthlyInsurance,
        monthlyHoa,
        monthlyPmi,
        totalMonthly,
        totalInterest,
        totalCost,
        schedule
    };
}

function renderDashboardMortgageResults(model) {
    document.getElementById('dashboard-loan-amount').textContent = formatDashboardCurrency(model.loanAmount);
    document.getElementById('dashboard-principal-interest').textContent = formatDashboardCurrency(model.monthlyPayment);
    document.getElementById('dashboard-property-tax-monthly').textContent = formatDashboardCurrency(model.monthlyTax);
    document.getElementById('dashboard-insurance-monthly').textContent = formatDashboardCurrency(model.monthlyInsurance);
    document.getElementById('dashboard-hoa-monthly').textContent = formatDashboardCurrency(model.monthlyHoa);
    document.getElementById('dashboard-pmi-monthly').textContent = formatDashboardCurrency(model.monthlyPmi);
    document.getElementById('dashboard-total-monthly').textContent = formatDashboardCurrency(model.totalMonthly);
    document.getElementById('dashboard-total-interest').textContent = formatDashboardCurrency(model.totalInterest);
    document.getElementById('dashboard-total-cost').textContent = formatDashboardCurrency(model.totalCost);

    renderDashboardPie(model);
    renderDashboardBalanceChart(model);
    renderDashboardSchedule(model.schedule);
}

function renderDashboardPie(model) {
    const pie = document.getElementById('dashboard-payment-pie');
    const values = [
        { label: 'Principal & Interest', value: model.monthlyPayment, color: '#0b3d91' },
        { label: 'Taxes', value: model.monthlyTax, color: '#29b6f6' },
        { label: 'Insurance', value: model.monthlyInsurance, color: '#d4af37' },
        { label: 'HOA', value: model.monthlyHoa, color: '#7f8ea3' },
        { label: 'PMI', value: model.monthlyPmi, color: '#1f6f5f' }
    ].filter((item) => item.value > 0);
    const total = values.reduce((sum, item) => sum + item.value, 0);
    pie.innerHTML = values.map((item) => `<div style="display:flex;justify-content:space-between;padding:6px 0"><span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${item.color};margin-right:8px"></span>${item.label}</span><strong>${formatDashboardCurrency(item.value)}</strong></div>`).join('');
    const gradient = values.map((item, index) => { const start = values.slice(0, index).reduce((acc, part) => acc + part.value, 0) / total * 100; const end = values.slice(0, index + 1).reduce((acc, part) => acc + part.value, 0) / total * 100; return `${item.color} ${start}% ${end}%`; }).join(', ');
    pie.style.background = `conic-gradient(${gradient})`;
}

function renderDashboardBalanceChart(model) {
    const svg = document.getElementById('dashboard-balance-chart');
    if (!svg) return;
    const width = 640;
    const height = 260;
    const points = model.schedule.filter((_, index) => index % Math.ceil(model.schedule.length / 24) === 0 || index === model.schedule.length - 1);
    const maxBalance = Math.max(...model.schedule.map((row) => row.balance));
    const path = points.map((row, index) => {
        const x = 20 + (index / (points.length - 1)) * (width - 40);
        const y = height - 20 - (row.balance / maxBalance) * (height - 40);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
    svg.innerHTML = `<path d="${path}" fill="none" stroke="#0b3d91" stroke-width="3"></path><g>${points.map((row, index) => { const x = 20 + (index / (points.length - 1)) * (width - 40); const y = height - 20 - (row.balance / maxBalance) * (height - 40); return `<circle cx="${x}" cy="${y}" r="4" fill="#29b6f6"></circle>`; }).join('')}</g>`;
}

function renderDashboardSchedule(schedule) {
    const tbody = document.getElementById('dashboard-schedule-body');
    if (!tbody) return;
    tbody.innerHTML = schedule.slice(0, 24).map((row) => `
        <tr>
            <td>${row.month}</td>
            <td>${formatDashboardCurrency(row.payment)}</td>
            <td>${formatDashboardCurrency(row.principal)}</td>
            <td>${formatDashboardCurrency(row.interest)}</td>
            <td>${formatDashboardCurrency(row.balance)}</td>
        </tr>
    `).join('');
}

function renderDashboardSavedCalculations() {
    const container = document.getElementById('dashboard-saved-list');
    const items = readMortgageCalculations();
    if (!container) return;
    if (!items.length) {
        container.innerHTML = '<div class="saved-card"><p>No saved calculations yet.</p></div>';
        return;
    }
    container.innerHTML = items.map((item, index) => `
        <article class="saved-card">
            <div>
                <strong>${item.label}</strong>
                <p>${item.date}</p>
            </div>
            <div class="saved-card-actions">
                <button type="button" class="btn btn-outline" data-dashboard-load="${index}">Load</button>
                <button type="button" class="btn btn-outline" data-dashboard-delete="${index}">Delete</button>
            </div>
        </article>
    `).join('');
}

function bindDashboardMortgageEvents() {
    document.getElementById('dashboard-calculate-btn')?.addEventListener('click', () => {
        const model = calculateDashboardMortgage();
        renderDashboardMortgageResults(model);
    });
    document.getElementById('dashboard-save-mortgage-btn')?.addEventListener('click', () => {
        const model = calculateDashboardMortgage();
        const items = readMortgageCalculations();
        items.unshift({
            label: `Saved scenario ${items.length + 1}`,
            date: new Date().toLocaleDateString(),
            ...model
        });
        writeMortgageCalculations(items.slice(0, 8));
        renderDashboardSavedCalculations();
    });
    document.getElementById('dashboard-saved-list')?.addEventListener('click', (event) => {
        const deleteIndex = event.target.closest('[data-dashboard-delete]')?.dataset.dashboardDelete;
        const loadIndex = event.target.closest('[data-dashboard-load]')?.dataset.dashboardLoad;
        if (deleteIndex !== undefined) {
            const items = readMortgageCalculations();
            items.splice(Number(deleteIndex), 1);
            writeMortgageCalculations(items);
            renderDashboardSavedCalculations();
            return;
        }
        if (loadIndex !== undefined) {
            const items = readMortgageCalculations();
            const item = items[Number(loadIndex)];
            if (!item) return;
            document.getElementById('dashboard-home-price').value = item.homePrice || 0;
            document.getElementById('dashboard-down-amount').value = item.downPaymentAmount ?? item.downAmount ?? 0;
            document.getElementById('dashboard-down-percent').value = item.downPaymentPercent ?? (item.homePrice > 0 ? (((item.downPaymentAmount ?? item.downAmount) || 0) / item.homePrice) * 100 : 0);
            document.getElementById('dashboard-interest-rate').value = item.interestRate ? (item.interestRate * 100).toFixed(2) : '';
            document.getElementById('dashboard-loan-term').value = item.loanTerm || 30;
            document.getElementById('dashboard-property-tax').value = item.annualTax ?? (item.propertyTax ? item.propertyTax * 12 : 0);
            document.getElementById('dashboard-insurance').value = item.annualInsurance ?? (item.insurance ? item.insurance * 12 : 0);
            document.getElementById('dashboard-hoa').value = item.hoa ?? item.monthlyHoa ?? 0;
            const loadedModel = calculateDashboardMortgage();
            renderDashboardMortgageResults(loadedModel);
        }
    });
}

function initDashboardMortgagePanel() {
    const existing = document.getElementById('panel-mortgage');
    if (existing) return;
    const panel = getDashboardMortgagePanel();
    const settingsPanel = document.getElementById('panel-settings');
    settingsPanel?.insertAdjacentElement('beforebegin', panel);
    renderDashboardSavedCalculations();
    bindDashboardMortgageEvents();
}

window.addEventListener('dashboard:init', initDashboardMortgagePanel);
