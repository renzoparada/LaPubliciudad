import { useMemo, useRef, useState } from "react";
import type { BriefSubmission } from "../brief/types";
import { buildStrategy } from "../engine/strategy";
import { downloadJson, emptySubmission, loadLibrary, parseSubmission, removeFromLibrary, saveToLibrary } from "../brief/storage";
import { SAMPLE_ANSWERS } from "../brief/sample";
import { AIProposal, AnswersView, DiagnosisView, ScopeView, StrategyView, ToolsView } from "../components/Report";
import { navigate } from "../router";

export function Landing({ hasDraft, onStart, onResume }: { hasDraft: boolean; onStart: () => void; onResume: () => void }) {
  return (
    <div className="landing">
      <section className="hero">
        <p className="eyebrow">Brief de marketing y comunicación</p>
        <h1>
          Cuéntanos sobre tu empresa.
          <br />
          <span className="accent">Nosotros diseñamos la estrategia.</span>
        </h1>
        <p className="lead">
          Responde este brief en unos 20 a 30 minutos. Con tus respuestas nuestro equipo prepara una propuesta a medida, con las metodologías y herramientas de las
          grandes agencias del mundo.
        </p>
        <div className="hero-cta">
          {hasDraft ? (
            <>
              <button className="btn primary lg" onClick={onResume}>
                Continuar mi brief →
              </button>
              <button className="btn ghost lg" onClick={onStart}>
                Empezar de nuevo
              </button>
            </>
          ) : (
            <button className="btn primary lg" onClick={onStart}>
              Comenzar el brief →
            </button>
          )}
        </div>
        <p className="muted small">Tus respuestas se guardan automáticamente y son confidenciales.</p>
      </section>
      <section className="benefits">
        {[
          ["🔎", "Diagnóstico inicial", "Analizamos la madurez de tu marketing e identificamos tus oportunidades más rápidas."],
          ["🧭", "Estrategia a medida", "Pilares, embudo, mezcla de canales, plan de contenidos y hoja de ruta de 90 días."],
          ["🧰", "Herramientas y recursos", "El stack de herramientas de marketing, publicidad y medición adecuado a tu tamaño y presupuesto."],
          ["📄", "Propuesta y cotización", "Un alcance claro y una oferta a medida, sin servicios que no necesitas."],
        ].map(([icon, t, d]) => (
          <div className="card" key={t}>
            <span className="benefit-icon" aria-hidden>
              {icon}
            </span>
            <h4>{t}</h4>
            <p>{d}</p>
          </div>
        ))}
      </section>
      <section className="how">
        <h2>¿Cómo funciona?</h2>
        <ol className="how-steps">
          <li>
            <strong>Completas el brief</strong> por secciones, a tu ritmo.
          </li>
          <li>
            <strong>Analizamos tu información</strong> y preparamos la estrategia.
          </li>
          <li>
            <strong>Agendamos una reunión</strong> para presentarte la estrategia y la propuesta.
          </li>
        </ol>
      </section>
    </div>
  );
}

export function ThankYou({ sub, delivered }: { sub: BriefSubmission | null; delivered: boolean }) {
  const nombre = String(sub?.answers.contacto_nombre || "").split(" ")[0];
  return (
    <div className="center-page thanks-page">
      <p className="eyebrow">Brief recibido</p>
      <h1>¡Gracias por completar la información{nombre ? `, ${nombre}` : ""}! 🙌</h1>
      <p className="lead">
        {delivered || !sub
          ? "Nuestro equipo revisará tus respuestas y se pondrá en contacto contigo muy pronto."
          : "No pudimos enviar tus respuestas automáticamente. Descarga tu copia y envíanosla por email; con eso ya podemos empezar."}
      </p>
      <div className="hero-cta">
        {sub && !delivered && (
          <button className="btn primary" onClick={() => downloadJson(sub)}>
            Descargar mi copia
          </button>
        )}
        <button className="btn ghost" onClick={() => navigate("/")}>
          Volver al inicio
        </button>
      </div>
    </div>
  );
}

