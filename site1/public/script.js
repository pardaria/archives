const socket = new WebSocket('ws://localhost:3000');
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const fileInput = document.getElementById('file-input');
const onlineUsers = document.getElementById('online-users');
const changeNickButton = document.getElementById('change-nick');
const channels = document.querySelectorAll('.channel');
const sendFileButton = document.getElementById('send-file-button');
const menuToggle = document.getElementById('menu-toggle');
const usersToggle = document.getElementById('users-toggle');
const sidebarLeft = document.getElementById('sidebar-left');
const sidebarRight = document.getElementById('sidebar-right');
const overlay = document.getElementById('overlay');
const channelTitle = document.getElementById('channel-title');

let username = generateKanjiName();
let isPreFormatted = false;
let currentChannel = 'Chat';

function generateKanjiName() {
    const kanji = ['山', '川', '木', '花', '月', '日', '火', '水', '金', '土'];
    const kanjo = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
    const hiragana = ['あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ'];
    const katakana = ['ア', 'イ', 'ウ', 'エ', 'オ', 'カ', 'キ', 'ク', 'ケ', 'コ'];
    const allCharacters = kanji.concat(hiragana, kanjo, katakana);
    let nick = '';
    for (let i = 0; i < 5; i++) {
        nick += allCharacters[Math.floor(Math.random() * allCharacters.length)];
    }
    return nick;
}

function sanitizeInput(input) {
    return input.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function getDateTimeSaoPaulo() {
    const options = {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false 
    };
    return new Date().toLocaleString('pt-BR', options);
}

function displayMessage(message, isFile = false) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message';

    if (!message.timestamp) {
        message.timestamp = getDateTimeSaoPaulo();
    }

    if (isFile) {
        if (message.fileType.startsWith('image')) {
            messageElement.innerHTML = `<span style="color: ${message.color || '#8B0000'};"><span class="timestamp">[${message.timestamp}]</span>
            <span style="color: ${message.color || 'red'};">${message.username}:</span></span><br><img src="${message.content}" alt="Image">`;
        } else if (message.fileType.startsWith('video')) {
            messageElement.innerHTML = `<span style="color: ${message.color || '#8B0000'};"><span class="timestamp">[${message.timestamp}]</span>
            <span style="color: ${message.color || 'red'};">${message.username}:</span></span><br><video src="${message.content}" controls></video>`;
        } else if (message.fileType.startsWith('audio')) {
            messageElement.innerHTML = `<span style="color: ${message.color || '#8B0000'};"><span class="timestamp">[${message.timestamp}]</span>
            <span style="color: ${message.color || 'red'};">${message.username}:</span></span><br><audio src="${message.content}" controls></audio>`;
        }
    } else {
        messageElement.innerHTML = `<span style="color: ${message.color || '#8B0000'};"><span class="timestamp">[${message.timestamp}]</span>
        <span style="color: ${message.color || 'red'};">${message.username}: ${message.content}</span>`;
    }
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

channels.forEach(channel => {
    channel.addEventListener('click', () => {
        channels.forEach(c => c.classList.remove('active'));
        channel.classList.add('active');
        currentChannel = channel.getAttribute('data-channel');
        channelTitle.textContent = currentChannel;
        chatMessages.innerHTML = '';
        socket.send(JSON.stringify({ type: 'getHistory', channel: currentChannel }));
        
        if (window.innerWidth <= 768) {
            toggleSidebar('left', false);
        }
    });
});

sendButton.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (message) {
        socket.send(JSON.stringify({
            type: 'message',
            channel: currentChannel,
            username: username,
            content: message,
            isPreFormatted: isPreFormatted,
            timestamp: getDateTimeSaoPaulo()
        }));
        messageInput.value = '';
    }
});

messageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        sendButton.click();
    }
});

fileInput.addEventListener('change', () => {
    const fileName = fileInput.files[0] ? fileInput.files[0].name : 'Escolher Arquivo';
    const fileLabel = document.querySelector('.file-input-label');
    fileLabel.textContent = fileName.length > 15 ? fileName.substring(0, 12) + '...' : fileName;
});

sendFileButton.addEventListener('click', () => {
    const file = fileInput.files[0];
    if (file) {
        if (file.size <= 20 * 1024 * 1024) {
            const reader = new FileReader();
            reader.onload = (e) => {
                socket.send(JSON.stringify({
                    type: 'file',
                    channel: currentChannel,
                    username: username,
                    content: e.target.result,
                    fileType: file.type
                }));
                
                fileInput.value = '';
                document.querySelector('.file-input-label').textContent = 'Escolher Arquivo';
            };
            reader.readAsDataURL(file);
        } else {
            alert('Arquivo muito grande. O limite é de 20MB.');
        }
    } else {
        alert('Por favor, selecione um arquivo primeiro.');
    }
});

changeNickButton.addEventListener('click', () => {
    const newNick = prompt('Digite seu novo nick:');
    if (newNick && newNick.trim()) {
        username = sanitizeInput(newNick.trim());
        socket.send(JSON.stringify({
            type: 'setUsername',
            username: username
        }));
    }
});

function toggleSidebar(side, forceState = null) {
    if (side === 'left') {
        const isActive = forceState !== null ? forceState : !sidebarLeft.classList.contains('active');
        sidebarLeft.classList.toggle('active', isActive);
        
        if (isActive) {
            sidebarRight.classList.remove('active');
        }
    } else if (side === 'right') {
        const isActive = forceState !== null ? forceState : !sidebarRight.classList.contains('active');
        sidebarRight.classList.toggle('active', isActive);
        
        if (isActive) {
            sidebarLeft.classList.remove('active');
        }
    }
    
    const anyActive = sidebarLeft.classList.contains('active') || sidebarRight.classList.contains('active');
    overlay.classList.toggle('active', anyActive);
}

menuToggle.addEventListener('click', () => toggleSidebar('left'));
usersToggle.addEventListener('click', () => toggleSidebar('right'));

overlay.addEventListener('click', () => {
    toggleSidebar('left', false);
    toggleSidebar('right', false);
});

socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'message' || data.type === 'file') {
        if (data.content.startsWith('/clear')) {
            return; 
        }

        if (data.channel === currentChannel) {
            displayMessage(data, data.type === 'file');
        }
    } else if (data.type === 'users') {
        onlineUsers.innerHTML = data.users.map(user => `<div>${user}</div>`).join('');
    } else if (data.type === 'history') {
        data.messages.forEach(message => displayMessage(message, message.type === 'file'));
    } else if (data.type === 'clearMessages') {
        if (data.channel === currentChannel) {
            const messages = chatMessages.querySelectorAll('.message');
            const numMessagesToRemove = Math.min(data.numMessages, messages.length);
            for (let i = 0; i < numMessagesToRemove; i++) {
                chatMessages.removeChild(messages[messages.length - 1 - i]);
            }
        }
    }
});

function adjustLayout() {
    if (window.innerWidth > 768) {
        sidebarLeft.classList.remove('active');
        sidebarRight.classList.remove('active');
        overlay.classList.remove('active');
    }
}

window.addEventListener('load', adjustLayout);
window.addEventListener('resize', adjustLayout);

socket.addEventListener('open', () => {
    console.log('Conectado ao WebSocket');
    socket.send(JSON.stringify({
        type: 'setUsername',
        username: username
    }));
    
    socket.send(JSON.stringify({ type: 'getHistory', channel: currentChannel }));
});

socket.addEventListener('error', (error) => {
    console.error('Erro no WebSocket:', error);
});

socket.addEventListener('close', () => {
    console.log('Conexão WebSocket fechada');
});