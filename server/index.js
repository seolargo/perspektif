import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";

const here = path.dirname(fileURLToPath(import.meta.url));
const client = new Anthropic();
const app = express();
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 3001;
const PERSPECTIVE_MODEL = "claude-haiku-4-5";
const SYNTHESIS_MODEL = "claude-sonnet-5";

// ---------------------------------------------------------------------------
// Perspektifler: kod değil veri. Yeni bir "X aklı" eklemek = perspectives/
// altına bir JSON dosyası koymak. Deploy gerektirmez, sunucu her istekte okur.
// ---------------------------------------------------------------------------
function loadPerspectives() {
  const dir = path.join(here, "perspectives");
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")))
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

// Her perspektifin çıktısı üç bölüm: neye takıldı / nasıl yorumladı / neyi
// kaçırdı. "yorumu" alanı Entman'ın dört çerçeveleme işlevine oturur.
const PERSPECTIVE_SCHEMA = {
  type: "object",
  properties: {
    takildigi: {
      type: "array",
      items: { type: "string" },
      description:
        "Bu perspektifin metinde en yüksek belirginlik atadığı 3-5 olgu/detay. Metinden somut, alıntıya yakın.",
    },
    yorumu: {
      type: "object",
      properties: {
        problem_tanimi: { type: "string", description: "Bu perspektife göre asıl mesele ne?" },
        nedensel_yorum: { type: "string", description: "Bu perspektife göre buna ne sebep oldu?" },
        ahlaki_degerlendirme: { type: "string", description: "Bu perspektife göre kim/ne nasıl değerlendirilmeli?" },
        cozum_onerisi: { type: "string", description: "Bu perspektife göre ne yapılmalı?" },
      },
      required: ["problem_tanimi", "nedensel_yorum", "ahlaki_degerlendirme", "cozum_onerisi"],
      additionalProperties: false,
    },
    kacirdigi: {
      type: "array",
      items: { type: "string" },
      description:
        "Bu perspektifin bilinen kör noktaları yüzünden bu metinde gözden kaçırdığı 2-4 şey. Dürüst öz-eleştiri.",
    },
    duygusal_yuk: {
      type: "number",
      description: "Metnin duygusal yükü, 0 (nötr haber) ile 1 (ağır tanıklık/travma) arası.",
    },
  },
  required: ["takildigi", "yorumu", "kacirdigi", "duygusal_yuk"],
  additionalProperties: false,
};

const SYNTHESIS_SCHEMA = {
  type: "object",
  properties: {
    uzlasma: {
      type: "array",
      items: { type: "string" },
      description: "Perspektiflerin ortaklaştığı noktalar.",
    },
    catisma: {
      type: "array",
      items: { type: "string" },
      description: "Perspektiflerin gerçekten ayrıştığı noktalar — ton farkı değil, içerik farkı.",
    },
    kor_nokta_kapatmalari: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kim: { type: "string", description: "Kör noktayı kapatan perspektifin adı" },
          neyi_kapatti: { type: "string", description: "Hangi perspektifin hangi kör noktasını nasıl kapattı" },
        },
        required: ["kim", "neyi_kapatti"],
        additionalProperties: false,
      },
    },
    entegre_okuma: {
      type: "string",
      description:
        "Normal insan aklı: tüm perspektiflerin birleşiminden çıkan, tek tek hiçbirinde olmayan bütünlüklü okuma. 2-3 paragraf.",
    },
    ton_notu: {
      type: "string",
      description:
        "Metin ağır bir tanıklık/travma içeriyorsa buraya kısa bir çerçeve notu yaz ('bu bir tanıklık, analiz nesnesi değil' ruhunda). İçerik nötr ise boş string bırak.",
    },
  },
  required: ["uzlasma", "catisma", "kor_nokta_kapatmalari", "entegre_okuma", "ton_notu"],
  additionalProperties: false,
};

