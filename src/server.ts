import express from "express";
import path from "path";
import fetch from "node-fetch";

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const targetApi = process.env.TARGET_API;

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.post("/api/narrate", async (req, res) => {
  const prompt = req.body?.prompt || "";
  if (targetApi) {
    try {
      const r = await (fetch as any)(`${targetApi}/api/narrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      const text = await r.text();
      res.status(r.status).set(Object.fromEntries(r.headers.entries())).send(text);
      return;
    } catch (err) {
      console.error("proxy error", err);
      res.status(502).json({ error: String(err) });
      return;
    }
  }
  const demo = `鍙欎簨锛堢ず渚嬶級: ${prompt}`;
  res.json({ text: demo });
});

app.get("/sse-narrate", async (req, res) => {
  const prompt = String(req.query.prompt || "");
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*"
  });
  res.write(": connected\n\n");

  (async () => {
    const text = `鍙欎簨娴侊紙绀轰緥锛? ${prompt}`;
    const parts = text.match(/.{1,80}/g) || [text];
    for (let i = 0; i < parts.length; i++) {
      res.write(`data: ${parts[i].replace(/\n/g, "\\n")}\n\n`);
      await new Promise(r => setTimeout(r, 80));
    }
    res.write("event: done\n");
    res.write("data: 1\n\n");
    try { res.end(); } catch {}
  })();
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(port, "0.0.0.0", () => {
  console.log(`AIWarhammerGG server running on http://0.0.0.0:${port}`);
});
