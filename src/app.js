"use strict";
const $ = (s) => document.querySelector(s);
const KEY = "chatly.v1";
const SUGGEST = [
  ["Код", "Напиши функцию на Python"],
  ["Бизнес", "Составь план запуска стартапа"],
  ["Письмо", "Вежливо откажи клиенту"],
  ["Идеи", "Придумай название для кофейни"],
];
const ICONS = {
  moon: '<path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 012-2h9"/>',
};
const svg = (n, cls = "ic") => `<svg class="${cls}" viewBox="0 0 24 24">${ICONS[n]}</svg>`;

/* ---------- состояние ---------- */
function defaults() {
  return { chats: [], activeId: null, model: "Chatly Ultra", theme: "dark" };
}
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && Array.isArray(s.chats)) return { ...defaults(), ...s };
  } catch (_) {}
  return defaults();
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {} }
let state = load();
let busy = false;
let renamingId = null;
const active = () => state.chats.find((c) => c.id === state.activeId) || null;

/* ---------- ответ модели (заглушка) ----------
   Сюда позже подключается API: получает чат, возвращает текст. */
async function getReply(chat) {
  await new Promise((r) => setTimeout(r, 700));
  return "Модель пока не подключена. Это основа интерфейса.\n\nСюда позже добавится API — функция `getReply` в `src/app.js`.";
}

