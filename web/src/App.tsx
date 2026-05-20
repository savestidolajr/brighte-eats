import { Routes, Route, Navigate, NavLink } from "react-router-dom";
import { RegistrationForm } from "./components/RegistrationForm";
import { LeadsDashboard } from "./components/LeadsDashboard";
import { AdminGate } from "./components/AdminGate";
import { ServiceManager } from "./components/ServiceManager";

export function App() {
  return (
    <main className="max-w-3xl mx-auto p-6 font-sans">
      <h1 className="text-2xl font-bold mb-6 text-slate-800">Brighte Eats</h1>
      <nav className="flex gap-4 mb-6 border-b border-slate-200 pb-4">
        <NavLink
          to="/register"
          className={({ isActive }) =>
            isActive
              ? "font-semibold text-indigo-600 underline underline-offset-4"
              : "text-slate-600 hover:text-indigo-600 transition-colors"
          }
        >
          Register interest
        </NavLink>
        <NavLink
          to="/admin"
          end
          className={({ isActive }) =>
            isActive
              ? "font-semibold text-indigo-600 underline underline-offset-4"
              : "text-slate-600 hover:text-indigo-600 transition-colors"
          }
        >
          Leads dashboard
        </NavLink>
        <NavLink
          to="/admin/services"
          className={({ isActive }) =>
            isActive
              ? "font-semibold text-indigo-600 underline underline-offset-4"
              : "text-slate-600 hover:text-indigo-600 transition-colors"
          }
        >
          Manage services
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
        <Route
          path="/admin/services"
          element={
            <AdminGate>
              <ServiceManager />
            </AdminGate>
          }
        />
        <Route path="*" element={<Navigate to="/register" replace />} />
      </Routes>
    </main>
  );
}
