/**
 * Melo - Enhanced Frontend
 * Features: Theme toggle, Enter to send, Right-click delete, Auto-delete old chats
 */

const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : 'https://melo-backend-production.up.railway.app/api';

let currentUser = null;
let currentConversationId = null;
let isProcessing = false;
let selectedChatIdForDelete = null;

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    checkAuthStatus();
    setupInputAutoResize();
    setupContextMenu();
});

// ==================== THEME MANAGEMENT ====================

function initializeTheme() {
    const savedTheme = localStorage.getItem('meloTheme') || 'dark';
    setTheme(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

function setTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('meloTheme', theme);

    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

// ==================== KEYBOARD HANDLING ====================

function handleKeyDown(event) {
    // Enter without Shift = Send message
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        const form = document.getElementById('chatForm');
        form.dispatchEvent(new Event('submit'));
    }
    // Shift+Enter = New line (default behavior)
}

// ==================== CONTEXT MENU FOR DELETE ====================

function setupContextMenu() {
    const contextMenu = document.getElementById('contextMenu');

    // Hide context menu on click outside
    document.addEventListener('click', () => {
        contextMenu.classList.add('hidden');
    });

    // Prevent default context menu
    document.getElementById('conversationList').addEventListener('contextmenu', (e) => {
        e.preventDefault();

        const conversationItem = e.target.closest('.conversation-item');
        if (conversationItem) {
            selectedChatIdForDelete = conversationItem.dataset.conversationId;

            // Position context menu
            contextMenu.style.left = e.pageX + 'px';
            contextMenu.style.top = e.pageY + 'px';
            contextMenu.classList.remove('hidden');
        }
    });
}

async function deleteChat() {
    const contextMenu = document.getElementById('contextMenu');
    contextMenu.classList.add('hidden');

    if (!selectedChatIdForDelete) return;

    if (!confirm('Are you sure you want to delete this conversation?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/conversations/${selectedChatIdForDelete}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            // If deleted current conversation, reset
            if (currentConversationId === selectedChatIdForDelete) {
                currentConversationId = null;
                document.getElementById('chatWindow').innerHTML = '';
                addWelcomeMessage();
            }

            // Reload conversation list
            loadConversations();
        } else {
            alert('Failed to delete conversation');
        }
    } catch (error) {
        console.error('Delete error:', error);
        alert('Error deleting conversation');
    }

    selectedChatIdForDelete = null;
}

// ==================== AUTO-DELETE OLD CHATS ====================

async function autoDeleteOldChats() {
    if (!currentUser) return;

    try {
        const response = await fetch(`${API_BASE_URL}/conversations/cleanup?user_id=${currentUser.user_id}&days=7`, {
            method: 'POST'
        });

        if (response.ok) {
            const data = await response.json();
            if (data.deleted_count > 0) {
                console.log(`Auto-deleted ${data.deleted_count} old conversations`);
                loadConversations();
            }
        }
    } catch (error) {
        console.error('Auto-delete error:', error);
    }
}

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
    const password = document.getElementById('signupPassword').value;
    const confirm = document.getElementById('signupConfirm').value;

    if (!username || !password) {
        showSignupError('Username and password required');
        return;
    }

    if (username.length < 3) {
        showSignupError('Username must be at least 3 characters');
        return;
    }

    if (password.length < 6) {
        showSignupError('Password must be at least 6 characters');
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
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            showSignupError(data.error || 'Signup failed');
            return;
        }

        currentUser = { user_id: data.user_id, username: data.username };
        localStorage.setItem('meloUser', JSON.stringify(currentUser));
        showChatScreen();
        autoDeleteOldChats();

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
            showLoginError(data.error || 'Login failed');
            return;
        }

        currentUser = { user_id: data.user_id, username: data.username };
        localStorage.setItem('meloUser', JSON.stringify(currentUser));
        showChatScreen();
        loadConversations();
        autoDeleteOldChats();

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
        autoDeleteOldChats();
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
    const errorEl = document.getElementById('loginError');
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
}

function showSignupError(msg) {
    const errorEl = document.getElementById('signupError');
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
}

// ==================== CHAT ====================

function addWelcomeMessage() {
    const chatWindow = document.getElementById('chatWindow');
    if (chatWindow.children.length === 0) {
        const msg = document.createElement('div');
        msg.className = 'message bot-message';
        msg.innerHTML = `
            <div class="message-avatar">💙</div>
            <div class="message-content">
                <div class="message-bubble">
                    <p>Hello ${currentUser.username}! I'm Melo, your adaptive AI companion powered by GPT-OSS 120B. How are you feeling today?</p>
                </div>
                <div class="message-time">${formatTime(new Date())}</div>
            </div>
        `;
        chatWindow.appendChild(msg);
    }
}