// Sistem promptu config'ten derlenir: içerde bilişsel mod, dışarda kullanıcıya
// gösterilen isim. Karikatürleşmeye karşı sabit koruma her perspektife eklenir.
function buildPerspectiveSystemPrompt(p) {
  return [
    `Sen çok perspektifli bir haber analiz motorunda TEK bir bilişsel perspektifi temsil ediyorsun.`,
    ``,
    `PERSPEKTİF ADI (kullanıcıya görünen): ${p.display_name}`,
    `BİLİŞSEL MOD (senin gerçek tanımın): ${p.cognitive_mode}`,
    ``,
    `${p.mode_description}`,
    ``,
    `Odak soruların:`,
    ...p.focus_questions.map((q) => `- ${q}`),
    ``,
    `Bilinen kör noktaların (bunlara karşı dürüst ol):`,
    ...p.blind_spots.map((b) => `- ${b}`),
    ``,
    `KURALLAR:`,
    `- Bu bir dikkat deseni simülasyonu, bir kimlik taklidi değil. Stereotip ve karikatür üretme; "${p.display_name}" adı bir etiket, senin işin o etiketin arkasındaki bilişsel modu ciddiyetle uygulamak.`,
    `- Sadece metinde olana dayan; metinde olmayan olgu uydurma.`,
    `- "kacirdigi" alanı bu analizin en değerli kısmı: kör noktaların yüzünden bu metinde gerçekten gözden kaçırmış olabileceğin şeyleri yaz.`,
    `- Türkçe yaz.`,
  ].join("\n");
}

async function runPerspective(p, text) {
  const response = await client.messages.create({
    model: PERSPECTIVE_MODEL,
    max_tokens: 2500,
    system: buildPerspectiveSystemPrompt(p),
    output_config: { format: { type: "json_schema", schema: PERSPECTIVE_SCHEMA } },
    messages: [{ role: "user", content: `HABER METNİ:\n\n${text}` }],
  });
  const block = response.content.find((b) => b.type === "text");
  return JSON.parse(block.text);
}

async function runSynthesis(results, text) {
  const system = [
    `Sen çok perspektifli bir haber analiz motorunun SENTEZ katmanısın — "normal insan aklı".`,
    `Ama bu ayrı bir perspektif değil, bir META katman: sana N perspektifin aynı haber için ürettiği analizler verilecek.`,
    ``,
    `Görevin:`,
    `1. Perspektifler nerede uzlaşıyor, nerede gerçekten çatışıyor?`,
    `2. Kimin kör noktasını kim kapatıyor? ("kacirdigi" alanlarını diğerlerinin "takildigi" alanlarıyla çaprazla)`,
    `3. Entegre okuma: birleşimden çıkan, tek tek hiçbir perspektifte olmayan bütünlüklü okumayı yaz.`,
    ``,
    `Perspektiflerin ortalama duygusal_yuk değeri yüksekse (≈0.7+), ton_notu alanına kısa bir çerçeve yaz:`,
    `bu bir tanıklıktır, analiz nesnesi değil — analitik dil kurbanları nesneleştirmemeli. Nötr içerikte ton_notu boş string olsun.`,
    ``,
    `Türkçe yaz. Perspektiflerin söylediklerini özetleme; onların ÜZERİNE çık.`,
  ].join("\n");

  const payload = results.map((r) => ({
    perspektif: r.perspective.display_name,
    bilissel_mod: r.perspective.cognitive_mode,
    analiz: r.data,
  }));

  const response = await client.messages.create({
    model: SYNTHESIS_MODEL,
    max_tokens: 8000,
    system,
    output_config: { format: { type: "json_schema", schema: SYNTHESIS_SCHEMA } },
    messages: [
      {
        role: "user",
        content: `HABER METNİ:\n\n${text}\n\nPERSPEKTİF ANALİZLERİ (JSON):\n\n${JSON.stringify(payload, null, 2)}`,
      },
    ],
  });
  const block = response.content.find((b) => b.type === "text");
  return JSON.parse(block.text);
}

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

// NDJSON stream: her perspektif bittiği anda kart dolar, sonda sentez gelir.
app.post("/api/analyze", async (req, res) => {
  const text = (req.body?.text ?? "").trim();
  if (text.length < 80) {
    return res.status(400).json({ error: "Analiz için en az birkaç cümlelik bir haber metni yapıştır." });
  }

  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.flushHeaders?.();
  const send = (obj) => res.write(JSON.stringify(obj) + "\n");

  const perspectives = loadPerspectives();
  send({
    type: "meta",
    perspectives: perspectives.map((p) => ({
      id: p.id,
      display_name: p.display_name,
      tagline: p.tagline,
      color: p.color,
    })),
  });

  // Fan-out: tüm perspektifler paralel; biten stream'e düşer.
  const settled = await Promise.all(
    perspectives.map(async (p) => {
      try {
        const data = await runPerspective(p, text);
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
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    console.warn("UYARI: ANTHROPIC_API_KEY tanımlı değil — /api/analyze çağrıları başarısız olur.");
  }
});
