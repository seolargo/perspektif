// H1/H2/H3 deneyleri — perspektif mimarisi gerçekten iş görüyor mu?
//
// H1 (ayrışma):   Farklı perspektiflerin çıktıları arasındaki embedding mesafesi,
//                 AYNI perspektifin iki bağımsız çalıştırması arasındaki mesafeden
//                 anlamlı derecede büyük mü? Değilse "perspektif tiyatrosu".
// H2 (kapsama):   N perspektifin birleşimi, tek geçişli "kapsamlı analiz et"
//                 baseline'ından daha çok bilgi birimi yakalıyor mu?
// H3 (tamamlama): Bir perspektifin kör noktası (kacirdigi) başka bir perspektifin
//                 çıktısında karşılanıyor mu?
//
// Çalıştırma: cd server && node --env-file-if-exists=.env experiments/run.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  client,
  PERSPECTIVE_MODEL,
  SYNTHESIS_MODEL,
  loadPerspectives,
  runPreprocessing,
  runPerspective,
} from "../lib.js";

const here = path.dirname(fileURLToPath(import.meta.url));

const TEXTS = [
  {
    id: "park_avm",
    text: `Belediye, kent merkezindeki son büyük yeşil alan olan Millet Bahçesi'nin bir bölümünün otopark ve AVM projesine dönüştürüleceğini açıkladı. Mahalle sakinleri kararın kendilerine sorulmadığını söyleyerek imza kampanyası başlattı; iki günde 12 bin imza toplandı. Belediye başkanı projenin bölgeye 2 bin kişilik istihdam getireceğini ve kronik otopark sorununu çözeceğini savundu. Şehir Plancıları Odası ise imar değişikliğinin yargıya taşınacağını, alanın deprem toplanma bölgesi olarak planlandığını hatırlattı. Mahallede esnafın bir kısmı projeyi desteklerken, park çevresinde oturan yaşlı sakinler günlük yaşamlarının tek nefes alanını kaybetmekten endişeli.`,
  },
  {
    id: "deprem_konteyner",
    text: `Depremin üzerinden sekiz ay geçmesine rağmen ilçedeki konteyner kentte hâlâ 4 bin kişi yaşıyor. Kalıcı konutların yıl sonunda teslim edileceği açıklanmıştı; ancak müteahhit firmalardan ikisinin ihaleyi bırakması nedeniyle inşaatların yüzde 40'ı durmuş durumda. Konteyner kentte yaşayan Ayşe Kaya, iki çocuğunun okula 12 kilometre öteye servisle gittiğini, kışın konteynerlerin ısınmadığını anlattı. Valilik, elektrik ve su kesintilerinin giderildiğini, yeni ihalelerin bu ay tamamlanacağını duyurdu. Bölgede psikososyal destek veren gönüllü sayısının ise ilk aylara göre onda bire düştüğü belirtiliyor.`,
  },
  {
    id: "faiz_kobi",
    text: `Merkez Bankası politika faizini 250 baz puan artırarak yüzde 42,5'e çıkardı. Karar sonrası bankalar ticari kredi faizlerini güncellerken, KOBİ temsilcileri mevcut borçlarını çeviremez hale geldiklerini açıkladı. Organize sanayi bölgesindeki bir tekstil atölyesi sahibi, 35 çalışanının maaşını ödemek için makinelerinden ikisini sattığını söyledi. Ekonomi yönetimi, enflasyonla mücadelede kararlılık mesajı verdi ve sıkı duruşun en az iki çeyrek süreceğini belirtti. Ekonomistler dezenflasyonun başladığını ancak istihdam kaybının önümüzdeki altı ayda belirginleşeceğini öngörüyor.`,
  },
  {
    id: "hastane_siddet",
    text: `Kentteki eğitim ve araştırma hastanesinin acil servisinde bir hasta yakını, bekleme süresine sinirlenerek nöbetçi doktora saldırdı. Doktorun burnu kırıldı; saldırgan gözaltına alındıktan sonra adli kontrol şartıyla serbest bırakıldı. Hastane çalışanları ertesi gün iş bırakma eylemi yaptı. Sağlık sendikası, acil serviste gece tek doktorun 200'den fazla hastaya baktığını, güvenlik personelinin ise iki kişiye düştüğünü açıkladı. Hasta yakınları da sekiz saati bulan bekleme sürelerinden şikâyetçi. Sağlık müdürlüğü soruşturma başlattığını ve ek güvenlik kadrosu talep edildiğini bildirdi.`,
  },
  {
    id: "teknoloji_isten_cikarma",
    text: `Ülkenin en büyük e-ticaret şirketi, müşteri hizmetleri ve içerik operasyonlarında çalışan 800 kişinin işine son verdiğini duyurdu. Şirket açıklamasında, yapay zekâ destekli otomasyonun bu birimlerdeki iş yükünü yüzde 70 azalttığı belirtildi. İşten çıkarılanların çoğu iki yıldan uzun süredir şirkette çalışıyordu ve tazminat paketine ek olarak üç aylık "yeniden beceri kazandırma" programı önerildi. Çalışanların kurduğu dayanışma ağı, programın içeriğinin belirsiz olduğunu ve sektörde benzer pozisyonların hızla kapandığını vurguladı. Şirket hisseleri duyurunun ardından yüzde 6 değer kazandı.`,
  },
];

