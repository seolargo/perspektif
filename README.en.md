# Perspektif

> 🇹🇷 Türkçe sürüm: [README.md](README.md)

A multi-perspective news analysis app that reads a single news text through
multiple "minds." Each perspective reports three things: **what it fixated on**,
**how it interpreted it** (Entman's four framing functions: problem / cause /
moral evaluation / remedy), and **what it missed** (blind spots). At the end, a
"common human mind" meta-layer produces a synthesis: agreements, conflicts,
blind-spot closures, and an integrated reading.

## Architecture

```
React (Vite) ── POST /api/analyze ──► Express (Node.js)
   │ pills: mind selection              ├─ preprocessing: structured event extraction (gpt-5-mini)
   │                                    ├─ perspectives/*.json  (a perspective is data, not code)
   │                                    ├─ parallel gpt-5-mini calls (Promise.all, structured output)
   │                                    └─ gpt-5.1 synthesis call
   ◄── NDJSON stream ─────────────────  each card fills the moment its perspective finishes
```

- **Perspectives are config:** dropping a new JSON file into
  `server/perspectives/` adds a new "X mind" — no deploy needed, the server
  re-reads the directory on every request. Internally each mind is a cognitive
  mode (e.g. `relational`); the user-facing name (e.g. "Kadın Aklı" / "Women's
  Mind") is just a label. An anti-caricature guard is baked into every prompt.
- **Selectable minds:** ~24 minds (Instrumental, Relational, Market, Historian,
  Lawyer, Skeptic, Worker, Survivor/Witness…) are hand-picked per analysis via
  pills on the home page; the first three come pre-selected, and at least one
  mind is required.
- **Preprocessing:** perspectives read a structured event summary (actors,
  facts, claims, stakeholders) extracted in a single cheap call instead of the
  raw text — more consistency, fewer tokens. Falls back to raw text on failure.
- **Models:** perspectives run on `gpt-5-mini` (cheap, parallel, minimal
  reasoning), synthesis on `gpt-5.1`. Outputs are guaranteed JSON via
  `response_format` (json_schema, strict).
- **Sensitive content:** every perspective returns `duygusal_yuk` (emotional
  charge, 0-1); at high charge the synthesis layer emits `ton_notu` ("this is
  testimony, not an object of analysis") which the UI shows as a banner.

## Running

```sh
# Put OPENAI_API_KEY=sk-... into server/.env (npm start reads it automatically)
# or export it as an environment variable:
export OPENAI_API_KEY=sk-...

# Production-like (single server, also serves the built frontend)
cd web && npm install && npm run build
cd ../server && npm install && npm start
# → http://localhost:3001

# Development (hot reload)
cd server && npm start          # :3001
cd web && npm run dev           # :5173, /api → :3001 proxy
```

## Adding a new perspective

`server/perspectives/example.json`:

```json
{
  "id": "tarihci_akli",
  "order": 4,
  "display_name": "Tarihçi Aklı",
  "cognitive_mode": "historical (contextual/temporal reading)",
  "tagline": "Precedents, patterns, continuity",
  "color": "#a98ac9",
  "mode_description": "Read the event through a temporal lens: ...",
  "focus_questions": ["When did this happen before, and how?", "..."],
  "blind_spots": ["The urgency of the present", "..."]
}
```

The server picks the file up on the next request; the new mind appears as a
selectable pill on the home page.

## Experiments — does this actually work?

`server/experiments/run.js` measures the architecture's three claims:

- **H1 (divergence):** is the embedding distance between different
  perspectives' outputs larger than the noise between two independent runs of
  the *same* perspective? If not, it's "perspective theater."
- **H2 (coverage):** does the union of N perspectives capture more information
  units than a single-pass "analyze comprehensively" baseline? (LLM-judged)
- **H3 (complementarity):** are one perspective's blind spots covered by
  another perspective's output?

```sh
cd server && node --env-file-if-exists=.env experiments/run.js
# → experiments/results.json
```

The first measurement (5 news texts, with the fixed core trio) gave an honest
result: H1 weak (1.44x, ranging 0.92x–2.25x by text), H2 failed (union 93% vs
baseline 100%), H3 weak (33%). In short, the current core set is too similar to
itself; the measurements should be re-run whenever the perspective set changes.

## Next steps

- Text extraction from URLs (Python + trafilatura service)
- Redis cache (the same article is free the second time)
- H4: human validation (salience comparison with EQ/SQ-profiled readers)
- Repeating H1/H2 on the Media Frames Corpus (labeled ground truth)
