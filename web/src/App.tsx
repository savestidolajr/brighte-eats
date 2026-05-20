import { useState } from "react";
import { RegistrationForm } from "./components/RegistrationForm";
import { LeadsDashboard } from "./components/LeadsDashboard";

export function App() {
  const [tab, setTab] = useState<"register" | "dashboard">("register");
  return (
    <main style={{ maxWidth: 880, margin: "2rem auto", fontFamily: "system-ui" }}>
      <h1>Brighte Eats</h1>
      <nav style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <button onClick={() => setTab("register")} disabled={tab === "register"}>
          Register interest
        </button>
        <button onClick={() => setTab("dashboard")} disabled={tab === "dashboard"}>
          Leads dashboard
        </button>
      </nav>
      {tab === "register" ? <RegistrationForm /> : <LeadsDashboard />}
    </main>
  );
}
