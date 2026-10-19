// Bookshelf page: shows every book from the Google Sheet (see books.js).
function renderShelf(books) {
  const shelf = document.getElementById("shelf");
  setChildren(shelf);
  if (!books.length) { shelf.appendChild(el("p", "shelf-status", "Our shelf is empty for now. Check back soon!")); return; }
  books.forEach((book, i) => {
    const card = el("article", "shelf-book");
    const cover = el("div", "shelf-cover");
    setCover(cover, book, i);
    card.appendChild(cover);
    card.appendChild(el("h3", null, book.title));
    if (book.author) card.appendChild(el("p", "shelf-author", book.author));
    if (isReading(book)) card.appendChild(el("p", "shelf-reading", "Currently reading"));
    else if (book.finished && !isFinishedFlag(book)) card.appendChild(el("p", "shelf-finished", book.finished));
    if (book.notes) card.appendChild(el("p", "shelf-notes", book.notes));
    shelf.appendChild(card);
  });
}

loadBooks().then(renderShelf).catch(() => {
  setChildren(document.getElementById("shelf"), 
    el("p", "shelf-status", "Sorry, the bookshelf couldn't load right now. Please try again later."));
});
