/* ====================================
   COMPONENTS
   ==================================== */
function renderNavbar() {
    return `
    <header>
        <div class="profile-group">
            <img src="https://i.postimg.cc/PrNFhBn3/Ani.jpg" class="avatar">
            <div class="info">
                <div class="model-wrapper">
                    <select id="model-selector" class="model-select">
                        <option value="gpt-4">GPT-4 (Smart)</option>
                        <option value="gpt-3.5">GPT-3.5 (Fast)</option>
                        <option value="claude-3">Claude 3</option>
                        <option value="gemini-pro">Gemini Pro</option>
                    </select>
                    <i class="fa-solid fa-chevron-down"></i>
                </div>
                <div class="status" style="font-size: 11px; color: #23a559;">● Online</div>
            </div>
        </div>
        <button class="icon-btn" id="voice-toggle-btn"><i class="fa-solid fa-volume-high"></i></button>
    </header>
    `;
}

function renderFooter() {
    return `
    <div id="input-area">
        <button class="icon-btn" id="upload-btn"><i class="fa-solid fa-paperclip"></i></button>
        
        <div class="input-wrapper" id="input-wrapper">
            <div id="img-preview-container">
                <img id="img-preview" src="" alt="">
            </div>
            <textarea id="msg-input" placeholder="Message..." rows="1"></textarea>
        </div>

        <button class="icon-btn" id="mic-btn"><i class="fa-solid fa-microphone"></i></button>
        <button class="icon-btn" id="send-btn" style="display:none;"><i class="fa-solid fa-paper-plane"></i></button>
    </div>
    `;
}

// Render Components
document.getElementById('navbar-container').innerHTML = renderNavbar();
document.getElementById('footer-container').innerHTML = renderFooter();

// Selectors
const chatBox = document.getElementById("chat-box");
const input = document.getElementById("msg-input");
const sendBtn = document.getElementById("send-btn");
const micBtn = document.getElementById("mic-btn");
const uploadBtn = document.getElementById("upload-btn");
const fileInput = document.getElementById("image-upload");
const modelSelect = document.getElementById("model-selector");
const inputWrapper = document.getElementById("input-wrapper");
const imgPreview = document.getElementById("img-preview");
const voiceToggleBtn = document.getElementById("voice-toggle-btn");

// State
let currentImageBase64 = null;
let isVoiceOutputEnabled = true;
const API_URL = "https://hybrid-ani.onrender.com/chat"; // Change to your Backend URL

/* ====================================
   IMAGE INPUT LOGIC
   ==================================== */
uploadBtn.onclick = () => fileInput.click();

fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            currentImageBase64 = e.target.result; // Save Base64
            imgPreview.src = currentImageBase64;
            inputWrapper.classList.add("preview-active");
            toggleSendButton();
        };
        reader.readAsDataURL(file);
    }
};

/* ====================================
   VOICE INPUT (Speech-to-Text)
   ==================================== */
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "en-US";

    recognition.onstart = () => micBtn.classList.add("mic-active");
    recognition.onend = () => micBtn.classList.remove("mic-active");

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        input.value += transcript + " ";
        toggleSendButton();
        input.focus();
    };

    micBtn.onclick = () => recognition.start();
} else {
    micBtn.style.display = "none"; // Hide if not supported
}

/* ====================================
   VOICE OUTPUT (Google Translate Hack - 100% Free)
   ==================================== */
const audioPlayer = new Audio();
let isSpeaking = false;

voiceToggleBtn.onclick = () => {
    isVoiceOutputEnabled = !isVoiceOutputEnabled;
    voiceToggleBtn.innerHTML = isVoiceOutputEnabled 
        ? '<i class="fa-solid fa-volume-high"></i>' 
        : '<i class="fa-solid fa-volume-xmark"></i>';
    if(!isVoiceOutputEnabled) {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
    }
};

function speakText(text) {
    if (!isVoiceOutputEnabled) return;
    
    // Cancel any existing audio
    audioPlayer.pause();

    // 1. Clean the text (remove emojis, *, #)
    const cleanText = text.replace(/[*#]/g, '').trim();
    if (!cleanText) return;

    // 2. Construct the Google Translate URL
    // client=tw-ob is the magic key for free access
    const encodedText = encodeURIComponent(cleanText);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=en&client=tw-ob`;

    // 3. Play Audio
    audioPlayer.src = url;
    audioPlayer.playbackRate = 1.1; // Make it slightly faster/natural
    isSpeaking = true;
    audioPlayer.play();

    // 4. Live Mode Logic (Restart Mic when done)
    audioPlayer.onended = () => {
        isSpeaking = false;
        if (isLiveMode) {
            setTimeout(() => {
                try { recognition.start(); } catch(e) {}
            }, 500); 
        }
    };
    
    // Fallback: If internet fails, use robot voice
    audioPlayer.onerror = () => {
        const fallback = new SpeechSynthesisUtterance(cleanText);
        window.speechSynthesis.speak(fallback);
    };
}



/* ====================================
   CHAT LOGIC
   ==================================== */
function toggleSendButton() {
    const hasText = input.value.trim().length > 0;
    const hasImage = currentImageBase64 !== null;
    
    if (hasText || hasImage) {
        sendBtn.style.display = "flex";
        micBtn.style.display = "none";
    } else {
        sendBtn.style.display = "none";
        micBtn.style.display = "flex";
    }
}

input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = input.scrollHeight + 'px';
    toggleSendButton();
});

function addMessage(text, type, imgData = null) {
    const div = document.createElement("div");
    div.className = `msg ${type}`;

    let content = "";
    
    // 1. If there is an image, show it
    if (imgData) {
        content += `<img src="${imgData}" class="chat-img"><br>`;
    }

    // 2. Format Text (Markdown-ish)
    if (text) {
        let formatted = text
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // Bold
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>') // Link
            .replace(/\n/g, '<br>'); // Newlines
        content += `<span>${formatted}</span>`;
    }

    div.innerHTML = content;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage() {
    const text = input.value.trim();
    const model = modelSelect.value; // GET SELECTED MODEL
    
    if (!text && !currentImageBase64) return;

    // Add User Message to Chat
    addMessage(text, "user", currentImageBase64);

    // Prepare Payload
    const payload = {
        message: text,
        model: model,
        image: currentImageBase64 // Sending Base64 string to backend
    };

    // Reset Input
    input.value = "";
    currentImageBase64 = null;
    inputWrapper.classList.remove("preview-active");
    input.style.height = 'auto';
    toggleSendButton();

    // Show Loading
    const loader = document.createElement("div");
    loader.className = "msg bot";
    loader.innerText = "...";
    chatBox.appendChild(loader);

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        loader.remove();
        
        const botReply = data.reply || data.response || "No response";
        addMessage(botReply, "bot");
        
        // Speak response
        speakText(botReply);

    } catch (err) {
        loader.remove();
        addMessage("Error connecting to Ani.", "bot");
    }
}

sendBtn.onclick = sendMessage;
input.onkeydown = (e) => { if(e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }};
