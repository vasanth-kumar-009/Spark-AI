
// const chatBox = document.getElementById("chatBox");
// const chatForm = document.getElementById("chatForm");
// const userInput = document.getElementById("userInput");
// const sendBtn = document.getElementById("sendBtn");
// const clearBtn = document.getElementById("clearBtn");

// let messages = [];
// let isBusy = false;

// function addMessage(text, type) {
//     const div = document.createElement("div");
//     div.className = `message ${type}`;
//     div.textContent = text;
//     chatBox.appendChild(div);
//     chatBox.scrollTop = chatBox.scrollHeight;
//     return div;
// }

// chatForm.addEventListener("submit", async (event) => {
//     event.preventDefault();

//     const prompt = userInput.value.trim();

//     if (!prompt || isBusy) return;

//     messages.push({
//         role: "user",
//         content: prompt
//     });

//     addMessage(prompt, "user");
//     userInput.value = "";

//     isBusy = true;
//     sendBtn.disabled = true;

//     const aiMessage = addMessage("", "ai");

//     try {
//         const response = await fetch("/api/chat", {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json"
//             },
//             body: JSON.stringify({ messages })
//         });

//         if (!response.ok) {
//             const data = await response.json();
//             throw new Error(data.error || "Request failed.");
//         }

//         if (!response.body) {
//             throw new Error("Streaming is not supported by this response.");
//         }

//         const reader = response.body.getReader();
//         const decoder = new TextDecoder();

//         let buffer = "";
//         let answer = "";

//         while (true) {
//             const { value, done } = await reader.read();

//             if (done) break;

//             buffer += decoder.decode(value, { stream: true });

//             const events = buffer.split("\n\n");
//             buffer = events.pop();

//             for (const eventText of events) {
//                 const dataLine = eventText
//                     .split("\n")
//                     .find(line => line.startsWith("data: "));

//                 if (!dataLine) continue;

//                 const data = dataLine.slice(6);

//                 if (data === "[DONE]") continue;

//                 const parsed = JSON.parse(data);

//                 if (parsed.error) {
//                     throw new Error(parsed.error);
//                 }

//                 answer += parsed.content || "";
//                 aiMessage.textContent = answer;
//                 chatBox.scrollTop = chatBox.scrollHeight;
//             }
//         }

//         if (!answer) {
//             throw new Error("The AI returned an empty response.");
//         }

//         messages.push({
//             role: "assistant",
//             content: answer
//         });

//     } catch (error) {
//         aiMessage.textContent = "Error: " + error.message;
//         messages.pop();
//     } finally {
//         isBusy = false;
//         sendBtn.disabled = false;
//         userInput.focus();
//     }
// });

// clearBtn.addEventListener("click", () => {
//     if (isBusy) return;

//     messages = [];
//     chatBox.innerHTML = "";

//     addMessage(
//         "Conversation cleared! How can I help you?",
//         "ai"
//     );
// });


/* ==========================================================
   Spark AI - front-end
   ========================================================== */

// const root = document.documentElement;

// const chatBox = document.getElementById("chatBox");
// const chatInner = document.getElementById("chatInner");
// const chatForm = document.getElementById("chatForm");
// const userInput = document.getElementById("userInput");
// const sendBtn = document.getElementById("sendBtn");

// const sidebar = document.getElementById("sidebar");
// const sidebarToggle = document.getElementById("sidebarToggle");
// const backdrop = document.getElementById("backdrop");
// const newChatBtn = document.getElementById("newChatBtn");
// const clearAllBtn = document.getElementById("clearAllBtn");
// const chatList = document.getElementById("chatList");
// const themeBtn = document.getElementById("themeBtn");

// const KEYS = {
//     chats: "spark_chats",
//     active: "spark_active_chat",
//     theme: "spark_theme",
//     sidebar: "spark_sidebar"
// };

// const DEFAULT_TITLE = "New chat";
// const mobileQuery = window.matchMedia("(max-width: 820px)");

// const AVATAR_HTML = `<img src="ai.png" alt="AI">`;

// const TRASH_SVG = `
// <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
//     <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>
// </svg>`;

// const SUGGESTIONS = [
//     "Explain vibe-coding simply",
//     "Help me write an email",
//     "Give me a study plan",
//     "Debug my code"
// ];

// let chats = [];      // saved conversations (only ones that have messages)
// let current = null;  // the conversation on screen: { id, title, messages, updatedAt }
// let isBusy = false;

// /* ---------- Safe localStorage ---------- */

// function read(key) {
//     try {
//         return localStorage.getItem(key);
//     } catch {
//         return null;
//     }
// }

// function store(key, value) {
//     try {
//         localStorage.setItem(key, value);
//     } catch {
//         /* storage full or blocked - the app still works, it just won't remember */
//     }
// }

// /* ---------- Helpers ---------- */

// function escapeHtml(str) {
//     return String(str)
//         .replace(/&/g, "&amp;")
//         .replace(/</g, "&lt;")
//         .replace(/>/g, "&gt;")
//         .replace(/"/g, "&quot;")
//         .replace(/'/g, "&#39;");
// }

// function isNearBottom() {
//     return chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight < 120;
// }

// function scrollToBottom(force = false) {
//     if (force || isNearBottom()) {
//         chatBox.scrollTop = chatBox.scrollHeight;
//     }
// }

// function uid() {
//     return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
// }

// /* ---------- Tiny, safe markdown renderer ---------- */

// function renderInline(text) {
//     // `text` is already HTML-escaped
//     return text
//         .replace(/`([^`\n]+)`/g, "<code>$1</code>")
//         .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
//         .replace(/(^|[^*])\*(?!\s)([^*\n]+?)\*(?!\*)/g, "$1<em>$2</em>")
//         .replace(
//             /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
//             '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
//         );
// }

// function renderBlocks(text) {
//     const lines = escapeHtml(text).split("\n");
//     let html = "";
//     let paragraph = [];
//     let list = null; // { type: "ul" | "ol", items: [] }

