import { useState } from "react";
import { useQuery } from "@apollo/client";
import { LEADS, SERVICES, type LeadConnection, type Service } from "../graphql";
import { LeadDetail } from "./LeadDetail";

const PAGE = 10;

export function LeadsDashboard() {
  const [service, setService] = useState<string>("");
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const {
    data: svcData,
    loading: svcLoading,
    error: svcError,
  } = useQuery<{ services: Service[] }>(SERVICES);
  const { data, loading, error, refetch } = useQuery<{ leads: LeadConnection }>(
    LEADS,
    {
      variables: {
        limit: PAGE,
        offset,
        service: service || null,
        sortBy: "CREATED_AT",
        sortDir: "DESC",
      },
      fetchPolicy: "cache-and-network",
    }
  );

  if (selectedId) {
    return <LeadDetail id={selectedId} onBack={() => setSelectedId(null)} />;
  }

  const conn = data?.leads;

  return (
    <section>
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <label>
          Filter:{" "}
          <select
            value={service}
            onChange={(e) => {
              setService(e.target.value);
              setOffset(0);
            }}
          >
            <option value="">All services</option>
            {(svcData?.services ?? []).map((s) => (
              <option key={s.code} value={s.code}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        {svcLoading && <span>loading…</span>}
        {svcError && (
          <span style={{ color: "crimson" }}>services unavailable</span>
        )}
      </div>

      {loading && !conn && <p>Loading leads…</p>}

      {error && (
        <div role="alert" style={{ color: "crimson" }}>
          {error.message || "Failed to load leads."}{" "}
          <button onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {conn && conn.items.length === 0 && <p>No leads yet.</p>}

      {conn && conn.items.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">Name</th>
              <th align="left">Email</th>
              <th align="left">Services</th>
            </tr>
          </thead>
          <tbody>
            {conn.items.map((l) => (
              <tr
                key={l.id}
                onClick={() => setSelectedId(l.id)}
                style={{ cursor: "pointer", borderTop: "1px solid #ddd" }}
              >
                <td>{l.name}</td>
                <td>{l.email}</td>
                <td>{l.services.map((s) => s.label).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {conn && (
        <div style={{ display: "flex", gap: 12, marginTop: 16, alignItems: "center" }}>
          <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>
            Prev
          </button>
          <span>
            {conn.totalCount === 0 ? 0 : offset + 1}–
            {Math.min(offset + PAGE, conn.totalCount)} of {conn.totalCount}
          </span>
          <button
            disabled={offset + PAGE >= conn.totalCount}
            onClick={() => setOffset(offset + PAGE)}
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}
