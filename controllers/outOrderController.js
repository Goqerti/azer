// controllers/outOrderController.js
const fileStore = require('../services/fileStore');
const telegram = require('../services/telegramService');

// Gəliri hesablamaq üçün köməkçi funksiya
const calculateGelir = (order) => {
    const alishAmount = order.alish?.amount || 0;
    const satishAmount = order.satish?.amount || 0;
    // Valyuta fərqini nəzərə almadan sadə hesablama
    return { amount: parseFloat((satishAmount - alishAmount).toFixed(2)) };
};

// Bütün 'Outgoing' sifarişlərini qaytarır
exports.getAllOrders = (req, res) => {
    try {
        const orders = fileStore.getOutOrders();
        res.json(orders.map(o => ({ ...o, gelir: calculateGelir(o) })));
    } catch (error) {
        console.error("Outgoing sifarişləri gətirilərkən xəta:", error);
        res.status(500).json({ message: "Sifarişləri yükləmək mümkün olmadı." });
    }
};

// Yeni 'Outgoing' sifarişi yaradır
exports.createOrder = (req, res) => {
    try {
        const newOrderData = req.body;
        if (!newOrderData.turist) {
            return res.status(400).json({ message: 'Turist məlumatı mütləq daxil edilməlidir.' });
        }
        const orders = fileStore.getOutOrders();
        let nextSatisNo = 1;
        if (orders.length > 0) {
            const maxSatisNo = Math.max(...orders.map(o => parseInt(o.satisNo)).filter(num => !isNaN(num)), 0);
            nextSatisNo = maxSatisNo + 1;
        }
        const orderToSave = {
            satisNo: String(nextSatisNo),
            creationTimestamp: new Date().toISOString(),
            createdBy: req.session.user.username,
            ...newOrderData,
        };
        orders.push(orderToSave);
        fileStore.saveAllOutOrders(orders);

        const actionMessage = `yeni OUTGOING sifariş (№${orderToSave.satisNo}) yaratdı: <b>${orderToSave.turist}</b>`;
        telegram.sendLog(telegram.formatLog(req.session.user, actionMessage));
        
        res.status(201).json({ ...orderToSave, gelir: calculateGelir(orderToSave) });

    } catch (error) {
        console.error("Outgoing sifarişi yaradılarkən xəta:", error);
        res.status(500).json({ message: 'Serverdə daxili xəta baş verdi.' });
    }
};

// Mövcud 'Outgoing' sifarişini yeniləyir
exports.updateOrder = (req, res) => {
    try {
        const { satisNo } = req.params;
        const updatedOrderData = req.body;
        let orders = fileStore.getOutOrders();
        const orderIndex = orders.findIndex(o => String(o.satisNo) === String(satisNo));
        if (orderIndex === -1) return res.status(404).json({ message: `Sifariş (${satisNo}) tapılmadı.` });

        const orderToUpdate = { ...orders[orderIndex], ...updatedOrderData };
        orders[orderIndex] = orderToUpdate;
        fileStore.saveAllOutOrders(orders);

        telegram.sendLog(telegram.formatLog(req.session.user, `OUTGOING sifarişinə (№${satisNo}) düzəliş etdi.`));
        res.status(200).json({ message: 'Sifariş uğurla yeniləndi.'});
    } catch (error) {
        console.error("Outgoing sifarişi yenilənərkən xəta:", error);
        res.status(500).json({ message: 'Serverdə daxili xəta baş verdi.' });
    }
};

// 'Outgoing' sifarişini silir
exports.deleteOrder = (req, res) => {
    try {
        let orders = fileStore.getOutOrders();
        const orderToDelete = orders.find(o => String(o.satisNo) === req.params.satisNo);
        if (!orderToDelete) return res.status(404).json({ message: `Sifariş tapılmadı.` });
        
        const updatedOrders = orders.filter(order => String(order.satisNo) !== req.params.satisNo);
        fileStore.saveAllOutOrders(updatedOrders);

        telegram.sendLog(telegram.formatLog(req.session.user, `OUTGOING sifarişi (№${orderToDelete.satisNo}) sildi.`));
        res.status(200).json({ message: `Sifariş uğurla silindi.` });
    } catch (error) {
        console.error("Outgoing sifarişi silinərkən xəta:", error);
        res.status(500).json({ message: 'Sifariş silinərkən xəta.' });
    }
};