//     const flushParagraph = () => {
//         if (paragraph.length) {
//             html += `<p>${renderInline(paragraph.join("<br>"))}</p>`;
//             paragraph = [];
//         }
//     };

//     const flushList = () => {
//         if (list) {
//             html += `<${list.type}>${list.items
//                 .map(item => `<li>${renderInline(item)}</li>`)
//                 .join("")}</${list.type}>`;
//             list = null;
//         }
//     };

//     for (const line of lines) {
//         const heading = line.match(/^(#{1,3})\s+(.*)$/);
//         const bullet = line.match(/^\s*[-*]\s+(.*)$/);
//         const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);

//         if (heading) {
//             flushParagraph();
//             flushList();
//             const level = heading[1].length;
//             html += `<h${level}>${renderInline(heading[2])}</h${level}>`;
//         } else if (bullet || numbered) {
//             flushParagraph();
//             const type = bullet ? "ul" : "ol";
//             if (!list || list.type !== type) {
//                 flushList();
//                 list = { type, items: [] };
//             }
//             list.items.push((bullet || numbered)[1]);
//         } else if (line.trim() === "") {
//             flushParagraph();
//             flushList();
//         } else {
//             flushList();
//             paragraph.push(line);
//         }
//     }

//     flushParagraph();
//     flushList();
//     return html;
// }

// function renderMarkdown(source) {
//     // Handles unfinished code fences too, so streaming looks right
//     const fence = /```([\w+-]*)\n?([\s\S]*?)(?:```|$)/g;
//     let html = "";
//     let last = 0;
//     let match;

//     while ((match = fence.exec(source)) !== null) {
//         html += renderBlocks(source.slice(last, match.index));

//         const lang = match[1] || "code";
//         html += `
// <div class="code-block">
//     <div class="code-head">
//         <span>${escapeHtml(lang)}</span>
//         <button type="button" class="copy-btn">Copy</button>
//     </div>
//     <pre><code>${escapeHtml(match[2].replace(/\n$/, ""))}</code></pre>
// </div>`;

//         last = match.index + match[0].length;
//         if (match[0].length === 0) fence.lastIndex++;
//     }

//     html += renderBlocks(source.slice(last));
//     return html;
// }

// /* ---------- Chat history (saved in the browser) ---------- */

// function createChat() {
//     return { id: uid(), title: DEFAULT_TITLE, messages: [], updatedAt: Date.now() };
// }

// function makeTitle(text) {
//     const clean = text.replace(/\s+/g, " ").trim();
//     return clean.length > 40 ? clean.slice(0, 40).trimEnd() + "…" : clean || DEFAULT_TITLE;
// }

// function loadChats() {
//     try {
//         const data = JSON.parse(read(KEYS.chats) || "[]");
//         if (!Array.isArray(data)) return [];

//         return data
//             .filter(chat => chat && chat.id && Array.isArray(chat.messages))
//             .map(chat => ({
//                 id: String(chat.id),
//                 title: String(chat.title || DEFAULT_TITLE),
//                 updatedAt: Number(chat.updatedAt) || Date.now(),
//                 messages: chat.messages.filter(
//                     m => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant")
//                 )
//             }))
//             .filter(chat => chat.messages.length > 0);
//     } catch {
//         return [];
//     }
// }

// function persist() {
//     store(KEYS.chats, JSON.stringify(chats));
//     store(KEYS.active, current.id);
// }

// // Save the current conversation (or drop it from the list if it is empty)
// function saveCurrent() {
//     const index = chats.findIndex(chat => chat.id === current.id);

//     if (current.messages.length === 0) {
//         if (index !== -1) chats.splice(index, 1);
//     } else {
//         if (current.title === DEFAULT_TITLE) {
//             current.title = makeTitle(current.messages[0].content);
//         }
//         current.updatedAt = Date.now();

//         if (index === -1) chats.push(current);
//         chats.sort((a, b) => b.updatedAt - a.updatedAt);
//     }

//     persist();
//     renderChatList();
// }

// function renderChatList() {
//     clearAllBtn.hidden = chats.length === 0;

//     if (chats.length === 0) {
//         chatList.innerHTML = '<p class="list-empty">Your conversations will show up here.</p>';
//         return;
//     }

//     const dayMs = 86400000;
//     const startOfToday = new Date().setHours(0, 0, 0, 0);

//     const groups = [
//         { label: "Today", items: [] },
//         { label: "Yesterday", items: [] },
//         { label: "Previous 7 days", items: [] },
//         { label: "Older", items: [] }
//     ];

//     for (const chat of chats) {
//         const t = chat.updatedAt;
//         const i =
//             t >= startOfToday ? 0 :
//             t >= startOfToday - dayMs ? 1 :
//             t >= startOfToday - 7 * dayMs ? 2 : 3;
//         groups[i].items.push(chat);
//     }

//     chatList.innerHTML = groups
//         .filter(group => group.items.length)
//         .map(group => `
// <p class="list-label">${group.label}</p>
// ${group.items.map(chat => `
// <div class="chat-item${chat.id === current.id ? " active" : ""}" data-id="${escapeHtml(chat.id)}">
//     <button type="button" class="chat-open" title="${escapeHtml(chat.title)}">${escapeHtml(chat.title)}</button>
//     <button type="button" class="chat-del" aria-label="Delete chat" title="Delete chat">${TRASH_SVG}</button>
// </div>`).join("")}`)
//         .join("");
// }

// function renderConversation() {
//     chatInner.innerHTML = "";

//     if (current.messages.length === 0) {
//         showWelcome();
//         return;
//     }

//     for (const message of current.messages) {
//         addMessage(message.content, message.role === "user" ? "user" : "ai");
//     }

//     scrollToBottom(true);
// }

// function showChat(chat) {
//     current = chat;
//     persist();
//     renderConversation();
//     renderChatList();
// }

