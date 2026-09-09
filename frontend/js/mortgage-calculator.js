const state = {
    calculation: null,
    schedule: [],
    savedCalculations: JSON.parse(localStorage.getItem('atlasMortgageCalculations') || '[]')
};

const form = document.getElementById('mortgage-form');
const formElements = {
    homePrice: document.getElementById('home-price'),
    downPaymentAmount: document.getElementById('down-payment-amount'),
    downPaymentPercent: document.getElementById('down-payment-percent'),
    interestRate: document.getElementById('interest-rate'),
    loanTerm: document.getElementById('loan-term'),
    propertyTax: document.getElementById('property-tax'),
    homeInsurance: document.getElementById('home-insurance'),
    monthlyHoa: document.getElementById('hoa'),
    scheduleRange: document.getElementById('schedule-range')
};

function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2
    }).format(value || 0);
}

function roundCurrency(value) {
    return Number(value || 0).toFixed(2);
}

function calculateMortgage() {
    const homePrice = Number(formElements.homePrice.value || 0);
    const downPaymentAmount = Number(formElements.downPaymentAmount.value || 0);
    const downPaymentPercent = Number(formElements.downPaymentPercent.value || 0);
    const annualRate = Number(formElements.interestRate.value || 0) / 100;
    const loanTermYears = Number(formElements.loanTerm.value || 30);
    const propertyTaxAnnual = Number(formElements.propertyTax.value || 0);
    const homeInsuranceAnnual = Number(formElements.homeInsurance.value || 0);
    const monthlyHoa = Number(formElements.monthlyHoa.value || 0);

    const computedDownPayment = downPaymentAmount > 0 ? downPaymentAmount : homePrice * (downPaymentPercent / 100);
    const computedPercent = homePrice > 0 ? (computedDownPayment / homePrice) * 100 : 0;
    const loanAmount = Math.max(homePrice - computedDownPayment, 0);
    const monthlyRate = annualRate / 12;
    const paymentCount = loanTermYears * 12;
    const paymentFactor = monthlyRate > 0 ? (monthlyRate * Math.pow(1 + monthlyRate, paymentCount)) / (Math.pow(1 + monthlyRate, paymentCount) - 1) : loanAmount / paymentCount;
    const principalAndInterest = loanAmount * paymentFactor;

    const monthlyTax = propertyTaxAnnual / 12;
    const monthlyInsurance = homeInsuranceAnnual / 12;
    const pmiMonthly = computedPercent < 20 ? Math.max(loanAmount * 0.005 / 12, 0) : 0;
    const totalMonthlyPayment = principalAndInterest + monthlyTax + monthlyInsurance + monthlyHoa + pmiMonthly;

    let balance = loanAmount;
    let totalInterest = 0;
    const schedule = [];

    for (let month = 1; month <= paymentCount; month += 1) {
        const interestPayment = balance * monthlyRate;
        const principalPayment = principalAndInterest - interestPayment;
        balance = Math.max(balance - principalPayment, 0);
        totalInterest += interestPayment;
        schedule.push({
            month,
            payment: principalAndInterest,
            principal: principalPayment,
            interest: interestPayment,
            balance
        });
    }

    const totalCostOfLoan = loanAmount + totalInterest + propertyTaxAnnual * loanTermYears + homeInsuranceAnnual * loanTermYears + monthlyHoa * paymentCount + pmiMonthly * paymentCount;

    state.calculation = {
        homePrice,
        downPaymentAmount: computedDownPayment,
        downPaymentPercent: computedPercent,
        loanAmount,
        principalAndInterest,
        propertyTax: monthlyTax,
        insurance: monthlyInsurance,
        hoa: monthlyHoa,
        pmi: pmiMonthly,
        totalMonthlyPayment,
        totalInterest,
        totalCostOfLoan,
        paymentCount,
        schedule
    };

    state.schedule = state.calculation.schedule;
    renderResults();
}

