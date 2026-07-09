import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const here = path.dirname(fileURLToPath(import.meta.url));
export const client = new OpenAI();

export const PERSPECTIVE_MODEL = "gpt-5-mini";
export const SYNTHESIS_MODEL = "gpt-5.1";
export const PREPROCESS_MODEL = "gpt-5-mini";
export const PERSPECTIVES_DIR = path.join(here, "perspectives");

// ---------------------------------------------------------------------------
// Perspektifler: kod değil veri. Yeni bir "X aklı" eklemek = perspectives/
// altına bir JSON dosyası koymak. Deploy gerektirmez, sunucu her istekte okur.
// ---------------------------------------------------------------------------
export function loadPerspectives() {
  return fs
    .readdirSync(PERSPECTIVES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(PERSPECTIVES_DIR, f), "utf8")))
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

// Preprocessing çıktısı: perspektifler ham metin yerine bu yapılandırılmış
// olay üzerinde çalışır — tutarlılık artar, token maliyeti düşer.
export const EVENT_SCHEMA = {
  type: "object",
  properties: {
    event_type: {
      type: "string",
      description: "Olay türü, kısa etiket (ör. kentsel_donusum, dogal_afet, ekonomi_politikasi, siddet).",
    },
    actors: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          role: { type: "string", description: "fail | magdur | otorite | taraf | gozlemci" },
        },
        required: ["name", "role"],
        additionalProperties: false,
      },
    },
    facts: {
      type: "array",
      items: { type: "string" },
      description: "Metindeki somut olgular; her biri tek cümle, metne sadık.",
    },
    claims: {
      type: "array",
      items: { type: "string" },
      description: "Aktörlerin iddiaları/savunmaları — olgulardan ayrı tutulur, 'X'e göre' kalıbıyla.",
    },
    stakeholders: {
      type: "array",
      items: { type: "string" },
      description: "Olaydan etkilenen taraflar, metinde adı geçmeyenler dahil olabilir.",
    },
  },
  required: ["event_type", "actors", "facts", "claims", "stakeholders"],
  additionalProperties: false,
};

// Her perspektifin çıktısı üç bölüm: neye takıldı / nasıl yorumladı / neyi
// kaçırdı. "yorumu" alanı Entman'ın dört çerçeveleme işlevine oturur.
export const PERSPECTIVE_SCHEMA = {
  type: "object",
  properties: {
    takildigi: {
      type: "array",
      items: { type: "string" },
      description:
        "Bu perspektifin metinde en yüksek belirginlik atadığı 2-3 olgu/detay. Her biri tek kısa cümle.",
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
        "Bu perspektifin bilinen kör noktaları yüzünden bu metinde gözden kaçırdığı 2 şey. Her biri tek kısa cümle.",
    },
    duygusal_yuk: {
      type: "number",
      description: "Metnin duygusal yükü, 0 (nötr haber) ile 1 (ağır tanıklık/travma) arası.",
    },
  },
  required: ["takildigi", "yorumu", "kacirdigi", "duygusal_yuk"],
  additionalProperties: false,
};

export const SYNTHESIS_SCHEMA = {
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
        "Normal insan aklı: tüm perspektiflerin birleşiminden çıkan, tek tek hiçbirinde olmayan bütünlüklü okuma. Tek kısa paragraf, en fazla 4 cümle.",
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
export function buildPerspectiveSystemPrompt(p) {
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
    `- Sadece sana verilen içerikte olana dayan; içerikte olmayan olgu uydurma.`,
    `- "kacirdigi" alanı bu analizin en değerli kısmı: kör noktaların yüzünden bu metinde gerçekten gözden kaçırmış olabileceğin şeyleri yaz.`,
    `- Türkçe yaz.`,
    `- KISA yaz: her alan tek cümle, madde başına en fazla 15 kelime. Uzun paragraf yok.`,
  ].join("\n");
}