/* ---------- безопасный markdown ---------- */
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function inline(s) {
  return esc(s)
    .replace(/`([^`\n]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
}
function md(text) {
  return text.split("```").map((part, i) => {
    if (i % 2 === 1) {
      const nl = part.indexOf("\n");
      const lang = nl >= 0 ? part.slice(0, nl).trim() : "";
      const code = (nl >= 0 ? part.slice(nl + 1) : part).replace(/\n$/, "");
      return `<div class="code"><div class="code-head"><span>${esc(lang) || "code"}</span><button class="copy" type="button">Копировать</button></div><pre><code>${esc(code)}</code></pre></div>`;
    }
    let out = "", list = false;
    for (const line of part.split("\n")) {
      const li = line.match(/^\s*[-*]\s+(.*)/);
      if (li) { if (!list) { out += "<ul>"; list = true; } out += `<li>${inline(li[1])}</li>`; continue; }
      if (list) { out += "</ul>"; list = false; }
      const h = line.match(/^(#{1,3})\s+(.*)/);
      if (h) { const n = h[1].length + 2; out += `<h${n}>${inline(h[2])}</h${n}>`; }
      else if (line.trim()) out += `<p>${inline(line)}</p>`;
    }
    return out + (list ? "</ul>" : "");
  }).join("");
}

/* ---------- отрисовка ---------- */
function groupOf(ts) {
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  const day = 864e5, t = d0.getTime();
  if (ts >= t) return "Сегодня";
  if (ts >= t - day) return "Вчера";
  if (ts >= t - 7 * day) return "Последние 7 дней";
  return "Ранее";
}

function renderList() {
  const q = $("#search").value.trim().toLowerCase();
  const list = $("#list");
  list.innerHTML = "";
  const chats = [...state.chats].sort((a, b) => b.updated - a.updated)
    .filter((c) => !q || c.title.toLowerCase().includes(q));
  if (!chats.length) {
    list.innerHTML = `<div class="empty-list">${q ? "Ничего не найдено" : "Чатов пока нет"}</div>`;
    return;
  }
  let lastGroup = "";
  for (const c of chats) {
    const g = groupOf(c.updated);
    if (g !== lastGroup) {
      lastGroup = g;
      const gl = document.createElement("div");
      gl.className = "group"; gl.textContent = g;
      list.appendChild(gl);
    }
    const row = document.createElement("div");
    row.className = "item" + (c.id === state.activeId ? " active" : "");
    if (c.id === renamingId) {
      const inp = document.createElement("input");
      inp.className = "t-input"; inp.value = c.title;
      const done = (ok) => {
        if (renamingId !== c.id) return;
        renamingId = null;
        if (ok && inp.value.trim()) c.title = inp.value.trim().slice(0, 80);
        save(); renderList();
      };
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") done(true); if (e.key === "Escape") done(false); });
      inp.addEventListener("blur", () => done(true));
      row.appendChild(inp); list.appendChild(row);
      setTimeout(() => { inp.focus(); inp.select(); });
      continue;
    }
    const t = document.createElement("div");
    t.className = "t"; t.textContent = c.title; t.title = "Двойной клик — переименовать";
    t.addEventListener("click", () => openChat(c.id));
    t.addEventListener("dblclick", () => { renamingId = c.id; renderList(); });
    const x = document.createElement("button");
    x.className = "x"; x.title = "Удалить чат"; x.innerHTML = svg("trash");
    x.addEventListener("click", (e) => { e.stopPropagation(); removeChat(c.id); });
    row.append(t, x); list.appendChild(row);
  }
}

function buildMsg(m, animate) {
  const el = document.createElement("div");
  el.className = "msg " + m.role + (animate ? " in" : "");
  const body = document.createElement("div");
  body.className = "body";
  if (m.role === "user") { body.textContent = m.content; el.appendChild(body); return { el, body }; }
  el.insertAdjacentHTML("beforeend", '<svg class="logo av"><use href="#logo"/></svg>');
  const col = document.createElement("div");
  col.className = "col";
  const acts = document.createElement("div");
  acts.className = "actions";
  acts.innerHTML = `<button class="act" type="button">${svg("copy")}Копировать</button>`;
  acts.firstChild.addEventListener("click", (e) => {
    navigator.clipboard.writeText(m.content).then(() => {
      e.currentTarget.lastChild.textContent = "Скопировано";
      setTimeout(() => { e.currentTarget.lastChild.textContent = "Копировать"; }, 1500);
    }).catch(() => {});
  });
  col.append(body, acts); el.appendChild(col);
  return { el, body };
}

const toBottom = () => { const s = $("#scroll"); s.scrollTop = s.scrollHeight; };

function renderThread(animateLast = false) {
  const chat = active();
  const thread = $("#thread");
  thread.innerHTML = "";
  $("#scroll").classList.toggle("has-msgs", !!(chat && chat.messages.length));
  if (!chat) return null;
  let last = null;
  chat.messages.forEach((m, i) => {
    const r = buildMsg(m, animateLast && i === chat.messages.length - 1);
    if (m.role === "assistant") r.body.innerHTML = md(m.content);
    thread.appendChild(r.el);
    last = r;
  });
  toBottom();
  return last;
}

function showTyping() {
  const el = document.createElement("div");
  el.className = "msg assistant in";
  el.innerHTML = '<svg class="logo av"><use href="#logo"/></svg><div class="col"><div class="typing"><i></i><i></i><i></i></div></div>';
  $("#thread").appendChild(el); toBottom();
}

function typeOut(body, text) {
  return new Promise((resolve) => {
    let i = 0;
    const stepSize = Math.max(1, Math.ceil(text.length / 80));
    const tick = () => {
      i = Math.min(text.length, i + stepSize);
      body.innerHTML = md(text.slice(0, i));
      toBottom();
      if (i < text.length) setTimeout(tick, 16); else resolve();
    };
    tick();
  });
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  $("#theme-ic").innerHTML = ICONS[state.theme === "dark" ? "sun" : "moon"];
  $("#theme-t").textContent = state.theme === "dark" ? "Светлая тема" : "Тёмная тема";
}
function render() { renderList(); renderThread(); }

/* ---------- действия ---------- */
function newChat() {
  const chat = { id: crypto.randomUUID(), title: "Новый чат", messages: [], updated: Date.now() };
  state.chats.push(chat); state.activeId = chat.id;
  return chat;
}
function openChat(id) { state.activeId = id; save(); render(); $("#input").focus(); }
function removeChat(id) {
  state.chats = state.chats.filter((c) => c.id !== id);
  if (state.activeId === id) state.activeId = null;
  save(); render();
}
function startNew() {
  const cur = active();
  if (cur && !cur.messages.length) { $("#input").focus(); return; }
  state.activeId = null; save(); render(); $("#input").focus();
}

async function send(preset) {
  const input = $("#input");
  const text = (typeof preset === "string" ? preset : input.value).trim();
  if (!text || busy) return;
  const chat = active() || newChat();
  chat.messages.push({ role: "user", content: text });
  if (chat.title === "Новый чат") chat.title = text.slice(0, 40);
  chat.updated = Date.now();
  input.value = ""; autosize(); busy = true; updateSend();
  save(); renderList(); renderThread(true); showTyping();
  let reply;
  try { reply = await getReply(chat); }
  catch (e) { reply = "Ошибка: " + (e && e.message ? e.message : e); }
  chat.messages.push({ role: "assistant", content: reply });
  chat.updated = Date.now();
  save(); renderList();
  const same = state.activeId === chat.id;
  if (same) {
    const r = renderThread(true);
    r.body.innerHTML = "";
    await typeOut(r.body, reply);
  }
  busy = false; updateSend();
}

function autosize() {
  const t = $("#input");
  t.style.height = "auto";
  t.style.height = Math.min(t.scrollHeight, 200) + "px";
}
function updateSend() { $("#send").disabled = busy || !$("#input").value.trim(); }

/* ---------- события ---------- */
$("#chips").innerHTML = SUGGEST.map(([t, s], i) => `<button class="chip" type="button" data-i="${i}"><b>${esc(t)}</b><span>${esc(s)}</span></button>`).join("");
$("#chips").addEventListener("click", (e) => {
  const b = e.target.closest(".chip");
  if (b) send(SUGGEST[+b.dataset.i][1]);
});
$("#new").addEventListener("click", startNew);
$("#send").addEventListener("click", () => send());
$("#search").addEventListener("input", renderList);
$("#collapse").addEventListener("click", () => $("#app").classList.add("collapsed"));
$("#expand").addEventListener("click", () => $("#app").classList.remove("collapsed"));
$("#theme").addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  applyTheme(); save();
});
$("#model").addEventListener("change", (e) => { state.model = e.target.value; save(); });
$("#input").addEventListener("input", () => { autosize(); updateSend(); });
$("#input").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); }
});
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".copy");
  if (!btn) return;
  const code = btn.closest(".code").querySelector("code").textContent;
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = "Скопировано";
    setTimeout(() => (btn.textContent = "Копировать"), 1500);
  }).catch(() => {});
});
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); startNew(); }
});

/* ---------- старт ---------- */
if (window.innerWidth < 760) $("#app").classList.add("collapsed");
if (![...$("#model").options].some((o) => o.value === state.model)) state.model = "Chatly Ultra";
$("#model").value = state.model;
applyTheme(); render(); updateSend();
$("#input").focus();