function renderResults() {
    if (!state.calculation) return;

    const { principalAndInterest, propertyTax, insurance, hoa, pmi, totalMonthlyPayment, totalInterest, totalCostOfLoan, loanAmount, downPaymentPercent } = state.calculation;

    document.getElementById('hero-monthly-payment').textContent = formatCurrency(totalMonthlyPayment);
    document.getElementById('monthly-payment-total').textContent = formatCurrency(totalMonthlyPayment);
    document.getElementById('payment-principal-interest').textContent = formatCurrency(principalAndInterest);
    document.getElementById('payment-tax').textContent = formatCurrency(propertyTax);
    document.getElementById('payment-insurance').textContent = formatCurrency(insurance);
    document.getElementById('payment-hoa').textContent = formatCurrency(hoa);
    document.getElementById('payment-pmi').textContent = formatCurrency(pmi);
    document.getElementById('total-interest-paid').textContent = formatCurrency(totalInterest);
    document.getElementById('total-cost-of-loan').textContent = formatCurrency(totalCostOfLoan);
    document.getElementById('loan-amount').textContent = formatCurrency(loanAmount);

    document.getElementById('pmi-badge').textContent = downPaymentPercent < 20 ? 'PMI Included' : 'PMI Not Needed';

    renderPieChart({ principalAndInterest, tax: propertyTax, insurance, hoa, pmi });
    renderBalanceChart();
    renderSchedule();
    renderSavedCalculations();
}

function renderPieChart(parts) {
    const pie = document.getElementById('pie-chart');
    const legend = document.getElementById('legend-list');
    if (!pie || !legend) return;

    const total = Object.values(parts).reduce((sum, value) => sum + value, 0);
    const segments = [
        { label: 'Principal & Interest', value: parts.principalAndInterest, color: '#0b3d91' },
        { label: 'Taxes', value: parts.tax, color: '#29b6f6' },
        { label: 'Insurance', value: parts.insurance, color: '#d4af37' },
        { label: 'HOA', value: parts.hoa, color: '#7f8ea3' },
        { label: 'PMI', value: parts.pmi, color: '#1f6f5f' }
    ].filter((segment) => segment.value > 0);

    const conicGradient = segments.map((segment, index) => {
        const start = segments.slice(0, index).reduce((sum, item) => sum + item.value, 0) / total * 100;
        const end = (segments.slice(0, index + 1).reduce((sum, item) => sum + item.value, 0) / total * 100);
        return `${segment.color} ${start}% ${end}%`;
    }).join(', ');

    pie.style.background = `conic-gradient(${conicGradient})`;

    legend.innerHTML = segments.map((segment) => `
        <li>
            <span><i class="legend-dot" style="background:${segment.color}"></i>${segment.label}</span>
            <strong>${formatCurrency(segment.value)}</strong>
        </li>
    `).join('');
}