// function openChat(id) {
//     if (isBusy) return;

//     if (id !== current.id) {
//         const chat = chats.find(c => c.id === id);
//         if (chat) showChat(chat);
//     }

//     closeSidebarOnMobile();
//     userInput.focus();
// }

// function newChat() {
//     if (isBusy) return;

//     // Already on an empty chat - nothing to create
//     if (current.messages.length > 0) {
//         showChat(createChat());
//     }

//     closeSidebarOnMobile();
//     userInput.focus();
// }

// function deleteChat(id) {
//     if (isBusy) return;

//     const chat = chats.find(c => c.id === id);
//     if (!chat) return;
//     if (!confirm(`Delete "${chat.title}"?`)) return;

//     chats = chats.filter(c => c.id !== id);

//     if (current.id === id) {
//         current = createChat();
//         renderConversation();
//     }

//     persist();
//     renderChatList();
// }

// function clearAllChats() {
//     if (isBusy || chats.length === 0) return;
//     if (!confirm("Delete all chats? This can't be undone.")) return;

//     chats = [];
//     current = createChat();
//     renderConversation();
//     persist();
//     renderChatList();
// }

// /* ---------- Messages UI ---------- */

// function showWelcome() {
//     chatInner.innerHTML = `
// <div class="welcome">
//     <div class="logo">
//         <img src="ai.png" alt="Spark AI">
//     </div>
//     <h2>How can I help you today?</h2>
//     <p>Ask a question or pick a suggestion to get started.</p>
//     <div class="chips">
//         ${SUGGESTIONS.map(s => `<button type="button" class="chip">${escapeHtml(s)}</button>`).join("")}
//     </div>
// </div>`;
// }

// function addMessage(text, type) {
//     const welcome = chatInner.querySelector(".welcome");
//     if (welcome) welcome.remove();

//     const row = document.createElement("div");
//     row.className = `msg ${type}`;

//     if (type === "ai") {
//         const avatar = document.createElement("div");
//         avatar.className = "avatar";
//         avatar.innerHTML = AVATAR_HTML;
//         row.appendChild(avatar);
//     }

//     const bubble = document.createElement("div");
//     bubble.className = "bubble";

//     if (type === "user") {
//         bubble.textContent = text;
//     } else if (text) {
//         bubble.innerHTML = renderMarkdown(text);
//     }

//     row.appendChild(bubble);
//     chatInner.appendChild(row);
//     scrollToBottom(true);

//     return bubble;
// }

// function showTyping(bubble) {
//     bubble.innerHTML = '<span class="typing"><span></span><span></span><span></span></span>';
// }

// function setBusy(value) {
//     isBusy = value;
//     sidebar.classList.toggle("locked", value);
//     updateSendState();
// }

// function updateSendState() {
//     sendBtn.disabled = isBusy || userInput.value.trim() === "";
// }

// function autoResize() {
//     userInput.style.height = "auto";
//     userInput.style.height = Math.min(userInput.scrollHeight, 180) + "px";
// }

// /* ---------- Sending ---------- */

// async function sendMessage(prompt) {
//     prompt = prompt.trim();
//     if (!prompt || isBusy) return;

//     const chat = current;

//     chat.messages.push({ role: "user", content: prompt });
//     saveCurrent(); // appears in the sidebar right away

//     addMessage(prompt, "user");
//     userInput.value = "";
//     autoResize();

//     setBusy(true);

//     const aiBubble = addMessage("", "ai");
//     showTyping(aiBubble);

//     try {
//         const response = await fetch("/api/chat", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ messages: chat.messages })
//         });

//         if (!response.ok) {
//             const data = await response.json().catch(() => ({}));
//             throw new Error(data.error || "Request failed.");
//         }

//         if (!response.body) {
//             throw new Error("Streaming is not supported by this response.");
//         }

//         const reader = response.body.getReader();
//         const decoder = new TextDecoder();

//         let buffer = "";
//         let answer = "";

//         while (true) {
//             const { value, done } = await reader.read();
//             if (done) break;

//             buffer += decoder.decode(value, { stream: true });

//             const events = buffer.split("\n\n");
//             buffer = events.pop();

//             for (const eventText of events) {
//                 const dataLine = eventText
//                     .split("\n")
//                     .find(line => line.startsWith("data: "));

//                 if (!dataLine) continue;

//                 const data = dataLine.slice(6);
//                 if (data === "[DONE]") continue;

//                 const parsed = JSON.parse(data);
//                 if (parsed.error) throw new Error(parsed.error);

//                 answer += parsed.content || "";

//                 if (answer) {
//                     const stick = isNearBottom();
//                     aiBubble.innerHTML = renderMarkdown(answer);
//                     if (stick) scrollToBottom(true);
//                 }
//             }
//         }

//         if (!answer) {
//             throw new Error("The AI returned an empty response.");
//         }

//         chat.messages.push({ role: "assistant", content: answer });

//     } catch (error) {
//         aiBubble.textContent = "Error: " + error.message;
//         aiBubble.closest(".msg").classList.add("error");
//         chat.messages.pop(); // remove the unanswered question from history
//     } finally {
//         saveCurrent();
//         setBusy(false);
//         userInput.focus();
//     }
// }

// /* ---------- Sidebar open / close ---------- */

// function setSidebar(open) {
//     root.classList.toggle("sidebar-open", open);
//     sidebarToggle.setAttribute("aria-expanded", String(open));

//     // Remember the choice on desktop only (on phones it always starts closed)
//     if (!mobileQuery.matches) store(KEYS.sidebar, open ? "1" : "0");
// }

// function closeSidebarOnMobile() {
//     if (mobileQuery.matches) setSidebar(false);
// }

// sidebarToggle.addEventListener("click", () => {
//     setSidebar(!root.classList.contains("sidebar-open"));
// });

// backdrop.addEventListener("click", () => setSidebar(false));