// Tek LLM çağrısıyla yapılandırılmış olay çıkarımı + havuzdan akıl seçimi.
// Seçim ayrı bir çağrı DEĞİL: aynı ucuz preprocessing çağrısına eklenir, ek
// maliyeti sıfıra yakındır. pool boşsa sadece olay çıkarımı yapılır.
// Dönüş: { event, selected } — selected: seçilen havuz perspektif id'leri (≤2).
export async function runPreprocessing(text, pool = []) {
  let schema = EVENT_SCHEMA;
  let selectionNote = "";
  if (pool.length > 0) {
    schema = {
      ...EVENT_SCHEMA,
      properties: {
        ...EVENT_SCHEMA.properties,
        secilen_akillar: {
          type: "array",
          items: { type: "string", enum: pool.map((p) => p.id) },
          description:
            "Havuzdan bu habere gerçekten katkı verecek EN FAZLA 2 ek perspektif. Katkı vermeyecekse boş bırak.",
        },
      },
      required: [...EVENT_SCHEMA.required, "secilen_akillar"],
    };
    selectionNote = [
      ``,
      `Ayrıca şu ek perspektif havuzundan, bu habere sabit perspektiflerin (ilişkisel, araçsal, teşvik temelli) ötesinde GERÇEKTEN yeni bir şey görecek en fazla 2 tanesini seç; emin değilsen az seç:`,
      ...pool.map((p) => `- ${p.id}: ${p.display_name} — ${p.mode_description}`),
    ].join("\n");
  }

  const response = await client.chat.completions.create({
    model: PREPROCESS_MODEL,
    max_completion_tokens: 4000,
    reasoning_effort: "minimal",
    response_format: {
      type: "json_schema",
      json_schema: { name: "olay_cikarimi", strict: true, schema },
    },
    messages: [
      {
        role: "system",
        content:
          "Sen bir haber ön-işleme katmanısın. Verilen metinden yapılandırılmış olay çıkarımı yaparsın. Sadece metinde olana dayan; olgu ile iddiayı ayır. Türkçe ve kısa yaz." +
          selectionNote,
      },
      { role: "user", content: `HABER METNİ:\n\n${text}` },
    ],
  });
  const out = JSON.parse(response.choices[0].message.content);
  const valid = new Set(pool.map((p) => p.id));
  const selected = (out.secilen_akillar ?? []).filter((id) => valid.has(id)).slice(0, 2);
  delete out.secilen_akillar;
  return { event: out, selected };
}

// content: preprocessing çıktısı (JSON string) veya ham metin (fallback).
export async function runPerspective(p, content, structured) {
  const label = structured
    ? "YAPILANDIRILMIŞ OLAY ÖZETİ (haber metninden ön-işlemeyle çıkarıldı):"
    : "HABER METNİ:";
  const response = await client.chat.completions.create({
    model: PERSPECTIVE_MODEL,
    max_completion_tokens: 6000,
    reasoning_effort: "minimal",
    response_format: {
      type: "json_schema",
      json_schema: { name: "perspektif_analizi", strict: true, schema: PERSPECTIVE_SCHEMA },
    },
    messages: [
      { role: "system", content: buildPerspectiveSystemPrompt(p) },
      { role: "user", content: `${label}\n\n${content}` },
    ],
  });
  return JSON.parse(response.choices[0].message.content);
}

export async function runSynthesis(results, text) {
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
    `KISA yaz: listelerde en fazla 3 madde, madde başına tek cümle. Entegre okuma tek kısa paragraf.`,
  ].join("\n");

  const payload = results.map((r) => ({
    perspektif: r.perspective.display_name,
    bilissel_mod: r.perspective.cognitive_mode,
    analiz: r.data,
  }));

  const response = await client.chat.completions.create({
    model: SYNTHESIS_MODEL,
    max_completion_tokens: 12000,
    response_format: {
      type: "json_schema",
      json_schema: { name: "sentez", strict: true, schema: SYNTHESIS_SCHEMA },
    },
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: `HABER METNİ:\n\n${text}\n\nPERSPEKTİF ANALİZLERİ (JSON):\n\n${JSON.stringify(payload, null, 2)}`,
      },
    ],
  });
  return JSON.parse(response.choices[0].message.content);
}
