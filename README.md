# Our Book Club Website

All website files live in the `public/` folder.

- `public/index.html` — home page
- `public/current-book.html`, `member-corner.html`, `bookshelf.html` — one page per section
- The menu is copied on every page; when adding a page, add its link to the menu on all pages
- `public/style.css` — colors and layout
- `public/books.js` — reads the published Google Sheet (columns: Title, Author, Finished, ISBN, Cover URL, Notes) and finds covers
- `public/bookshelf.js` — Bookshelf page (all books)
- `public/current-book.js` — Current Book page and Home "Now reading" card (the book marked N in Finished)

Book data is loaded through `src/worker.js` (`/api/books` and `/api/cover`), so visitors only talk to this site.

To update the site: edit the page files in `public/`, commit, and push to GitHub.
Cloudflare rebuilds the site automatically within a minute or two.
