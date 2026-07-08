import React, { useState, useCallback } from "react";

const ORNEK_METIN = `Buraya analiz etmek istediğin haber metnini yapıştır. En az birkaç paragraf olursa perspektifler daha çok şey yakalar.`;

function PerspectiveCard({ meta, result, error, loading }) {
  return (
    <div className="card" style={{ "--accent": meta.color || "#888" }}>
      <div className="card-head">
        <h3>{meta.display_name}</h3>
        <span className="tagline">{meta.tagline}</span>
      </div>

      {loading && (
        <div className="skeleton">
          <div className="pulse" />
          <div className="pulse" style={{ width: "70%" }} />
          <div className="pulse" style={{ width: "85%" }} />
        </div>
      )}

      {error && <div className="card-error">Bu perspektif başarısız oldu: {error}</div>}

      {result && (
        <>
          <section>
            <h4>Neye takıldı</h4>
            <ul>
              {result.takildigi.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </section>

          <section>
            <h4>Nasıl yorumladı</h4>
            <dl>
              <dt>Mesele</dt>
              <dd>{result.yorumu.problem_tanimi}</dd>
              <dt>Neden</dt>
              <dd>{result.yorumu.nedensel_yorum}</dd>
              <dt>Değerlendirme</dt>
              <dd>{result.yorumu.ahlaki_degerlendirme}</dd>
              <dt>Ne yapılmalı</dt>
              <dd>{result.yorumu.cozum_onerisi}</dd>
            </dl>
          </section>

          <section className="missed">
            <h4>Neyi kaçırdı</h4>
            <ul>
              {result.kacirdigi.map((k, i) => (
                <li key={i}>{k}</li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function SynthesisPanel({ data }) {
  return (
    <div className="synthesis">
      {data.ton_notu ? <div className="tone-note">{data.ton_notu}</div> : null}
      <h2>Normal insan aklı — sentez</h2>
      <p className="integrated">{data.entegre_okuma}</p>

      <div className="synth-grid">
        <section>
          <h4>Uzlaşma</h4>
          <ul>
            {data.uzlasma.map((u, i) => (
              <li key={i}>{u}</li>
            ))}
          </ul>
        </section>
        <section>
          <h4>Çatışma</h4>
          <ul>
            {data.catisma.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </section>
        <section>
          <h4>Kör nokta kapatmaları</h4>
          <ul>
            {data.kor_nokta_kapatmalari.map((k, i) => (
              <li key={i}>
                <strong>{k.kim}:</strong> {k.neyi_kapatti}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

export default function App() {
  const [text, setText] = useState("");
  const [meta, setMeta] = useState(null); // [{id, display_name, tagline, color}]
  const [results, setResults] = useState({}); // id -> data
  const [errors, setErrors] = useState({}); // id -> message
  const [synthesis, setSynthesis] = useState(null);
  const [globalError, setGlobalError] = useState(null);
  const [running, setRunning] = useState(false);

  const analyze = useCallback(async () => {
    setMeta(null);
    setResults({});
    setErrors({});
    setSynthesis(null);
    setGlobalError(null);
    setRunning(true);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Sunucu hatası (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const handle = (msg) => {
        if (msg.type === "meta") setMeta(msg.perspectives);
        else if (msg.type === "perspective")
          setResults((r) => ({ ...r, [msg.id]: msg.data }));
        else if (msg.type === "perspective_error")
          setErrors((e) => ({ ...e, [msg.id]: msg.message }));
        else if (msg.type === "synthesis") setSynthesis(msg.data);
        else if (msg.type === "error") setGlobalError(msg.message);
      };

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (line.trim()) handle(JSON.parse(line));
        }
      }
      if (buffer.trim()) handle(JSON.parse(buffer));
    } catch (err) {
      setGlobalError(String(err.message ?? err));
    } finally {
      setRunning(false);
    }
  }, [text]);

  return (
    <div className="page">
      <header>
        <h1>Perspektif</h1>
        <p>Bir haber, birden çok akıl. Her perspektif neye takıldığını, nasıl yorumladığını ve — asıl önemlisi — neyi kaçırdığını söyler.</p>
      </header>

      <div className="input-area">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={ORNEK_METIN}
          rows={9}
          disabled={running}
        />
        <button onClick={analyze} disabled={running || text.trim().length < 80}>
          {running ? "Perspektifler okuyor…" : "Analiz et"}
        </button>
      </div>

      {globalError && <div className="global-error">{globalError}</div>}

      {synthesis && <SynthesisPanel data={synthesis} />}

      {meta && (
        <div className="cards">
          {meta.map((p) => (
            <PerspectiveCard
              key={p.id}
              meta={p}
              result={results[p.id]}
              error={errors[p.id]}
              loading={running && !results[p.id] && !errors[p.id]}
            />
          ))}
        </div>
      )}

      {meta && !synthesis && running && Object.keys(results).length === meta.length && (
        <div className="synth-wait">Sentez hazırlanıyor…</div>
      )}
    </div>
  );
}
