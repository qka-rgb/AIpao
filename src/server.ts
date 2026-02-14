import express from "express";
import path from "path";
import fetch from "node-fetch";

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const targetApi = process.env.TARGET_API;
const REQUEST_TIMEOUT = 30000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.post("/api/narrate", async (req, res) => {
  const prompt = req.body?.prompt || "";
  if (targetApi) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      const r = await fetch(`${targetApi}/api/narrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
        signal: controller.signal as any
      });
      clearTimeout(timeout);
      const text = await r.text();
      const safeHeaders = ["content-type", "content-length", "cache-control"];
      const headers: Record<string, string> = {};
      r.headers.forEach((value, key) => {
        if (safeHeaders.includes(key.toLowerCase())) headers[key] = value;
      });
      res.status(r.status).set(headers).send(text);
      return;
    } catch (err: any) {
      if (err.name === "AbortError") return res.status(504).json({ error: "Gateway timeout" });
      console.error("proxy error", err);
      res.status(502).json({ error: String(err.message || err) });
      return;
    }
  }
  res.json({ text: `叙事（示例）: ${prompt}` });
});

app.get("/sse-narrate", async (req, res) => {
  const prompt = String(req.query.prompt || "");
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "Access-Control-Allow-Origin": "*" });
  res.write(": connected\n\n");
  (async () => {
    try {
      const parts = `叙事流（示例）: ${prompt}`.match(/.{1,80}/g) || [`叙事流（示例）: ${prompt}`];
      for (let i = 0; i < parts.length; i++) {
        if (res.writableEnded) break;
        res.write(`data: ${parts[i].replace(/\n/g, "\\n")}\n\n`);
        await new Promise(r => setTimeout(r, 80));
      }
      res.write("event: done\ndata: 1\n\n");
    } catch (err) { console.error("sse error", err); } 
    finally { if (!res.writableEnded) res.end(); }
  })();
});

app.get("/health", (_req, res) => res.json({ ok: true }));
app.listen(port, "0.0.0.0", () => { console.log(`AIWarhammerGG server running on http://0.0.0.0:${port}`); });