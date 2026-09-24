import { auth, db } from "./firebase.js";
import { signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { collection, doc, onSnapshot, query, orderBy, limit, writeBatch, addDoc, serverTimestamp, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// Clear Chat: direkter Firestore-Chat, keine Cloud Functions und keine KI nötig.
window.clearChatScriptLoaded = true;
const $ = id => document.getElementById(id);
const showStatus = message => { const el = $("startupStatus"); if (el) { el.hidden = false; el.textContent = message; } };
let user = null, roomId = null, room = null, unsubscribeRooms = null, unsubscribeRoom = null, unsubscribeMessages = null;
let profile; try { profile = JSON.parse(localStorage.getItem("clearChatProfile") || '{"name":"","color":"#e76f51"}'); } catch { profile = {name:"",color:"#e76f51"}; }
const modalIds = ["profileModal","createChatModal","joinChatModal","inviteModal","settingsModal"];
function safeError(err) {
  console.error("Clear Chat:", err);
  let message = err?.message || "Ein Fehler ist aufgetreten.";
  if (err?.code === "permission-denied") message = "Firebase verweigert den Zugriff. Bitte die neuen Firestore-Regeln in der Firebase-Konsole veröffentlichen (siehe START_HIER.txt).";
  if (err?.code === "unavailable") message = "Firebase ist gerade nicht erreichbar. Bitte Internetverbindung prüfen.";
  showStatus("⚠️ " + message); alert(message);
}
function openModal(id) { modalIds.forEach(m => $(m).classList.add("hidden")); $(id).classList.remove("hidden"); }
function closeModals() { modalIds.forEach(m => $(m).classList.add("hidden")); }
function setProfile() {
  $("profileName").textContent = profile.name || "Dein Profil";
  $("profileAvatar").textContent = (profile.name || "?").slice(0,1).toUpperCase();
  $("profileAvatar").style.background = profile.color;
  $("usernameInput").value = profile.name;
  $("userColorInput").value = profile.color;
}
function requireProfile() { if (profile.name) return true; openModal("profileModal"); alert("Bitte lege zuerst dein Profil an."); return false; }
function showWelcome() {
  roomId = null; room = null;
  if (unsubscribeRoom) unsubscribeRoom(); if (unsubscribeMessages) unsubscribeMessages();
  unsubscribeRoom = unsubscribeMessages = null;
  $("welcomeScreen").classList.remove("hidden"); $("chatScreen").classList.add("hidden");
}
function openRoom(id) {
  if (unsubscribeRoom) unsubscribeRoom(); if (unsubscribeMessages) unsubscribeMessages();
  roomId = id; room = null;
  $("welcomeScreen").classList.add("hidden"); $("chatScreen").classList.remove("hidden");
  $("messages").textContent = "Nachrichten werden geladen …";
  unsubscribeRoom = onSnapshot(doc(db,"rooms",id), snap => {
    if (!snap.exists()) return showWelcome();
    room = snap.data();
    $("currentChatName").textContent = room.name || "Chat";
    $("currentChatDescription").textContent = room.description || "";
    $("settingsButton").style.display = room.owner === user.uid ? "" : "none";
    $("leaveChatButton").style.display = room.owner === user.uid ? "none" : "";
    $("settingsEmojis").value = room.emojis || "";
    $("settingsRules").value = room.rules || "";
    $("settingsTerms").value = room.terms || "";
    $("settingsTandem").value = room.tandem || "";
  }, safeError);
  unsubscribeMessages = onSnapshot(query(collection(db,"rooms",id,"messages"),orderBy("createdAt","desc"),limit(100)), snap => {
    $("messages").replaceChildren(); snap.docs.reverse().forEach(d => renderMessage(d.data()));
    $("messages").scrollTop = $("messages").scrollHeight;
  }, safeError);
  document.querySelectorAll(".chat-list-item").forEach(el => el.classList.toggle("active",el.dataset.id === id));
}
function renderMessage(msg) {
  const wrap = document.createElement("div"); wrap.className = "message" + (msg.userId === user.uid ? " own" : "");
  const name = document.createElement("div"); name.className = "message-name"; name.textContent = msg.userName;
  const bubble = document.createElement("div"); bubble.className = "message-bubble"; bubble.textContent = msg.text;
  if (msg.userId === user.uid) bubble.style.background = msg.color || profile.color;
  const time = document.createElement("div"); time.className = "message-time";
  time.textContent = msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleString("de-DE",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}) : "Wird gesendet …";
  wrap.append(name,bubble,time); $("messages").append(wrap);
}
function listenRooms() {
  if (unsubscribeRooms) unsubscribeRooms();
  unsubscribeRooms = onSnapshot(collection(db,"users",user.uid,"rooms"),snap => {
    $("chatList").replaceChildren();
    snap.docs.forEach(d => {
      const b = document.createElement("button"); b.className = "chat-list-item" + (roomId === d.id ? " active" : "");
      b.dataset.id = d.id; b.textContent = d.data().name || "Chat";
      b.onclick = () => openRoom(d.id); $("chatList").append(b);
    });
    if (roomId && !snap.docs.some(d => d.id === roomId)) showWelcome();
  },safeError);
}
async function send() {
  if (!user || !roomId || !room || !requireProfile()) return;
  const text = $("messageInput").value.trim(); if (!text || text.length > 1000) return;
  $("sendButton").disabled = true;
  try {
    await addDoc(collection(db,"rooms",roomId,"messages"), {
      text, userId:user.uid, userName:profile.name, color:profile.color, createdAt:serverTimestamp()
    });
    $("messageInput").value = "";
  } catch(err) { safeError(err); }
  finally { $("sendButton").disabled = false; }
}
document.querySelectorAll(".close-modal").forEach(b => b.onclick = closeModals);
modalIds.forEach(id => $(id).addEventListener("click",e => {if(e.target === $(id)) closeModals();}));
$("profileButton").onclick = () => openModal("profileModal");
$("saveProfileButton").onclick = () => {
  const name = $("usernameInput").value.trim();
  if (!name || name.length > 30) return alert("Bitte einen Namen mit höchstens 30 Zeichen eingeben.");
  profile = {name,color:$("userColorInput").value};
  localStorage.setItem("clearChatProfile",JSON.stringify(profile)); setProfile(); closeModals();
  if (user && new URL(location.href).searchParams.get("join")) openModal("joinChatModal");
};
$("newChatButton").onclick = $("welcomeCreateButton").onclick = () => {if (requireProfile()) openModal("createChatModal");};
$("createChatConfirm").onclick = async () => {
  if (!user) return alert("Firebase verbindet sich noch. Bitte kurz warten.");
  if (!requireProfile()) return;
  const name = $("newChatName").value.trim(); if (!name) return alert("Bitte einen Chatnamen eingeben.");
  $("createChatConfirm").disabled = true;
  try {
    const roomRef = doc(collection(db,"rooms"));
    const batch = writeBatch(db);
    batch.set(roomRef, {name, description:$("newChatDescription").value.trim(), emojis:$("newChatEmojis").value.trim(),
      rules:$("newChatRules").value.trim(), terms:"", tandem:"", owner:user.uid, createdAt:serverTimestamp()});
    batch.set(doc(db,"rooms",roomRef.id,"members",user.uid), {joinedAt:serverTimestamp()});
    batch.set(doc(db,"users",user.uid,"rooms",roomRef.id), {name, joinedAt:serverTimestamp()});
    await batch.commit(); closeModals(); openRoom(roomRef.id);
  } catch(err) { safeError(err); }
  finally { $("createChatConfirm").disabled = false; }
};
$("joinChatButton").onclick = () => {if(requireProfile()) openModal("joinChatModal");};
$("joinChatConfirm").onclick = async () => {
  if (!user) return alert("Firebase verbindet sich noch. Bitte kurz warten.");
  if (!requireProfile()) return;
  const code = $("joinChatCode").value.trim(); if (!code) return alert("Bitte Einladungscode eingeben.");
  $("joinChatConfirm").disabled = true;
  try {
    const roomSnap = await getDoc(doc(db,"rooms",code));
    if (!roomSnap.exists()) return alert("Kein Chat zu diesem Code gefunden.");
    const batch = writeBatch(db);
    batch.set(doc(db,"rooms",code,"members",user.uid), {joinedAt:serverTimestamp()});
    batch.set(doc(db,"users",user.uid,"rooms",code), {name:roomSnap.data().name, joinedAt:serverTimestamp()});
    await batch.commit(); closeModals(); openRoom(code);
    const url = new URL(location.href); url.searchParams.delete("join"); history.replaceState({},"",url);
  } catch(err) { safeError(err); }
  finally { $("joinChatConfirm").disabled = false; }
};
$("leaveChatButton").onclick = async () => {
  if (!roomId || !confirm("Diesen Chat verlassen?")) return;
  if (room?.owner === user.uid) return alert("Als Ersteller kannst du diesen Chat in dieser Testversion nicht verlassen.");
  try {
    const oldId = roomId;
    const batch = writeBatch(db);
    batch.delete(doc(db,"rooms",oldId,"members",user.uid));
    batch.delete(doc(db,"users",user.uid,"rooms",oldId));
    await batch.commit(); showWelcome();
  } catch(err) {safeError(err);}
};
$("settingsButton").onclick = () => {if(room && room.owner === user.uid) openModal("settingsModal");};
$("saveSettingsButton").onclick = async () => {
  if (!roomId || !room || room.owner !== user.uid) return;
  $("saveSettingsButton").disabled = true;
  try {
    await updateDoc(doc(db,"rooms",roomId), {emojis:$("settingsEmojis").value.trim(),
      rules:$("settingsRules").value.trim(),terms:$("settingsTerms").value.trim(),tandem:$("settingsTandem").value.trim()});
    closeModals();
  } catch(err) {safeError(err);}
  finally {$("saveSettingsButton").disabled = false;}
};
$("inviteButton").onclick = () => {
  if (!roomId) return;
  const url = new URL(location.href); url.searchParams.set("join",roomId);
  $("inviteCode").textContent = roomId; $("inviteLink").value = url.toString();
  $("qrcode").replaceChildren();
  if (typeof QRCode !== "undefined") new QRCode($("qrcode"),{text:url.toString(),width:190,height:190});
  else $("qrcode").textContent = "QR-Code gerade nicht verfügbar – Link oder Code verwenden.";
  openModal("inviteModal");
};
$("copyInviteButton").onclick = async () => {
  try { await navigator.clipboard.writeText($("inviteLink").value); alert("Link kopiert!"); }
  catch { $("inviteLink").select(); alert("Bitte den markierten Link kopieren."); }
};
$("sendButton").onclick = send;
$("messageInput").onkeydown = e => {if (e.key === "Enter" && !e.shiftKey) {e.preventDefault(); send();}};
$("editMessageButton").onclick = () => {$("moderationNotice").classList.add("hidden"); $("messageInput").focus();};
$("cancelMessageButton").onclick = () => $("moderationNotice").classList.add("hidden");
setProfile();
onAuthStateChanged(auth,async u => {
  if (u) {
    user = u; const el = $("startupStatus"); if (el && location.protocol !== "file:") el.hidden = true;
    listenRooms();
    const join = new URL(location.href).searchParams.get("join");
    if (join) {$("joinChatCode").value = join; openModal(profile.name ? "joinChatModal" : "profileModal");}
    else if (!profile.name) openModal("profileModal");
  } else {
    user = null; showStatus("Verbindung zu Firebase wird aufgebaut …");
    try {await signInAnonymously(auth);} catch(err) {safeError(err);}
  }
});
