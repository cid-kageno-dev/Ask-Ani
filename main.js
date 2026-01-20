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
                    </select>
                    <i class="fa-solid fa-chevron-down"></i>
                </div>
                <div class="status" style="font-size: 11px; color: #23a559;">● Online</div>
            </div>
        </div>
        <button class="icon-btn" id="voice-toggle-btn"><i class="fa-solid fa-volume-xmark"></i></button>
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
const API_URL = "https://hybrid-ani.onrender.com/chat"; // YOUR BACKEND URL

// VOICE STATE (Off by default)
let isVoiceOutputEnabled = false; 
const audioPlayer = new Audio();

/* ====================================
   SPEECH RECOGNITION (With Auto-Send)
   ==================================== */
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let silenceTimer = null;
const SILENCE_TIMEOUT = 2000; // 2 Seconds silence = Auto Send

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false; 
    recognition.lang = "en-US";
    recognition.interimResults = true; // Use interim to detect "still talking"

    recognition.onstart = () => {
        micBtn.classList.add("mic-active");
        input.placeholder = "Listening...";
    };

    recognition.onend = () => {
        micBtn.classList.remove("mic-active");
        input.placeholder = "Message...";
        clearTimeout(silenceTimer); // Safety clear
    };

    recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('');

        input.value = transcript;
        input.dispatchEvent(new Event('input')); // Resize box
        toggleSendButton();

        // --- AUTO SEND LOGIC ---
        clearTimeout(silenceTimer); // Reset timer while talking
        
        if (transcript.trim().length > 0) {
            silenceTimer = setTimeout(() => {
                recognition.stop(); // Stop listening
                sendMessage();      // Send automatically
            }, SILENCE_TIMEOUT);
        }
    };

    micBtn.onclick = () => {
        input.value = ""; // Clear input for fresh dictation
        recognition.start();
    };
} else {
    micBtn.style.display = 'none';
}

/* ====================================
   VOICE TOGGLE (Output)
   ==================================== */
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

/* ====================================
   TEXT-TO-SPEECH (Google Translate Free)
   ==================================== */
function speakText(text) {
    if (!isVoiceOutputEnabled) return;
    audioPlayer.pause();
    const cleanText = text.replace(/[*#]/g, '').trim();
    if (!cleanText) return;

    const encodedText = encodeURIComponent(cleanText);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=en&client=tw-ob`;

    audioPlayer.src = url;
    audioPlayer.playbackRate = 1.1; 
    audioPlayer.play();
    
    audioPlayer.onerror = () => {
        const fallback = new SpeechSynthesisUtterance(cleanText);
        window.speechSynthesis.speak(fallback);
    };
}

/* ====================================
   IMAGE & INPUT LOGIC
   ==================================== */
uploadBtn.onclick = () => fileInput.click();

fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            currentImageBase64 = e.target.result;
            imgPreview.src = currentImageBase64;
            inputWrapper.classList.add("preview-active");
            toggleSendButton();
        };
        reader.readAsDataURL(file);
    }
};

function toggleSendButton() {
    if(input.value.trim() || currentImageBase64) {
        sendBtn.style.display = "flex"; micBtn.style.display = "none";
    } else {
        sendBtn.style.display = "none"; micBtn.style.display = "flex";
    }
}

input.addEventListener('input', () => {
    input.style.height = 'auto'; input.style.height = input.scrollHeight + 'px';
    toggleSendButton();
});

/* ====================================
   CHAT LOGIC
   ==================================== */
function addMessage(text, type, imgData = null) {
    const div = document.createElement("div");
    div.className = `msg ${type}`;
    let content = "";
    if (imgData) content += `<img src="${imgData}" class="chat-img"><br>`;
    if (text) content += `<span>${text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>')}</span>`;
    div.innerHTML = content;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage() {
    // 1. Clear any pending auto-send timers
    clearTimeout(silenceTimer);

    const text = input.value.trim();
    if (!text && !currentImageBase64) return;

    addMessage(text, "user", currentImageBase64);
    const payload = { message: text, model: modelSelect.value, image: currentImageBase64 };
    
    // Reset UI
    input.value = ""; 
    currentImageBase64 = null;
    inputWrapper.classList.remove("preview-active");
    toggleSendButton();

    const loader = document.createElement("div");
    loader.className = "msg bot"; loader.innerText = "...";
    chatBox.appendChild(loader);

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        loader.remove();
        
        const botReply = data.reply || data.response;
        addMessage(botReply, "bot");
        
        if (isVoiceOutputEnabled) {
            speakText(botReply);
        }

    } catch (err) {
        loader.remove();
        addMessage("Error connecting.", "bot");
    }
}

sendBtn.onclick = sendMessage;
input.onkeydown = (e) => { if(e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }};
