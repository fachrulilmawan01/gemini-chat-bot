const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const sendBtn = document.getElementById('send-btn');
const resetBtn = document.getElementById('reset-btn');

// Store conversation history for multi-turn chat context
const conversation = [];

/**
 * Format markdown text to clean HTML (bold, lists, paragraphs).
 * @param {string} text 
 * @returns {string} HTML string
 */
function formatMarkdown(text) {
  // Escape HTML to prevent injection
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Convert **bold**
  let formatted = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Parse lines for bullet lists & paragraphs
  const lines = formatted.split('\n');
  let inList = false;
  let html = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      html += `<li>${trimmed.substring(2)}</li>`;
    } else {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      if (trimmed === '') {
        html += '<br/>';
      } else {
        html += `<p>${line}</p>`;
      }
    }
  }

  if (inList) {
    html += '</ul>';
  }

  return html;
}

/**
 * Appends a message row with avatar, bubble, and timestamp to the chat box.
 * @param {'user'|'bot'} sender 
 * @param {string} text 
 * @param {boolean} isThinking 
 * @returns {HTMLDivElement} The created message bubble element
 */
function appendMessage(sender, text, isThinking = false) {
  // Hide welcome card once the first message is sent
  const welcomeCard = document.getElementById('welcome-card');
  if (welcomeCard) {
    welcomeCard.style.display = 'none';
  }

  const row = document.createElement('div');
  row.classList.add('message-row', sender === 'user' ? 'user-row' : 'bot-row');

  // Avatar
  const avatar = document.createElement('div');
  avatar.classList.add('msg-avatar');
  avatar.textContent = sender === 'user' ? '👤' : '✈️';

  // Content wrapper
  const contentBox = document.createElement('div');
  contentBox.classList.add('message-content');

  // Message Bubble
  const bubble = document.createElement('div');
  bubble.classList.add('message-bubble');

  if (isThinking) {
    bubble.innerHTML = `
      <div class="thinking-box">
        <span class="thinking-text">Triva sedang merencanakan...</span>
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
    `;
  } else if (sender === 'bot') {
    bubble.innerHTML = formatMarkdown(text);
  } else {
    bubble.textContent = text;
  }

  // Timestamp
  const time = document.createElement('div');
  time.classList.add('message-time');
  const now = new Date();
  time.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  contentBox.appendChild(bubble);
  contentBox.appendChild(time);

  row.appendChild(avatar);
  row.appendChild(contentBox);

  chatBox.appendChild(row);
  chatBox.scrollTop = chatBox.scrollHeight;

  return bubble;
}

/**
 * Handles sending a message to the backend.
 * @param {string} userMessage 
 */
async function handleSendMessage(userMessage) {
  if (!userMessage) return;

  // 1. Add user message to UI and clear input
  appendMessage('user', userMessage);
  input.value = '';

  // 2. Push user turn into history
  conversation.push({ role: 'user', text: userMessage });

  // 3. Show temporary thinking indicator
  const botBubble = appendMessage('bot', '', true);

  // Disable form inputs
  input.disabled = true;
  if (sendBtn) sendBtn.disabled = true;

  try {
    // 4. Send request to /api/chat
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ conversation }),
    });

    if (!response.ok) {
      throw new Error('Failed to get response from server.');
    }

    const data = await response.json();

    // 5. Replace thinking indicator with AI reply
    if (data && data.result) {
      botBubble.innerHTML = formatMarkdown(data.result);
      conversation.push({ role: 'model', text: data.result });
    } else {
      botBubble.textContent = 'Sorry, no response received.';
      conversation.pop(); // Revert user turn on empty response
    }
  } catch (error) {
    console.error('Chat error:', error);
    botBubble.textContent = 'Failed to get response from server.';
    conversation.pop(); // Revert user turn on error
  } finally {
    input.disabled = false;
    if (sendBtn) sendBtn.disabled = false;
    input.focus();
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}

// Form submission handler
form.addEventListener('submit', (e) => {
  e.preventDefault();
  handleSendMessage(input.value.trim());
});

// Bind suggestion chips
function bindSuggestionChips() {
  const chips = document.querySelectorAll('.chip');
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const text = chip.textContent.trim();
      handleSendMessage(text);
    });
  });
}
bindSuggestionChips();

// Reset chat handler
if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    conversation.length = 0;
    chatBox.innerHTML = `
      <div class="welcome-card" id="welcome-card">
        <div class="welcome-icon">🌴</div>
        <h3>Halo! Mau liburan ke mana kali ini?</h3>
        <p>Saya Triva, travel assistant pribadimu. Ceritakan destinasi impian atau pilih ide cepat di bawah:</p>
        <div class="suggestion-chips">
          <button type="button" class="chip">🏖️ Rekomendasi liburan 3 hari di Bali</button>
          <button type="button" class="chip">🎒 Backpacker hemat ke Jepang 7 hari</button>
          <button type="button" class="chip">⛰️ Itinerary santai akhir pekan ke Bromo</button>
        </div>
      </div>
    `;
    bindSuggestionChips();
    input.value = '';
    input.focus();
  });
}
