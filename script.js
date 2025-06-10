document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const startingBalanceInput = document.getElementById('starting-balance');
    const saveBalanceBtn = document.getElementById('save-balance-btn');
    const totalSpentSpan = document.getElementById('total-spent');
    const remainingBalanceSpan = document.getElementById('remaining-balance');

    // Income Summary DOM Elements
    const totalIncomeSpan = document.getElementById('total-income');
    const netIncomeSpan = document.getElementById('net-income');
    const savingsRateSpan = document.getElementById('savings-rate');

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

    const incomeAmountInput = document.getElementById('income-amount');
    const incomeDateInput = document.getElementById('income-date');
    const incomeNoteInput = document.getElementById('income-note');
    const incomeAllocationInput = document.getElementById('income-allocation');
    const addIncomeBtn = document.getElementById('add-income-btn');
    const incomeUl = document.getElementById('income-ul');

    const needsWantsChartCtx = document.getElementById('needsWantsChart').getContext('2d');
    const categoryChartCtx = document.getElementById('categoryChart').getContext('2d');

    let needsWantsChart;
    let categoryChart;

    // NEW DOM Elements for Month Navigation
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const currentMonthDisplay = document.getElementById('current-month-display');
    // END NEW

    let expenses = [];
    let income = [];
    let currentMonthStartingBalance = 0; // This will remain the CURRENT active month's balance
    let needsBudget = 0; // This will remain the CURRENT active month's budget
    let wantsBudget = 0; // This will remain the CURRENT active month's budget

    // NEW: Variable to track the month being viewed
    // This will be a Date object, always set to the 1st of the month
    let currentViewingDate = new Date();


    const STORAGE_KEY_EXPENSES = 'smartSpendExpenses';
    const STORAGE_KEY_INCOME = 'smartSpendIncome';
    const STORAGE_KEY_STARTING_BALANCE = 'smartSpendStartingBalance';
    const STORAGE_KEY_NEEDS_BUDGET = 'smartSpendNeedsBudget';
    const STORAGE_KEY_WANTS_BUDGET = 'smartSpendWantsBudget';
    const STORAGE_KEY_LAST_MONTH_YEAR_RESET = 'smartSpendLastMonthYearReset';


    const subCategoryToType = {
        "Rent/Mortgage": "Need", "Utilities": "Need", "Groceries": "Need", "Transportation": "Need",
        "Healthcare": "Need", "Insurance": "Need", "Loan Payments": "Need", "Miscellaneous Needs": "Need",
        "Dining Out": "Want", "Entertainment": "Want", "Shopping": "Want", "Travel": "Want",
        "Hobbies": "Want", "Subscriptions": "Want", "Miscellaneous Wants": "Want",
        "Investments": "Other", "Savings": "Other", "Charity": "Other", "Gifts": "Other", "Uncategorized": "Other"
    };

    // --- Initialization ---
    function initializeApp() {
        const today = new Date();
        expenseDateInput.value = today.toISOString().split('T')[0];
        incomeDateInput.value = today.toISOString().split('T')[0];

        // Set currentViewingDate to the start of the current month
        currentViewingDate.setDate(1); // Set to 1st to avoid issues with month lengths (e.g., Feb 30th)

        loadData();
        // Initial render will be for the current month
        updateMonthDisplay(); // NEW
        renderAllDisplayedData(); // Consolidated rendering function
    }

    function renderAllDisplayedData() {
        renderFinancialSummary();
        renderExpenses();
        renderIncome();
        renderCharts();
    }

    function loadData() {
        // Load ALL historical expenses and income data
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

        const storedIncome = localStorage.getItem(STORAGE_KEY_INCOME);
        if (storedIncome) {
            try {
                income = JSON.parse(storedIncome);
                income = income.map(inc => ({
                    ...inc,
                    id: inc.id || Date.now() + Math.random(),
                    allocationType: inc.allocationType || 'Unallocated'
                }));
            } catch (e) {
                console.error("Error parsing income from localStorage:", e);
                income = [];
            }
        }

        // Load current month's starting balance and budgets ONLY if we are viewing the *actual* current month
        const today = new Date();
        const actualCurrentMonthYear = `${today.getFullYear()}-${today.getMonth()}`;
        const lastMonthYearReset = localStorage.getItem(STORAGE_KEY_LAST_MONTH_YEAR_RESET);


        // Check if it's a new actual month and we haven't reset for it yet
        if (lastMonthYearReset !== actualCurrentMonthYear) {
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
            localStorage.setItem(STORAGE_KEY_LAST_MONTH_YEAR_RESET, actualCurrentMonthYear);
            saveData(); // Save the cleared current month data (expenses/income are not cleared)
        } else {
             // Only load these if it's not a new month, or if it's the current month being viewed
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
        }

        // Disable budget/balance inputs if not viewing current month
        const isViewingCurrentMonth = currentViewingDate.getMonth() === today.getMonth() && currentViewingDate.getFullYear() === today.getFullYear();
        startingBalanceInput.disabled = !isViewingCurrentMonth;
        saveBalanceBtn.disabled = !isViewingCurrentMonth;
        needsBudgetInput.disabled = !isViewingCurrentMonth;
        wantsBudgetInput.disabled = !isViewingCurrentMonth;
        saveBudgetsBtn.disabled = !isViewingCurrentMonth;
        addExpenseBtn.disabled = !isViewingCurrentMonth; // Disable adding expenses/income for past/future months
        addIncomeBtn.disabled = !isViewingCurrentMonth; // Disable adding expenses/income for past/future months

        // Clear forms if not viewing current month, so user doesn't accidentally add to wrong month
        if (!isViewingCurrentMonth) {
            clearExpenseForm();
            clearIncomeForm();
        }
    }

    function saveData() {
        // Only save current month's active balance and budgets (if applicable)
        localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(expenses));
        localStorage.setItem(STORAGE_KEY_INCOME, JSON.stringify(income));
        // Only save starting balance if it's set and valid
        if (!isNaN(currentMonthStartingBalance) && currentMonthStartingBalance > 0) {
             localStorage.setItem(STORAGE_KEY_STARTING_BALANCE, currentMonthStartingBalance.toString());
        } else {
             localStorage.removeItem(STORAGE_KEY_STARTING_BALANCE); // Clear if invalid/zero
        }
        localStorage.setItem(STORAGE_KEY_NEEDS_BUDGET, needsBudget.toString());
        localStorage.setItem(STORAGE_KEY_WANTS_BUDGET, wantsBudget.toString());
    }

    function clearExpenseForm() {
        expenseAmountInput.value = '';
        expenseNoteInput.value = '';
        expenseSubcategoryInput.value = '';
        expenseDateInput.value = new Date().toISOString().split('T')[0];
    }

    function clearIncomeForm() {
        incomeAmountInput.value = '';
        incomeNoteInput.value = '';
        incomeAllocationInput.value = 'Unallocated';
        incomeDateInput.value = new Date().toISOString().split('T')[0];
    }


    // NEW: Function to filter data for the currently viewed month
    function getFilteredExpenses() {
        return expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getMonth() === currentViewingDate.getMonth() && expenseDate.getFullYear() === currentViewingDate.getFullYear();
        });
    }

    // NEW: Function to filter income for the currently viewed month
    function getFilteredIncome() {
        return income.filter(inc => {
            const incomeDate = new Date(inc.date);
            return incomeDate.getMonth() === currentViewingDate.getMonth() && incomeDate.getFullYear() === currentViewingDate.getFullYear();
        });
    }

    function detectExpenseType(note) {
        const needsKeywords = ['rent', 'haircut', 'petrol', 'electricity', 'water bill', 'gas bill', 'internet', 'phone bill', 'groceries', 'food', 'supermarket', 'transport', 'fuel', 'bus', 'train', 'taxi', 'healthcare', 'doctor', 'medicine', 'hospital', 'insurance', 'loan', 'emi'];
        const wantsKeywords = ['tiffin', 'lunch', 'hotel', 'movie', 'tea', 'chips', 'shopping', 'clothes', 'gym', 'travel', 'vacation', 'hobby', 'book', 'subscription', 'gym', 'spa'];

        const lowerCaseNote = note.toLowerCase();

        for (const keyword of needsKeywords) {
            if (lowerCaseNote.includes(keyword)) {
                return 'Need';
            }
        }
        for (const keyword of wantsKeywords) {
            if (lowerCaseNote.includes(keyword)) {
                return 'Want';
            }
        }
        return 'Uncategorized';
    }


    // --- Financial Summary Logic ---
    function calculateFinancialMetrics() {
        const filteredExpenses = getFilteredExpenses(); // Use filtered expenses
        const filteredIncome = getFilteredIncome();     // Use filtered income

        let needsTotalSpent = 0;
        let wantsTotalSpent = 0;
        let uncategorizedTotalSpent = 0;
        let totalSpent = 0;
        let totalIncome = 0;
        let totalSavingsAllocation = 0;

        filteredExpenses.forEach(expense => {
            totalSpent += expense.amount;
            if (expense.type === 'Need') {
                needsTotalSpent += expense.amount;
            } else if (expense.type === 'Want') {
                wantsTotalSpent += expense.amount;
            } else {
                uncategorizedTotalSpent += expense.amount;
            }
        });

        filteredIncome.forEach(inc => {
            totalIncome += inc.amount;
            if (inc.allocationType === 'Savings/Investments') {
                totalSavingsAllocation += inc.amount;
            }
        });

        // The remaining balance calculation needs to be more nuanced for past/future months.
        // For simplicity, for past/future months, we'll display total spent/income for that month.
        // The 'remaining balance' and 'net income' will primarily make sense for the *current* active month.
        // If viewing a past month, 'remaining balance' will show how much was left over (or overspent) at the end of *that* month.
        let effectiveStartingBalance = 0;
        let effectiveNeedsBudget = 0;
        let effectiveWantsBudget = 0;

        const today = new Date();
        if (currentViewingDate.getMonth() === today.getMonth() && currentViewingDate.getFullYear() === today.getFullYear()) {
            // If viewing the current month, use the actively set balance and budgets
            effectiveStartingBalance = currentMonthStartingBalance;
            effectiveNeedsBudget = needsBudget;
            effectiveWantsBudget = wantsBudget;
        } else {
            // For past/future months, we don't have stored specific budgets/balances for them in this simple model.
            // We'll just show the income/expenses for that month.
            // You could implement a more complex storage system to save historical budgets if needed.
        }

        const netIncome = totalIncome - totalSpent;
        const savingsRate = totalIncome > 0 ? (totalSavingsAllocation / totalIncome) * 100 : 0;

        return {
            needsTotalSpent,
            wantsTotalSpent,
            uncategorizedTotalSpent,
            totalSpent,
            totalIncome,
            netIncome,
            savingsRate,
            effectiveStartingBalance, // Pass these through
            effectiveNeedsBudget,
            effectiveWantsBudget
        };
    }

    function updateProgressBar(progressBar, spent, budget) {
        if (budget === 0) {
            progressBar.style.width = '0%';
            progressBar.classList.remove('green', 'orange', 'red');
            return;
        }
        const percentage = (spent / budget) * 100;
        progressBar.style.width = `${Math.min(percentage, 100)}%`;
        progressBar.classList.remove('green', 'orange', 'red'); // Reset classes

        if (percentage < 70) {
            progressBar.classList.add('green');
        } else if (percentage >= 70 && percentage < 100) {
            progressBar.classList.add('orange');
        } else {
            progressBar.classList.add('red');
        }
    }

    function renderFinancialSummary() {
        const {
            needsTotalSpent,
            wantsTotalSpent,
            uncategorizedTotalSpent,
            totalSpent,
            totalIncome,
            netIncome,
            savingsRate,
            effectiveStartingBalance,
            effectiveNeedsBudget,
            effectiveWantsBudget
        } = calculateFinancialMetrics();

        totalSpentSpan.textContent = `₹ ${totalSpent.toFixed(2)}`;
        // Remaining Balance for current month, or net for historical
        const today = new Date();
        if (currentViewingDate.getMonth() === today.getMonth() && currentViewingDate.getFullYear() === today.getFullYear()) {
            remainingBalanceSpan.textContent = `₹ ${(effectiveStartingBalance + totalIncome - totalSpent).toFixed(2)}`;
        } else {
             remainingBalanceSpan.textContent = `₹ ${netIncome.toFixed(2)} (Net for ${currentViewingDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })})`; // Indicate it's net for historical
        }


        totalIncomeSpan.textContent = `₹ ${totalIncome.toFixed(2)}`;
        netIncomeSpan.textContent = `₹ ${netIncome.toFixed(2)}`;
        savingsRateSpan.textContent = `${savingsRate.toFixed(2)}%`;

        // Display Category Budgets
        // For historical months, show "N/A" for budgets unless specifically set for that month
        if (currentViewingDate.getMonth() === today.getMonth() && currentViewingDate.getFullYear() === today.getFullYear()) {
            budgetNeedsInfo.innerHTML = `₹ ${needsTotalSpent.toFixed(2)} / ₹ ${effectiveNeedsBudget.toFixed(2)} (Spent)`;
            budgetWantsInfo.innerHTML = `₹ ${wantsTotalSpent.toFixed(2)} / ₹ ${effectiveWantsBudget.toFixed(2)} (Spent)`;
            updateProgressBar(needsProgressBar, needsTotalSpent, effectiveNeedsBudget);
            updateProgressBar(wantsProgressBar, wantsTotalSpent, effectiveWantsBudget);
            renderPaceYourselfIndicator(totalSpent, needsTotalSpent, wantsTotalSpent, effectiveNeedsBudget, effectiveWantsBudget, totalIncome); // Pass all required
        } else {
            budgetNeedsInfo.innerHTML = `₹ ${needsTotalSpent.toFixed(2)} / N/A (Spent)`;
            budgetWantsInfo.innerHTML = `₹ ${wantsTotalSpent.toFixed(2)} / N/A (Spent)`;
            needsProgressBar.style.width = '0%'; // No progress bar for past/future budgets
            wantsProgressBar.style.width = '0%';
            needsProgressBar.classList.remove('green', 'orange', 'red');
            wantsProgressBar.classList.remove('green', 'orange', 'red');
            paceYourselfInfo.textContent = 'Budgets and pace tracking are for the current month.';
            paceYourselfInfo.className = 'gray';
        }
    }

    // Adjusted renderPaceYourselfIndicator to accept budget and income values
    function renderPaceYourselfIndicator(totalSpent, needsSpent, wantsSpent, currentNeedsBudget, currentWantsBudget, totalIncome) {
        const today = new Date();
        // Only calculate pace for the current month
        if (currentViewingDate.getMonth() !== today.getMonth() || currentViewingDate.getFullYear() !== today.getFullYear()) {
            paceYourselfInfo.textContent = 'Pace tracking is for the current month.';
            paceYourselfInfo.className = 'gray';
            return;
        }

        const dayOfMonth = today.getDate();
        const daysInCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

        const percentageOfMonthPassed = (dayOfMonth / daysInCurrentMonth) * 100;

        // Calculate total available funds for the month
        let totalBudget = currentNeedsBudget + currentWantsBudget + (currentMonthStartingBalance + totalIncome - currentNeedsBudget - currentWantsBudget > 0 ? (currentMonthStartingBalance + totalIncome - currentNeedsBudget - currentWantsBudget) : 0);

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

        // Add specific warnings for Needs and Wants if over budget
        const needsPace = (needsSpent / currentNeedsBudget) * 100;
        const wantsPace = (wantsSpent / currentWantsBudget) * 100;

        if (currentNeedsBudget > 0 && needsPace > percentageOfMonthPassed + 10) {
            paceMessage += ` Consider slowing down on Needs.`;
        }
        if (currentWantsBudget > 0 && wantsPace > percentageOfMonthPassed + 10) {
            paceMessage += ` Consider slowing down on Wants.`;
        }


        paceYourselfInfo.textContent = paceMessage;
        paceYourselfInfo.className = '';
        paceYourselfInfo.classList.add(paceColor);
    }


    // --- Expense Management ---
    function addExpense() {
        const amount = parseFloat(expenseAmountInput.value);
        const date = expenseDateInput.value;
        const note = expenseNoteInput.value.trim();
        const selectedSubcategory = expenseSubcategoryInput.value;

        if (isNaN(amount) || amount <= 0 || !date || !note) {
            alert('Please enter a valid amount, date, and reason for the expense.');
            return;
        }

        // Check if the expense date is for the *current active* month
        const today = new Date();
        const expenseDateObj = new Date(date);
        if (expenseDateObj.getMonth() !== today.getMonth() || expenseDateObj.getFullYear() !== today.getFullYear()) {
            alert('Expenses can only be added for the current month.');
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
        renderAllDisplayedData(); // Re-render all sections
        clearExpenseForm();
    }

    function deleteExpense(id) {
        expenses = expenses.filter(expense => expense.id !== id);
        saveData();
        renderAllDisplayedData(); // Re-render all sections
    }

    function renderExpenses() {
        expensesUl.innerHTML = '';

        const currentMonthExpenses = getFilteredExpenses().sort((a, b) => new Date(b.date) - new Date(a.date));

        if (currentMonthExpenses.length === 0) {
            const li = document.createElement('li');
            li.textContent = `No expenses recorded for ${currentViewingDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })} yet.`;
            expensesUl.appendChild(li);
            return;
        }

        const today = new Date();
        const isViewingCurrentMonth = currentViewingDate.getMonth() === today.getMonth() && currentViewingDate.getFullYear() === today.getFullYear();


        currentMonthExpenses.forEach(expense => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="expense-info">
                    <span class="expense-date">${expense.date}</span> -
                    <span class="expense-note">${expense.note}</span>
                </div>
                <span class="expense-amount">₹ ${expense.amount.toFixed(2)}</span>
                <span class="expense-type">(${expense.type}${expense.subCategory ? ' - ' + expense.subCategory : ''})</span>
                ${isViewingCurrentMonth ? `<button class="delete-btn" data-id="${expense.id}" data-type="expense">Delete</button>` : ''}
            `; // Only show delete button for current month
            expensesUl.appendChild(li);
        });

        // Only add event listeners if viewing current month
        if (isViewingCurrentMonth) {
            document.querySelectorAll('.expense-list .delete-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const idToDelete = parseInt(e.target.dataset.id);
                    deleteExpense(idToDelete);
                });
            });
        }
    }


    // --- Income Management ---
    function addIncome() {
        const amount = parseFloat(incomeAmountInput.value);
        const date = incomeDateInput.value;
        const note = incomeNoteInput.value.trim();
        const allocationType = incomeAllocationInput.value;

        if (isNaN(amount) || amount <= 0 || !date || !note) {
            alert('Please enter a valid amount, date, and source/note for the income.');
            return;
        }

        // Check if the income date is for the *current active* month
        const today = new Date();
        const incomeDateObj = new Date(date);
        if (incomeDateObj.getMonth() !== today.getMonth() || incomeDateObj.getFullYear() !== today.getFullYear()) {
            alert('Income can only be added for the current month.');
            return;
        }

        const newIncome = {
            id: Date.now(),
            amount: amount,
            date: date,
            note: note,
            allocationType: allocationType
        };

        income.push(newIncome);
        saveData();
        renderAllDisplayedData(); // Re-render all sections
        clearIncomeForm();
    }

    function deleteIncome(id) {
        income = income.filter(inc => inc.id !== id);
        saveData();
        renderAllDisplayedData(); // Re-render all sections
    }

    function renderIncome() {
        incomeUl.innerHTML = '';

        const currentMonthIncome = getFilteredIncome().sort((a, b) => new Date(b.date) - new Date(a.date));

        if (currentMonthIncome.length === 0) {
            const li = document.createElement('li');
            li.textContent = `No income recorded for ${currentViewingDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })} yet.`;
            incomeUl.appendChild(li);
            return;
        }

        const today = new Date();
        const isViewingCurrentMonth = currentViewingDate.getMonth() === today.getMonth() && currentViewingDate.getFullYear() === today.getFullYear();


        currentMonthIncome.forEach(inc => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="expense-info">
                    <span class="expense-date">${inc.date}</span> -
                    <span class="expense-note">${inc.note}</span>
                </div>
                <span class="expense-amount income-amount-display">₹ ${inc.amount.toFixed(2)}</span>
                <span class="expense-type">(${inc.allocationType})</span>
                ${isViewingCurrentMonth ? `<button class="delete-btn" data-id="${inc.id}" data-type="income">Delete</button>` : ''}
            `; // Only show delete button for current month
            incomeUl.appendChild(li);
        });

        // Only add event listeners if viewing current month
        if (isViewingCurrentMonth) {
            document.querySelectorAll('.income-list .delete-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const idToDelete = parseInt(e.target.dataset.id);
                    deleteIncome(idToDelete);
                });
            });
        }
    }


    // --- Chart Rendering ---
    function renderCharts() {
        const filteredExpenses = getFilteredExpenses(); // Use filtered expenses

        // Chart 1: Needs vs. Wants
        const needsTotal = filteredExpenses
            .filter(e => e.type === 'Need')
            .reduce((sum, e) => sum + e.amount, 0);
        const wantsTotal = filteredExpenses
            .filter(e => e.type === 'Want')
            .reduce((sum, e) => sum + e.amount, 0);
        const uncategorizedTotal = filteredExpenses
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
                        text: `Needs vs. Wants Spending (${currentViewingDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })})`,
                        font: { size: 16 }
                    }
                }
            }
        });

        // Chart 2: Spending by SUB-CATEGORY
        const subCategoryTotals = filteredExpenses.reduce((acc, expense) => {
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
                        text: `Spending by Sub-Category (${currentViewingDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })})`,
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

    // NEW: Month Navigation Functions
    function updateMonthDisplay() {
        currentMonthDisplay.textContent = currentViewingDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    }

    function goToPreviousMonth() {
        currentViewingDate.setMonth(currentViewingDate.getMonth() - 1);
        // Important: set the date to 1st of the month to avoid issues with month lengths (e.g., going from March 31 to Feb 31, which doesn't exist)
        currentViewingDate.setDate(1);
        updateMonthDisplay();
        loadData(); // Re-load (to get current month budgets/balances if needed) and re-render
        renderAllDisplayedData();
    }

    function goToNextMonth() {
        const today = new Date();
        const nextMonthDate = new Date(currentViewingDate);
        nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
        nextMonthDate.setDate(1); // Set to 1st of the next month for comparison

        // Prevent navigating past the actual current month
        if (nextMonthDate.getMonth() > today.getMonth() || nextMonthDate.getFullYear() > today.getFullYear()) {
            alert("You cannot navigate past the current month.");
            return;
        }

        currentViewingDate.setMonth(currentViewingDate.getMonth() + 1);
        currentViewingDate.setDate(1); // Set to 1st
        updateMonthDisplay();
        loadData(); // Re-load (to get current month budgets/balances if needed) and re-render
        renderAllDisplayedData();
    }

    // --- Event Listeners ---
    saveBalanceBtn.addEventListener('click', () => {
        const newBalance = parseFloat(startingBalanceInput.value);
        const today = new Date();
        // Only allow saving balance for the actual current month
        if (currentViewingDate.getMonth() === today.getMonth() && currentViewingDate.getFullYear() === today.getFullYear()) {
            if (!isNaN(newBalance) && newBalance >= 0) {
                currentMonthStartingBalance = newBalance;
                // Update the last reset date only when a new balance is saved for the current month
                const currentMonthYear = `${today.getFullYear()}-${today.getMonth()}`;
                localStorage.setItem(STORAGE_KEY_LAST_MONTH_YEAR_RESET, currentMonthYear);
                saveData();
                renderFinancialSummary();
                alert('Starting balance saved!');
            } else {
                alert('Please enter a valid positive number for your starting balance.');
            }
        } else {
            alert('Starting balance can only be set for the current active month.');
        }
    });

    saveBudgetsBtn.addEventListener('click', () => {
        const newNeedsBudget = parseFloat(needsBudgetInput.value);
        const newWantsBudget = parseFloat(wantsBudgetInput.value);
        const today = new Date();
        // Only allow saving budgets for the actual current month
        if (currentViewingDate.getMonth() === today.getMonth() && currentViewingDate.getFullYear() === today.getFullYear()) {
            if ((!isNaN(newNeedsBudget) && newNeedsBudget >= 0) && (!isNaN(newWantsBudget) && newWantsBudget >= 0)) {
                needsBudget = newNeedsBudget;
                wantsBudget = newWantsBudget;
                saveData();
                renderFinancialSummary();
                alert('Budgets saved!');
            } else {
                alert('Please enter valid positive numbers for both Needs and Wants budgets.');
            }
        } else {
            alert('Budgets can only be set for the current active month.');
        }
    });

    addExpenseBtn.addEventListener('click', addExpense);
    addIncomeBtn.addEventListener('click', addIncome);

    // NEW Event Listeners for Month Navigation
    prevMonthBtn.addEventListener('click', goToPreviousMonth);
    nextMonthBtn.addEventListener('click', goToNextMonth);

    // Initial load
    initializeApp();
});
