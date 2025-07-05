// routes/api.js
const express = require('express');
const router = express.Router();

// Controller-lərin import edilməsi
const userController = require('../controllers/userController');
const permissionController = require('../controllers/permissionController');
const orderController = require('../controllers/orderController');
const musicController = require('../controllers/musicController');
const expenseController = require('../controllers/expenseController');
const { requireLogin, requireOwnerRole } = require('../middleware/authMiddleware');

// --- Təhlükəsizlik Middleware ---
// Bu fayldakı bütün route-lar üçün giriş tələb olunur
router.use(requireLogin);

// --- User & Permissions Routes ---
router.get('/user/me', userController.getCurrentUser);
router.get('/user/permissions', permissionController.getUserPermissions);

// Owner/Admin üçün xüsusi icazə route-ları
router.get('/permissions/admin-view', requireOwnerRole, permissionController.getPermissionsForAdmin);
router.put('/permissions/admin-save', requireOwnerRole, permissionController.savePermissionsForAdmin);

// --- User Management Routes (Yalnız Owner) ---
router.get('/users', requireOwnerRole, userController.getAllUsers);
router.put('/users/:username', requireOwnerRole, userController.updateUser);
router.delete('/users/:username', requireOwnerRole, userController.deleteUser);

// --- Order Routes (Incoming/Finance üçün) ---
router.get('/orders', orderController.getAllOrders);
router.post('/orders', orderController.createOrder);
router.put('/orders/:satisNo', orderController.updateOrder);
router.delete('/orders/:satisNo', orderController.deleteOrder);
router.put('/orders/:satisNo/note', orderController.updateOrderNote);
router.get('/orders/search/rez/:rezNomresi', orderController.searchOrderByRezNo);

// --- Expense Routes (Finance üçün) ---
router.get('/expenses', expenseController.getExpenses);
router.post('/expenses', expenseController.createExpense);
router.put('/expenses/:id', expenseController.updateExpense);
router.delete('/expenses/:id', expenseController.deleteExpense);

// --- Digər Resurslar (Incoming/Finance üçün) ---
router.get('/reservations', orderController.getReservations);
router.get('/reports', orderController.getReports);
router.get('/debts', orderController.getDebts);
router.get('/notifications', orderController.getNotifications);

// --- Music Route ---
router.get('/music/play', musicController.playSong);

module.exports = router;
