// Bookshelf: reads books from a published Google Sheet (CSV).
// Sheet columns (row 1): Title | Author | Finished | ISBN | Cover URL | Notes
// Finished: Y = finished, N = currently reading, or a date like "October 2026".
// Cover priority: Cover URL -> ISBN (Open Library) -> title/author search (Open Library) -> colored spine.
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
  const col = name => header.findIndex(h => h === name || h.replace(/\s+/g, "") === name.replace(/\s+/g, ""));
  const idx = { title: col("title"), author: col("author"), finished: col("finished"),
                isbn: col("isbn"), cover: col("cover url"), notes: col("notes") };
  const get = (r, k) => (idx[k] >= 0 && r[idx[k]] ? r[idx[k]].trim() : "");
  return rows.slice(1)
    .map(r => ({ title: get(r, "title"), author: get(r, "author"), finished: get(r, "finished"),
                 isbn: get(r, "isbn").replace(/[^0-9Xx]/g, ""), cover: get(r, "cover"), notes: get(r, "notes") }))
    .filter(b => b.title);
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

async function searchCover(book) {
  try {
    const q = new URLSearchParams({ title: book.title, limit: "1", fields: "cover_i" });
    if (book.author) q.set("author", book.author);
    const res = await fetch("https://openlibrary.org/search.json?" + q);
    const data = await res.json();
    const id = data.docs && data.docs[0] && data.docs[0].cover_i;
    return id ? `https://covers.openlibrary.org/b/id/${id}-M.jpg` : null;
  } catch { return null; }
}

function setCover(holder, book, i) {
  const candidates = [];
  if (book.cover) candidates.push(book.cover);
  if (book.isbn) candidates.push(`https://covers.openlibrary.org/b/isbn/${book.isbn}-M.jpg?default=false`);
  let searched = false;
  const tryNext = async () => {
    let src = candidates.shift();
    if (!src && !searched) { searched = true; src = await searchCover(book); }
    if (!src) { holder.replaceChildren(spine(book, i)); return; }
    const img = new Image();
    img.alt = `Cover of ${book.title}`;
    img.onload = () => { if (img.naturalWidth > 1) holder.replaceChildren(img); else tryNext(); };
    img.onerror = tryNext;
    img.src = src;
  };
  holder.replaceChildren(spine(book, i));
  tryNext();
}

function render(books) {
  const shelf = document.getElementById("shelf");
  shelf.replaceChildren();
  if (!books.length) { shelf.appendChild(el("p", "shelf-status", "Our shelf is empty for now. Check back soon!")); return; }
  books.forEach((book, i) => {
    const card = el("article", "shelf-book");
    const cover = el("div", "shelf-cover");
    setCover(cover, book, i);
    card.appendChild(cover);
    card.appendChild(el("h3", null, book.title));
    if (book.author) card.appendChild(el("p", "shelf-author", book.author));
    // Finished column: Y/Yes = finished (nothing shown), N/No = currently reading,
    // anything else (e.g. "October 2026") is shown as the finish date.
    const f = book.finished.toLowerCase();
    if (["n", "no", "false", "reading"].includes(f)) card.appendChild(el("p", "shelf-reading", "Currently reading"));
    else if (book.finished && !["y", "yes", "true", "x"].includes(f)) card.appendChild(el("p", "shelf-finished", book.finished));
    if (book.notes) card.appendChild(el("p", "shelf-notes", book.notes));
    shelf.appendChild(card);
  });
}

fetch(SHEET_URL)
  .then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })
  .then(text => render(toBooks(parseCSV(text))))
  .catch(() => {
    document.getElementById("shelf").replaceChildren(
      el("p", "shelf-status", "Sorry, the bookshelf couldn't load right now. Please try again later."));
  });
