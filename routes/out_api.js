// routes/out_api.js
const express = require('express');
const router = express.Router();

const outUserController = require('../controllers/outUserController');
const outOrderController = require('../controllers/outOrderController');
const { requireOutLogin } = require('../middleware/authMiddleware');

// Bu fayldakı bütün route-lar artıq /api/out prefiksi ilə başlayır
// və 'outgoing' şöbəsi üçün girişi tələb edir.
router.use(requireOutLogin);

// İstifadəçi məlumatları
router.get('/user/me', outUserController.getCurrentUser);

// Sifarişlər
router.get('/orders', outOrderController.getAllOrders);
router.post('/orders', outOrderController.createOrder);
router.put('/orders/:satisNo', outOrderController.updateOrder);
router.delete('/orders/:satisNo', outOrderController.deleteOrder);

module.exports = router;