// document.addEventListener("keydown", (event) => {
//     if (event.key === "Escape" && mobileQuery.matches && root.classList.contains("sidebar-open")) {
//         setSidebar(false);
//     }
// });

// /* ---------- Theme (dark / light) ---------- */

// function applyTheme(theme) {
//     root.setAttribute("data-theme", theme);

//     const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
//     themeBtn.setAttribute("aria-label", label);
//     themeBtn.title = label;
// }

// themeBtn.addEventListener("click", () => {
//     const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
//     applyTheme(next);
//     store(KEYS.theme, next);
// });

// /* ---------- Events ---------- */

// chatForm.addEventListener("submit", (event) => {
//     event.preventDefault();
//     sendMessage(userInput.value);
// });

// userInput.addEventListener("input", () => {
//     autoResize();
//     updateSendState();
// });

// userInput.addEventListener("keydown", (event) => {
//     if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
//         event.preventDefault();
//         sendMessage(userInput.value);
//     }
// });

// newChatBtn.addEventListener("click", newChat);
// clearAllBtn.addEventListener("click", clearAllChats);

// chatList.addEventListener("click", (event) => {
//     const item = event.target.closest(".chat-item");
//     if (!item) return;

//     if (event.target.closest(".chat-del")) {
//         deleteChat(item.dataset.id);
//     } else {
//         openChat(item.dataset.id);
//     }
// });

// // Suggestion chips + code "Copy" buttons (event delegation)
// chatInner.addEventListener("click", async (event) => {
//     const chip = event.target.closest(".chip");
//     if (chip) {
//         sendMessage(chip.textContent);
//         return;
//     }

//     const copyBtn = event.target.closest(".copy-btn");
//     if (copyBtn) {
//         const code = copyBtn.closest(".code-block").querySelector("code").innerText;
//         try {
//             await navigator.clipboard.writeText(code);
//             copyBtn.textContent = "Copied";
//         } catch {
//             copyBtn.textContent = "Failed";
//         }
//         setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
//     }
// });

// /* ---------- Start ---------- */

// applyTheme(root.getAttribute("data-theme") || "dark");
// sidebarToggle.setAttribute("aria-expanded", String(root.classList.contains("sidebar-open")));

// chats = loadChats();
// current = chats.find(chat => chat.id === read(KEYS.active)) || createChat();

// renderConversation();
// renderChatList();
// userInput.focus();

// // Turn on sidebar animations only after the first paint
// requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("ready")));

// const chatBox = document.getElementById("chatBox");
// const chatForm = document.getElementById("chatForm");
// const userInput = document.getElementById("userInput");
// const sendBtn = document.getElementById("sendBtn");
// const clearBtn = document.getElementById("clearBtn");

// let messages = [];
// let isBusy = false;

// function addMessage(text, type) {
//     const div = document.createElement("div");
//     div.className = `message ${type}`;
//     div.textContent = text;
//     chatBox.appendChild(div);
//     chatBox.scrollTop = chatBox.scrollHeight;
//     return div;
// }

// chatForm.addEventListener("submit", async (event) => {
//     event.preventDefault();

//     const prompt = userInput.value.trim();

//     if (!prompt || isBusy) return;

//     messages.push({
//         role: "user",
//         content: prompt
//     });

//     addMessage(prompt, "user");
//     userInput.value = "";

//     isBusy = true;
//     sendBtn.disabled = true;

//     const aiMessage = addMessage("", "ai");

//     try {
//         const response = await fetch("/api/chat", {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json"
//             },
//             body: JSON.stringify({ messages })
//         });

//         if (!response.ok) {
//             const data = await response.json();
//             throw new Error(data.error || "Request failed.");
//         }

//         if (!response.body) {
//             throw new Error("Streaming is not supported by this response.");
//         }

//         const reader = response.body.getReader();
//         const decoder = new TextDecoder();

//         let buffer = "";
//         let answer = "";

//         while (true) {
//             const { value, done } = await reader.read();

//             if (done) break;

//             buffer += decoder.decode(value, { stream: true });

//             const events = buffer.split("\n\n");
//             buffer = events.pop();

//             for (const eventText of events) {
//                 const dataLine = eventText
//                     .split("\n")
//                     .find(line => line.startsWith("data: "));

//                 if (!dataLine) continue;

//                 const data = dataLine.slice(6);

//                 if (data === "[DONE]") continue;

//                 const parsed = JSON.parse(data);

//                 if (parsed.error) {
//                     throw new Error(parsed.error);
//                 }

//                 answer += parsed.content || "";
//                 aiMessage.textContent = answer;
//                 chatBox.scrollTop = chatBox.scrollHeight;
//             }
//         }

//         if (!answer) {
//             throw new Error("The AI returned an empty response.");
//         }

//         messages.push({
//             role: "assistant",
//             content: answer
//         });

//     } catch (error) {
//         aiMessage.textContent = "Error: " + error.message;
//         messages.pop();
//     } finally {
//         isBusy = false;
//         sendBtn.disabled = false;
//         userInput.focus();
//     }
// });

// clearBtn.addEventListener("click", () => {
//     if (isBusy) return;

//     messages = [];
//     chatBox.innerHTML = "";

//     addMessage(
//         "Conversation cleared! How can I help you?",
//         "ai"
//     );
// });


/* ==========================================================
   Spark AI - front-end
   ========================================================== */

const root = document.documentElement;

const chatBox = document.getElementById("chatBox");
const chatInner = document.getElementById("chatInner");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const backdrop = document.getElementById("backdrop");
const newChatBtn = document.getElementById("newChatBtn");
const clearAllBtn = document.getElementById("clearAllBtn");
const chatList = document.getElementById("chatList");
const themeBtn = document.getElementById("themeBtn");
const attachBtn = document.getElementById("attachBtn");
const fileInput = document.getElementById("fileInput");
const attachTray = document.getElementById("attachTray");

const KEYS = {
    chats: "spark_chats",
    active: "spark_active_chat",
    theme: "spark_theme",
    sidebar: "spark_sidebar"
};

