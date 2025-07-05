document.addEventListener('DOMContentLoaded', () => {
    const expenseInputs = document.querySelectorAll('#expenseForm .expense-input');
    const totalAmountSpan = document.getElementById('totalAmount');
    const expenseForm = document.getElementById('expenseForm');
    const expensesTableBody = document.getElementById('expensesTableBody');
    const applyFilterBtn = document.getElementById('applyExpenseFilterBtn');
    const resetFilterBtn = document.getElementById('resetExpenseFilterBtn');
    const filterMonthInput = document.getElementById('filterMonthExpenses');

    const editModal = document.getElementById('editExpenseModal');
    const editForm = document.getElementById('editExpenseForm');
    const editExpenseIdInput = document.getElementById('editExpenseId');
    const editTotalAmountSpan = document.getElementById('editTotalAmount');
    const editExpenseInputs = document.querySelectorAll('#editExpenseForm .expense-input');

    let allExpenses = []; // Xərcləri yadda saxlamaq üçün

    const calculateTotal = (formType = 'new') => {
        let total = 0;
        const inputs = (formType === 'edit') ? editExpenseInputs : expenseInputs;
        const totalSpan = (formType === 'edit') ? editTotalAmountSpan : totalAmountSpan;

        inputs.forEach(input => {
            total += parseFloat(input.value) || 0;
        });
        if(totalSpan) {
            totalSpan.textContent = total.toFixed(2);
        }
    };

    const fetchAndRenderExpenses = async () => {
        try {
            let url = '/api/expenses';
            const filterValue = filterMonthInput.value;
            if (filterValue) {
                url += `?month=${filterValue}`;
            }

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Xərcləri yükləmək mümkün olmadı.');
            }
            const expenses = await response.json();
            allExpenses = expenses; // Gələn xərcləri yadda saxla
            renderExpensesTable(expenses);
        } catch (error) {
            expensesTableBody.innerHTML = `<tr><td colspan="13" style="text-align: center; color: red;">${error.message}</td></tr>`;
        }
    };

    const renderExpensesTable = (expenses) => {
        expensesTableBody.innerHTML = '';
        if (expenses.length === 0) {
            expensesTableBody.innerHTML = '<tr><td colspan="13" style="text-align: center;">Heç bir xərc tapılmadı.</td></tr>';
            return;
        }

        expenses.forEach(expense => {
            const row = expensesTableBody.insertRow();
            row.insertCell().textContent = new Date(expense.date).toLocaleDateString('az-AZ');
            row.insertCell().textContent = (expense.icare || 0).toFixed(2);
            row.insertCell().textContent = (expense.kommunal || 0).toFixed(2);
            row.insertCell().textContent = (expense.telefon || 0).toFixed(2);
            row.insertCell().textContent = (expense.ofis_xerci || 0).toFixed(2);
            row.insertCell().textContent = (expense.reklam || 0).toFixed(2);
            row.insertCell().textContent = (expense.maas || 0).toFixed(2);
            row.insertCell().textContent = (expense.sosial_sigorta || 0).toFixed(2);
            row.insertCell().textContent = (expense.icbari_sigorta || 0).toFixed(2);
            row.insertCell().textContent = (expense.masin_yanacaq || 0).toFixed(2);
            row.insertCell().textContent = (expense.gunluk_xercler || 0).toFixed(2);
            row.insertCell().textContent = (expense.total || 0).toFixed(2);
            
            const actionsCell = row.insertCell();
            const editButton = document.createElement('button');
            editButton.className = 'action-btn edit';
            editButton.innerHTML = '✏️';
            editButton.title = 'Düzəliş et';
            editButton.onclick = () => openEditModal(expense.id);
            actionsCell.appendChild(editButton);

            const deleteButton = document.createElement('button');
            deleteButton.className = 'action-btn delete';
            deleteButton.innerHTML = '🗑️';
            deleteButton.title = 'Sil';
            deleteButton.onclick = () => deleteExpense(expense.id);
            actionsCell.appendChild(deleteButton);
        });
    };

    const deleteExpense = async (id) => {
        if (!confirm('Bu xərci silmək istədiyinizə əminsiniz?')) return;
        
        try {
            const response = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Silmə əməliyyatı uğursuz oldu.');
            }
            alert('Xərc uğurla silindi.');
            fetchAndRenderExpenses();
        } catch (error) {
            alert(error.message);
        }
    };
    
    const openEditModal = (id) => {
        const expense = allExpenses.find(exp => exp.id === id);
        if (!expense) return;

        editExpenseIdInput.value = expense.id;
        
        // Formadakı inputları doldur
        for (const key in expense) {
            const input = editForm.querySelector(`#edit_${key}`);
            if (input) {
                input.value = expense[key];
            }
        }
        calculateTotal('edit'); // Modaldakı yekun məbləği hesabla
        editModal.style.display = 'flex';
    };

    expenseInputs.forEach(input => {
        input.addEventListener('input', () => calculateTotal('new'));
    });

    editExpenseInputs.forEach(input => {
        input.addEventListener('input', () => calculateTotal('edit'));
    });

    expenseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const expenseData = {};
        let total = 0;
        expenseInputs.forEach(input => {
            const value = parseFloat(input.value) || 0;
            expenseData[input.id] = value;
            total += value;
        });
        expenseData.total = total;

        try {
            const response = await fetch('/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(expenseData)
            });

            const result = await response.json();
            if (!response.ok) {
                 throw new Error(result.message || 'Xərcləri yadda saxlayarkən xəta baş verdi.');
            }

            alert('Xərclər uğurla yadda saxlanıldı!');
            expenseForm.reset();
            calculateTotal('new');
            fetchAndRenderExpenses();

        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    });

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = editExpenseIdInput.value;
        const updatedData = {};
        let total = 0;

        editExpenseInputs.forEach(input => {
            const value = parseFloat(input.value) || 0;
            const key = input.id.replace('edit_', '');
            updatedData[key] = value;
            total += value;
        });
        updatedData.total = total;

        try {
            const response = await fetch(`/api/expenses/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });
            
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Yeniləmə uğursuz oldu.');
            }

            alert('Xərc uğurla yeniləndi.');
            editModal.style.display = 'none';
            fetchAndRenderExpenses();
        } catch (error) {
            alert(error.message);
        }
    });

    applyFilterBtn.addEventListener('click', fetchAndRenderExpenses);
    resetFilterBtn.addEventListener('click', () => {
        filterMonthInput.value = '';
        fetchAndRenderExpenses();
    });
    
    // Edit modalı bağlamaq üçün
    editModal.querySelector('.close-button').onclick = () => {
        editModal.style.display = 'none';
    };

    window.onclick = (event) => {
        if (event.target == editModal) {
            editModal.style.display = "none";
        }
    };

    // İlkin yükləmə
    fetchAndRenderExpenses();
});