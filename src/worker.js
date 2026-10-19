// Small Cloudflare Worker that sits next to the website files.
// It fetches the Google Sheet and Open Library data on the server, so visitors'
// browsers only ever talk to our own site (this fixes phones/browsers that
// block requests to other websites).
// Everything else (the HTML/CSS/JS pages) is served straight from /public.

const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRJk4pUTzthpTbfHIqMnUEO-0_ixU13bPToNxZg2OIO78lnDRnZcUEIbLZFLjFywsVyff52K6HrTJx1/pub?gid=0&single=true&output=csv";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // /api/books -> the Google Sheet as CSV (cached for 1 minute)
    if (url.pathname === "/api/books") {
      try {
        const res = await fetch(SHEET_URL, { redirect: "follow", cf: { cacheTtl: 60, cacheEverything: true } });
        if (!res.ok) return new Response("Sheet unavailable", { status: 502 });
        return new Response(await res.text(), {
          headers: { "content-type": "text/csv; charset=utf-8", "cache-control": "public, max-age=60" },
        });
      } catch (e) {
        return new Response("Sheet unavailable", { status: 502 });
      }
    }

    // /api/cover?title=...&author=... -> {"url": "<cover image>"} from Open Library search
    if (url.pathname === "/api/cover") {
      const title = url.searchParams.get("title") || "";
      const author = url.searchParams.get("author") || "";
      let cover = null;
      if (title) {
        try {
          const q = new URLSearchParams({ title, limit: "1", fields: "cover_i" });
          if (author) q.set("author", author);
          const res = await fetch("https://openlibrary.org/search.json?" + q, {
            headers: { "user-agent": "OurBookClubSite/1.0" },
            cf: { cacheTtl: 86400, cacheEverything: true },
          });
          const data = await res.json();
          const id = data.docs && data.docs[0] && data.docs[0].cover_i;
          if (id) cover = "https://covers.openlibrary.org/b/id/" + id + "-L.jpg";
        } catch (e) { /* no cover */ }
      }
      return new Response(JSON.stringify({ url: cover }), {
        headers: { "content-type": "application/json", "cache-control": "public, max-age=86400" },
      });
    }

    // Everything else: the normal website files
    return env.ASSETS.fetch(request);
  },
};
