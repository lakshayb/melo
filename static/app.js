/**
 * Melo - Fixed Frontend
 * Login form hiding/showing properly
 */

const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : 'https://melo-backend-production.up.railway.app/api';

let currentUser = null;
let currentConversationId = null;
let isProcessing = false;

document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    setupInputAutoResize();
});

// ==================== FORM SWITCHING ====================

function switchToSignup(e) {
    e.preventDefault();
    document.getElementById('loginForm').classList.remove('active');
    document.getElementById('signupForm').classList.add('active');
    clearErrors();
}

function switchToLogin(e) {
    e.preventDefault();
    document.getElementById('signupForm').classList.remove('active');
    document.getElementById('loginForm').classList.add('active');
    clearErrors();
}

function clearErrors() {
    document.getElementById('loginError').classList.add('hidden');
    document.getElementById('signupError').classList.add('hidden');
}

// ==================== AUTH ====================

async function handleSignup() {
    const username = document.getElementById('signupUsername').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirm = document.getElementById('signupConfirm').value;

    if (!username || !password) {
        showSignupError('Username and password required');
        return;
    }

    if (password !== confirm) {
        showSignupError('Passwords do not match');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            showSignupError(data.error);
            return;
        }

        currentUser = { user_id: data.user_id, username: data.username };
        localStorage.setItem('meloUser', JSON.stringify(currentUser));
        showChatScreen();

    } catch (error) {
        showSignupError('Signup failed: ' + error.message);
    }
}

async function handleLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        showLoginError('Username and password required');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            showLoginError(data.error);
            return;
        }

        currentUser = { user_id: data.user_id, username: data.username };
        localStorage.setItem('meloUser', JSON.stringify(currentUser));
        showChatScreen();
        loadConversations();

    } catch (error) {
        showLoginError('Login failed: ' + error.message);
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        currentUser = null;
        currentConversationId = null;
        localStorage.removeItem('meloUser');
        showLoginScreen();
    }
}

function checkAuthStatus() {
    const saved = localStorage.getItem('meloUser');
    if (saved) {
        currentUser = JSON.parse(saved);
        showChatScreen();
        loadConversations();
    } else {
        showLoginScreen();
    }
}

function showLoginScreen() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('chatScreen').classList.add('hidden');
    document.getElementById('loginForm').classList.add('active');
    document.getElementById('signupForm').classList.remove('active');
    clearErrors();
}

function showChatScreen() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('chatScreen').classList.remove('hidden');
    document.getElementById('username').textContent = currentUser.username;

    if (!currentConversationId) {
        addWelcomeMessage();
    }
}

function showLoginError(msg) {
    document.getElementById('loginError').textContent = msg;
    document.getElementById('loginError').classList.remove('hidden');
}

function showSignupError(msg) {
    document.getElementById('signupError').textContent = msg;
    document.getElementById('signupError').classList.remove('hidden');
}

// ==================== CHAT ====================

function addWelcomeMessage() {
    if (document.getElementById('chatWindow').children.length === 0) {
        const msg = document.createElement('div');
        msg.className = 'message bot-message';
        msg.innerHTML = `
            <div class="message-avatar">💙</div>
            <div class="message-content">
                <div class="message-bubble">
                    <p>Hello ${currentUser.username}! I'm Melo, your adaptive AI companion. How are you feeling today?</p>
                </div>
            </div>
        `;
        document.getElementById('chatWindow').appendChild(msg);
    }
}

async function handleSubmit(e) {
    e.preventDefault();

    if (isProcessing) return;

    const message = document.getElementById('messageInput').value.trim();
    if (!message) return;

    isProcessing = true;

    addMessageToChat(message, 'user');
    document.getElementById('messageInput').value = '';
    updateCharCounter();
    document.getElementById('sendBtn').disabled = true;
    document.getElementById('typingIndicator').classList.add('active');

    try {
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                user_id: currentUser.user_id,
                conversation_id: currentConversationId
            })
        });

        if (!response.ok) throw new Error('Chat failed');

        const data = await response.json();
        currentConversationId = data.conversation_id;

        document.getElementById('typingIndicator').classList.remove('active');

        setTimeout(() => {
            addMessageToChat(data.reply, 'bot');
            if (data.emotion) {
                showEmotion(data.emotion, data.confidence);
            }
            loadConversations();
        }, 500);

    } catch (error) {
        document.getElementById('typingIndicator').classList.remove('active');
        addMessageToChat('Sorry, something went wrong. Please try again.', 'bot');
    } finally {
        isProcessing = false;
        document.getElementById('sendBtn').disabled = false;
    }
}

function addMessageToChat(text, sender) {
    const msg = document.createElement('div');
    msg.className = `message ${sender}-message`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = sender === 'user' ? '👤' : '💙';

    const content = document.createElement('div');
    content.className = 'message-content';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    text.split('\n').forEach((line, idx) => {
        if (line.trim()) {
            const p = document.createElement('p');
            p.textContent = line.trim();
            bubble.appendChild(p);
        }
    });

    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
    });

    content.appendChild(bubble);
    content.appendChild(time);
    msg.appendChild(avatar);
    msg.appendChild(content);

    document.getElementById('chatWindow').appendChild(msg);
    document.getElementById('chatWindow').scrollTop = document.getElementById('chatWindow').scrollHeight;
}

function showEmotion(emotion, confidence) {
    const emotionIcons = {
        'Happy': '😊', 'Sad': '😢', 'Angry': '😠',
        'Anxious': '😰', 'Love': '❤️', 'Lonely': '😔',
        'Confusion': '😕', 'Hopeful': '🌟', 'Overwhelmed': '😫',
        'Crisis': '🚨', 'Neutral': '😐'
    };

    document.getElementById('emotionIcon').textContent = emotionIcons[emotion] || '💭';
    document.getElementById('emotionValue').textContent = emotion;
    document.getElementById('emotionConfidence').textContent = `(${(confidence * 100).toFixed(0)}%)`;
    document.getElementById('emotionDisplay').classList.remove('hidden');
    setTimeout(() => document.getElementById('emotionDisplay').classList.add('hidden'), 8000);
}

// ==================== HISTORY ====================

async function loadConversations() {
    try {
        const response = await fetch(`${API_BASE_URL}/conversations?user_id=${currentUser.user_id}`);
        const data = await response.json();

        const list = document.getElementById('conversationList');
        list.innerHTML = '';

        data.conversations.forEach(conv => {
            const date = new Date(conv.started_at);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            const item = document.createElement('div');
            item.className = 'conversation-item';
            item.onclick = () => loadConversation(conv.conversation_id);
            item.innerHTML = `<p>${dateStr}</p><small>${conv.message_count} messages</small>`;
            list.appendChild(item);
        });
    } catch (error) {
        console.error('Failed to load conversations:', error);
    }
}

async function loadConversation(conversationId) {
    currentConversationId = conversationId;
    document.getElementById('chatWindow').innerHTML = '';

    try {
        const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`);
        const data = await response.json();

        data.messages.forEach(msg => {
            addMessageToChat(msg.message_text, msg.sender_type);
        });
    } catch (error) {
        console.error('Failed to load messages:', error);
    }
}

function startNewChat() {
    currentConversationId = null;
    document.getElementById('chatWindow').innerHTML = '';
    addWelcomeMessage();
}

function setupInputAutoResize() {
    const input = document.getElementById('messageInput');
    if (input) {
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 80) + 'px';
            updateCharCounter();
        });
    }
}

function updateCharCounter() {
    const length = document.getElementById('messageInput').value.length;
    document.getElementById('charCounter').textContent = `${length}/1000`;
}
