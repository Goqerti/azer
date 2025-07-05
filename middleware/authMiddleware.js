// middleware/authMiddleware.js

/**
 * 'Incoming' və 'Finance' şöbələri üçün girişin tələb olunduğunu yoxlayır.
 * Sessiya etibarlı deyilsə və ya şöbə uyğun deyilsə, istifadəçini
 * əsas şöbə seçimi səhifəsinə yönləndirir.
 */
exports.requireLogin = (req, res, next) => {
    // Sessiyanın və istifadəçinin mövcudluğunu, həmçinin şöbənin 'incoming' və ya 'finance' olduğunu yoxlayırıq.
    if (req.session && req.session.user && (req.session.department === 'incoming' || req.session.department === 'finance')) {
        return next(); // Hər şey qaydasındadırsa, növbəti mərhələyə keç
    }
    
    // API sorğuları üçün JSON formatında xəta qaytarırıq
    if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({ message: 'Sessiya bitib və ya giriş edilməyib.' });
    }
    
    // Digər bütün hallar üçün əsas giriş səhifəsinə yönləndiririk
    return res.redirect('/login.html');
};

/**
 * 'Outgoing' şöbəsi üçün girişin tələb olunduğunu yoxlayır.
 * Sessiya etibarlı deyilsə və ya şöbə 'outgoing' deyilsə,
 * istifadəçini 'Outgoing' giriş səhifəsinə yönləndirir.
 */
exports.requireOutLogin = (req, res, next) => {
    if (req.session && req.session.user && req.session.department === 'outgoing') {
        return next();
    }
    
    if (req.originalUrl.startsWith('/api/out/')) {
        return res.status(401).json({ message: 'Sessiya bitib və ya giriş edilməyib.' });
    }
    
    return res.redirect('/outlogin.html');
};

/**
 * Yalnız 'owner' roluna sahib istifadəçilərin icazəsini yoxlayır.
 * İcazə yoxdursa, 403 (Forbidden) statusu ilə xəta qaytarır.
 */
exports.requireOwnerRole = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'owner') {
        return next();
    }
    return res.status(403).json({ message: 'Bu əməliyyatı etməyə yalnız "Owner" icazəlidir.' });
};
