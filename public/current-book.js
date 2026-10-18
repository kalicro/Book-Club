// Current Book page + Home "Now reading" card.
// Shows the book(s) marked N in the Finished column of the Google Sheet (see books.js).
loadBooks().then(books => {
  const reading = books.filter(isReading);

  // Current Book page
  const target = document.getElementById("current-book");
  if (target) {
    target.replaceChildren();
    if (!reading.length) {
      const card = el("div", "card");
      const p = el("p", null, "We're choosing our next book! Cast your vote in the ");
      const a = el("a", null, "Member Corner"); a.href = "member-corner.html";
      p.appendChild(a); p.appendChild(document.createTextNode("."));
      card.appendChild(p); target.appendChild(card);
    }
    reading.forEach((book, i) => {
      const card = el("div", "card book");
      const cover = el("div", "cover");
      setCover(cover, book, i, "L");
      const info = el("div");
      info.appendChild(el("h3", null, book.title));
      if (book.author) info.appendChild(el("p", "author", "by " + book.author));
      if (book.notes) info.appendChild(el("p", null, book.notes));
      card.appendChild(cover); card.appendChild(info);
      target.appendChild(card);
    });
  }

  // Home page "Now reading" card
  const home = document.getElementById("now-reading");
  if (home) {
    const h = home.querySelector("h3"), p = home.querySelector("p");
    if (reading.length) {
      h.textContent = reading.map(b => b.title).join(" & ");
      p.textContent = reading[0].author && reading.length === 1 ? "by " + reading[0].author : "";
    } else {
      h.textContent = "Choosing our next book";
      p.textContent = "Vote in the Member Corner.";
    }
  }
}).catch(() => {
  const target = document.getElementById("current-book");
  if (target) target.replaceChildren(el("p", "shelf-status", "Sorry, the current book couldn't load right now. Please try again later."));
});