const TABS = [
  ["diagnostico", "Diagnóstico"],
  ["estrategia", "Estrategia"],
  ["herramientas", "Herramientas"],
  ["alcance", "Alcance y cotización"],
  ["ia", "Propuesta con IA"],
  ["respuestas", "Respuestas"],
] as const;

export function Agency() {
  const [lib, setLib] = useState(loadLibrary);
  const [current, setCurrent] = useState<BriefSubmission | null>(lib[0] ?? null);
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("diagnostico");
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const strategy = useMemo(() => (current ? buildStrategy(current.answers) : null), [current]);

  const add = (s: BriefSubmission) => {
    saveToLibrary(s);
    setLib(loadLibrary());
    setCurrent(s);
    setTab("diagnostico");
  };
  const onFiles = async (files: FileList | null) => {
    setErr("");
    for (const f of Array.from(files ?? [])) {
      try {
        add(parseSubmission(await f.text()));
      } catch (e) {
        setErr(`${f.name}: ${e instanceof Error ? e.message : "no se pudo leer"}`);
      }
    }
  };

  return (
    <div className="agency">
      <aside className="steps">
        <div className="steps-head">
          <strong>Panel de la agencia</strong>
          <span className="muted">Briefs en este navegador</span>
        </div>
        <div className="agency-actions">
          <button className="btn primary sm" onClick={() => fileRef.current?.click()}>
            Importar brief (.json)
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" multiple hidden onChange={(e) => onFiles(e.target.files)} />
          <button className="btn ghost sm" onClick={() => add({ ...emptySubmission(SAMPLE_ANSWERS), submittedAt: new Date().toISOString() })}>
            Cargar ejemplo
          </button>
        </div>
        {err && <p className="field-error small">{err}</p>}
        <ol>
          {lib.map((s) => (
            <li key={s.id}>
              <button className={`step ${current?.id === s.id ? "current" : ""}`} onClick={() => setCurrent(s)}>
                <span>
                  {String(s.answers.empresa_nombre || "Sin nombre")}
                  <br />
                  <small className="muted">{new Date(s.submittedAt || s.updatedAt).toLocaleDateString("es")}</small>
                </span>
              </button>
            </li>
          ))}
        </ol>
        {lib.length === 0 && <p className="muted small">Importa un brief enviado por un cliente o carga el ejemplo para probar.</p>}
      </aside>

      <main className="report">
        {!current || !strategy ? (
          <div className="center-page">
            <h1>Panel de la agencia</h1>
            <p className="lead">Aquí verás el diagnóstico, la estrategia, las herramientas y el alcance para cotizar cada brief.</p>
          </div>
        ) : (
          <>
            <header className="report-head">
              <div>
                <p className="eyebrow">Brief de</p>
                <h1>{String(current.answers.empresa_nombre || "Sin nombre")}</h1>
                <p className="muted">
                  {[current.answers.contacto_nombre, current.answers.contacto_cargo, current.answers.contacto_email, current.answers.contacto_telefono].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="no-print head-actions">
                <button className="btn ghost sm" onClick={() => window.print()}>
                  Imprimir / PDF
                </button>
                <button className="btn ghost sm" onClick={() => downloadJson(current)}>
                  Descargar JSON
                </button>
                <button
                  className="btn-link danger"
                  onClick={() => {
                    removeFromLibrary(current.id);
                    const l = loadLibrary();
                    setLib(l);
                    setCurrent(l[0] ?? null);
                  }}
                >
                  Quitar
                </button>
              </div>
            </header>
            <nav className="tabs no-print" role="tablist">
              {TABS.map(([id, label]) => (
                <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>
                  {label}
                </button>
              ))}
            </nav>
            {tab === "diagnostico" && <DiagnosisView dx={strategy.diagnosis} />}
            {tab === "estrategia" && <StrategyView st={strategy} />}
            {tab === "herramientas" && <ToolsView st={strategy} />}
            {tab === "alcance" && <ScopeView key={current.id} st={strategy} />}
            {tab === "ia" && <AIProposal key={current.id} answers={current.answers} strategy={strategy} />}
            {tab === "respuestas" && <AnswersView answers={current.answers} />}
          </>
        )}
      </main>
    </div>
  );
}
