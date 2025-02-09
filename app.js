let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
let expenseChart = null;
const APP_ID = EXCHANGE_APP_ID;
let exchangeRates = { USD: 1 };

const categoryColors = {
    food: {
        gradient: 'linear-gradient(45deg, #0ea5e9, #0369a1)',
        solid: '#0ea5e9',
        border: '#0369a1',
        icon: '🍽️'
    },
    transport: {
        gradient: 'linear-gradient(45deg, #3b82f6, #1d4ed8)',
        solid: '#3b82f6',
        border: '#1d4ed8',
        icon: '🚗'
    },
    utilities: {
        gradient: 'linear-gradient(45deg, #06b6d4, #0284c7)',
        solid: '#06b6d4',
        border: '#0284c7',
        icon: '⚡'
    },
    entertainment: {
        gradient: 'linear-gradient(45deg, #ec4899, #be185d)',
        solid: '#ec4899',
        border: '#be185d',
        icon: '🎬'
    },
    shopping: {
        gradient: 'linear-gradient(45deg, #f97316, #ea580c)',
        solid: '#f97316',
        border: '#ea580c',
        icon: '🛍️'
    },
    others: {
        gradient: 'linear-gradient(45deg, #64748b, #475569)',
        solid: '#64748b',
        border: '#475569',
        icon: '📌'
    }
};

const expenseForm = document.getElementById('expenseForm');
const expenseList = document.getElementById('expenseList');
const totalAmount = document.getElementById('totalAmount');
const displayCurrency = document.getElementById('displayCurrency');

function initializeChart() {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    const orderedCategories = Object.keys(categoryColors);
    
    Chart.defaults.color = '#ffffff';
    Chart.defaults.font.family = "'Segoe UI', sans-serif";
    
    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: orderedCategories.map(category => category.charAt(0).toUpperCase() + category.slice(1)),
            datasets: [{
                data: orderedCategories.map(() => 0),
                backgroundColor: orderedCategories.map(category => categoryColors[category].solid),
                hoverBackgroundColor: orderedCategories.map(category => categoryColors[category].border),
                borderWidth: 2,
                borderColor: '#1a1a27'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '60%',
            color: '#ffffff',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#ffffff',
                        font: { size: 14, weight: '500' },
                        padding: 20,
                        filter: (legendItem, data) => data.datasets[0].data[legendItem.index] > 0,
                        generateLabels: (chart) => {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                const activeLabels = data.labels.map((label, i) => {
                                    const category = label.toLowerCase();
                                    const value = chart.data.datasets[0].data[i];
                                    if (value > 0) {
                                        return {
                                            text: `${label} (${value.toFixed(2)})`,
                                            fillStyle: categoryColors[category].solid,
                                            strokeStyle: categoryColors[category].border,
                                            lineWidth: 2,
                                            hidden: false,
                                            index: i,
                                            color: '#ffffff',
                                            fontColor: '#ffffff'
                                        };
                                    }
                                    return null;
                                }).filter(Boolean);
                                return activeLabels;
                            }
                            return [];
                        },
                        usePointStyle: true,
                        pointStyle: 'circle',
                        boxWidth: 10,
                        boxHeight: 10,
                        color: '#ffffff'
                    }
                },
                title: {
                    display: true,
                    text: 'Expenses by Category',
                    color: '#ffffff',
                    font: {
                        size: 24,
                        weight: 'bold',
                        family: "'Segoe UI', sans-serif"
                    },
                    padding: { top: 20, bottom: 20 }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const currency = displayCurrency.value;
                            return `${label}: ${currency} ${value.toFixed(2)}`;
                        }
                    },
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    backgroundColor: 'rgba(26, 26, 39, 0.9)',
                    borderColor: 'rgba(139, 92, 246, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true
                }
            }
        }
    });
}

async function fetchExchangeRates() {
    try {
        const response = await fetch(`https://openexchangerates.org/api/latest.json?app_id=${APP_ID}`);
        const data = await response.json();
        if (data.rates) {
            exchangeRates = data.rates;
            updateExpenseList();
            updateTotalAmount();
            updateChart();
        }
    } catch (error) {
        console.error('Error fetching exchange rates:', error);
        alert('Error fetching exchange rates. Please try again later.');
    }
}

function convertCurrency(amount, fromCurrency, toCurrency) {
    const inUSD = fromCurrency === 'USD' ? amount : amount / exchangeRates[fromCurrency];
    return toCurrency === 'USD' ? inUSD : inUSD * exchangeRates[toCurrency];
}

function updateTotalAmount() {
    const selectedCurrency = displayCurrency.value;
    const total = expenses.reduce((sum, expense) => {
        return sum + convertCurrency(expense.amount, expense.currency, selectedCurrency);
    }, 0);
    totalAmount.textContent = `${selectedCurrency} ${total.toFixed(2)}`;
}

function updateChart() {
    const categoryTotals = {};
    const selectedCurrency = displayCurrency.value;
    Object.keys(categoryColors).forEach(category => categoryTotals[category] = 0);
    
    expenses.forEach(expense => {
        const convertedAmount = convertCurrency(expense.amount, expense.currency, selectedCurrency);
        const category = expense.category.toLowerCase();
        categoryTotals[category] = (categoryTotals[category] || 0) + convertedAmount;
    });

    const orderedCategories = Object.keys(categoryColors);
    const orderedData = orderedCategories.map(category => categoryTotals[category]);
    const orderedLabels = orderedCategories.map(category => 
        category.charAt(0).toUpperCase() + category.slice(1)
    );

    expenseChart.data.labels = orderedLabels;
    expenseChart.data.datasets[0].data = orderedData;
    expenseChart.update();
}

