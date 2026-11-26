import type { AnswerValue, Answers, Field, RepeaterItem } from "../brief/types";

interface Props {
  field: Field;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
  answers: Answers;
  error?: string;
}

export function FieldInput({ field, value, onChange, answers, error }: Props) {
  const id = `f_${field.id}`;
  const label = (
    <label htmlFor={id} className="field-label">
      {field.label}
      {field.required && <span className="req" aria-label="obligatorio"> *</span>}
    </label>
  );
  const help = field.help && <p className="field-help">{field.help}</p>;
  const err = error && <p className="field-error" role="alert">{error}</p>;
  const cls = `field ${field.half ? "half" : ""} ${error ? "has-error" : ""}`;

  switch (field.type) {
    case "textarea":
      return (
        <div className={cls}>
          {label}
          {help}
          <textarea id={id} rows={3} placeholder={field.placeholder} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
          {err}
        </div>
      );
    case "select":
      return (
        <div className={cls}>
          {label}
          {help}
          <select id={id} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)}>
            <option value="">Selecciona…</option>
            {field.options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {err}
        </div>
      );
    case "multiselect": {
      const sel = Array.isArray(value) ? (value as string[]) : [];
      const toggle = (v: string) => onChange(sel.includes(v) ? sel.filter((x) => x !== v) : [...sel, v]);
      return (
        <div className={cls}>
          <span className="field-label" id={id}>
            {field.label}
            {field.required && <span className="req"> *</span>}
          </span>
          {help}
          <div className="chips" role="group" aria-labelledby={id}>
            {field.options?.map((o) => (
              <button type="button" key={o.value} className={`chip ${sel.includes(o.value) ? "on" : ""}`} aria-pressed={sel.includes(o.value)} onClick={() => toggle(o.value)}>
                {o.label}
              </button>
            ))}
          </div>
          {err}
        </div>
      );
    }
    case "yesno":
      return (
        <div className={cls}>
          <span className="field-label" id={id}>
            {field.label}
            {field.required && <span className="req"> *</span>}
          </span>
          {help}
          <div className="segmented" role="radiogroup" aria-labelledby={id}>
            {[
              [true, "Sí"],
              [false, "No"],
            ].map(([v, l]) => (
              <button type="button" key={String(v)} role="radio" aria-checked={value === v} className={value === v ? "on" : ""} onClick={() => onChange(v as boolean)}>
                {l as string}
              </button>
            ))}
          </div>
          {err}
        </div>
      );
    case "scale": {
      const [lo, hi] = field.scaleLabels ?? ["Bajo", "Alto"];
      return (
        <div className={cls}>
          <span className="field-label" id={id}>
            {field.label}
          </span>
          {help}
          <div className="scale" role="radiogroup" aria-labelledby={id}>
            <span className="scale-end">{lo}</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} role="radio" aria-checked={value === n} className={value === n ? "on" : ""} onClick={() => onChange(n)}>
                {n}
              </button>
            ))}
            <span className="scale-end">{hi}</span>
          </div>
          {err}
        </div>
      );
    }
    case "repeater":
      return <Repeater field={field} value={value} onChange={onChange} answers={answers} error={error} />;
    default:
      return (
        <div className={cls}>
          {label}
          {help}
          <input
            id={id}
            type={field.type === "number" ? "number" : field.type}
            inputMode={field.type === "number" ? "numeric" : undefined}
            placeholder={field.placeholder}
            value={value === undefined || value === null ? "" : String(value)}
            onChange={(e) => onChange(field.type === "number" ? (e.target.value === "" ? undefined : Number(e.target.value)) : e.target.value)}
          />
          {err}
        </div>
      );
  }
}

function Repeater({ field, value, onChange, answers, error }: Props) {
  const list = Array.isArray(value) ? (value as RepeaterItem[]) : [];
  const update = (i: number, k: string, v: AnswerValue) => onChange(list.map((it, j) => (j === i ? { ...it, [k]: v } : it)));
  const add = () => onChange([...list, {}]);
  const remove = (i: number) => onChange(list.filter((_, j) => j !== i));
  return (
    <div className={`field repeater ${error ? "has-error" : ""}`}>
      <span className="field-label">{field.label}</span>
      {field.help && <p className="field-help">{field.help}</p>}
      {list.map((item, i) => (
        <fieldset className="card-item" key={i}>
          <legend>
            {field.itemLabel ?? "Elemento"} {i + 1}
            {item.nombre ? `: ${String(item.nombre)}` : ""}
          </legend>
          <div className="grid">
            {field.fields
              ?.filter((f) => !f.showIf || f.showIf(answers))
              .map((f) => (
                <FieldInput key={f.id} field={{ ...f, id: `${field.id}_${i}_${f.id}` }} value={item[f.id]} answers={answers} onChange={(v) => update(i, f.id, v)} />
              ))}
          </div>
          <button type="button" className="btn-link danger" onClick={() => remove(i)}>
            Quitar
          </button>
        </fieldset>
      ))}
      <button type="button" className="btn ghost" onClick={add}>
        + Agregar {(field.itemLabel ?? "elemento").toLowerCase()}
      </button>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