const DEFAULT_TITLE = "New chat";
const mobileQuery = window.matchMedia("(max-width: 820px)");

const AVATAR_HTML = `<img src="ai.png" alt="AI">`;

const TRASH_SVG = `
<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>
</svg>`;

const SUGGESTIONS = [
    "Explain vibe-coding simply",
    "Help me write an email",
    "Give me a study plan",
    "Debug my code"
];

let chats = [];      // saved conversations (only ones that have messages)
let current = null;  // the conversation on screen: { id, title, messages, updatedAt }
let isBusy = false;

/* ---------- Safe localStorage ---------- */

function read(key) {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function store(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch {
        /* storage full or blocked - the app still works, it just won't remember */
    }
}

/* ---------- Helpers ---------- */

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function isNearBottom() {
    return chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight < 120;
}

function scrollToBottom(force = false) {
    if (force || isNearBottom()) {
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ---------- File attachments ---------- */

const MAX_FILES = 5;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_PDF_BYTES = 20 * 1024 * 1024;
const MAX_TEXT_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TEXT_CHARS = 50000;   // text sent per file (longer files are cut)
const IMAGE_MAX_SIDE = 1600;    // images are shrunk to this before sending
const FILE_PROMPT = "Please review the attached file(s) and summarize them.";
const FENCE = "`".repeat(3);

const PDF_JS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDF_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const TEXT_EXT = [
    "txt", "md", "csv", "json", "js", "ts", "jsx", "tsx", "py", "java", "c", "cpp", "cs",
    "go", "rs", "php", "rb", "sh", "sql", "html", "css", "xml", "yaml", "yml", "log"
];

let pending = []; // files attached to the message being written

function h(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function fileExt(name) {
    const i = name.lastIndexOf(".");
    return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

function notify(message) {
    const toast = h("div", "toast", message);
    toast.setAttribute("role", "status");
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function isProcessing() {
    return pending.some(a => a.loading);
}

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            const scale = Math.min(1, IMAGE_MAX_SIDE / Math.max(img.width, img.height));
            const w = Math.max(1, Math.round(img.width * scale));
            const hgt = Math.max(1, Math.round(img.height * scale));

            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = hgt;

            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#fff"; // transparent PNGs become white instead of black
            ctx.fillRect(0, 0, w, hgt);
            ctx.drawImage(img, 0, 0, w, hgt);

            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL("image/jpeg", 0.85));
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error(`Couldn't read the image "${file.name}".`));
        };

        img.src = url;
    });
}

function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);

    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = PDF_JS;
        script.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER;
            resolve(window.pdfjsLib);
        };
        script.onerror = () => reject(new Error("Couldn't load the PDF reader. Check your connection."));
        document.head.appendChild(script);
    });
}

async function extractPdfText(file) {
    const pdfjs = await loadPdfJs();
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;

    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += `--- Page ${i} ---\n` + content.items.map(item => item.str).join(" ") + "\n\n";
        if (text.length > MAX_TEXT_CHARS) break;
    }
    return text.trim();
}

function textAttachment(base, text) {
    const truncated = text.length > MAX_TEXT_CHARS;
    return { ...base, kind: "text", data: truncated ? text.slice(0, MAX_TEXT_CHARS) : text, truncated };
}

async function processFile(file) {
    const name = file.name || "pasted-image.png";
    const base = { name, size: file.size, mime: file.type };

    if (IMAGE_TYPES.includes(file.type)) {
        if (file.size > MAX_IMAGE_BYTES) throw new Error(`"${name}" is too large (max 15 MB).`);
        return { ...base, kind: "image", data: await loadImage(file) };
    }

    if (file.type === "application/pdf" || fileExt(name) === "pdf") {
        if (file.size > MAX_PDF_BYTES) throw new Error(`"${name}" is too large (max 20 MB).`);
        const text = await extractPdfText(file);
        if (!text) {
            throw new Error(`No readable text in "${name}". If it's a scan, upload pages as images instead.`);
        }
        return textAttachment(base, text);
    }

    if (file.type.startsWith("text/") || TEXT_EXT.includes(fileExt(name))) {
        if (file.size > MAX_TEXT_FILE_BYTES) throw new Error(`"${name}" is too large (max 5 MB).`);
        const text = await file.text();
        if (!text.trim()) throw new Error(`"${name}" is empty.`);
        return textAttachment(base, text);
    }

    throw new Error(`"${name}" isn't supported. Use images, PDFs or text/code files.`);
}

function addFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const room = MAX_FILES - pending.length;
    if (room <= 0) {
        notify(`You can attach up to ${MAX_FILES} files per message.`);
        return;
    }
    if (files.length > room) notify(`Only ${room} more file(s) fit - the limit is ${MAX_FILES} per message.`);

    for (const file of files.slice(0, room)) {
        const item = { id: uid(), name: file.name || "pasted-image", size: file.size, loading: true };
        pending.push(item);

        processFile(file)
            .then(result => {
                Object.assign(item, result);
                delete item.loading;
            })
            .catch(error => {
                pending = pending.filter(a => a !== item);
                notify(error.message);
            })
            .finally(() => {
                renderTray();
                updateSendState();
            });
    }

    renderTray();
    updateSendState();
}

function buildChip(a, removable) {
    const chip = h("div", "att-chip" + (a.loading ? " loading" : ""));
    chip.dataset.id = a.id;

    if (a.kind === "image" && a.data) {
        const img = h("img");
        img.src = a.data;
        img.alt = "";
        chip.appendChild(img);
    } else {
        chip.appendChild(h("div", "att-icon", a.kind === "image" ? "IMG" : fileExt(a.name).slice(0, 4) || "FILE"));
    }

    let sub;
    if (a.loading) sub = "Reading...";
    else if (a.kind === "image") sub = a.data ? "Image" : "Image (not kept after reload)";
    else sub = formatSize(a.size) + (a.truncated ? " - shortened" : "");

    const meta = h("div", "att-meta");
    meta.appendChild(h("div", "att-name", a.name));
    meta.appendChild(h("div", "att-sub", sub));
    chip.appendChild(meta);

    if (removable) {
        const remove = h("button", "att-remove", "\u00d7");
        remove.type = "button";
        remove.setAttribute("aria-label", "Remove " + a.name);
        chip.appendChild(remove);
    }

    return chip;
}

