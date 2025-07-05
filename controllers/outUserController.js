// controllers/outUserController.js
const bcrypt = require('bcrypt');
const fileStore = require('../services/fileStore');
const telegram = require('../services/telegramService');

exports.login = (req, res) => {
    const { username, password } = req.body;
    console.log(`[Outgoing Login Attempt] İstifadəçi adı ilə girişə cəhd edildi: "${username}"`);
    
    try {
        const users = fileStore.getOutUsers();
        const user = users[username];

        if (!user) {
            console.error(`[Outgoing Login FAILED] İstifadəçi tapılmadı: "${username}"`);
            // Yönləndirmə əvəzinə JSON formatında xəta qaytarırıq
            return res.status(401).json({ success: false, message: 'İstifadəçi adı tapılmadı.' });
        }
        console.log(`[Outgoing Login INFO] İstifadəçi tapıldı: "${username}". Şifrə yoxlanılır...`);

        const isPasswordCorrect = bcrypt.compareSync(password, user.password);
        if (!isPasswordCorrect) {
            console.error(`[Outgoing Login FAILED] "${username}" üçün daxil edilən şifrə yanlışdır.`);
            // Yönləndirmə əvəzinə JSON formatında xəta qaytarırıq
            return res.status(401).json({ success: false, message: 'Şifrə yanlışdır.' });
        }
        
        console.log(`[Outgoing Login SUCCESS] Şifrə düzgündür. "${username}" üçün sessiya yaradılır...`);
        req.session.user = { username, role: user.role, displayName: user.displayName };
        req.session.department = 'outgoing';
        
        req.session.save((err) => {
            if (err) {
                console.error('[Outgoing Login ERROR] Sessiyanı yadda saxlamaq mümkün olmadı:', err);
                return res.status(500).json({ success: false, message: 'Sessiyanı yadda saxlamaq mümkün olmadı.' });
            }
            console.log(`[Outgoing Login INFO] Sessiya yadda saxlanıldı. Uğurlu cavab göndərilir...`);
            telegram.sendLog(telegram.formatLog(req.session.user, 'sistemə (Outgoing) daxil oldu.'));
            
            // Yönləndirmə əvəzinə uğurlu JSON cavabı və yönləndirmə URL-i göndəririk
            res.status(200).json({ success: true, redirectUrl: '/outgoing.html' });
        });

    } catch (error) {
        console.error("[Outgoing Login CRITICAL] Daxili server xətası:", error);
        res.status(500).json({ success: false, message: "Giriş zamanı daxili server xətası baş verdi." });
    }
};

exports.getCurrentUser = (req, res) => {
    if (req.session.user && req.session.department === 'outgoing') {
        res.json(req.session.user);
    } else {
        res.status(401).json({ message: 'Giriş edilməyib.' });
    }
};
