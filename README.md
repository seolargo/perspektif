# Perspektif

Bir haber metnini birden çok "akıl" ile okuyan çok perspektifli analiz uygulaması.
Her perspektif üç şey söyler: **neye takıldı**, **nasıl yorumladı** (Entman'ın dört
çerçeveleme işlevi: mesele / neden / değerlendirme / çözüm) ve **neyi kaçırdı**
(kör noktalar). En sonda "normal insan aklı" meta-katmanı sentez üretir: uzlaşma,
çatışma, kör nokta kapatmaları ve entegre okuma.

## Mimari

```
React (Vite) ── POST /api/analyze ──► Express (Node.js)
                                        ├─ perspectives/*.json  (perspektif = veri, kod değil)
                                        ├─ paralel gpt-5-mini çağrıları (Promise.all, structured output)
                                        └─ gpt-5.1 sentez çağrısı
                ◄── NDJSON stream ───  her perspektif bittiği anda karta düşer
```

- **Perspektifler config'tir:** `server/perspectives/` altına yeni bir JSON dosyası
  koymak yeni bir "X aklı" ekler — deploy gerekmez. İçerde bilişsel mod
  (ör. `relational`), dışarda kullanıcıya gösterilen isim (ör. "Kadın Aklı") —
  karikatürleşmeye karşı sabit koruma her prompta eklenir.
- **Modeller:** perspektifler `gpt-5-mini` (ucuz, paralel), sentez
  `gpt-5.1`. Çıktılar `response_format` (json_schema, strict) ile garanti JSON.
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

Sunucu dosyayı bir sonraki istekte otomatik okur.

## Sonraki adımlar (tasarım konuşmasından)

- URL'den metin çıkarımı (Python + trafilatura servisi)
- Preprocessing katmanı (yapılandırılmış olay çıkarımı — tutarlılık + token tasarrufu)
- Redis cache (aynı haber ikinci kez ücretsiz)
- H1/H2 ölçümleri: perspektif çıktıları arasında embedding mesafesi (perspektif
  tiyatrosu testi) ve kapsama karşılaştırması (tek geçişli baseline'a karşı)
