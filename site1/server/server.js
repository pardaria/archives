const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, '../public')));


app.get('/', (req, res) => {

    res.sendFile(path.join(__dirname, '../public', 'index.html'));

});

const onlineUsers = new Map(); 

const messagesFilePath = path.join(__dirname, 'messages.json');

function loadMessages() {
    if (fs.existsSync(messagesFilePath)) {
        const data = fs.readFileSync(messagesFilePath, 'utf8');
        return JSON.parse(data);
    }
    return [];
}

function saveMessages(messages) {
    fs.writeFileSync(messagesFilePath, JSON.stringify(messages, null, 2));
}

let messages = loadMessages();

wss.on('connection', (ws) => {
    console.log('Novo cliente conectado');

    ws.username = 'Anônimo';
    onlineUsers.set(ws, ws.username); 
    updateOnlineUsers(); 

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'setUsername') {
            ws.username = sanitizeInput(data.username);
            onlineUsers.set(ws, ws.username); 
            updateOnlineUsers();
        } else if (data.type === 'message' || data.type === 'file') {
            if (data.content.startsWith('/clear')) {
                const parts = data.content.split(' ');
                if (parts.length === 2 && !isNaN(parts[1])) {
                    const numMessagesToDelete = parseInt(parts[1], 10);
                    deleteLastMessages(data.channel, numMessagesToDelete);
                }
                return;
            }

            const newMessage = {
                type: data.type,
                channel: data.channel,
                username: ws.username,
                content: data.content,
                fileType: data.fileType,
                isPreFormatted: data.isPreFormatted,
                timestamp: new Date().toISOString()
            };
            messages.push(newMessage);
            saveMessages(messages);

            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(newMessage));
                }
            });
        } else if (data.type === 'getHistory') {
            const channelMessages = messages.filter(msg => msg.channel === data.channel);
            ws.send(JSON.stringify({ type: 'history', messages: channelMessages }));
        }
    });

    ws.on('close', () => {
        onlineUsers.delete(ws);
        updateOnlineUsers(); 
    });
});

function deleteLastMessages(channel, numMessagesToDelete) {
    const channelMessages = messages.filter(msg => msg.channel === channel);
    const messagesToDelete = channelMessages.slice(-numMessagesToDelete);
    messages = messages.filter(msg => !messagesToDelete.includes(msg));
    saveMessages(messages);

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'clearMessages',
                channel: channel,
                numMessages: numMessagesToDelete
            }));
        }
    });
}

function updateOnlineUsers() {
    const users = Array.from(onlineUsers.values()); 
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'users', users }));
        }
    });
}

function sanitizeInput(input) {
    return input.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

server.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});