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
        <button class="icon-btn" id="live-btn"><i class="fa-solid fa-headphones"></i></button>
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
const liveBtn = document.getElementById("live-btn"); // New Headphone Button
const uploadBtn = document.getElementById("upload-btn");
const fileInput = document.getElementById("image-upload");
const modelSelect = document.getElementById("model-selector");
const inputWrapper = document.getElementById("input-wrapper");
const imgPreview = document.getElementById("img-preview");

// State
let currentImageBase64 = null;
let isLiveMode = false;     // Are we in continuous conversation?
let silenceTimer = null;    // Timer to detect when user stops talking
const SILENCE_DELAY = 2000; // Wait 2 seconds of silence before sending
const API_URL = "https://hybrid-ani.onrender.com/chat"; // YOUR BACKEND URL

/* ====================================
   SPEECH RECOGNITION SETUP
   ==================================== */
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false; // We handle the loop manually
    recognition.lang = "en-US";
    recognition.interimResults = true; // See text while talking

    recognition.onstart = () => {
        if (!isLiveMode) micBtn.classList.add("mic-active");
    };

    recognition.onend = () => {
        micBtn.classList.remove("mic-active");
        // If in Live Mode and we didn't just send a message, restart listening
        // (Logic handled in processLiveVoice)
    };

    recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('');

        // Show text in input
        input.value = transcript;
        input.dispatchEvent(new Event('input')); // Trigger resize

        // LIVE MODE LOGIC: Detect Silence
        if (isLiveMode) {
            clearTimeout(silenceTimer); // User is still talking, reset timer
            
            // If silence for 2 seconds, assume done and send
            silenceTimer = setTimeout(() => {
                recognition.stop();
                sendMessage(); // Auto-send
            }, SILENCE_DELAY);
        }
    };
}

/* ====================================
   LIVE MODE TOGGLE (Headphones)
   ==================================== */
liveBtn.onclick = () => {
    isLiveMode = !isLiveMode;
    
    if (isLiveMode) {
        liveBtn.classList.add("live-active");
        document.body.classList.add("live-mode-on");
        addMessage("<i>Live Mode On. Just start speaking...</i>", "bot");
        recognition.start(); // Start listening immediately
    } else {
        liveBtn.classList.remove("live-active");
        document.body.classList.remove("live-mode-on");
        recognition.stop();
        window.speechSynthesis.cancel(); // Stop AI talking
        clearTimeout(silenceTimer);
    }
};

/* ====================================
   TEXT-TO-SPEECH (Voice Output)
   ==================================== */
function speakText(text) {
    window.speechSynthesis.cancel();
    
    // clean text (remove markdown * or #) for cleaner speech
    const cleanText = text.replace(/[*#]/g, '');
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    utterance.onend = () => {
        // IMPORTANT: When AI finishes talking, if Live Mode is ON, listen again.
        if (isLiveMode) {
            setTimeout(() => {
                try { recognition.start(); } catch(e) {} // Restart Mic
            }, 500); 
        }
    };

    window.speechSynthesis.speak(utterance);
}

/* ====================================
   STANDARD INPUT LOGIC
   ==================================== */
// Mic Button (Single Press)
micBtn.onclick = () => {
    if (isLiveMode) return; // Disable manual mic if in live mode
    recognition.start();
};

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

/* ====================================
   CHAT LOGIC
   ==================================== */
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
    const text = input.value.trim();
    if (!text && !currentImageBase64) return;

    // 1. UI Updates
    addMessage(text, "user", currentImageBase64);
    const payload = { message: text, model: modelSelect.value, image: currentImageBase64 };
    
    input.value = ""; currentImageBase64 = null;
    inputWrapper.classList.remove("preview-active");
    toggleSendButton();

    // 2. Show Loading
    const loader = document.createElement("div");
    loader.className = "msg bot"; loader.innerText = "...";
    chatBox.appendChild(loader);

    // 3. API Call
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
        
        // 4. Speak Result (Auto-triggers listening again if Live Mode is on)
        if (isLiveMode) {
            speakText(botReply);
        }

    } catch (err) {
        loader.remove();
        addMessage("Error connecting.", "bot");
    }
}

sendBtn.onclick = sendMessage;
input.onkeydown = (e) => { if(e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }};
