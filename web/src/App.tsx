import { Routes, Route, Navigate, NavLink } from "react-router-dom";
import { RegistrationForm } from "./components/RegistrationForm";
import { LeadsDashboard } from "./components/LeadsDashboard";
import { AdminGate } from "./components/AdminGate";

const linkStyle = ({ isActive }: { isActive: boolean }) => ({
  fontWeight: isActive ? 700 : 400,
  textDecoration: "none",
});

export function App() {
  return (
    <main style={{ maxWidth: 880, margin: "2rem auto", fontFamily: "system-ui" }}>
      <h1>Brighte Eats</h1>
      <nav style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <NavLink to="/register" style={linkStyle}>
          Register interest
        </NavLink>
        <NavLink to="/admin" style={linkStyle}>
          Leads dashboard
        </NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<Navigate to="/register" replace />} />
        <Route path="/register" element={<RegistrationForm />} />
        <Route
          path="/admin"
          element={
            <AdminGate>
              <LeadsDashboard />
            </AdminGate>
          }
        />
        <Route path="*" element={<Navigate to="/register" replace />} />
      </Routes>
    </main>
  );
}