function renderTray() {
    attachTray.hidden = pending.length === 0;
    attachTray.replaceChildren(...pending.map(a => buildChip(a, true)));
}

function renderAttachments(list) {
    const wrap = h("div", "msg-atts");

    for (const a of list) {
        if (a.kind === "image" && a.data) {
            const img = h("img", "att-full");
            img.src = a.data;
            img.alt = a.name;
            wrap.appendChild(img);
        } else {
            wrap.appendChild(buildChip(a, false));
        }
    }
    return wrap;
}

// Turns saved messages into what the backend receives:
//  - text/PDF files are placed in front of the question as plain text
//  - images are sent as OpenAI-style "image_url" parts
function buildApiMessages(messages) {
    return messages.map(m => {
        if (!m.attachments || !m.attachments.length) {
            return { role: m.role, content: m.content };
        }

        let text = "";
        const images = [];

        for (const a of m.attachments) {
            if (a.kind === "text") {
                text += `[Attached file: ${a.name}]\n${FENCE}\n${a.data}\n${FENCE}\n`;
                if (a.truncated) text += "(The file was long, so only the beginning is included.)\n";
                text += "\n";
            } else if (a.data) {
                images.push(a);
            } else {
                text += `[Attached image "${a.name}" is no longer available.]\n\n`;
            }
        }

        text += m.content;

        if (!images.length) return { role: m.role, content: text };

        return {
            role: m.role,
            content: [
                { type: "text", text },
                ...images.map(a => ({ type: "image_url", image_url: { url: a.data } }))
            ]
        };
    });
}

/* ---------- Tiny, safe markdown renderer ---------- */

