// controllers/adminController.js
const bcrypt = require('bcrypt');
const fileStore = require('../services/fileStore');
const telegram = require('../services/telegramService');

// Owner girişini yoxlayır
exports.loginOwner = (req, res) => {
    const { password } = req.body;
    const users = fileStore.getUsers();
    const ownerUser = Object.values(users).find(u => u.role === 'owner');

    if (ownerUser && bcrypt.compareSync(password, ownerUser.password)) {
        const ownerUsername = Object.keys(users).find(key => users[key] === ownerUser);
        req.session.isOwner = true;
        req.session.user = { username: ownerUsername, role: 'owner', displayName: ownerUser.displayName };
        telegram.sendLog(telegram.formatLog(req.session.user, 'Owner panelinə daxil oldu.'));
        res.redirect('/owner_panel.html');
    } else {
        res.redirect('/owner_login.html?error=true');
    }
};

// Şifrəsiz (impersonate) giriş
exports.impersonateLogin = (req, res) => {
    if (!req.session.isOwner) {
        return res.status(401).json({ message: 'İcazə yoxdur.' });
    }
    const { department } = req.body;
    req.session.department = department;
    
    let redirectUrl = '/';
    if (department === 'outgoing') redirectUrl = '/outgoing.html';
    else if (department === 'finance') redirectUrl = '/finance.html';
    else redirectUrl = '/index.html';
    
    telegram.sendLog(telegram.formatLog(req.session.user, `${department} panelinə şifrəsiz keçid etdi.`));
    res.status(200).json({ redirectUrl });
};

// Yeni istifadəçi qeydiyyatı (YENİLƏNMİŞ MƏNTİQ)
exports.registerUser = (req, res) => {
    if (!req.session.isOwner) {
        return res.status(403).json({ message: 'Bu əməliyyatı etməyə icazəniz yoxdur.' });
    }

    const { department, username, password, displayName, email, role } = req.body;
    if (!department || !username || !password || !displayName || !role || !email) {
        return res.status(400).json({ message: 'Bütün xanaları doldurun.' });
    }

    try {
        const userData = { username, password, displayName, email, role, department };

        if (department === 'outgoing') {
            const outUsers = fileStore.getOutUsers();
            if (outUsers[username]) return res.status(409).json({ message: 'Bu istifadəçi adı Outgoing şöbəsində artıq mövcuddur.' });
            fileStore.addOutUser(userData);
        } else { // incoming, finance və ya yeni yaradılan şöbələr üçün
            const users = fileStore.getUsers();
            if (users[username]) return res.status(409).json({ message: 'Bu istifadəçi adı əsas sistemdə artıq mövcuddur.' });
            fileStore.addUser(userData);
        }

        // Yeni istifadəçi üçün permissions.json-a default icazələr əlavə et
        const permissions = fileStore.getPermissions();
        if (!permissions[username]) {
            permissions[username] = {
                canEditOrder: false,
                canEditFinancials: false,
                canDeleteOrder: false
            };
            fileStore.savePermissions(permissions);
        }

        telegram.sendLog(telegram.formatLog(req.session.user, `<b>${displayName} (${role})</b> adlı yeni istifadəçini <b>${department}</b> şöbəsinə əlavə etdi.`));
        res.status(201).json({ message: 'Yeni istifadəçi uğurla yaradıldı!' });

    } catch (error) {
        console.error("İstifadəçi yaradarkən xəta:", error);
        res.status(500).json({ message: 'Server xətası baş verdi.' });
    }
};