// --- yardımcılar --------------------------------------------------------------

function renderAnalysis(d) {
  return [
    ...d.takildigi,
    d.yorumu.problem_tanimi,
    d.yorumu.nedensel_yorum,
    d.yorumu.ahlaki_degerlendirme,
    d.yorumu.cozum_onerisi,
    ...d.kacirdigi,
  ].join("\n");
}

async function embed(texts) {
  const res = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}

function cosineDist(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return 1 - dot / (Math.sqrt(na) * Math.sqrt(nb));
}

const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;

async function runBaseline(text) {
  const res = await client.chat.completions.create({
    model: PERSPECTIVE_MODEL,
    max_completion_tokens: 6000,
    reasoning_effort: "minimal",
    messages: [
      {
        role: "system",
        content:
          "Sen bir haber analiz motorusun. Verilen haberi kapsamlı ve çok yönlü analiz et: önemli olgular, meselenin tanımı, nedenler, değerlendirme, çözüm önerileri, paydaşlar ve gözden kaçmaması gereken noktalar. Türkçe yaz.",
      },
      { role: "user", content: `HABER METNİ:\n\n${text}` },
    ],
  });
  return res.choices[0].message.content;
}

const H2_SCHEMA = {
  type: "object",
  properties: {
    units: {
      type: "array",
      items: {
        type: "object",
        properties: {
          unit: { type: "string", description: "Haberdeki bir bilgi birimi (olgu, paydaş, sonuç, gerilim)" },
          coklu: { type: "boolean", description: "Çok perspektifli birleşim bu birimi ele alıyor mu?" },
          tekli: { type: "boolean", description: "Tek geçişli analiz bu birimi ele alıyor mu?" },
        },
        required: ["unit", "coklu", "tekli"],
        additionalProperties: false,
      },
    },
  },
  required: ["units"],
  additionalProperties: false,
};

async function judgeCoverage(text, multiText, singleText) {
  const res = await client.chat.completions.create({
    model: SYNTHESIS_MODEL,
    max_completion_tokens: 12000,
    response_format: { type: "json_schema", json_schema: { name: "kapsama", strict: true, schema: H2_SCHEMA } },
    messages: [
      {
        role: "system",
        content:
          "Sen bir değerlendirme hakemisin. Önce haberdeki 12-15 önemli bilgi birimini çıkar (olgular, paydaşlar, sonuçlar, gerilimler — birbirinden bağımsız ve spesifik olsun). Sonra her birim için iki analizin o birimi ele alıp almadığını işaretle. Cömert olma: birim gerçekten değinilmişse true.",
      },
      {
        role: "user",
        content: `HABER METNİ:\n\n${text}\n\n=== ANALİZ A (çok perspektifli birleşim) ===\n\n${multiText}\n\n=== ANALİZ B (tek geçişli) ===\n\n${singleText}`,
      },
    ],
  });
  return JSON.parse(res.choices[0].message.content).units;
}

const H3_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kor_nokta: { type: "string" },
          kapatan: { type: "string", description: "Kör noktayı içeriğinde gerçekten ele alan perspektifin adı, yoksa 'yok'" },
        },
        required: ["kor_nokta", "kapatan"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
};

async function judgeComplementarity(blindspots, analyses) {
  const res = await client.chat.completions.create({
    model: SYNTHESIS_MODEL,
    max_completion_tokens: 12000,
    response_format: { type: "json_schema", json_schema: { name: "tamamlama", strict: true, schema: H3_SCHEMA } },
    messages: [
      {
        role: "system",
        content:
          "Sen bir değerlendirme hakemisin. Sana kör nokta ifadeleri ve perspektif analizleri verilecek. Her kör nokta için: onu beyan eden perspektif DIŞINDAKİ perspektiflerden herhangi biri bu konuyu içeriğinde gerçekten ele alıyor mu? Alıyorsa perspektifin adını, almıyorsa 'yok' yaz. Yüzeysel değinme yetmez; içerik olarak karşılanmış olmalı.",
      },
      {
        role: "user",
        content: `KÖR NOKTALAR:\n${blindspots.map((b) => `- [${b.owner}] ${b.item}`).join("\n")}\n\nPERSPEKTİF ANALİZLERİ:\n${analyses
          .map((a) => `=== ${a.name} ===\n${a.text}`)
          .join("\n\n")}`,
      },
    ],
  });
  return JSON.parse(res.choices[0].message.content).items;
}

