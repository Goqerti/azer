// services/fileStore.js
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

// --- Fayl Yolları ---
// Incoming
const DB_FILE = path.join(__dirname, '..', 'sifarişlər.txt');
const USERS_FILE = path.join(__dirname, '..', 'users.txt');
// Outgoing
const OUT_DB_FILE = path.join(__dirname, '..', 'outsifarişlər.txt');
const OUT_USERS_FILE = path.join(__dirname, '..', 'outusers.txt');
// Ümumi
const PERMISSIONS_FILE = path.join(__dirname, '..', 'permissions.json');
const CHAT_HISTORY_FILE = path.join(__dirname, '..', 'chat_history.txt');
const EXPENSES_FILE = path.join(__dirname, '..', 'xercler.txt');


// --- Ümumi Fayl Əməliyyatları Funksiyaları ---
const readFileLines = (filePath) => {
    if (!fs.existsSync(filePath)) return [];
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        return data.trim().split('\n').filter(Boolean);
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        return [];
    }
};

const readJsonFile = (filePath) => {
    if (!fs.existsSync(filePath)) return null;
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading or parsing JSON file ${filePath}:`, error);
        return null;
    }
};

const writeJsonFile = (filePath, data) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error(`Error writing to JSON file ${filePath}:`, error);
    }
};

const writeLinesToFile = (filePath, lines) => {
    try {
        fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf-8');
    } catch (error) {
        console.error(`Error writing lines to file ${filePath}:`, error);
    }
};

const appendLineToFile = (filePath, line) => {
    try {
        fs.appendFileSync(filePath, line + '\n', 'utf-8');
    } catch (error) {
        console.error(`Error appending to file ${filePath}:`, error);
    }
};


// --- Incoming Şöbəsi Funksiyaları ---
const getOrders = () => {
    return readFileLines(DB_FILE).map(line => {
        try {
            return JSON.parse(line);
        } catch (e) {
            console.error(`Error parsing order line: ${line}`);
            return null;
        }
    }).filter(Boolean);
};
const saveAllOrders = (orders) => writeLinesToFile(DB_FILE, orders.map(o => JSON.stringify(o)));

const getUsers = () => {
    const lines = readFileLines(USERS_FILE);
    const users = {};
    lines.forEach(line => {
        const parts = line.split(':');
        if (parts.length >= 5) {
            const [username, password, role, displayName, email, department] = parts;
            users[username.trim()] = { 
                password: password.trim(), 
                role: role.trim(), 
                displayName: displayName.trim(), 
                email: email ? email.trim() : '',
                department: department ? department.trim() : 'incoming'
            };
        }
    });
    return users;
};

const saveAllUsers = (users) => {
    const lines = Object.entries(users).map(([username, data]) => 
        `${username}:${data.password}:${data.role}:${data.displayName}:${data.email}:${data.department || 'incoming'}`
    );
    writeLinesToFile(USERS_FILE, lines);
};

const addUser = (userData) => {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(userData.password, salt);
    const newUserLine = `${userData.username}:${hashedPassword}:${userData.role}:${userData.displayName}:${userData.email}:${userData.department || 'incoming'}`;
    appendLineToFile(USERS_FILE, newUserLine);
};


// --- Outgoing Şöbəsi Funksiyaları ---
const getOutOrders = () => {
    return readFileLines(OUT_DB_FILE).map(line => {
        try {
            return JSON.parse(line);
        } catch (e) {
            console.error(`Error parsing outgoing order line: ${line}`);
            return null;
        }
    }).filter(Boolean);
};
const saveAllOutOrders = (orders) => writeLinesToFile(OUT_DB_FILE, orders.map(o => JSON.stringify(o)));

const getOutUsers = () => {
    const lines = readFileLines(OUT_USERS_FILE);
    const users = {};
    lines.forEach(line => {
        const parts = line.split(':');
        if (parts.length >= 5) {
            const [username, password, role, displayName, email, department] = parts;
            users[username.trim()] = { 
                password: password.trim(), 
                role: role.trim(), 
                displayName: displayName.trim(), 
                email: email ? email.trim() : '',
                department: department ? department.trim() : 'outgoing'
            };
        }
    });
    return users;
};

const addOutUser = (userData) => {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(userData.password, salt);
    const newUserLine = `${userData.username}:${hashedPassword}:${userData.role}:${userData.displayName}:${userData.email}:${userData.department || 'outgoing'}`;
    appendLineToFile(OUT_USERS_FILE, newUserLine);
};


// --- İcazə Funksiyaları ---
const getPermissions = () => readJsonFile(PERMISSIONS_FILE) || {};
const savePermissions = (permissions) => writeJsonFile(PERMISSIONS_FILE, permissions);


// --- Chat Funksiyaları ---
const getChatHistory = () => {
    const lines = readFileLines(CHAT_HISTORY_FILE);
    const messages = [];
    lines.forEach((line, index) => {
        try {
            if(line) messages.push(JSON.parse(line));
        } catch (e) {
            console.error(`Xəbərdarlıq: chat_history.txt faylının ${index + 1}-ci sətri zədələnib.`);
        }
    });
    return messages;
};
const appendToChatHistory = (message) => appendLineToFile(CHAT_HISTORY_FILE, JSON.stringify(message));


// --- Xərc Funksiyaları ---
const getExpenses = () => {
    const lines = readFileLines(EXPENSES_FILE);
    const expenses = [];
    lines.forEach((line, index) => {
        try {
            if (line) {
                 expenses.push(JSON.parse(line));
            }
        } catch (e) {
            console.error(`Xəbərdarlıq: xercler.txt faylının ${index + 1}-ci sətrindəki məlumat zədələnib və ötürülür: "${line}"`);
        }
    });
    return expenses;
};

const addExpense = (expenseData) => appendLineToFile(EXPENSES_FILE, JSON.stringify(expenseData));
const saveAllExpenses = (expenses) => writeLinesToFile(EXPENSES_FILE, expenses.map(e => JSON.stringify(e)));


// --- Bütün funksiyaların export edilməsi ---
module.exports = {
    // Incoming
    getOrders,
    saveAllOrders,
    getUsers,
    addUser,
    saveAllUsers,
    // Outgoing
    getOutOrders,
    saveAllOutOrders,
    getOutUsers,
    addOutUser,
    // Ümumi
    getPermissions,
    savePermissions,
    getChatHistory,
    appendToChatHistory,
    getExpenses,
    addExpense,
    saveAllExpenses
};
