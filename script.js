document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const startingBalanceInput = document.getElementById('starting-balance');
    const saveBalanceBtn = document.getElementById('save-balance-btn');
    const totalSpentSpan = document.getElementById('total-spent');
    const remainingBalanceSpan = document.getElementById('remaining-balance');

    // NEW Income Summary DOM Elements
    const totalIncomeSpan = document.getElementById('total-income');
    const netIncomeSpan = document.getElementById('net-income');
    const savingsRateSpan = document.getElementById('savings-rate');
    // END NEW

    // Budget DOM Elements
    const needsBudgetInput = document.getElementById('needs-budget');
    const wantsBudgetInput = document.getElementById('wants-budget');
    const saveBudgetsBtn = document.getElementById('save-budgets-btn');
    const budgetNeedsInfo = document.getElementById('budget-needs-info');
    const budgetWantsInfo = document.getElementById('budget-wants-info');
    const needsProgressBar = document.querySelector('.needs-progress');
    const wantsProgressBar = document.querySelector('.wants-progress');
    const paceYourselfInfo = document.getElementById('pace-yourself-info');

    const expenseAmountInput = document.getElementById('expense-amount');
    const expenseDateInput = document.getElementById('expense-date');
    const expenseNoteInput = document.getElementById('expense-note');
    const expenseSubcategoryInput = document.getElementById('expense-subcategory');
    const addExpenseBtn = document.getElementById('add-expense-btn');
    const expensesUl = document.getElementById('expenses-ul');

    // NEW Income DOM Elements
    const incomeAmountInput = document.getElementById('income-amount');
    const incomeDateInput = document.getElementById('income-date');
    const incomeNoteInput = document.getElementById('income-note');
    const incomeAllocationInput = document.getElementById('income-allocation');
    const addIncomeBtn = document.getElementById('add-income-btn');
    const incomeUl = document.getElementById('income-ul');
    // END NEW

    const needsWantsChartCtx = document.getElementById('needsWantsChart').getContext('2d');
    const categoryChartCtx = document.getElementById('categoryChart').getContext('2d');

    let needsWantsChart, categoryChart;

    // --- Data Storage & Management ---
    let expenses = []; // Stores ALL expense objects (historical and current)
    let income = [];   // NEW: Stores ALL income objects
    let currentMonthStartingBalance = 0;
    let needsBudget = 0;
    let wantsBudget = 0;

    const STORAGE_KEY_EXPENSES = 'smartSpendAnalyzer_expenses';
    const STORAGE_KEY_INCOME = 'smartSpendAnalyzer_income'; // NEW
    const STORAGE_KEY_STARTING_BALANCE = 'smartSpendAnalyzer_startingBalance';
    const STORAGE_KEY_LAST_MONTH_YEAR_RESET = 'smartSpendAnalyzer_lastMonthYearReset';
    const STORAGE_KEY_NEEDS_BUDGET = 'smartSpendAnalyzer_needsBudget';
    const STORAGE_KEY_WANTS_BUDGET = 'smartSpendAnalyzer_wantsBudget';

    // --- CUSTOMIZED KEYWORDS FOR NEEDS VS. WANTS DETECTION ---
    const needsKeywords = [
        'fruits', 'vegetables', 'paneer', 'milk', 'petrol', 'groceries', 'oats', 'protein powder',
        'rent', 'utilities', 'electricity', 'water', 'internet', 'loan', 'emi', 'insurance', 'medicine', 'doctor'
    ];

    const wantsKeywords = [
        'tea', 'coffee', 'juice', 'tiffins', 'chips', 'manchuria', 'noodles', 'puffs',
        'restaurant', 'movie', 'concert', 'shopping', 'clothes', 'gadget', 'holiday', 'trip', 'gift', 'hobby'
    ];
    // --- END CUSTOMIZED KEYWORDS ---

    // --- MAPPING SUBCATEGORY TO MAIN TYPE --- (Used if user selects subcategory)
    const subCategoryToType = {
        'Groceries': 'Need',
        'Transport': 'Need',
        'Bills': 'Need',
        'Health': 'Need',
        'Education': 'Need',
        'Housing': 'Need',
        'Utilities': 'Need',
        'Dining Out': 'Want',
        'Entertainment': 'Want',
        'Shopping': 'Want',
        'Hobbies': 'Want',
        'Travel': 'Want',
        'Personal Care': 'Want',
        'Gifts': 'Want',
        'Investment': 'Other',
        'Savings': 'Other',
        'Income': 'Other', // This option in select is now for expenses, not the new income tracking
        'Miscellaneous': 'Uncategorized'
    };

    // --- Initialization ---
    function initializeApp() {
        const today = new Date();
        expenseDateInput.value = today.toISOString().split('T')[0];
        incomeDateInput.value = today.toISOString().split('T')[0]; // NEW

        loadData();
        renderFinancialSummary();
        renderExpenses();
        renderIncome(); // NEW
        renderCharts();
    }

    function loadData() {
        const storedExpenses = localStorage.getItem(STORAGE_KEY_EXPENSES);
        if (storedExpenses) {
            try {
                expenses = JSON.parse(storedExpenses);
                expenses = expenses.map(exp => ({
                    ...exp,
                    id: exp.id || Date.now() + Math.random(),
                    subCategory: exp.subCategory || 'Miscellaneous'
                }));
            } catch (e) {
                console.error("Error parsing expenses from localStorage:", e);
                expenses = [];
            }
        }

        // NEW: Load Income Data
        const storedIncome = localStorage.getItem(STORAGE_KEY_INCOME);
        if (storedIncome) {
            try {
                income = JSON.parse(storedIncome);
                income = income.map(inc => ({
                    ...inc,
                    id: inc.id || Date.now() + Math.random(),
                    allocationType: inc.allocationType || 'Unallocated' // Default if not present
                }));
            } catch (e) {
                console.error("Error parsing income from localStorage:", e);
                income = [];
            }
        }
        // END NEW

        const storedBalance = localStorage.getItem(STORAGE_KEY_STARTING_BALANCE);
        if (storedBalance) {
            currentMonthStartingBalance = parseFloat(storedBalance);
            startingBalanceInput.value = currentMonthStartingBalance;
        }

        const storedNeedsBudget = localStorage.getItem(STORAGE_KEY_NEEDS_BUDGET);
        if (storedNeedsBudget) {
            needsBudget = parseFloat(storedNeedsBudget);
            needsBudgetInput.value = needsBudget;
        }
        const storedWantsBudget = localStorage.getItem(STORAGE_KEY_WANTS_BUDGET);
        if (storedWantsBudget) {
            wantsBudget = parseFloat(storedWantsBudget);
            wantsBudgetInput.value = wantsBudget;
        }

        // --- Logic for new month starting balance and budgets ---
        const today = new Date();
        const currentMonthYear = `${today.getFullYear()}-${today.getMonth()}`;
        const lastMonthYearReset = localStorage.getItem(STORAGE_KEY_LAST_MONTH_YEAR_RESET);

        if (lastMonthYearReset !== currentMonthYear) {
            alert("New month detected! Please set your 'Starting Monthly Balance' and 'Budgets' for this month.");
            startingBalanceInput.value = '';
            needsBudgetInput.value = '';
            wantsBudgetInput.value = '';

            currentMonthStartingBalance = 0;
            needsBudget = 0;
            wantsBudget = 0;

            localStorage.removeItem(STORAGE_KEY_STARTING_BALANCE);
            localStorage.removeItem(STORAGE_KEY_NEEDS_BUDGET);
            localStorage.removeItem(STORAGE_KEY_WANTS_BUDGET);

            // Keep current month's expenses/income for historical viewing, but reset summary
            // A more advanced app would archive previous month's data. For now, we just reset the flags.
            // If you want to clear expenses/income for the new month, you'd add:
            // expenses = [];
            // income = [];
            // localStorage.removeItem(STORAGE_KEY_EXPENSES);
            // localStorage.removeItem(STORAGE_KEY_INCOME);

            localStorage.setItem(STORAGE_KEY_LAST_MONTH_YEAR_RESET, currentMonthYear);
            saveData();
        }
    }

    function saveData() {
        localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(expenses));
        localStorage.setItem(STORAGE_KEY_INCOME, JSON.stringify(income)); // NEW
        if (!isNaN(currentMonthStartingBalance) && currentMonthStartingBalance > 0) {
             localStorage.setItem(STORAGE_KEY_STARTING_BALANCE, currentMonthStartingBalance.toString());
        } else {
             localStorage.removeItem(STORAGE_KEY_STARTING_BALANCE);
        }
        localStorage.setItem(STORAGE_KEY_NEEDS_BUDGET, needsBudget.toString());
        localStorage.setItem(STORAGE_KEY_WANTS_BUDGET, wantsBudget.toString());
    }

    // --- Financial Summary Logic ---
    function calculateFinancialMetrics() { // Renamed for broader scope
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        let needsTotalSpent = 0;
        let wantsTotalSpent = 0;
        let uncategorizedTotalSpent = 0;
        let totalSpent = 0;
        let totalIncome = 0; // NEW
        let totalSavingsAllocation = 0; // NEW (from income)

        expenses.forEach(expense => {
            const expenseDate = new Date(expense.date);
            if (expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear) {
                totalSpent += expense.amount;
                if (expense.type === 'Need') {
                    needsTotalSpent += expense.amount;
                } else if (expense.type === 'Want') {
                    wantsTotalSpent += expense.amount;
                } else {
                    uncategorizedTotalSpent += expense.amount;
                }
            }
        });

        // NEW: Calculate Total Income and Savings Allocation
        income.forEach(inc => {
            const incomeDate = new Date(inc.date);
            if (incomeDate.getMonth() === currentMonth && incomeDate.getFullYear() === currentYear) {
                totalIncome += inc.amount;
                if (inc.allocationType === 'Savings/Investments') {
                    totalSavingsAllocation += inc.amount;
                }
            }
        });
        // END NEW

        const netIncome = totalIncome - totalSpent; // NEW
        const savingsRate = totalIncome > 0 ? (totalSavingsAllocation / totalIncome) * 100 : 0; // NEW

        return {
            needsTotalSpent,
            wantsTotalSpent,
            uncategorizedTotalSpent,
            totalSpent,
            totalIncome, // NEW
            netIncome,   // NEW
            savingsRate  // NEW
        };
    }

    function renderFinancialSummary() {
        const {
            needsTotalSpent,
            wantsTotalSpent,
            uncategorizedTotalSpent,
            totalSpent,
            totalIncome,
            netIncome,
            savingsRate
        } = calculateFinancialMetrics(); // Using the new function

        totalSpentSpan.textContent = `₹ ${totalSpent.toFixed(2)}`;
        remainingBalanceSpan.textContent = `₹ ${(currentMonthStartingBalance + totalIncome - totalSpent).toFixed(2)}`; // Updated remaining balance

        // NEW: Display Income Summary
        totalIncomeSpan.textContent = `₹ ${totalIncome.toFixed(2)}`;
        netIncomeSpan.textContent = `₹ ${netIncome.toFixed(2)}`;
        savingsRateSpan.textContent = `${savingsRate.toFixed(2)}%`;
        // END NEW

        // Display Category Budgets
        budgetNeedsInfo.innerHTML = `₹ ${needsTotalSpent.toFixed(2)} / ₹ ${needsBudget.toFixed(2)} (Spent)`;
        budgetWantsInfo.innerHTML = `₹ ${wantsTotalSpent.toFixed(2)} / ₹ ${wantsBudget.toFixed(2)} (Spent)`;

        // Update progress bars
        updateProgressBar(needsProgressBar, needsTotalSpent, needsBudget);
        updateProgressBar(wantsProgressBar, wantsTotalSpent, wantsBudget);

        // Pace Yourself Indicator
        renderPaceYourselfIndicator(totalSpent, needsTotalSpent, wantsTotalSpent);
    }

    function updateProgressBar(progressBarElement, spent, budget) {
        let percentage = 0;
        if (budget > 0) {
            percentage = (spent / budget) * 100;
        }

        progressBarElement.style.width = `${Math.min(percentage, 100)}%`;
        progressBarElement.classList.remove('green', 'orange', 'red');

        if (percentage <= 70) {
            progressBarElement.classList.add('green');
        } else if (percentage <= 100) {
            progressBarElement.classList.add('orange');
        } else {
            progressBarElement.classList.add('red');
        }
    }

    function renderPaceYourselfIndicator(totalSpent, needsSpent, wantsSpent) {
        const today = new Date();
        const dayOfMonth = today.getDate();
        const daysInCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

        const percentageOfMonthPassed = (dayOfMonth / daysInCurrentMonth) * 100;

        const { totalIncome } = calculateFinancialMetrics(); // Get total income for pace calculation
        let totalBudget = needsBudget + wantsBudget + (currentMonthStartingBalance + totalIncome - needsBudget - wantsBudget > 0 ? (currentMonthStartingBalance + totalIncome - needsBudget - wantsBudget) : 0);

        let totalSpentPercentage = (totalSpent / totalBudget) * 100;

        let paceMessage = '';
        let paceColor = '';

        if (totalBudget === 0) {
            paceMessage = 'Set a total budget and starting balance/income to see your spending pace.';
            paceColor = 'gray';
        } else if (totalSpentPercentage < percentageOfMonthPassed - 10) {
            paceMessage = `You are pacing well! (${totalSpentPercentage.toFixed(0)}% spent, ${percentageOfMonthPassed.toFixed(0)}% of month passed)`;
            paceColor = 'green';
        } else if (totalSpentPercentage > percentageOfMonthPassed + 10) {
            paceMessage = `You are spending too fast! (${totalSpentPercentage.toFixed(0)}% spent, ${percentageOfMonthPassed.toFixed(0)}% of month passed)`;
            paceColor = 'red';
        } else {
            paceMessage = `You are on track! (${totalSpentPercentage.toFixed(0)}% spent, ${percentageOfMonthPassed.toFixed(0)}% of month passed)`;
            paceColor = 'yellow';
        }

        const needsPace = (needsSpent / needsBudget) * 100;
        const wantsPace = (wantsSpent / wantsBudget) * 100;

        if (needsBudget > 0 && needsPace > percentageOfMonthPassed + 10) {
            paceMessage += ` Consider slowing down on Needs.`;
        }
        if (wantsBudget > 0 && wantsPace > percentageOfMonthPassed + 10) {
            paceMessage += ` Consider slowing down on Wants.`;
        }

        paceYourselfInfo.textContent = paceMessage;
        paceYourselfInfo.className = '';
        paceYourselfInfo.classList.add(paceColor);
    }

    // --- Expense Management ---
    function detectExpenseType(note) {
        const lowerNote = note.toLowerCase();
        for (const keyword of needsKeywords) {
            if (lowerNote.includes(keyword)) {
                return 'Need';
            }
        }
        for (const keyword of wantsKeywords) {
            if (lowerNote.includes(keyword)) {
                return 'Want';
            }
        }
        return 'Uncategorized';
    }

    function addExpense() {
        const amount = parseFloat(expenseAmountInput.value);
        const date = expenseDateInput.value;
        const note = expenseNoteInput.value.trim();
        const selectedSubcategory = expenseSubcategoryInput.value;

        if (isNaN(amount) || amount <= 0 || !date || !note) {
            alert('Please enter a valid amount, date, and reason for the expense.');
            return;
        }

        let mainType;
        let subCategory = selectedSubcategory;

        if (selectedSubcategory && subCategoryToType[selectedSubcategory]) {
            mainType = subCategoryToType[selectedSubcategory];
        } else {
            mainType = detectExpenseType(note);
            if (!selectedSubcategory) {
                 if (mainType === 'Need') subCategory = 'Miscellaneous Needs';
                 else if (mainType === 'Want') subCategory = 'Miscellaneous Wants';
                 else subCategory = 'Miscellaneous';
            }
        }

        const newExpense = {
            id: Date.now(),
            amount: amount,
            date: date,
            note: note,
            type: mainType,
            subCategory: subCategory
        };

        expenses.push(newExpense);
        saveData();
        renderExpenses();
        renderFinancialSummary();
        renderCharts();
        clearExpenseForm();
    }

    function deleteExpense(id) {
        expenses = expenses.filter(expense => expense.id !== id);
        saveData();
        renderExpenses();
        renderFinancialSummary();
        renderCharts();
    }

    function renderExpenses() {
        expensesUl.innerHTML = '';

        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        const currentMonthExpenses = expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
        }).sort((a, b) => new Date(b.date) - new Date(a.date));

        if (currentMonthExpenses.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No expenses recorded for this month yet.';
            expensesUl.appendChild(li);
            return;
        }

        currentMonthExpenses.forEach(expense => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="expense-info">
                    <span class="expense-date">${expense.date}</span> -
                    <span class="expense-note">${expense.note}</span>
                </div>
                <span class="expense-amount">₹ ${expense.amount.toFixed(2)}</span>
                <span class="expense-type">(${expense.type}${expense.subCategory ? ' - ' + expense.subCategory : ''})</span>
                <button class="delete-btn" data-id="${expense.id}" data-type="expense">Delete</button>
            `;
            expensesUl.appendChild(li);
        });

        document.querySelectorAll('.expense-list .delete-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const idToDelete = parseInt(e.target.dataset.id);
                deleteExpense(idToDelete);
            });
        });
    }

    function clearExpenseForm() {
        expenseAmountInput.value = '';
        expenseNoteInput.value = '';
        expenseSubcategoryInput.value = '';
        const today = new Date();
        expenseDateInput.value = today.toISOString().split('T')[0];
    }

    // --- NEW: Income Management ---
    function addIncome() {
        const amount = parseFloat(incomeAmountInput.value);
        const date = incomeDateInput.value;
        const note = incomeNoteInput.value.trim();
        const allocationType = incomeAllocationInput.value;

        if (isNaN(amount) || amount <= 0 || !date || !note) {
            alert('Please enter a valid amount, date, and source/note for the income.');
            return;
        }

        const newIncome = {
            id: Date.now(),
            amount: amount,
            date: date,
            note: note,
            allocationType: allocationType // e.g., 'Needs', 'Wants', 'Savings/Investments', 'Unallocated'
        };

        income.push(newIncome);
        saveData();
        renderIncome();
        renderFinancialSummary();
        clearIncomeForm();
    }

    function deleteIncome(id) {
        income = income.filter(inc => inc.id !== id);
        saveData();
        renderIncome();
        renderFinancialSummary();
    }

    function renderIncome() {
        incomeUl.innerHTML = '';

        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        const currentMonthIncome = income.filter(inc => {
            const incomeDate = new Date(inc.date);
            return incomeDate.getMonth() === currentMonth && incomeDate.getFullYear() === currentYear;
        }).sort((a, b) => new Date(b.date) - new Date(a.date));

        if (currentMonthIncome.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No income recorded for this month yet.';
            incomeUl.appendChild(li);
            return;
        }

        currentMonthIncome.forEach(inc => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="expense-info">
                    <span class="expense-date">${inc.date}</span> -
                    <span class="expense-note">${inc.note}</span>
                </div>
                <span class="expense-amount income-amount-display">₹ ${inc.amount.toFixed(2)}</span>
                <span class="expense-type">(${inc.allocationType})</span>
                <button class="delete-btn" data-id="${inc.id}" data-type="income">Delete</button>
            `;
            incomeUl.appendChild(li);
        });

        document.querySelectorAll('.income-list .delete-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const idToDelete = parseInt(e.target.dataset.id);
                deleteIncome(idToDelete);
            });
        });
    }

    function clearIncomeForm() {
        incomeAmountInput.value = '';
        incomeNoteInput.value = '';
        incomeAllocationInput.value = 'Unallocated'; // Reset to default
        const today = new Date();
        incomeDateInput.value = today.toISOString().split('T')[0];
    }
    // END NEW Income Management

    // --- Chart Rendering ---
    function renderCharts() {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        const currentMonthExpenses = expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
        });

        // Chart 1: Needs vs. Wants
        const needsTotal = currentMonthExpenses
            .filter(e => e.type === 'Need')
            .reduce((sum, e) => sum + e.amount, 0);
        const wantsTotal = currentMonthExpenses
            .filter(e => e.type === 'Want')
            .reduce((sum, e) => sum + e.amount, 0);
        const uncategorizedTotal = currentMonthExpenses
            .filter(e => e.type === 'Uncategorized' || e.type === 'Other')
            .reduce((sum, e) => sum + e.amount, 0);

        if (needsWantsChart) needsWantsChart.destroy();

        needsWantsChart = new Chart(needsWantsChartCtx, {
            type: 'pie',
            data: {
                labels: ['Needs', 'Wants', 'Other/Uncategorized'],
                datasets: [{
                    data: [needsTotal, wantsTotal, uncategorizedTotal],
                    backgroundColor: ['#28a745', '#dc3545', '#ffc107'],
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Needs vs. Wants Spending (This Month)',
                        font: { size: 16 }
                    }
                }
            }
        });

        // Chart 2: Spending by SUB-CATEGORY
        const subCategoryTotals = currentMonthExpenses.reduce((acc, expense) => {
            const subCat = expense.subCategory || 'Uncategorized';
            acc[subCat] = (acc[subCat] || 0) + expense.amount;
            return acc;
        }, {});

        const sortedSubCategories = Object.entries(subCategoryTotals).sort(([, a], [, b]) => b - a);
        const subCategoryLabels = sortedSubCategories.map(([label]) => label);
        const subCategoryData = sortedSubCategories.map(([, data]) => data);

        const subCategoryBackgroundColors = subCategoryLabels.map(label => {
            const mainType = subCategoryToType[label] || 'Uncategorized';
            if (mainType === 'Need') return '#28a745';
            if (mainType === 'Want') return '#dc3545';
            return '#ffc107';
        });

        if (categoryChart) categoryChart.destroy();

        categoryChart = new Chart(categoryChartCtx, {
            type: 'bar',
            data: {
                labels: subCategoryLabels,
                datasets: [{
                    label: 'Amount Spent (₹)',
                    data: subCategoryData,
                    backgroundColor: subCategoryBackgroundColors,
                    borderColor: subCategoryBackgroundColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Spending by Sub-Category (This Month)',
                        font: { size: 16 }
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Amount (₹)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Sub-Category'
                        }
                    }
                }
            }
        });
    }

    // --- Event Listeners ---
    saveBalanceBtn.addEventListener('click', () => {
        const newBalance = parseFloat(startingBalanceInput.value);
        if (!isNaN(newBalance) && newBalance >= 0) {
            currentMonthStartingBalance = newBalance;
            const today = new Date();
            const currentMonthYear = `${today.getFullYear()}-${today.getMonth()}`;
            localStorage.setItem(STORAGE_KEY_LAST_MONTH_YEAR_RESET, currentMonthYear);
            saveData();
            renderFinancialSummary();
            alert('Starting balance saved!');
        } else {
            alert('Please enter a valid positive number for your starting balance.');
        }
    });

    saveBudgetsBtn.addEventListener('click', () => {
        const newNeedsBudget = parseFloat(needsBudgetInput.value);
        const newWantsBudget = parseFloat(wantsBudgetInput.value);

        if ((!isNaN(newNeedsBudget) && newNeedsBudget >= 0) && (!isNaN(newWantsBudget) && newWantsBudget >= 0)) {
            needsBudget = newNeedsBudget;
            wantsBudget = newWantsBudget;
            saveData();
            renderFinancialSummary();
            alert('Budgets saved!');
        } else {
            alert('Please enter valid positive numbers for both Needs and Wants budgets.');
        }
    });

    addExpenseBtn.addEventListener('click', addExpense);
    addIncomeBtn.addEventListener('click', addIncome); // NEW

    // Initial load
    initializeApp();
});
