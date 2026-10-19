// Shared book data: reads books from the published Google Sheet (CSV).
// Sheet columns (row 1): Title | Author | Finished | ISBN | Cover URL | Notes | Ebook URL | Audiobook URL
// Finished: Y = finished, N = currently reading, or a date like "October 2026".
// Used by the Bookshelf, Current Book and Home pages.
// The site loads the sheet through /api/books (see src/worker.js) so phones that
// block other websites still work; SHEET_URL is only a backup.
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRJk4pUTzthpTbfHIqMnUEO-0_ixU13bPToNxZg2OIO78lnDRnZcUEIbLZFLjFywsVyff52K6HrTJx1/pub?gid=0&single=true&output=csv";

const SPINE_COLORS = ["#8a3b2e", "#2f5d50", "#3b4a6b", "#7a5c2e", "#5b3a5e", "#4a6b3b", "#6b3b3b", "#2e5a7a"];

function parseCSV(text) {
  const rows = []; let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function toBooks(rows) {
  if (!rows.length) return [];
  const header = rows[0].map(h => h.trim().toLowerCase());
  const norm = h => h.replace(/[\s\-_]+/g, "");
  const col = (...names) => header.findIndex(h => names.some(n => norm(h) === norm(n)));
  const idx = { title: col("title"), author: col("author"), finished: col("finished"),
                isbn: col("isbn"), cover: col("cover url", "cover"), notes: col("notes"),
                ebook: col("ebook url", "ebook link", "ebook"), audiobook: col("audiobook url", "audiobook link", "audiobook") };
  const get = (r, k) => (idx[k] >= 0 && r[idx[k]] ? r[idx[k]].trim() : "");
  return rows.slice(1)
    .map(r => ({ title: get(r, "title"), author: get(r, "author"), finished: get(r, "finished"),
                 isbn: get(r, "isbn").replace(/[^0-9Xx]/g, ""), cover: get(r, "cover"), notes: get(r, "notes"),
                 ebook: safeUrl(get(r, "ebook")), audiobook: safeUrl(get(r, "audiobook")) }))
    .filter(b => b.title);
}

// Only allow real web links (http/https) from the sheet.
function safeUrl(u) {
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ""; } catch (e) { return ""; }
}

// "Ebook" / "Audiobook" link buttons for a book (empty if neither link is set).
function formatLinks(book) {
  const wrap = el("div", "format-links");
  [["ebook", "📖 Ebook"], ["audiobook", "🎧 Audiobook"]].forEach(([k, label]) => {
    if (!book[k]) return;
    const a = el("a", "format-link", label);
    a.href = book[k]; a.target = "_blank"; a.rel = "noopener";
    wrap.appendChild(a);
  });
  return wrap.children.length ? wrap : null;
}

function isReading(book) { return ["n", "no", "false", "reading"].includes(book.finished.toLowerCase()); }
function isFinishedFlag(book) { return ["y", "yes", "true", "x"].includes(book.finished.toLowerCase()); }

let _booksPromise = null;
function loadBooks() {
  if (!_booksPromise) {
    const getText = u => fetch(u).then(r => { if (!r.ok) throw new Error(r.status); return r.text(); });
    _booksPromise = getText("/api/books")
      .catch(() => getText(SHEET_URL))
      .then(text => toBooks(parseCSV(text)));
  }
  return _booksPromise;
}

// Replace a node's contents (works on older phones too).
function setChildren(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  for (let i = 1; i < arguments.length; i++) node.appendChild(arguments[i]);
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function spine(book, i) {
  const s = el("div", "spine");
  s.style.background = SPINE_COLORS[i % SPINE_COLORS.length];
  s.appendChild(el("span", "spine-title", book.title));
  if (book.author) s.appendChild(el("span", "spine-author", book.author));
  return s;
}

function searchCover(book) {
  const q = new URLSearchParams({ title: book.title });
  if (book.author) q.set("author", book.author);
  return fetch("/api/cover?" + q)
    .then(r => r.json())
    .then(d => d.url || null)
    .catch(() => null);
}

// Cover priority: Cover URL -> ISBN (Open Library) -> title/author search -> colored spine.
function setCover(holder, book, i, size) {
  size = size || "M";
  const candidates = [];
  if (book.cover) candidates.push(book.cover);
  if (book.isbn) candidates.push(`https://covers.openlibrary.org/b/isbn/${book.isbn}-${size}.jpg?default=false`);
  let searched = false;
  const tryNext = async () => {
    let src = candidates.shift();
    if (!src && !searched) { searched = true; src = await searchCover(book); }
    if (!src) { setChildren(holder, spine(book, i)); return; }
    const img = new Image();
    img.alt = `Cover of ${book.title}`;
    img.onload = () => { if (img.naturalWidth > 1) setChildren(holder, img); else tryNext(); };
    img.onerror = tryNext;
    img.src = src;
  };
  setChildren(holder, spine(book, i));
  tryNext();
}
