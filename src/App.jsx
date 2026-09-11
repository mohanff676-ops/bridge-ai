import { useState } from "react";
import "./App.css";

const scenarios = [
  {
    icon: "car",
    name: "Traffic",
    text: "There is a large accident blocking the road near our college. Cars are stuck and traffic is building up. I don't know if anyone is injured or whether emergency services have arrived.",
  },
  {
    icon: "flood",
    name: "Flooding",
    text: "After heavy rain, water has covered the road outside our college. People are struggling to walk through it and some motorcycles are getting stuck. I don't know how deep the water is.",
  },
  {
    icon: "civic",
    name: "Civic Issue",
    text: "A streetlight near our college has been broken for several days. The road becomes very dark at night and people are having difficulty seeing. I don't know whether anyone has already reported it.",
  },
  {
    icon: "alert",
    name: "Emergency",
    text: "There is smoke coming from a building near me and I can see people leaving the building. I don't know what caused the smoke or whether anyone is trapped inside.",
  },
];

const pipeline = [
  { key: "input", label: "Messy input", note: "text + photo" },
  { key: "gemini", label: "Gemini", note: "multimodal reasoning" },
  { key: "evidence", label: "Evidence split", note: "stated · observed · inferred · unknown" },
  { key: "action", label: "System action", note: "ready for a real workflow" },
];

const icons = {
  car: (
    <path d="M3 12.5l1.5-4.2A2 2 0 0 1 6.4 7h11.2a2 2 0 0 1 1.9 1.3L21 12.5M3 12.5V16a1 1 0 0 0 1 1h1M3 12.5h18M20 17h1a1 1 0 0 0 1-1v-3.5M7 17.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm10 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
  ),
  flood: (
    <path d="M3 16c1.2 1 2.2 1 3.4 0 1.2-1 2.2-1 3.4 0 1.2 1 2.2 1 3.4 0 1.2-1 2.2-1 3.4 0 1.2 1 2.2 1 3.4 0M3 20c1.2 1 2.2 1 3.4 0 1.2-1 2.2-1 3.4 0 1.2 1 2.2 1 3.4 0 1.2-1 2.2-1 3.4 0 1.2 1 2.2 1 3.4 0M8 13l3.2-6.4a1 1 0 0 1 1.8.1L16 13" />
  ),
  civic: (
    <path d="M4 21h16M5 21V10l7-5 7 5v11M9 21v-6h6v6M9 10h.01M12 10h.01M15 10h.01" />
  ),
  alert: (
    <path d="M12 3l9 16H3l9-16zM12 10v4m0 3h.01" />
  ),
};

function ScenarioIcon({ name }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
}

