document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get('room');
  const pwd = urlParams.get('pwd');

  if(!roomId || !pwd){
    alert("Room ID or password missing!");
    window.location.href = "index.html";
  }

  const messagesDiv = document.getElementById("messages");
  const input = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");
  const resetBtn = document.getElementById("resetBtn");
  const emojiBtn = document.getElementById("emojiBtn");
  const typingDiv = document.getElementById("typingIndicator");
  const bgUpload = document.getElementById("bgUpload");
  const deleteBgBtn = document.getElementById("deleteBgBtn");
  const chatContainer = document.querySelector(".chat-container");
  const timerSpan = document.getElementById("sessionTimer");

  const roomRef = db.collection("privateRooms").doc(roomId).collection("messages");
  const roomDoc = db.collection("privateRooms").doc(roomId);

  // Temporary avatar color
  const avatarColor = "#" + Math.floor(Math.random()*16777215).toString(16);

  // Load messages real-time
  roomRef.orderBy("ts").onSnapshot(snapshot => {
    messagesDiv.innerHTML = '';
    snapshot.forEach(doc => {
      const msg = doc.data();
      const div = document.createElement("div");
      div.className = msg.sender==="me"?"myMsg":"otherMsg";
      div.innerHTML = `<span>${msg.text}</span><small>${new Date(msg.ts).toLocaleTimeString()}</small>`;
      div.style.backgroundColor = msg.sender==="me"?avatarColor:"#eee";
      messagesDiv.appendChild(div);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
  });

  // Listen if session is destroyed
  roomDoc.onSnapshot(doc => {
    if(!doc.exists){
      messagesDiv.innerHTML = `<div class="systemMsg">This chat session has been closed by the admin. Thank you for using TalkWithSuman.</div>`;
      input.disabled = true;
      sendBtn.disabled = true;
      emojiBtn.disabled = true;
      resetBtn.disabled = true;
    }
  });

  // Typing indicator
  let typingTimeout;
  input.addEventListener("input", () => {
    typingDiv.textContent = "Typing...";
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(()=>{ typingDiv.textContent=""; },1000);
  });

  // Send message
  sendBtn.addEventListener("click", () => {
    const text = input.value.trim();
    if(!text) return;
    roomRef.add({ text, sender:"me", ts: Date.now() });
    input.value="";
  });

  input.addEventListener("keypress", e => {
    if(e.key==="Enter") sendBtn.click();
  });

  // Reset chat
  resetBtn.addEventListener("click", () => {
    if(!confirm("Clear all messages in this room?")) return;
    roomRef.get().then(snapshot => {
      snapshot.forEach(doc => doc.ref.delete());
    });
  });

  // Emoji picker
  emojiBtn.addEventListener("click", () => {
    const emoji = prompt("Enter emoji or paste any:","");
    if(emoji) input.value += emoji;
  });

  // Background upload
  bgUpload.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(ev){
      chatContainer.style.backgroundImage = `url('${ev.target.result}')`;
      chatContainer.style.backgroundSize = "cover";
      chatContainer.style.backgroundPosition = "center";
    };
    reader.readAsDataURL(file);
  });

  deleteBgBtn.addEventListener("click", () => {
    chatContainer.style.backgroundImage = "";
  });

  // --- SESSION TIMER ---
  const defaultDuration = 48*60*60*1000; // 48 hours default
  let endTime = Date.now() + defaultDuration;

  // If you store expiry in Firebase, load it like:
  roomDoc.get().then(doc => {
    if(doc.exists && doc.data().expiry){
      endTime = doc.data().expiry;
    } else {
      // Set default expiry
      roomDoc.set({expiry:endTime}, {merge:true});
    }
  });

  function updateTimer(){
    const now = Date.now();
    let diff = endTime - now;
    if(diff<=0){
      timerSpan.textContent = "Session expired";
      input.disabled = true;
      sendBtn.disabled = true;
      emojiBtn.disabled = true;
      resetBtn.disabled = true;
      roomDoc.delete(); // remove session automatically
      return;
    }
    const hours = Math.floor(diff / (1000*60*60));
    const minutes = Math.floor((diff % (1000*60*60)) / (1000*60));
    const seconds = Math.floor((diff % (1000*60)) / 1000);
    timerSpan.textContent = `Timer: ${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
  }
  setInterval(updateTimer,1000);
});
