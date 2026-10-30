const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');

// Store conversation history for multi-turn chat context
const conversation = [];

/**
 * Appends a message element to the chat box.
 * @param {'user'|'bot'} sender 
 * @param {string} text 
 * @returns {HTMLDivElement} The created message element
 */
function appendMessage(sender, text) {
  const msg = document.createElement('div');
  msg.classList.add('message', sender);
  msg.style.clear = 'both'; // ensures proper vertical stacking of floated messages
  msg.textContent = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
  return msg;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const userMessage = input.value.trim();
  if (!userMessage) return;

  // 1. Add user message to chat box and reset input
  appendMessage('user', userMessage);
  input.value = '';

  // 2. Add user message to conversation history
  conversation.push({ role: 'user', text: userMessage });

  // 3. Show temporary "Thinking..." bot message
  const botMessageElement = appendMessage('bot', 'Thinking...');

  // Disable form inputs during the request to prevent duplicate submissions
  const submitButton = form.querySelector('button[type="submit"]');
  input.disabled = true;
  if (submitButton) submitButton.disabled = true;

  try {
    // 4. Send conversation to backend
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

    // 5. Replace "Thinking..." with the AI reply if available
    if (data && data.result) {
      botMessageElement.textContent = data.result;
      conversation.push({ role: 'model', text: data.result });
    } else {
      botMessageElement.textContent = 'Sorry, no response received.';
      conversation.pop(); // Remove the last user message if turn was unsuccessful
    }
  } catch (error) {
    console.error('Chat error:', error);
    botMessageElement.textContent = 'Failed to get response from server.';
    conversation.pop(); // Remove the last user message to keep conversation state valid
  } finally {
    // Re-enable form controls and refocus input
    input.disabled = false;
    if (submitButton) submitButton.disabled = false;
    input.focus();
    chatBox.scrollTop = chatBox.scrollHeight;
  }
});
