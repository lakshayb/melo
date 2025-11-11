/**
 * Melo - The Therapist Chatbox
 * Frontend JavaScript Application - Vercel Deployment
 */

// Configuration - Use environment variable or default
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000/api'
  : 'https://melo-backend-production.up.railway.app/api'; // Change this to your Railway URL

// State management
let currentConversationId = null;
let currentUserId = 1;
let isProcessing = false;

// DOM Elements
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');
const chatWindow = document.getElementById('chatWindow');
const typingIndicator = document.getElementById('typingIndicator');
const emotionDisplay = document.getElementById('emotionDisplay');
const emotionValue = document.getElementById('emotionValue');
const emotionConfidence = document.getElementById('emotionConfidence');
const charCounter = document.getElementById('charCounter');
const sendBtn = document.getElementById('sendBtn');
const disclaimer = document.getElementById('disclaimer');
const closeDisclaimer = document.getElementById('closeDisclaimer');
const newChatBtn = document.getElementById('newChatBtn');

// Emotion emoji mapping
const EMOTION_EMOJIS = {
    'Sadness': '😢',
    'Anger': '😠',
    'Fear': '😰',
    'Happiness': '😊',
    'Love': '❤️',
    'Surprise': '😲',
    'Neutral': '😐',
    'Disgust': '🤢',
    'Shame': '🙈',
    'Guilt': '😔',
    'Confusion': '😕',
    'Desire': '🔥',
    'Sarcasm': '😏'
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    checkAPIConnection();
});

function initializeApp() {
    chatForm.addEventListener('submit', handleSubmit);
    messageInput.addEventListener('input', handleInput);
    closeDisclaimer.addEventListener('click', () => {
        disclaimer.classList.add('hidden');
        localStorage.setItem('disclaimerDismissed', 'true');
    });
    newChatBtn.addEventListener('click', startNewConversation);
    messageInput.addEventListener('input', autoResizeTextarea);

    if (localStorage.getItem('disclaimerDismissed')) {
        disclaimer.classList.add('hidden');
    }

    console.log('Melo chatbot initialized');
    console.log('API URL:', API_BASE_URL);
}

// Check API connection
async function checkAPIConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (response.ok) {
            console.log('✓ Connected to backend API');
        } else {
            console.warn('⚠ Backend API returned status:', response.status);
            addSystemMessage('⚠ Connected to backend but there may be issues. Please refresh.');
        }
    } catch (error) {
        console.error('✗ Cannot connect to backend API:', error);
        addSystemMessage('❌ Cannot connect to backend API. Check if Railway deployment is running and update the API_URL in app.js');
    }
}

// Handle form submission
async function handleSubmit(e) {
    e.preventDefault();

    if (isProcessing) return;

    const message = messageInput.value.trim();

    if (!message) return;

    isProcessing = true;
    sendBtn.disabled = true;

    addMessageToChat(message, 'user');
    messageInput.value = '';
    charCounter.textContent = '0/1000';
    messageInput.style.height = 'auto';

    typingIndicator.classList.add('active');

    try {
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                user_id: currentUserId,
                conversation_id: currentConversationId
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.conversation_id) {
            currentConversationId = data.conversation_id;
        }

        typingIndicator.classList.remove('active');

        setTimeout(() => {
            addMessageToChat(data.reply, 'bot');
            updateEmotionDisplay(data.emotion, data.confidence);

            if (data.needs_escalation) {
                showCrisisAlert();
            }
        }, 500);

    } catch (error) {
        console.error('Error sending message:', error);
        typingIndicator.classList.remove('active');
        addMessageToChat(
            `I apologize, but I encountered an error: ${error.message}. Please try again or check your internet connection.`,
            'bot'
        );
    } finally {
        isProcessing = false;
        sendBtn.disabled = false;
        messageInput.focus();
    }
}

// Add system message
function addSystemMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message';
    messageDiv.innerHTML = `
        <div class="message-avatar">⚠️</div>
        <div class="message-content">
            <div class="message-bubble" style="background: #fff3cd; border: 1px solid #ffc107; color: #856404;">
                <p>${text}</p>
            </div>
            <div class="message-time">System</div>
        </div>
    `;
    chatWindow.appendChild(messageDiv);
    scrollToBottom();
}

// Add message to chat window
function addMessageToChat(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = sender === 'user' ? '👤' : '💙';

    const content = document.createElement('div');
    content.className = 'message-content';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    const paragraphs = text.split('\n\n');
    paragraphs.forEach(para => {
        if (para.trim()) {
            const p = document.createElement('p');
            p.textContent = para.trim();
            bubble.appendChild(p);
        }
    });

    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = formatTime(new Date());

    content.appendChild(bubble);
    content.appendChild(time);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);

    chatWindow.appendChild(messageDiv);
    scrollToBottom();
}

// Update emotion display
function updateEmotionDisplay(emotion, confidence) {
    const emoji = EMOTION_EMOJIS[emotion] || '😐';
    emotionValue.textContent = `${emoji} ${emotion}`;
    emotionConfidence.textContent = `(${(confidence * 100).toFixed(1)}% confidence)`;
    emotionDisplay.classList.add('visible');

    setTimeout(() => {
        emotionDisplay.classList.remove('visible');
    }, 10000);
}

// Handle input changes
function handleInput(e) {
    const length = e.target.value.length;
    charCounter.textContent = `${length}/1000`;

    if (length > 900) {
        charCounter.style.color = 'var(--danger)';
    } else {
        charCounter.style.color = 'var(--text-secondary)';
    }
}

// Auto-resize textarea
function autoResizeTextarea(e) {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
}

// Scroll to bottom of chat
function scrollToBottom() {
    setTimeout(() => {
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }, 100);
}

// Format time
function formatTime(date) {
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) {
        return 'Just now';
    } else if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }
}

// Start new conversation
async function startNewConversation() {
    if (!confirm('Start a new conversation? Your current conversation will be saved.')) {
        return;
    }

    if (currentConversationId) {
        try {
            await fetch(`${API_BASE_URL}/conversations/${currentConversationId}/end`, {
                method: 'POST'
            });
        } catch (error) {
            console.error('Error ending conversation:', error);
        }
    }

    currentConversationId = null;
    chatWindow.innerHTML = '';

    addMessageToChat(
        "Hello! I'm Melo, your empathetic AI companion. I'm here to listen and provide emotional support in a safe, non-judgmental space.\n\nFeel free to share what's on your mind. Whether you're feeling happy, sad, anxious, or anything in between, I'm here for you. 💙",
        'bot'
    );

    emotionDisplay.classList.remove('visible');
}

// Show crisis alert
function showCrisisAlert() {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'crisis-alert';
    alertDiv.innerHTML = `
        <strong>⚠️ Crisis Support Available</strong>
        <p>If you're in immediate danger, please call emergency services or:</p>
        <ul>
            <li>National Suicide Prevention Lifeline: <a href="tel:988">988</a></li>
            <li>Crisis Text Line: Text HOME to <a href="sms:741741">741741</a></li>
            <li>International: <a href="https://findahelpline.com" target="_blank">findahelpline.com</a></li>
        </ul>
    `;

    chatWindow.appendChild(alertDiv);
    scrollToBottom();
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!isProcessing) {
            chatForm.dispatchEvent(new Event('submit'));
        }
    }
});

// Prevent accidental page refresh
window.addEventListener('beforeunload', (e) => {
    if (currentConversationId && chatWindow.children.length > 1) {
        e.preventDefault();
        e.returnValue = '';
    }
});

console.log('Melo chatbot ready! 💙');
