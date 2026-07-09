import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  PERSPECTIVES_DIR,
  loadPerspectives,
  runPreprocessing,
  runPerspective,
  runSynthesis,
} from "./lib.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
app.get("/api/perspectives", (_req, res) => {
  res.json(
    loadPerspectives().map((p) => ({
      id: p.id,
      display_name: p.display_name,
      tagline: p.tagline,
      color: p.color,
    }))
  );
});

// UI'dan yeni perspektif tanımlama: config dosyası olarak yazılır, bir sonraki
// analizde otomatik devreye girer.
function slugify(name) {
  const map = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", İ: "i" };
  return name
    .toLowerCase()
    .replace(/[çğıöşüİ]/g, (c) => map[c] ?? c)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

app.post("/api/perspectives", (req, res) => {
  const b = req.body ?? {};
  const asList = (v) =>
    Array.isArray(v) ? v.map((s) => String(s).trim()).filter(Boolean) : [];
  const display_name = String(b.display_name ?? "").trim();
  const mode_description = String(b.mode_description ?? "").trim();
  const focus_questions = asList(b.focus_questions);
  const blind_spots = asList(b.blind_spots);

  if (display_name.length < 2 || display_name.length > 40)
    return res.status(400).json({ error: "İsim 2-40 karakter olmalı." });
  if (mode_description.length < 20)
    return res.status(400).json({ error: "Mod tanımı en az birkaç cümle olmalı." });
  if (focus_questions.length < 1 || blind_spots.length < 1)
    return res.status(400).json({ error: "En az bir odak sorusu ve bir kör nokta gerekli." });

  const id = slugify(display_name);
  if (!id) return res.status(400).json({ error: "İsimden geçerli bir kimlik üretilemedi." });
  const file = path.join(PERSPECTIVES_DIR, `${id}.json`);
  if (fs.existsSync(file))
    return res.status(409).json({ error: `"${display_name}" zaten var.` });

  const existing = loadPerspectives();
  const perspective = {
    id,
    order: Math.max(0, ...existing.map((p) => p.order ?? 0)) + 1,
    display_name,
    cognitive_mode: String(b.cognitive_mode ?? "").trim() || display_name,
    tagline: String(b.tagline ?? "").trim(),
    color: /^#[0-9a-fA-F]{6}$/.test(String(b.color ?? "")) ? b.color : "#8a93a8",
    mode_description,
    focus_questions,
    blind_spots,
  };
  fs.writeFileSync(file, JSON.stringify(perspective, null, 2) + "\n");
  res.status(201).json({ id, display_name });
});

// NDJSON stream: her perspektif bittiği anda kart dolar, sonda sentez gelir.
app.post("/api/analyze", async (req, res) => {
  const text = (req.body?.text ?? "").trim();
  if (text.length < 80) {
    return res.status(400).json({ error: "Analiz için en az birkaç cümlelik bir haber metni yapıştır." });
  }
  const requested = Array.isArray(req.body?.perspectives) ? req.body.perspectives : [];
  const perspectives = loadPerspectives().filter((p) => requested.includes(p.id));
  if (perspectives.length === 0) {
    return res.status(400).json({ error: "En az bir akıl seç." });
  }

  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.flushHeaders?.();
  const send = (obj) => res.write(JSON.stringify(obj) + "\n");

  // Hangi akılların katılacağını kullanıcı istekte seçer (UI'daki pill'ler).
  send({
    type: "meta",
    perspectives: perspectives.map((p) => ({
      id: p.id,
      display_name: p.display_name,
      tagline: p.tagline,
      color: p.color,
    })),
  });

  // Preprocessing: yapılandırılmış olay çıkarımı. Başarısız olursa perspektifler
  // ham metne düşer (fallback), analiz durmaz.
  let event = null;
  try {
    ({ event } = await runPreprocessing(text));
    send({ type: "event", data: event });
  } catch (err) {
    send({ type: "preprocess_error", message: String(err?.message ?? err) });
  }

  const content = event ? JSON.stringify(event, null, 2) : text;

  // Fan-out: tüm perspektifler paralel; biten stream'e düşer.
  const settled = await Promise.all(
    perspectives.map(async (p) => {
      try {
        const data = await runPerspective(p, content, Boolean(event));
        send({ type: "perspective", id: p.id, data });
        return { perspective: p, data };
      } catch (err) {
        send({ type: "perspective_error", id: p.id, message: String(err?.message ?? err) });
        return null;
      }
    })
  );

  const ok = settled.filter(Boolean);
  if (ok.length >= 2) {
    try {
      const synthesis = await runSynthesis(ok, text);
      send({ type: "synthesis", data: synthesis });
    } catch (err) {
      send({ type: "error", stage: "synthesis", message: String(err?.message ?? err) });
    }
  } else {
    send({ type: "error", stage: "synthesis", message: "Sentez için yeterli perspektif tamamlanamadı." });
  }
  res.end();
});

// Prod: build edilmiş React uygulamasını da bu sunucu servis eder.
const dist = path.join(here, "../web/dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.listen(PORT, () => {
  console.log(`perspektif server → http://localhost:${PORT}`);
  if (!process.env.OPENAI_API_KEY) {
    console.warn("UYARI: OPENAI_API_KEY tanımlı değil — /api/analyze çağrıları başarısız olur.");
  }
});