function createExpenseElement(expense) {
    const div = document.createElement('div');
    div.className = 'expense-item';
    
    const selectedCurrency = displayCurrency.value;
    const convertedAmount = convertCurrency(expense.amount, expense.currency, selectedCurrency);
    const categoryColor = categoryColors[expense.category.toLowerCase()];

    div.style.borderLeft = `4px solid ${categoryColor.solid}`;
    div.style.background = `linear-gradient(to right, ${categoryColor.solid}0a, ${categoryColor.border}05)`;

    div.innerHTML = `
        <div class="expense-details">
            <strong>${expense.title}</strong>
            <div class="category-tag" style="background: ${categoryColor.gradient}">
                <span>${categoryColor.icon}</span>
                ${expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}
            </div>
            <div class="expense-date">
                <i class="far fa-calendar-alt"></i>
                ${expense.date}
            </div>
        </div>
        <div class="expense-amount" style="color: ${categoryColor.solid}">
            <i class="fas fa-coins"></i>
            ${selectedCurrency} ${convertedAmount.toFixed(2)}
        </div>
        <button class="delete-btn" data-id="${expense.id}">
            <i class="fas fa-trash-alt"></i>
        </button>
    `;

    return div;
}

function updateExpenseList() {
    expenseList.innerHTML = '';
    expenses.sort((a, b) => new Date(b.date) - new Date(a.date))
           .forEach(expense => expenseList.appendChild(createExpenseElement(expense)));
}

function saveExpenses() {
    localStorage.setItem('expenses', JSON.stringify(expenses));
}

function setupRealTimeConversion() {
    const amountInput = document.getElementById('expenseAmount');
    const fromCurrency = document.getElementById('expenseCurrency');
    const conversionDisplay = document.createElement('div');
    conversionDisplay.className = 'conversion-display';
    amountInput.parentElement.appendChild(conversionDisplay);

    function updateConversion() {
        const amount = amountInput.value;
        const from = fromCurrency.value;
        const to = displayCurrency.value;
        
        if (amount && from && to) {
            const converted = convertCurrency(parseFloat(amount), from, to);
            conversionDisplay.textContent = `${amount} ${from} = ${converted.toFixed(2)} ${to}`;
        } else {
            conversionDisplay.textContent = '';
        }
    }

    amountInput.addEventListener('input', updateConversion);
    fromCurrency.addEventListener('change', updateConversion);
    displayCurrency.addEventListener('change', updateConversion);
}

async function fetchCurrencies() {
    try {
        const response = await fetch(`https://openexchangerates.org/api/currencies.json`);
        const currencies = await response.json();
        
        const currencySelects = [
            document.getElementById('expenseCurrency'),
            document.getElementById('displayCurrency')
        ];

        const sortedCurrencies = Object.entries(currencies)
            .sort(([,a], [,b]) => a.localeCompare(b))
            .map(([code, name]) => ({ code, name }));

        currencySelects.forEach(select => {
            select.innerHTML = '<option value="">Select Currency</option>';
            sortedCurrencies.forEach(({ code, name }) => {
                const option = document.createElement('option');
                option.value = code;
                option.textContent = `${code} - ${name}`;
                if (code === 'USD') option.selected = true;
                select.appendChild(option);
            });
        });
    } catch (error) {
        console.error('Error fetching currencies:', error);
        alert('Error loading currencies. Please refresh the page.');
    }
}

expenseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newExpense = {
        id: Date.now(),
        title: document.getElementById('expenseTitle').value,
        amount: parseFloat(document.getElementById('expenseAmount').value),
        currency: document.getElementById('expenseCurrency').value,
        category: document.getElementById('expenseCategory').value,
        date: document.getElementById('expenseDate').value
    };
    expenses.push(newExpense);
    saveExpenses();
    expenseForm.reset();
    updateExpenseList();
    updateTotalAmount();
    updateChart();
});

expenseList.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.delete-btn');
    if (deleteBtn) {
        const id = parseInt(deleteBtn.dataset.id);
        expenses = expenses.filter(expense => expense.id !== id);
        saveExpenses();
        updateExpenseList();
        updateTotalAmount();
        updateChart();
    }
});

displayCurrency.addEventListener('change', () => {
    updateExpenseList();
    updateTotalAmount();
    updateChart();
});

function resetAllData() {
    if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
        expenses = [];
        localStorage.removeItem('expenses');
        expenseForm.reset();
        
        const currencySelects = [
            document.getElementById('expenseCurrency'),
            document.getElementById('displayCurrency')
        ];
        
        currencySelects.forEach(select => {
            select.value = 'USD';
        });
        
        updateExpenseList();
        updateTotalAmount();
        updateChart();
        
        const conversionDisplay = document.querySelector('.conversion-display');
        if (conversionDisplay) {
            conversionDisplay.textContent = '';
        }
        
        alert('All data has been reset successfully!');
    }
}

document.getElementById('resetButton').addEventListener('click', resetAllData);

document.addEventListener('DOMContentLoaded', () => {
    fetchCurrencies();
    initializeChart();
    fetchExchangeRates();
    setupRealTimeConversion();
    updateExpenseList();
    updateTotalAmount();
    updateChart();
    setInterval(fetchExchangeRates, 3600000);
});
