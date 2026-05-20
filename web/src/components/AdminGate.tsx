import { useState } from "react";
import { useApolloClient } from "@apollo/client";

const KEY = "adminToken";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const client = useApolloClient();
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(KEY)
  );
  const [input, setInput] = useState("");

  if (!token) {
    return (
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-sm mx-auto">
        <h2 className="text-lg font-semibold text-slate-800 mb-2">Admin access</h2>
        <p className="text-sm text-slate-600 mb-4">Enter the admin token to view leads.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const t = input.trim();
            if (!t) return;
            localStorage.setItem(KEY, t);
            setToken(t);
          }}
          className="space-y-3"
        >
          <input
            type="password"
            aria-label="admin token"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Admin token"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors text-sm"
          >
            Unlock dashboard
          </button>
        </form>
      </section>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          className="text-sm text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-300 rounded-md px-3 py-1.5 transition-colors"
          onClick={async () => {
            localStorage.removeItem(KEY);
            setToken(null);
            await client.clearStore(); // drop cached PII on logout
          }}
        >
          Log out
        </button>
      </div>
      {children}
    </div>
  );
}
