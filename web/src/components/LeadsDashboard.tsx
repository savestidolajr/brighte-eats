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
      <div className="flex items-center gap-3 mb-5">
        <label className="flex items-center gap-2 text-sm text-slate-700 font-medium">
          Filter:
          <select
            value={service}
            onChange={(e) => {
              setService(e.target.value);
              setOffset(0);
            }}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All services</option>
            {(svcData?.services ?? []).map((s) => (
              <option key={s.code} value={s.code}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        {svcLoading && <span className="text-xs text-slate-400">loading…</span>}
        {svcError && (
          <span className="text-xs text-red-600">services unavailable</span>
        )}
      </div>

      {loading && !conn && <p className="text-slate-500 text-sm">Loading leads…</p>}

      {error && (
        <div role="alert" className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md px-3 py-2 flex items-center gap-2">
          {error.message || "Failed to load leads."}{" "}
          <button
            onClick={() => refetch()}
            className="underline hover:no-underline text-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {conn && conn.items.length === 0 && (
        <p className="text-slate-500 text-sm">No leads yet.</p>
      )}

      {conn && conn.items.length > 0 && (
        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Services</th>
              </tr>
            </thead>
            <tbody>
              {conn.items.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => setSelectedId(l.id)}
                  className="cursor-pointer border-t border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3 text-slate-800">{l.name}</td>
                  <td className="px-4 py-3 text-slate-600">{l.email}</td>
                  <td className="px-4 py-3 text-slate-600">{l.services.map((s) => s.label).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {conn && (
        <div className="flex items-center gap-3 mt-4">
          <button
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE))}
            className="text-sm px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Prev
          </button>
          <span className="text-sm text-slate-600">
            {conn.totalCount === 0 ? 0 : offset + 1}–
            {Math.min(offset + PAGE, conn.totalCount)} of {conn.totalCount}
          </span>
          <button
            disabled={offset + PAGE >= conn.totalCount}
            onClick={() => setOffset(offset + PAGE)}
            className="text-sm px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}