function renderInline(text) {
    // `text` is already HTML-escaped
    return text
        .replace(/`([^`\n]+)`/g, "<code>$1</code>")
        .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
        .replace(/(^|[^*])\*(?!\s)([^*\n]+?)\*(?!\*)/g, "$1<em>$2</em>")
        .replace(
            /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
            '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
        );
}

function renderBlocks(text) {
    const lines = escapeHtml(text).split("\n");
    let html = "";
    let paragraph = [];
    let list = null; // { type: "ul" | "ol", items: [] }

    const flushParagraph = () => {
        if (paragraph.length) {
            html += `<p>${renderInline(paragraph.join("<br>"))}</p>`;
            paragraph = [];
        }
    };

    const flushList = () => {
        if (list) {
            html += `<${list.type}>${list.items
                .map(item => `<li>${renderInline(item)}</li>`)
                .join("")}</${list.type}>`;
            list = null;
        }
    };

    for (const line of lines) {
        const heading = line.match(/^(#{1,3})\s+(.*)$/);
        const bullet = line.match(/^\s*[-*]\s+(.*)$/);
        const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);

        if (heading) {
            flushParagraph();
            flushList();
            const level = heading[1].length;
            html += `<h${level}>${renderInline(heading[2])}</h${level}>`;
        } else if (bullet || numbered) {
            flushParagraph();
            const type = bullet ? "ul" : "ol";
            if (!list || list.type !== type) {
                flushList();
                list = { type, items: [] };
            }
            list.items.push((bullet || numbered)[1]);
        } else if (line.trim() === "") {
            flushParagraph();
            flushList();
        } else {
            flushList();
            paragraph.push(line);
        }
    }

    flushParagraph();
    flushList();
    return html;
}

function renderMarkdown(source) {
    // Handles unfinished code fences too, so streaming looks right
    const fence = /```([\w+-]*)\n?([\s\S]*?)(?:```|$)/g;
    let html = "";
    let last = 0;
    let match;

    while ((match = fence.exec(source)) !== null) {
        html += renderBlocks(source.slice(last, match.index));

        const lang = match[1] || "code";
        html += `
<div class="code-block">
    <div class="code-head">
        <span>${escapeHtml(lang)}</span>
        <button type="button" class="copy-btn">Copy</button>
    </div>
    <pre><code>${escapeHtml(match[2].replace(/\n$/, ""))}</code></pre>
</div>`;

        last = match.index + match[0].length;
        if (match[0].length === 0) fence.lastIndex++;
    }

    html += renderBlocks(source.slice(last));
    return html;
}

/* ---------- Chat history (saved in the browser) ---------- */

function createChat() {
    return { id: uid(), title: DEFAULT_TITLE, messages: [], updatedAt: Date.now() };
}

function makeTitle(text) {
    const clean = text.replace(/\s+/g, " ").trim();
    return clean.length > 40 ? clean.slice(0, 40).trimEnd() + "…" : clean || DEFAULT_TITLE;
}

function loadChats() {
    try {
        const data = JSON.parse(read(KEYS.chats) || "[]");
        if (!Array.isArray(data)) return [];

        return data
            .filter(chat => chat && chat.id && Array.isArray(chat.messages))
            .map(chat => ({
                id: String(chat.id),
                title: String(chat.title || DEFAULT_TITLE),
                updatedAt: Number(chat.updatedAt) || Date.now(),
                messages: chat.messages
                    .filter(m => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
                    .map(m => {
                        const attachments = Array.isArray(m.attachments)
                            ? m.attachments.filter(a => a && a.name && (a.kind === "image" || a.kind === "text"))
                            : [];
                        return attachments.length
                            ? { role: m.role, content: m.content, attachments }
                            : { role: m.role, content: m.content };
                    })
            }))
            .filter(chat => chat.messages.length > 0);
    } catch {
        return [];
    }
}

// Images are too big for localStorage, so only their names are saved.
// They stay available in memory until the page is reloaded.
function forStorage(chat) {
    return {
        ...chat,
        messages: chat.messages.map(m =>
            m.attachments
                ? { ...m, attachments: m.attachments.map(a => (a.kind === "image" ? { ...a, data: null } : a)) }
                : m
        )
    };
}

function persist() {
    store(KEYS.chats, JSON.stringify(chats.map(forStorage)));
    store(KEYS.active, current.id);
}

// Save the current conversation (or drop it from the list if it is empty)
function saveCurrent() {
    const index = chats.findIndex(chat => chat.id === current.id);

    if (current.messages.length === 0) {
        if (index !== -1) chats.splice(index, 1);
    } else {
        if (current.title === DEFAULT_TITLE) {
            const first = current.messages[0];
            current.title = makeTitle(
                first.content === FILE_PROMPT && first.attachments && first.attachments.length
                    ? first.attachments[0].name
                    : first.content
            );
        }
        current.updatedAt = Date.now();

        if (index === -1) chats.push(current);
        chats.sort((a, b) => b.updatedAt - a.updatedAt);
    }

    persist();
    renderChatList();
}

function renderChatList() {
    clearAllBtn.hidden = chats.length === 0;

    if (chats.length === 0) {
        chatList.innerHTML = '<p class="list-empty">Your conversations will show up here.</p>';
        return;
    }

    const dayMs = 86400000;
    const startOfToday = new Date().setHours(0, 0, 0, 0);

    const groups = [
        { label: "Today", items: [] },
        { label: "Yesterday", items: [] },
        { label: "Previous 7 days", items: [] },
        { label: "Older", items: [] }
    ];

    for (const chat of chats) {
        const t = chat.updatedAt;
        const i =
            t >= startOfToday ? 0 :
            t >= startOfToday - dayMs ? 1 :
            t >= startOfToday - 7 * dayMs ? 2 : 3;
        groups[i].items.push(chat);
    }

    chatList.innerHTML = groups
        .filter(group => group.items.length)
        .map(group => `
<p class="list-label">${group.label}</p>
${group.items.map(chat => `
<div class="chat-item${chat.id === current.id ? " active" : ""}" data-id="${escapeHtml(chat.id)}">
    <button type="button" class="chat-open" title="${escapeHtml(chat.title)}">${escapeHtml(chat.title)}</button>
    <button type="button" class="chat-del" aria-label="Delete chat" title="Delete chat">${TRASH_SVG}</button>
</div>`).join("")}`)
        .join("");
}

function renderConversation() {
    chatInner.innerHTML = "";
    pending = [];
    renderTray();

    if (current.messages.length === 0) {
        showWelcome();
        return;
    }

    for (const message of current.messages) {
        addMessage(message.content, message.role === "user" ? "user" : "ai", message.attachments);
    }

    scrollToBottom(true);
}

function showChat(chat) {
    current = chat;
    persist();
    renderConversation();
    renderChatList();
}

function openChat(id) {
    if (isBusy) return;

    if (id !== current.id) {
        const chat = chats.find(c => c.id === id);
        if (chat) showChat(chat);
    }

    closeSidebarOnMobile();
    userInput.focus();
}

function newChat() {
    if (isBusy) return;

    // Already on an empty chat - nothing to create
    if (current.messages.length > 0) {
        showChat(createChat());
    }

    closeSidebarOnMobile();
    userInput.focus();
}

function deleteChat(id) {
    if (isBusy) return;

    const chat = chats.find(c => c.id === id);
    if (!chat) return;
    if (!confirm(`Delete "${chat.title}"?`)) return;

    chats = chats.filter(c => c.id !== id);

    if (current.id === id) {
        current = createChat();
        renderConversation();
    }

    persist();
    renderChatList();
}

function clearAllChats() {
    if (isBusy || chats.length === 0) return;
    if (!confirm("Delete all chats? This can't be undone.")) return;

    chats = [];
    current = createChat();
    renderConversation();
    persist();
    renderChatList();
}

/* ---------- Messages UI ---------- */

function showWelcome() {
    chatInner.innerHTML = `
<div class="welcome">
    <div class="logo">
        <img src="ai.png" alt="Spark AI">
    </div>
    <h2>How can I help you today?</h2>
    <p>Ask a question or pick a suggestion to get started.</p>
    <div class="chips">
        ${SUGGESTIONS.map(s => `<button type="button" class="chip">${escapeHtml(s)}</button>`).join("")}
    </div>
</div>`;
}

function addMessage(text, type, attachments = []) {
    const welcome = chatInner.querySelector(".welcome");
    if (welcome) welcome.remove();

    const row = document.createElement("div");
    row.className = `msg ${type}`;

    if (type === "ai") {
        const avatar = document.createElement("div");
        avatar.className = "avatar";
        avatar.innerHTML = AVATAR_HTML;
        row.appendChild(avatar);
    }

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    if (type === "user") {
        if (attachments && attachments.length) bubble.appendChild(renderAttachments(attachments));
        if (text) bubble.appendChild(h("span", "", text));
    } else if (text) {
        bubble.innerHTML = renderMarkdown(text);
    }

    row.appendChild(bubble);
    chatInner.appendChild(row);
    scrollToBottom(true);

    return bubble;
}

function showTyping(bubble) {
    bubble.innerHTML = '<span class="typing"><span></span><span></span><span></span></span>';
}

function setBusy(value) {
    isBusy = value;
    sidebar.classList.toggle("locked", value);
    updateSendState();
}

function updateSendState() {
    sendBtn.disabled = isBusy || isProcessing() || (userInput.value.trim() === "" && pending.length === 0);
}

function autoResize() {
    userInput.style.height = "auto";
    userInput.style.height = Math.min(userInput.scrollHeight, 180) + "px";
}

/* ---------- Sending ---------- */

async function sendMessage(prompt) {
    prompt = prompt.trim();
    if (isBusy) return;

    if (isProcessing()) {
        notify("Still reading your files - one moment.");
        return;
    }

    const attachments = pending.filter(a => !a.loading).map(({ id, ...rest }) => rest);
    if (!prompt && attachments.length === 0) return;

    const chat = current;
    const message = { role: "user", content: prompt || FILE_PROMPT };
    if (attachments.length) message.attachments = attachments;

    chat.messages.push(message);
    saveCurrent(); // appears in the sidebar right away

    addMessage(message.content, "user", attachments);
    pending = [];
    renderTray();
    userInput.value = "";
    autoResize();

    setBusy(true);

    const aiBubble = addMessage("", "ai");
    showTyping(aiBubble);

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: buildApiMessages(chat.messages) })
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || "Request failed.");
        }

        if (!response.body) {
            throw new Error("Streaming is not supported by this response.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let buffer = "";
        let answer = "";

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            const events = buffer.split("\n\n");
            buffer = events.pop();

            for (const eventText of events) {
                const dataLine = eventText
                    .split("\n")
                    .find(line => line.startsWith("data: "));

                if (!dataLine) continue;

                const data = dataLine.slice(6);
                if (data === "[DONE]") continue;

                const parsed = JSON.parse(data);
                if (parsed.error) throw new Error(parsed.error);

                answer += parsed.content || "";

                if (answer) {
                    const stick = isNearBottom();
                    aiBubble.innerHTML = renderMarkdown(answer);
                    if (stick) scrollToBottom(true);
                }
            }
        }

        if (!answer) {
            throw new Error("The AI returned an empty response.");
        }

        chat.messages.push({ role: "assistant", content: answer });

    } catch (error) {
        aiBubble.textContent = "Error: " + error.message;
        aiBubble.closest(".msg").classList.add("error");
        chat.messages.pop(); // remove the unanswered question from history
    } finally {
        saveCurrent();
        setBusy(false);
        userInput.focus();
    }
}

/* ---------- Sidebar open / close ---------- */

function setSidebar(open) {
    root.classList.toggle("sidebar-open", open);
    sidebarToggle.setAttribute("aria-expanded", String(open));

    // Remember the choice on desktop only (on phones it always starts closed)
    if (!mobileQuery.matches) store(KEYS.sidebar, open ? "1" : "0");
}

function closeSidebarOnMobile() {
    if (mobileQuery.matches) setSidebar(false);
}

sidebarToggle.addEventListener("click", () => {
    setSidebar(!root.classList.contains("sidebar-open"));
});

backdrop.addEventListener("click", () => setSidebar(false));

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && mobileQuery.matches && root.classList.contains("sidebar-open")) {
        setSidebar(false);
    }
});

/* ---------- Theme (dark / light) ---------- */

function applyTheme(theme) {
    root.setAttribute("data-theme", theme);

    const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
    themeBtn.setAttribute("aria-label", label);
    themeBtn.title = label;
}

themeBtn.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    store(KEYS.theme, next);
});

/* ---------- Events ---------- */

chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    sendMessage(userInput.value);
});

userInput.addEventListener("input", () => {
    autoResize();
    updateSendState();
});

userInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        sendMessage(userInput.value);
    }
});

attachBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", () => {
    addFiles(fileInput.files);
    fileInput.value = ""; // lets the same file be picked again
});

attachTray.addEventListener("click", (event) => {
    const remove = event.target.closest(".att-remove");
    if (!remove) return;

    const id = remove.closest(".att-chip").dataset.id;
    pending = pending.filter(a => a.id !== id);
    renderTray();
    updateSendState();
});

// Paste an image (e.g. a screenshot) straight into the box
userInput.addEventListener("paste", (event) => {
    const data = event.clipboardData;
    if (data && data.files.length && !data.getData("text/plain")) {
        event.preventDefault();
        addFiles(data.files);
    }
});

// Drag & drop files anywhere on the page
const hasFiles = (event) =>
    event.dataTransfer && Array.from(event.dataTransfer.types || []).includes("Files");
let dragDepth = 0;

window.addEventListener("dragenter", (event) => {
    if (!hasFiles(event)) return;
    dragDepth++;
    chatForm.classList.add("drag-over");
});

window.addEventListener("dragleave", (event) => {
    if (!hasFiles(event)) return;
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) chatForm.classList.remove("drag-over");
});

window.addEventListener("dragover", (event) => {
    if (hasFiles(event)) event.preventDefault();
});

window.addEventListener("drop", (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth = 0;
    chatForm.classList.remove("drag-over");
    addFiles(event.dataTransfer.files);
});

newChatBtn.addEventListener("click", newChat);
clearAllBtn.addEventListener("click", clearAllChats);

chatList.addEventListener("click", (event) => {
    const item = event.target.closest(".chat-item");
    if (!item) return;

    if (event.target.closest(".chat-del")) {
        deleteChat(item.dataset.id);
    } else {
        openChat(item.dataset.id);
    }
});

// Suggestion chips + code "Copy" buttons (event delegation)
chatInner.addEventListener("click", async (event) => {
    const chip = event.target.closest(".chip");
    if (chip) {
        sendMessage(chip.textContent);
        return;
    }

    const copyBtn = event.target.closest(".copy-btn");
    if (copyBtn) {
        const code = copyBtn.closest(".code-block").querySelector("code").innerText;
        try {
            await navigator.clipboard.writeText(code);
            copyBtn.textContent = "Copied";
        } catch {
            copyBtn.textContent = "Failed";
        }
        setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
    }
});

/* ---------- Start ---------- */

applyTheme(root.getAttribute("data-theme") || "dark");
sidebarToggle.setAttribute("aria-expanded", String(root.classList.contains("sidebar-open")));

chats = loadChats();
current = chats.find(chat => chat.id === read(KEYS.active)) || createChat();

renderConversation();
renderChatList();
userInput.focus();

// Turn on sidebar animations only after the first paint
requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("ready")));