async function handleSubmit(e) {
    e.preventDefault();

    if (isProcessing) return;

    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    if (!message) return;

    isProcessing = true;

    addMessageToChat(message, 'user');
    input.value = '';
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
        }, 300);

    } catch (error) {
        document.getElementById('typingIndicator').classList.remove('active');
        addMessageToChat('Sorry, something went wrong. Please try again.', 'bot');
    } finally {
        isProcessing = false;
        document.getElementById('sendBtn').disabled = false;
        input.focus();
    }
}

function addMessageToChat(text, sender) {
    const chatWindow = document.getElementById('chatWindow');
    const msg = document.createElement('div');
    msg.className = `message ${sender}-message`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = sender === 'user' ? '👤' : '💙';

    const content = document.createElement('div');
    content.className = 'message-content';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    // Handle line breaks
    const lines = text.split('\n');
    lines.forEach((line, idx) => {
        if (line.trim()) {
            const p = document.createElement('p');
            p.textContent = line.trim();
            if (idx > 0) p.style.marginTop = '8px';
            bubble.appendChild(p);
        }
    });

    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = formatTime(new Date());

    content.appendChild(bubble);
    content.appendChild(time);
    msg.appendChild(avatar);
    msg.appendChild(content);

    chatWindow.appendChild(msg);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
    });
}

function showEmotion(emotion, confidence) {
    const emotionIcons = {
        'Happy': '😊', 'Sad': '😢', 'Angry': '😠',
        'Anxious': '😰', 'Lonely': '😔', 'Hopeful': '🌟',
        'Confused': '😕', 'Overwhelmed': '😫',
        'Crisis': '🚨', 'Neutral': '😐'
    };

    const display = document.getElementById('emotionDisplay');
    document.getElementById('emotionIcon').textContent = emotionIcons[emotion] || '💭';
    document.getElementById('emotionValue').textContent = emotion;
    document.getElementById('emotionConfidence').textContent = `${(confidence * 100).toFixed(0)}%`;
    display.classList.remove('hidden');

    setTimeout(() => display.classList.add('hidden'), 8000);
}

// ==================== HISTORY ====================

async function loadConversations() {
    try {
        const response = await fetch(`${API_BASE_URL}/conversations?user_id=${currentUser.user_id}`);
        const data = await response.json();

        const list = document.getElementById('conversationList');
        list.innerHTML = '';

        if (data.conversations.length === 0) {
            list.innerHTML = '<p style="color: var(--text-secondary); font-size: 12px; padding: 8px;">No conversations yet</p>';
            return;
        }

        data.conversations.forEach(conv => {
            const date = new Date(conv.started_at);
            const dateStr = formatDate(date);

            const item = document.createElement('div');
            item.className = 'conversation-item';
            item.dataset.conversationId = conv.conversation_id;
            item.onclick = () => loadConversation(conv.conversation_id);
            item.innerHTML = `
                <p>${dateStr}</p>
                <small>${conv.message_count} messages</small>
            `;
            list.appendChild(item);
        });
    } catch (error) {
        console.error('Failed to load conversations:', error);
    }
}

function formatDate(date) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}

async function loadConversation(conversationId) {
    currentConversationId = conversationId;
    const chatWindow = document.getElementById('chatWindow');
    chatWindow.innerHTML = '';

    try {
        const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`);
        const data = await response.json();

        data.messages.forEach(msg => {
            addMessageToChat(msg.message_text, msg.sender_type);
        });
    } catch (error) {
        console.error('Failed to load messages:', error);
        chatWindow.innerHTML = '<p style="color: var(--error); text-align: center;">Failed to load conversation</p>';
    }
}

function startNewChat() {
    currentConversationId = null;
    document.getElementById('chatWindow').innerHTML = '';
    addWelcomeMessage();
    document.getElementById('messageInput').focus();
}

// ==================== INPUT HELPERS ====================

function setupInputAutoResize() {
    const input = document.getElementById('messageInput');
    if (input) {
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 120) + 'px';
            updateCharCounter();
        });
    }
}

function updateCharCounter() {
    const input = document.getElementById('messageInput');
    const counter = document.getElementById('charCounter');
    if (input && counter) {
        counter.textContent = `${input.value.length}/1000`;
    }
}
