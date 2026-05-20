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
      <section>
        <h2>Admin access</h2>
        <p>Enter the admin token to view leads.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const t = input.trim();
            if (!t) return;
            localStorage.setItem(KEY, t);
            setToken(t);
          }}
        >
          <input
            type="password"
            aria-label="admin token"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Admin token"
          />
          <button type="submit">Unlock dashboard</button>
        </form>
      </section>
    );
  }

  return (
    <div>
      <button
        style={{ float: "right" }}
        onClick={async () => {
          localStorage.removeItem(KEY);
          setToken(null);
          await client.clearStore(); // drop cached PII on logout
        }}
      >
        Log out
      </button>
      {children}
    </div>
  );
}