function App() {
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  function handleImageChange(event) {
    const file = event.target.files[0];
    if (file) {
      setImage(file);
      setResult(null);
    }
  }

  function loadScenario(scenario) {
    setText(scenario.text);
    setResult(null);
  }

  function clearInput() {
    setText("");
    setImage(null);
    setResult(null);
    const input = document.getElementById("incident-image");
    if (input) input.value = "";
  }

  async function analyzeIncident() {
    if (!text.trim() && !image) {
      alert("Please describe the situation or add a photo.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      let imageData = null;

      if (image) {
        imageData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(image);
        });
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, image: imageData }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      setResult(data.result);
    } catch (error) {
      console.error(error);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function copyReport() {
    if (!result) return;

    const report = `
BRIDGE AI — EVIDENCE-AWARE INCIDENT REPORT

Priority: ${result.priority}
Category: ${result.category}
Verification: ${result.verification_status}
System Action: ${result.system_action}

SUMMARY
${result.summary}

STATED BY USER
${result.stated_facts?.map((x) => `• ${x}`).join("\n") || "None"}

OBSERVED FROM IMAGE
${result.image_observations?.map((x) => `• ${x}`).join("\n") || "None"}

AI INFERENCES
${result.inferred_information?.map((x) => `• ${x}`).join("\n") || "None"}

UNKNOWN / MISSING
${result.missing_information?.map((x) => `• ${x}`).join("\n") || "None"}

RECOMMENDED ACTIONS
${result.recommended_actions?.map((x, i) => `${i + 1}. ${x}`).join("\n") || "None"}
`;

    try {
      await navigator.clipboard.writeText(report);
      alert("Report copied!");
    } catch {
      alert("Could not copy the report.");
    }
  }

  return (
    <div className="app">
      <div className="grain" />

      {/* NAV */}
      <header className="nav">
        <div className="nav-inner">
          <div className="brand">
            <svg className="brand-mark" viewBox="0 0 32 32" fill="none">
              <circle cx="7" cy="16" r="4" fill="#7c6cf6" />
              <circle cx="25" cy="16" r="4" fill="#38d9ff" />
              <path d="M11 16h10" stroke="url(#bridgeGrad)" strokeWidth="2.4" strokeLinecap="round" />
              <defs>
                <linearGradient id="bridgeGrad" x1="11" y1="16" x2="21" y2="16">
                  <stop stopColor="#7c6cf6" />
                  <stop offset="1" stopColor="#38d9ff" />
                </linearGradient>
              </defs>
            </svg>
            <span>Bridge AI</span>
          </div>

          <nav className="nav-links">
            <span>Universal Bridge</span>
            <span>Evidence Engine</span>
            <span>Gemini Powered</span>
          </nav>

          <div className="nav-status">
            <span className="pulse-dot" />
            Online
          </div>
        </div>
      </header>

      <main className="container">
        {/* HERO */}
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">Human intent → system action</div>
            <h1>
              From messy human intent<br />to actionable information.
            </h1>
            <p>
              Transform real-world reports and visual evidence into
              structured, evidence-aware actions.
            </p>

            <div className="badge-row">
              <span>Multimodal</span>
              <span>Evidence-aware</span>
              <span>Action-ready</span>
              <span>Universal</span>
            </div>
          </div>

          <div className="hero-diagram" role="list" aria-label="How Bridge AI processes a report">
            {pipeline.map((step, i) => (
              <div className="pipe-step" role="listitem" key={step.key} style={{ "--d": `${i * 0.12}s` }}>
                <div className={`pipe-node pipe-node--${step.key}`} aria-hidden="true">
                  {i + 1}
                </div>
                <div className="pipe-text">
                  <strong>{step.label}</strong>
                  <span>{step.note}</span>
                </div>
                {i < pipeline.length - 1 && (
                  <div className="pipe-line" aria-hidden="true" style={{ "--d": `${i * 0.12 + 0.06}s` }} />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* SCENARIOS */}
        <section className="scenario-section">
          <div className="section-heading">
            <div>
              <div className="eyebrow eyebrow--small">Not a single-purpose classifier</div>
              <h2>One system. Many real-world situations.</h2>
              <p>Bridge AI isn't limited to traffic. Try a scenario to see it in action.</p>
            </div>
          </div>

          <div className="scenario-grid">
            {scenarios.map((scenario) => (
              <button key={scenario.name} className="scenario-card" onClick={() => loadScenario(scenario)}>
                <span className="scenario-icon">
                  <ScenarioIcon name={scenario.icon} />
                </span>
                <span className="scenario-name">{scenario.name}</span>
                <span className="scenario-arrow">→</span>
              </button>
            ))}
          </div>
        </section>

        {/* INPUT */}
        <section className="panel input-panel">
          <div className="section-heading">
            <div>
              <div className="step-label">01 — Real-world input</div>
              <h2>Tell us what happened</h2>
              <p id="input-hint">Describe the situation in your own words. Add a photo if you have one.</p>
            </div>
            <button className="ghost-button" onClick={clearInput}>
              Clear
            </button>
          </div>

          <div className="input-wrapper">
            <label className="sr-only" htmlFor="incident-text">
              Describe the situation
            </label>
            <textarea
              id="incident-text"
              placeholder="Describe the situation in your own words…"
              rows="6"
              aria-describedby="input-hint character-count"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="character-count" id="character-count">
              {text.length} characters
            </div>
          </div>

          <div className="upload-box">
            <div className="upload-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 16.5V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2.5M7 9l5-5 5 5M12 4v13" />
              </svg>
            </div>

            <div className="upload-content">
              <strong>Add visual evidence</strong>
              <span>Upload an incident photo for Gemini to analyze</span>
            </div>

            <label className="upload-button" htmlFor="incident-image">
              Choose image
            </label>
            <input id="incident-image" type="file" accept="image/*" onChange={handleImageChange} />
          </div>

          {image && (
            <div className="image-preview">
              <div className="preview-header">
                <span>Image selected</span>
                <button onClick={() => setImage(null)}>Remove</button>
              </div>
              <p>{image.name}</p>
              <img src={URL.createObjectURL(image)} alt="Incident preview" />
            </div>
          )}

          <div className="button-row">
            <button className="analyze-button" onClick={analyzeIncident} disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" />
                  Analyzing evidence…
                </>
              ) : (
                <>
                  Analyze with Gemini
                  <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          </div>

          <div className="privacy-note">Gemini API credentials remain server-side.</div>
        </section>

        {/* LOADING */}
        {loading && (
          <div className="panel loading-card" role="status" aria-live="polite">
            <div className="loading-animation" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <strong>Bridge AI is analyzing…</strong>
            <p>Extracting facts · Checking evidence · Identifying unknowns</p>
          </div>
        )}

        {/* RESULT */}
        {result && !result.error && (
          <section className="panel result-panel" role="region" aria-label="Bridge AI analysis result">
            <div className="section-heading">
              <div>
                <div className="step-label">02 — Bridge AI output</div>
                <h2>Evidence-aware incident report</h2>
                <p>Human input converted into structured, actionable information.</p>
              </div>

              <div className={`priority priority--${result.priority?.toLowerCase()}`}>
                <span className="priority-dot" />
                {result.priority}
              </div>
            </div>

            <div className="summary">
              <div className="mini-label">AI summary</div>
              <p>{result.summary}</p>
            </div>

            <div className="info-grid">
              <div className="info-card">
                <span className="info-label">Category</span>
                <strong>{result.category}</strong>
              </div>
              <div className="info-card">
                <span className="info-label">Verification</span>
                <strong>{result.verification_status}</strong>
              </div>
              <div className="info-card">
                <span className="info-label">System action</span>
                <strong>{result.system_action}</strong>
              </div>
            </div>

            <div className="evidence-heading">
              <div>
                <div className="eyebrow eyebrow--small">Evidence-aware reasoning</div>
                <h3>What does the AI actually know?</h3>
              </div>
              <span className="evidence-key">Stated · Observed · Inferred · Unknown</span>
            </div>

            <div className="evidence-grid">
              <div className="evidence-card evidence-card--stated">
                <div className="evidence-title">Stated by user</div>
                {result.stated_facts?.length > 0 ? (
                  <ul>
                    {result.stated_facts.map((fact, index) => (
                      <li key={index}>{fact}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty">No user-stated facts.</p>
                )}
              </div>

              <div className="evidence-card evidence-card--observed">
                <div className="evidence-title">Observed from image</div>
                {result.image_observations?.length > 0 ? (
                  <ul>
                    {result.image_observations.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty">No image evidence provided.</p>
                )}
              </div>

              <div className="evidence-card evidence-card--inferred">
                <div className="evidence-title">AI inferences</div>
                {result.inferred_information?.length > 0 ? (
                  <ul>
                    {result.inferred_information.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty">No unsupported inference made.</p>
                )}
              </div>

              <div className="evidence-card evidence-card--unknown">
                <div className="evidence-title">Unknown / missing</div>
                {result.missing_information?.length > 0 ? (
                  <ul>
                    {result.missing_information.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty">No missing information identified.</p>
                )}
              </div>
            </div>

            <div className="actions">
              <div className="section-heading actions-header">
                <div>
                  <div className="step-label">03 — Next step</div>
                  <h3>Recommended actions</h3>
                </div>
                <button className="ghost-button" onClick={copyReport}>
                  Copy report
                </button>
              </div>

              <ol>
                {result.recommended_actions?.map((action, index) => (
                  <li key={index}>
                    <span>{index + 1}</span>
                    {action}
                  </li>
                ))}
              </ol>
            </div>

            <div className="system-ready">
              <div>
                <span className="system-dot" />
                System-ready output
              </div>
              <strong>{result.system_action}</strong>
            </div>
          </section>
        )}

        {/* ERROR */}
        {result?.error && (
          <div className="panel error-box" role="alert">
            <div className="error-icon" aria-hidden="true">
              !
            </div>
            <div>
              <h3>Analysis error</h3>
              <p>{result.error}</p>
            </div>
          </div>
        )}

        <footer>
          <strong>Bridge AI</strong>
          <span>PromptWars × TechVerse 2026</span>
          <span>Powered by Gemini</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
