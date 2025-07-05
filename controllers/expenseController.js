// controllers/expenseController.js
const { v4: uuidv4 } = require('uuid'); // ID yaratmaq üçün
const fileStore = require('../services/fileStore');

exports.createExpense = (req, res) => {
    try {
        const newExpenseData = req.body;
        if (!newExpenseData || typeof newExpenseData.total === 'undefined') {
            return res.status(400).json({ message: 'Xərc məlumatları natamamdır.' });
        }
        
        // Hər xərcə unikal ID və tarix əlavə et
        newExpenseData.id = uuidv4();
        newExpenseData.date = new Date().toISOString();

        fileStore.addExpense(newExpenseData);
        res.status(201).json({ message: 'Xərc uğurla əlavə edildi.' });
    } catch (error) {
        console.error('!!! XƏRC YARADILARKƏN KRİTİK XƏTA !!!:', error);
        res.status(500).json({ 
            message: 'Serverdə daxili xəta baş verdi.',
            errorDetails: error.message 
        });
    }
};

exports.getExpenses = (req, res) => {
    try {
        let expenses = fileStore.getExpenses();
        const { month } = req.query;
        if (month) { 
            expenses = expenses.filter(expense => expense.date && expense.date.substring(0, 7) === month);
        }
        expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
        res.json(expenses);
    } catch (error) {
        console.error('Xərcləri gətirərkən xəta:', error);
        res.status(500).json({ message: 'Xərcləri gətirmək mümkün olmadı.' });
    }
};

exports.updateExpense = (req, res) => {
    try {
        const { id } = req.params;
        const updatedData = req.body;
        let expenses = fileStore.getExpenses();
        
        const expenseIndex = expenses.findIndex(exp => exp.id === id);
        
        if (expenseIndex === -1) {
            return res.status(404).json({ message: 'Bu ID ilə xərc tapılmadı.' });
        }
        
        expenses[expenseIndex] = { ...expenses[expenseIndex], ...updatedData, id: id };
        
        fileStore.saveAllExpenses(expenses);
        res.status(200).json({ message: 'Xərc uğurla yeniləndi.' });

    } catch (error) {
        console.error('Xərc yenilənərkən xəta:', error);
        res.status(500).json({ message: 'Serverdə daxili xəta baş verdi.' });
    }
};

exports.deleteExpense = (req, res) => {
    try {
        const { id } = req.params;
        let expenses = fileStore.getExpenses();
        
        const updatedExpenses = expenses.filter(exp => exp.id !== id);
        
        if (expenses.length === updatedExpenses.length) {
            return res.status(404).json({ message: 'Bu ID ilə silinəcək xərc tapılmadı.' });
        }
        
        fileStore.saveAllExpenses(updatedExpenses);
        res.status(200).json({ message: 'Xərc uğurla silindi.' });

    } catch (error) {
        console.error('Xərc silinərkən xəta:', error);
        res.status(500).json({ message: 'Serverdə daxili xəta baş verdi.' });
    }
};