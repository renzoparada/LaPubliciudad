export type FieldType =
  | "text"
  | "textarea"
  | "email"
  | "tel"
  | "url"
  | "number"
  | "date"
  | "select"
  | "multiselect"
  | "yesno"
  | "scale"
  | "repeater";

export interface Option {
  value: string;
  label: string;
}

export interface Field {
  id: string;
  label: string;
  type: FieldType;
  help?: string;
  placeholder?: string;
  required?: boolean;
  options?: Option[];
  /** Para "scale": etiquetas de los extremos. */
  scaleLabels?: [string, string];
  /** Para "repeater": campos de cada ficha. */
  fields?: Field[];
  itemLabel?: string;
  minItems?: number;
  /** Muestra el campo solo si se cumple la condición. */
  showIf?: (answers: Answers) => boolean;
  /** Ocupa media fila en pantallas anchas. */
  half?: boolean;
}

export interface Section {
  id: string;
  title: string;
  icon: string;
  intro: string;
  fields: Field[];
  showIf?: (answers: Answers) => boolean;
}

export type AnswerValue = string | string[] | number | boolean | RepeaterItem[] | undefined;
export type RepeaterItem = Record<string, AnswerValue>;
export type Answers = Record<string, AnswerValue>;

export interface BriefSubmission {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  answers: Answers;
}
