const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

// 1. Function to add a message to the UI
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.classList.add(sender === 'user' ? 'user-message' : 'ai-message');
    messageDiv.textContent = text;
    
    chatBox.appendChild(messageDiv);
    // Auto-scroll to bottom
    chatBox.scrollTop = chatBox.scrollHeight; 
}

// 2. Function to handle sending message
async function sendMessage() {
    const text = userInput.value.trim();
    if (text === "") return;

    // Display user message
    addMessage(text, 'user');
    userInput.value = '';

    // Show a loading indicator (optional)
    const loadingDiv = document.createElement('div');
    loadingDiv.classList.add('message', 'ai-message');
    loadingDiv.textContent = "Thinking...";
    loadingDiv.id = "loading-msg";
    chatBox.appendChild(loadingDiv);

    try {
        // --- THIS IS WHERE YOU CONNECT TO YOUR BACKEND ---
        const response = await fetch('YOUR_API_ENDPOINT_HERE', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: text }) 
        });

        const data = await response.json();
        
        // Remove loading text
        document.getElementById('loading-msg').remove();

        // Display AI response (Assuming your API returns { "reply": "..." })
        addMessage(data.reply, 'ai');

    } catch (error) {
        document.getElementById('loading-msg').remove();
        addMessage("Error: Could not connect to server.", 'ai');
        console.error(error);
    }
}

// Event Listeners
sendBtn.addEventListener('click', sendMessage);

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});
