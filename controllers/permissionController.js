// controllers/permissionController.js
const fileStore = require('../services/fileStore');
const telegram = require('../services/telegramService');

/**
 * Hazırkı istifadəçinin fərdi icazələrini qaytarır.
 * Bu funksiya hər bir işçinin öz panellərində (incoming/outgoing)
 * hansı düymələri görəcəyini müəyyən etmək üçün istifadə olunur.
 */
exports.getUserPermissions = (req, res) => {
    // Owner bütün icazələrə sahibdir
    if (req.session.isOwner) { 
        return res.json({ canEditOrder: true, canDeleteOrder: true, canEditFinancials: true });
    }
    // Adi istifadəçi üçün onun istifadəçi adına uyğun icazələri permissions.json-dan oxuyuruq
    const { username } = req.session.user;
    const allPermissions = fileStore.getPermissions();
    res.json(allPermissions[username] || {}); // İstifadəçinin fərdi icazələrini qaytarır, yoxdursa boş obyekt
};

/**
 * Admin paneli üçün bütün istifadəçiləri (həm incoming, həm outgoing)
 * və onların fərdi icazələrini birləşdirib qaytarır.
 */
exports.getPermissionsForAdmin = (req, res) => {
    if (!req.session.isOwner) {
        return res.status(403).json({ message: 'İcazə yoxdur.' });
    }
    
    const incomingUsers = fileStore.getUsers();
    const outgoingUsers = fileStore.getOutUsers();
    const permissions = fileStore.getPermissions();

    const allUsers = [];

    // Incoming istifadəçilərini siyahıya əlavə et
    for (const username in incomingUsers) {
        // Owner-i icazə siyahısında göstərmirik
        if (incomingUsers[username].role !== 'owner') {
            allUsers.push({
                username: username,
                displayName: incomingUsers[username].displayName,
                department: incomingUsers[username].department || 'incoming',
                permissions: permissions[username] || { canEditOrder: false, canEditFinancials: false, canDeleteOrder: false }
            });
        }
    }

    // Outgoing istifadəçilərini siyahıya əlavə et
    for (const username in outgoingUsers) {
        allUsers.push({
            username: username,
            displayName: outgoingUsers[username].displayName,
            department: 'outgoing',
            permissions: permissions[username] || { canEditOrder: false, canEditFinancials: false, canDeleteOrder: false }
        });
    }

    res.json(allUsers);
};

/**
 * Admin panelindən (permissions.html) göndərilən yeni icazə siyahısını
 * permissions.json faylına yadda saxlayır.
 */
exports.savePermissionsForAdmin = (req, res) => {
    if (!req.session.isOwner) {
        return res.status(403).json({ message: 'İcazə yoxdur.' });
    }
    try {
        const newPermissions = req.body;
        fileStore.savePermissions(newPermissions);
        telegram.sendLog(telegram.formatLog(req.session.user, `İstifadəçi icazələrini yenilədi.`));
        res.status(200).json({ message: 'İcazələr uğurla yadda saxlandı.' });
    } catch (error) {
        console.error('İcazələri yadda saxlayarkən xəta:', error);
        res.status(500).json({ message: 'Server xətası baş verdi.' });
    }
};
