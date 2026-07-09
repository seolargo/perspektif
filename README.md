# Perspektif

> 🇬🇧 English version: [README.en.md](README.en.md)

Bir haber metnini birden çok "akıl" ile okuyan çok perspektifli analiz uygulaması.
Her perspektif üç şey söyler: **neye takıldı**, **nasıl yorumladı** (Entman'ın dört
çerçeveleme işlevi: mesele / neden / değerlendirme / çözüm) ve **neyi kaçırdı**
(kör noktalar). En sonda "normal insan aklı" meta-katmanı sentez üretir: uzlaşma,
çatışma, kör nokta kapatmaları ve entegre okuma.

## Mimari

```
React (Vite) ── POST /api/analyze ──► Express (Node.js)
   │ pill'ler: akıl seçimi              ├─ preprocessing: yapılandırılmış olay çıkarımı (gpt-5-mini)
   │                                    ├─ perspectives/*.json  (perspektif = veri, kod değil)
   │                                    ├─ paralel gpt-5-mini çağrıları (Promise.all, structured output)
   │                                    └─ gpt-5.1 sentez çağrısı
   ◄── NDJSON stream ─────────────────  her perspektif bittiği anda karta düşer
```

- **Perspektifler config'tir:** `server/perspectives/` altına yeni bir JSON dosyası
  koymak yeni bir "X aklı" ekler — deploy gerekmez, sunucu her istekte okur.
  İçerde bilişsel mod (ör. `relational`), dışarda kullanıcıya gösterilen isim
  (ör. "Kadın Aklı") — karikatürleşmeye karşı sabit koruma her prompta eklenir.
- **Seçmeli akıllar:** ~24 akıl (Erkek, Kadın, Piyasa, Tarihçi, Hukukçu, Şüpheci,
  İşçi, Mağdur/Tanık…) ana sayfadaki pill'lerden analiz başına elle seçilir;
  ilk üçü varsayılan seçili gelir, en az bir akıl gerekir.
- **Preprocessing:** perspektifler ham metni değil, tek ucuz çağrıyla çıkarılan
  yapılandırılmış olay özetini okur (aktörler, olgular, iddialar, paydaşlar) —
  tutarlılık artar, token maliyeti düşer. Çıkarım başarısız olursa ham metne düşülür.
- **Modeller:** perspektifler `gpt-5-mini` (ucuz, paralel, minimal reasoning),
  sentez `gpt-5.1`. Çıktılar `response_format` (json_schema, strict) ile garanti JSON.
- **Hassas içerik:** her perspektif `duygusal_yuk` (0-1) döndürür; sentez katmanı
  yüksek yükte `ton_notu` ("bu bir tanıklık, analiz nesnesi değil") üretir ve UI
  bunu banner olarak gösterir.

## Çalıştırma

```sh
# server/.env dosyasına OPENAI_API_KEY=sk-... yaz (npm start otomatik okur)
# veya ortam değişkeni olarak ver:
export OPENAI_API_KEY=sk-...

# Prod benzeri (tek sunucu, build edilmiş frontend'i de servis eder)
cd web && npm install && npm run build
cd ../server && npm install && npm start
# → http://localhost:3001

# Geliştirme (hot reload)
cd server && npm start          # :3001
cd web && npm run dev           # :5173, /api → :3001 proxy
```

## Yeni perspektif eklemek

`server/perspectives/ornek.json`:

```json
{
  "id": "tarihci_akli",
  "order": 4,
  "display_name": "Tarihçi Aklı",
  "cognitive_mode": "historical (bağlamsal/zamansal okuma)",
  "tagline": "Öncüller, örüntüler, süreklilik",
  "color": "#a98ac9",
  "mode_description": "Olaya zamansal lensle bak: ...",
  "focus_questions": ["Bu daha önce ne zaman, nasıl oldu?", "..."],
  "blind_spots": ["Şimdinin aciliyeti", "..."]
}
```

Sunucu dosyayı bir sonraki istekte otomatik okur; yeni akıl ana sayfada pill
olarak görünür.

## Deneyler — bu şey gerçekten işe yarıyor mu?

`server/experiments/run.js`, mimarinin üç iddiasını ölçer:

- **H1 (ayrışma):** farklı perspektiflerin çıktıları arasındaki embedding mesafesi,
  aynı perspektifin iki bağımsız çalıştırması arasındaki gürültüden büyük mü?
  Değilse "perspektif tiyatrosu".
- **H2 (kapsama):** N perspektifin birleşimi, tek geçişli "kapsamlı analiz et"
  baseline'ından daha fazla bilgi birimi yakalıyor mu? (LLM hakemli)
- **H3 (tamamlayıcılık):** bir perspektifin kör noktası başka bir perspektifçe
  kapatılıyor mu?

```sh
cd server && node --env-file-if-exists=.env experiments/run.js
# → experiments/results.json
```

İlk ölçüm (5 haber, sabit üçlü ile) dürüst bir sonuç verdi: H1 zayıf (1.44x,
metne göre 0.92x–2.25x), H2 kaldı (birleşim %93 vs baseline %100), H3 zayıf
(%33). Yani mevcut çekirdek set birbirine fazla benziyor; ölçümler perspektif
seti değiştikçe tekrarlanmalı.

## Sonraki adımlar

- URL'den metin çıkarımı (Python + trafilatura servisi)
- Redis cache (aynı haber ikinci kez ücretsiz)
- H4: insan validasyonu (EQ/SQ profilli okuyucularla belirginlik karşılaştırması)
- Media Frames Corpus üzerinde H1/H2 tekrarı (etiketli ground truth)
