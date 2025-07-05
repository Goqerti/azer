// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
require('dotenv').config();

// Servislər və Middleware-lər
const fileStore = require('./services/fileStore');
const { requireLogin, requireOutLogin, requireOwnerRole } = require('./middleware/authMiddleware');
const { startBackupSchedule } = require('./services/telegramBackupService');
const telegram = require('./services/telegramService');

// Controller-lər
const userController = require('./controllers/userController');
const outUserController = require('./controllers/outUserController');
const adminController = require('./controllers/adminController');

// Route-lar
const apiRoutes = require('./routes/api');
const outApiRoutes = require('./routes/out_api');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Ümumi Middleware-lər ---
app.use(cors());
const sessionParser = session({
    secret: process.env.SESSION_SECRET || 'super-gizli-ve-unikal-acar-sozunuzu-bura-yazin-mutləq-dəyişin!',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
});
app.use(sessionParser);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));


// --- Səhifə Route-ları ---

// Əsas giriş mərkəzi
app.get('/', (req, res) => res.redirect('/login.html'));
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Owner Paneli
app.get('/owner_login.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'owner_login.html')));
app.post('/ownerlogin', adminController.loginOwner);
app.get('/owner_panel.html', (req, res) => {
    if (req.session.isOwner) {
        res.sendFile(path.join(__dirname, 'public', 'owner_panel.html'));
    } else {
        res.redirect('/owner_login.html');
    }
});
app.get('/register.html', (req, res) => {
     if (req.session.isOwner) {
        res.sendFile(path.join(__dirname, 'public', 'register.html'));
    } else {
        res.redirect('/owner_login.html');
    }
});
app.get('/permissions.html', (req, res) => {
     if (req.session.isOwner) {
        res.sendFile(path.join(__dirname, 'public', 'permissions.html'));
    } else {
        res.sendFile(path.join(__dirname, 'public', 'permissions.html'));
    }
});

// Incoming Şöbəsi
app.get('/incoming_login.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'incoming_login.html')));
app.post('/login', userController.login);
app.get('/index.html', requireLogin, (req, res) => {
    if (req.session.department === 'incoming' || req.session.isOwner) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
         res.status(403).send('Bu səhifəyə giriş icazəniz yoxdur.');
    }
});

// Outgoing Şöbəsi
app.get('/outlogin.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'outlogin.html')));
app.post('/outlogin', outUserController.login);
app.get('/outgoing.html', requireOutLogin, (req, res) => res.sendFile(path.join(__dirname, 'public', 'outgoing.html')));

// Finance Şöbəsi
app.get('/finance_login.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'finance_login.html')));
app.post('/financelogin', userController.loginFinance);
app.get('/finance.html', requireLogin, (req, res) => {
    if (req.session.department === 'finance' || req.session.isOwner) {
        res.sendFile(path.join(__dirname, 'public', 'finance.html'));
    } else {
        res.status(403).send('Bu səhifəyə giriş icazəniz yoxdur.');
    }
});

// Ümumi İstifadəçi Səhifəsi (Owner üçün)
app.get('/users.html', requireLogin, requireOwnerRole, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'users.html'));
});

// Ümumi Çıxış
app.get('/logout', userController.logout);


// --- API Route-ları ---

// DÜZƏLİŞ: Xüsusi admin route-u ümumi route-lardan ƏVVƏL gəlməlidir
const adminRouter = express.Router();
adminRouter.use((req, res, next) => {
    if (!req.session.isOwner) return res.status(401).json({ message: 'İcazə yoxdur.' });
    next();
});
adminRouter.post('/impersonate', adminController.impersonateLogin);
adminRouter.post('/register', adminController.registerUser);
app.use('/api/admin', adminRouter);

// Ümumi API route-ları
app.use('/api', apiRoutes);
app.use('/api/out', outApiRoutes);


// --- Serverin Başladılması ---
const initializeApp = () => {
    const filesToInit = [
        'sifarişlər.txt', 'users.txt', 'permissions.json', 
        'chat_history.txt', 'xercler.txt', 'outsifarişlər.txt', 'outusers.txt'
    ];
    filesToInit.forEach(file => {
        const filePath = path.join(__dirname, file);
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, file.endsWith('.json') ? '{}' : '', 'utf-8');
            console.log(`Created missing file: ${file}`);
        }
    });
};

const server = app.listen(PORT, () => {
    initializeApp();
    console.log(`Server http://localhost:${PORT} ünvanında işləyir`);
});


// --- WebSocket Server (Chat üçün) ---
const wss = new WebSocket.Server({ noServer: true });
const clients = new Map();

wss.on('connection', (ws, request) => {
    const user = request.session.user;
    if (!user) {
        ws.close();
        return;
    }
    const clientId = uuidv4();
    clients.set(clientId, { ws, user });
    console.log(`${user.displayName} chat-a qoşuldu.`);

    const history = fileStore.getChatHistory().slice(-50);
    ws.send(JSON.stringify({ type: 'history', data: history }));

    ws.on('message', (message) => {
        try {
            const parsedMessage = JSON.parse(Buffer.from(message).toString());
            const messageData = {
                id: uuidv4(),
                sender: user.displayName,
                role: user.role,
                text: parsedMessage.text,
                timestamp: new Date().toISOString()
            };
            fileStore.appendToChatHistory(messageData);
            for (const client of wss.clients) {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'message', data: messageData }));
                }
            }
        } catch (e) {
            console.error("Gələn mesaj parse edilə bilmədi:", e);
        }
    });

    ws.on('close', () => {
        clients.delete(clientId);
        console.log(`${user.displayName} chat-dan ayrıldı.`);
    });
});

server.on('upgrade', (request, socket, head) => {
    sessionParser(request, {}, () => {
        if (!request.session.user) {
            socket.destroy();
            return;
        }
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    });
});

// --- RENDER KEEP-ALIVE ---
const PING_URL = process.env.RENDER_EXTERNAL_URL;
if (PING_URL) {
    setInterval(() => {
        console.log("Pinging self to prevent sleep...");
        fetch(PING_URL).catch(err => console.error("Ping error:", err));
    }, 14 * 60 * 1000);
}

// --- TELEGRAM BACKUP ---
startBackupSchedule(2);
