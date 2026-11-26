import { useState } from "react";
import { useRoute, navigate } from "./router";
import { BriefWizard } from "./pages/BriefWizard";
import { Agency, Landing, ThankYou } from "./pages/Pages";
import { clearDraft, emptySubmission, loadDraft } from "./brief/storage";
import type { BriefSubmission } from "./brief/types";

export default function App() {
  const route = useRoute();
  const [draft, setDraft] = useState<BriefSubmission | null>(loadDraft);
  const [submitted, setSubmitted] = useState<{ sub: BriefSubmission; delivered: boolean } | null>(null);

  const start = () => {
    clearDraft();
    setDraft(emptySubmission());
    navigate("/brief");
  };

  let page;
  if (route.startsWith("/agencia")) page = <Agency />;
  else if (route.startsWith("/brief"))
    page = (
      <BriefWizard
        key={draft?.id ?? "new"}
        initial={draft ?? emptySubmission()}
        onSubmitted={(sub, delivered) => {
          setSubmitted({ sub, delivered });
          setDraft(null);
        }}
      />
    );
  else if (route.startsWith("/gracias")) page = <ThankYou sub={submitted?.sub ?? null} delivered={submitted?.delivered ?? false} />;
  else page = <Landing hasDraft={!!draft && Object.keys(draft.answers).length > 0} onStart={start} onResume={() => navigate("/brief")} />;

  return (
    <div className="app">
      <header className="topbar no-print">
        <a href="#/" className="brand" aria-label="La Publiciudad, inicio">
          <span className="brand-mark">LP</span>
          <span>
            La <strong>Publiciudad</strong>
          </span>
        </a>
        <nav>
          {/* El panel de la agencia no se enlaza desde las páginas del cliente: se entra directo por /#/agencia */}
          {route.startsWith("/agencia") && <a href="#/">Formulario del cliente</a>}
        </nav>
      </header>
      {page}
      <footer className="footer no-print">© {new Date().getFullYear()} La Publiciudad · Agencia de marketing y publicidad</footer>
    </div>
  );
}
