document.addEventListener('DOMContentLoaded', () => {
  // Get all necessary DOM elements
  const sidebar = document.getElementById('sidebar');
  const menuBtn = document.getElementById('menuBtn');
  const themeToggle = document.getElementById('themeToggle');
  const chatForm = document.getElementById('chatForm');
  const messageInput = document.getElementById('messageInput');
  const messagesContainer = document.getElementById('messagesContainer');
  const newChatBtn = document.getElementById('newChatBtn');
  const chatList = document.getElementById('chatList');
  const currentChatTitle = document.getElementById('currentChatTitle');
  const closeBtn = document.getElementById("closeSidebarBtn");

  // Track current chat session and all chats
  let currentChatId = null;
  let chats = JSON.parse(localStorage.getItem('chats')) || [];

  // Toggle between light and dark theme
  const toggleTheme = () => {
    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  };

  // Load theme from localStorage on page load
  document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'light');
  themeToggle.addEventListener('click', toggleTheme);

  // Sidebar menu toggle (mobile)
  menuBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
  closeBtn.addEventListener("click", () => sidebar.classList.remove("open"));

  // Auto-resize input area for multiline messages
  messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = messageInput.scrollHeight + 'px';
  });

  // Create a new chat session
  const createNewChat = () => {
    const chatId = Date.now().toString(); // Unique ID using timestamp
    const newChat = {
      id: chatId,
      title: `New Chat ${chats.length + 1}`,
      messages: []
    };
    chats.unshift(newChat); // Add to top
    currentChatId = chatId;
    saveChats();
    updateChatList();
    loadChat(chatId);
    return chatId;
  };

  // Save all chats to localStorage
  const saveChats = () => {
    localStorage.setItem('chats', JSON.stringify(chats));
  };

  // Update sidebar chat list UI
  const updateChatList = () => {
    chatList.innerHTML = '';
    chats.forEach(chat => {
      const li = document.createElement('li');
      li.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
      li.textContent = chat.title;
      li.onclick = () => loadChat(chat.id);
      chatList.appendChild(li);
    });
  };

  // Load a specific chat's messages into the chat window
  const loadChat = (chatId) => {
    currentChatId = chatId;
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      currentChatTitle.textContent = chat.title;
      messagesContainer.innerHTML = '';
      chat.messages.forEach(message => {
        appendMessage(message.content, message.sender, message.timestamp);
      });
      updateChatList();
    }
  };

  // Append a new message to the messages container
  const appendMessage = (content, sender, timestamp = new Date()) => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messageDiv.innerHTML = `
        <div class="content">${content}</div>
        <div class="timestamp">${new Date(timestamp).toLocaleTimeString()}</div>
      `;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  };

  // Show typing indicator while waiting for AI response
  const showTypingIndicator = () => {
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.innerHTML = '<span></span><span></span><span></span>';
    messagesContainer.appendChild(indicator);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return indicator;
  };

  // Create new chat when "New Chat" button is clicked
  newChatBtn.addEventListener('click', createNewChat);

  // Handle form submission (user sends a message)
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (!message) return;

    // Start new chat if one doesn't exist
    if (!currentChatId) currentChatId = createNewChat();

    // Save and show user's message
    const userMessage = { content: message, sender: 'user', timestamp: new Date() };
    const currentChat = chats.find(c => c.id === currentChatId);
    currentChat.messages.push(userMessage);
    appendMessage(message, 'user');

    // Reset input
    messageInput.value = '';
    messageInput.style.height = 'auto';

    // Show typing indicator while waiting
    const typingIndicator = showTypingIndicator();
    // Send request to Gemini API
    const API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
    const API_KEY = "AIzaSyBHnmbzY1fDkZflj1VNH4NJl7oArkVnMo8";
    try {
      const res = await fetch(`${API_BASE_URL}?key=${API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: message
                }
              ]
            }
          ]
        })
      });

      const data = await res.json();
      typingIndicator.remove();

      // Get Gemini AI response text
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't process that.";

      // Save and show AI message
      const aiMessage = { content: aiResponse, sender: 'ai', timestamp: new Date() };
      currentChat.messages.push(aiMessage);
      appendMessage(aiResponse, 'ai');

      // Rename chat title using first message
      if (currentChat.messages.length === 2) {
        currentChat.title = message.slice(0, 30) + (message.length > 30 ? '...' : '');
        currentChatTitle.textContent = currentChat.title;
        updateChatList();
      }

      saveChats();
    } catch (err) {
      typingIndicator.remove();
      appendMessage("Error getting response from Gemini API.", 'ai');
      console.error(err);
    }
  });

  // Load first chat (if any) when page loads
  if (chats.length > 0) loadChat(chats[0].id);
});