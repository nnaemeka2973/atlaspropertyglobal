/**
 * Atlas Property Group - Mortgage Calculator
 * Senior JavaScript Developer
 */

function calculateMortgage() {
    const price = document.getElementById('calc-price').value;
    const downPercent = document.getElementById('calc-down').value;
    const interestRate = 0.065; // Fixed annual rate for high-end loans 6.5%
    const termYears = 30;

    const downPayment = price * (downPercent / 100);
    const loanAmount = price - downPayment;
    const monthlyRate = interestRate / 12;
    const numPayments = termYears * 12;

    const monthlyPayment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
    
    const resultDiv = document.getElementById('calc-result');
    resultDiv.innerHTML = `Estimated Monthly Payment: $${Math.round(monthlyPayment).toLocaleString()}`;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    const hasCalcPrice = !!document.getElementById('calc-price');
    const hasCalcDown = !!document.getElementById('calc-down');
    const hasCalcResult = !!document.getElementById('calc-result');

    if (hasCalcPrice && hasCalcDown && hasCalcResult) {
        calculateMortgage();
    }
});