function renderBalanceChart() {
    const svg = document.getElementById('balance-chart');
    if (!svg || !state.schedule.length) return;

    const points = state.schedule.filter((_, index) => index % Math.max(1, Math.floor(state.schedule.length / 12)) === 0 || index === state.schedule.length - 1);
    const width = 640;
    const height = 280;
    const maxBalance = Math.max(...state.schedule.map((entry) => entry.balance), 1);
    const path = points.map((entry, index) => {
        const x = (index / Math.max(1, points.length - 1)) * (width - 40) + 20;
        const y = height - 30 - (entry.balance / maxBalance) * (height - 60);
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(' ');

    svg.innerHTML = `
        <rect x="0" y="0" width="${width}" height="${height}" fill="transparent"></rect>
        <line x1="20" y1="${height - 30}" x2="${width - 20}" y2="${height - 30}" stroke="currentColor" stroke-opacity="0.25"></line>
        <path d="${path}" fill="none" stroke="#0b3d91" stroke-width="3"></path>
        ${points.map((entry, index) => {
            const x = (index / Math.max(1, points.length - 1)) * (width - 40) + 20;
            const y = height - 30 - (entry.balance / maxBalance) * (height - 60);
            return `<circle cx="${x}" cy="${y}" r="4" fill="#29b6f6"></circle>`;
        }).join('')}
    `;
}

function renderSchedule() {
    const tbody = document.getElementById('schedule-body');
    const details = document.getElementById('schedule-details');
    if (!tbody || !details) return;

    const range = formElements.scheduleRange.value;
    let rows = state.schedule;
    if (range !== 'all') {
        rows = rows.slice(0, Number(range));
    }

    tbody.innerHTML = rows.length ? rows.map((row) => `
        <tr>
            <td>${row.month}</td>
            <td>${formatCurrency(row.payment)}</td>
            <td>${formatCurrency(row.principal)}</td>
            <td>${formatCurrency(row.interest)}</td>
            <td>${formatCurrency(row.balance)}</td>
        </tr>
    `).join('') : '<tr><td colspan="5">No schedule available.</td></tr>';

    const firstRow = rows[0];
    const lastRow = rows[rows.length - 1];
    details.textContent = firstRow && lastRow
        ? `Showing ${rows.length} months of the amortization schedule. Remaining balance after ${lastRow.month} months is ${formatCurrency(lastRow.balance)}.`
        : 'Adjust the inputs to generate a schedule.';
}

function renderSavedCalculations() {
    const container = document.getElementById('saved-calculations');
    if (!container) return;

    if (!state.savedCalculations.length) {
        container.innerHTML = '<div class="saved-item"><p>No saved mortgage scenarios yet.</p></div>';
        return;
    }

    container.innerHTML = state.savedCalculations.map((item) => `
        <article class="saved-item">
            <div>
                <strong>${item.label}</strong>
                <p>${formatCurrency(item.totalMonthlyPayment)} monthly • ${formatCurrency(item.loanAmount)} loan</p>
            </div>
            <div>${item.createdAt}</div>
        </article>
    `).join('');
}

function saveCalculation() {
    if (!state.calculation) return;

    const label = `Scenario ${state.savedCalculations.length + 1}`;
    state.savedCalculations.unshift({
        label,
        date: new Date().toLocaleDateString(),
        homePrice: state.calculation.homePrice,
        downPaymentAmount: state.calculation.downPaymentAmount,
        downPaymentPercent: state.calculation.downPaymentPercent,
        interestRate: Number(formElements.interestRate.value || 0) / 100,
        loanTerm: Number(formElements.loanTerm.value || 30),
        annualTax: Number(formElements.propertyTax.value || 0),
        annualInsurance: Number(formElements.homeInsurance.value || 0),
        hoa: Number(formElements.monthlyHoa.value || 0),
        loanAmount: state.calculation.loanAmount,
        totalMonthlyPayment: state.calculation.totalMonthlyPayment,
        totalInterest: state.calculation.totalInterest,
        totalCostOfLoan: state.calculation.totalCostOfLoan
    });
    state.savedCalculations = state.savedCalculations.slice(0, 6);
    localStorage.setItem('atlasMortgageCalculations', JSON.stringify(state.savedCalculations));
    renderSavedCalculations();
    window.alert('Mortgage scenario saved to your dashboard.');
}

function printCalculation() {
    window.print();
}

function exportPdf() {
    window.print();
}

function handleHeroCalculation() {
    if (!form) return;

    if (typeof form.requestSubmit === 'function') {
        form.requestSubmit();
    } else {
        calculateMortgage();
    }

    const paymentResult = document.getElementById('monthly-payment-total');
    paymentResult?.closest('.calculator-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    paymentResult?.focus({ preventScroll: true });
}

function syncDownPaymentFields() {
    const homePrice = Number(formElements.homePrice.value || 0);
    const downPaymentAmount = Number(formElements.downPaymentAmount.value || 0);
    const percent = homePrice > 0 ? (downPaymentAmount / homePrice) * 100 : 0;
    formElements.downPaymentPercent.value = percent.toFixed(1);
}

function syncFromPercent() {
    const homePrice = Number(formElements.homePrice.value || 0);
    const percent = Number(formElements.downPaymentPercent.value || 0);
    const amount = homePrice * (percent / 100);
    formElements.downPaymentAmount.value = amount.toFixed(0);
}

function attachEvents() {
    form?.addEventListener('submit', (event) => {
        event.preventDefault();
        calculateMortgage();
    });

    document.getElementById('calculate-trigger')?.addEventListener('click', handleHeroCalculation);
    document.getElementById('save-calculation')?.addEventListener('click', saveCalculation);
    document.getElementById('print-calculation')?.addEventListener('click', printCalculation);
    document.getElementById('export-pdf')?.addEventListener('click', exportPdf);
    formElements.scheduleRange?.addEventListener('change', renderSchedule);

    formElements.downPaymentAmount?.addEventListener('input', syncDownPaymentFields);
    formElements.downPaymentPercent?.addEventListener('input', syncFromPercent);
    formElements.homePrice?.addEventListener('input', () => {
        syncFromPercent();
        syncDownPaymentFields();
    });
}

function init() {
    attachEvents();
    calculateMortgage();
    renderSavedCalculations();
}

init();