// --- deney döngüsü -------------------------------------------------------------

const perspectives = loadPerspectives().slice(0, 3); // ilk üç akıl (order'a göre)
console.log(`Perspektifler: ${perspectives.map((p) => p.display_name).join(", ")}`);
console.log(`Metinler: ${TEXTS.length}\n`);

const results = [];

for (const t of TEXTS) {
  console.log(`--- ${t.id} ---`);
  const { event } = await runPreprocessing(t.text);
  const content = JSON.stringify(event, null, 2);

  // İki bağımsız çalıştırma: A (asıl) ve B (H1'in gürültü taban çizgisi için)
  const [runA, runB, baseline] = await Promise.all([
    Promise.all(perspectives.map((p) => runPerspective(p, content, true))),
    Promise.all(perspectives.map((p) => runPerspective(p, content, true))),
    runBaseline(t.text),
  ]);

  const textsA = runA.map(renderAnalysis);
  const textsB = runB.map(renderAnalysis);
  const vecs = await embed([...textsA, ...textsB]);
  const vA = vecs.slice(0, perspectives.length);
  const vB = vecs.slice(perspectives.length);

  // H1: perspektifler-arası mesafe vs aynı-perspektif-tekrar mesafesi
  const inter = [];
  for (let i = 0; i < vA.length; i++)
    for (let j = i + 1; j < vA.length; j++) inter.push(cosineDist(vA[i], vA[j]));
  const intra = vA.map((v, i) => cosineDist(v, vB[i]));
  const h1 = { inter: mean(inter), intra: mean(intra), ratio: mean(inter) / mean(intra) };

  // H2: birleşim vs tek geçiş kapsaması
  const multiText = perspectives
    .map((p, i) => `## ${p.display_name}\n${textsA[i]}`)
    .join("\n\n");
  const units = await judgeCoverage(t.text, multiText, baseline);
  const h2 = {
    toplam: units.length,
    coklu: units.filter((u) => u.coklu).length,
    tekli: units.filter((u) => u.tekli).length,
    sadece_coklu: units.filter((u) => u.coklu && !u.tekli).map((u) => u.unit),
    sadece_tekli: units.filter((u) => !u.coklu && u.tekli).map((u) => u.unit),
  };

  // H3: kör noktalar başka perspektifçe karşılanıyor mu
  const blindspots = perspectives.flatMap((p, i) =>
    runA[i].kacirdigi.map((item) => ({ owner: p.display_name, item }))
  );
  const analyses = perspectives.map((p, i) => ({ name: p.display_name, text: textsA[i] }));
  const h3items = await judgeComplementarity(blindspots, analyses);
  const covered = h3items.filter((x) => x.kapatan && x.kapatan.toLowerCase() !== "yok");
  const h3 = { toplam: h3items.length, kapatilan: covered.length, detay: h3items };

  console.log(
    `  H1 ayrışma: inter=${h1.inter.toFixed(3)} intra=${h1.intra.toFixed(3)} oran=${h1.ratio.toFixed(2)}x`
  );
  console.log(`  H2 kapsama: çoklu ${h2.coklu}/${h2.toplam}, tekli ${h2.tekli}/${h2.toplam}`);
  console.log(`  H3 tamamlama: ${h3.kapatilan}/${h3.toplam} kör nokta başka perspektifçe kapatıldı\n`);

  results.push({ text_id: t.id, h1, h2, h3 });
}

// --- özet ----------------------------------------------------------------------

const summary = {
  h1_ortalama_oran: mean(results.map((r) => r.h1.ratio)),
  h1_inter: mean(results.map((r) => r.h1.inter)),
  h1_intra: mean(results.map((r) => r.h1.intra)),
  h2_coklu_kapsama: mean(results.map((r) => r.h2.coklu / r.h2.toplam)),
  h2_tekli_kapsama: mean(results.map((r) => r.h2.tekli / r.h2.toplam)),
  h3_kapatma_orani: mean(results.map((r) => r.h3.kapatilan / Math.max(1, r.h3.toplam))),
};

console.log("=== ÖZET ===");
console.log(JSON.stringify(summary, null, 2));

fs.writeFileSync(
  path.join(here, "results.json"),
  JSON.stringify({ summary, results }, null, 2)
);
console.log(`\nDetay: experiments/results.json`);
