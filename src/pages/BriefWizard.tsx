import { useEffect, useMemo, useRef, useState } from "react";
import { FieldInput } from "../components/FieldInput";
import { visibleSections } from "../brief/schema";
import type { AnswerValue, BriefSubmission, Field, Section } from "../brief/types";
import { clearDraft, saveDraft, submitBrief } from "../brief/storage";
import { navigate } from "../router";

const isEmpty = (v: AnswerValue) => v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

function validate(section: Section, answers: BriefSubmission["answers"]): Record<string, string> {
  const errors: Record<string, string> = {};
  const check = (f: Field) => {
    if (f.showIf && !f.showIf(answers)) return;
    const v = answers[f.id];
    if (f.required && isEmpty(v)) errors[f.id] = "Este campo es obligatorio.";
    if (f.id === "consentimiento" && v !== true) errors[f.id] = "Necesitamos tu autorización para continuar.";
    if (f.type === "email" && typeof v === "string" && v && !/^\S+@\S+\.\S+$/.test(v)) errors[f.id] = "Revisa el formato del email.";
    if (f.id === "objetivos" && Array.isArray(v) && v.length > 3) errors[f.id] = "Elige como máximo 3 objetivos para poder priorizar.";
    if (f.type === "repeater" && f.minItems && (!Array.isArray(v) || v.length < f.minItems))
      errors[f.id] = `Agrega al menos ${f.minItems} ${(f.itemLabel ?? "elemento").toLowerCase()}.`;
  };
  section.fields.forEach(check);
  return errors;
}

export function BriefWizard({ initial, onSubmitted }: { initial: BriefSubmission; onSubmitted: (s: BriefSubmission) => void }) {
  const [sub, setSub] = useState(initial);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [savedAt, setSavedAt] = useState<string>("");
  const top = useRef<HTMLDivElement>(null);
  const sections = useMemo(() => visibleSections(sub.answers), [sub.answers]);
  const section = sections[Math.min(step, sections.length - 1)];
  const isLast = step >= sections.length - 1;

  // Autoguardado
  useEffect(() => {
    const t = setTimeout(() => {
      saveDraft(sub);
      setSavedAt(new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }));
    }, 400);
    return () => clearTimeout(t);
  }, [sub]);

  const setValue = (id: string, v: AnswerValue) => {
    setSub((s) => ({ ...s, answers: { ...s.answers, [id]: v } }));
    if (errors[id]) setErrors((e) => ({ ...e, [id]: "" }));
  };

  const go = (i: number) => {
    setStep(i);
    setErrors({});
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const next = async () => {
    const errs = validate(section, sub.answers);
    if (Object.values(errs).some(Boolean)) {
      setErrors(errs);
      document.querySelector(".has-error")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!isLast) return go(step + 1);
    // Validar todo antes de enviar
    for (let i = 0; i < sections.length; i++) {
      const e = validate(sections[i], sub.answers);
      if (Object.values(e).some(Boolean)) {
        go(i);
        setErrors(e);
        return;
      }
    }
    setSending(true);
    const final: BriefSubmission = { ...sub, submittedAt: new Date().toISOString() };
    // Si falla, el brief queda en cola en este navegador y se reenvía automáticamente.
    await submitBrief(final);
    clearDraft();
    setSending(false);
    onSubmitted(final);
    navigate("/gracias");
  };

  const progress = Math.round(((step + 1) / sections.length) * 100);

  return (
    <div className="wizard" ref={top}>
      <aside className="steps" aria-label="Secciones del brief">
        <div className="steps-head">
          <strong>Brief de marketing</strong>
          <span className="muted">{savedAt ? `Guardado ${savedAt}` : "Se guarda automáticamente"}</span>
        </div>
        <ol>
          {sections.map((s, i) => (
            <li key={s.id}>
              <button type="button" className={`step ${i === step ? "current" : ""} ${i < step ? "done" : ""}`} onClick={() => go(i)} aria-current={i === step ? "step" : undefined}>
                <span className="step-icon" aria-hidden>
                  {s.icon}
                </span>
                {s.title}
              </button>
            </li>
          ))}
        </ol>
      </aside>

      <main className="wizard-main">
        <div className="progress" aria-label={`Progreso ${progress}%`}>
          <div style={{ width: `${progress}%` }} />
        </div>
        <p className="eyebrow">
          Paso {step + 1} de {sections.length}
        </p>
        <h1>
          <span aria-hidden>{section.icon}</span> {section.title}
        </h1>
        <p className="lead">{section.intro}</p>

        <div className="grid">
          {section.fields
            .filter((f) => !f.showIf || f.showIf(sub.answers))
            .map((f) => (
              <FieldInput key={f.id} field={f} value={sub.answers[f.id]} answers={sub.answers} onChange={(v) => setValue(f.id, v)} error={errors[f.id]} />
            ))}
        </div>

        <div className="wizard-nav">
          <button type="button" className="btn ghost" disabled={step === 0} onClick={() => go(step - 1)}>
            ← Anterior
          </button>
          <button type="button" className="btn primary" onClick={next} disabled={sending}>
            {sending ? "Enviando…" : isLast ? "Enviar brief ✓" : "Siguiente →"}
          </button>
        </div>
        <p className="muted small center">Puedes cerrar la página y continuar después: tus respuestas quedan guardadas en este dispositivo.</p>
      </main>
    </div>
  );
}
