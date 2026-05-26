import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import {
  LEAD,
  SERVICES,
  SET_LEAD_SERVICES,
  type Lead,
  type Service,
} from "../graphql";

function sameSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const sb = new Set(b);
  return a.every((x) => sb.has(x));
}

export function LeadDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { data, loading, error, refetch } = useQuery<{ lead: Lead | null }>(
    LEAD,
    { variables: { id }, fetchPolicy: "cache-and-network" }
  );
  const { data: svcData } = useQuery<{ services: Service[] }>(SERVICES);

  // Selected interest codes, seeded from the lead once loaded.
  const [selected, setSelected] = useState<string[] | null>(null);
  const lead = data?.lead ?? null;
  const current = lead ? lead.services.map((s) => s.code) : [];
  const codes = selected ?? current;

  const [save, { loading: saving, error: saveError }] = useMutation(
    SET_LEAD_SERVICES,
    { onCompleted: () => refetch() }
  );

  const toggle = (code: string) =>
    setSelected((prev) => {
      const base = prev ?? current;
      return base.includes(code)
        ? base.filter((c) => c !== code)
        : [...base, code];
    });

  const labelFor = (code: string) =>
    svcData?.services.find((s) => s.code === code)?.label ?? code;

  const dirty = !sameSet(codes, current);

  return (
    <section>
      <button
        onClick={onBack}
        className="mb-4 text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
      >
        ← Back to list
      </button>

      {loading && !lead && <p className="text-slate-500 text-sm">Loading lead…</p>}

      {error && (
        <div role="alert" className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md px-3 py-2 flex items-center gap-2 mb-4">
          {error.message || "Failed to load lead."}{" "}
          <button
            onClick={() => refetch()}
            className="underline hover:no-underline text-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {data && !lead && <p className="text-slate-500 text-sm">Lead not found.</p>}

      {lead && (
        <>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-5">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="font-medium text-slate-600">Name</dt>
              <dd className="text-slate-900">{lead.name}</dd>
              <dt className="font-medium text-slate-600">Email</dt>
              <dd className="text-slate-900">{lead.email}</dd>
              <dt className="font-medium text-slate-600">Mobile</dt>
              <dd className="text-slate-900">{lead.mobile}</dd>
              <dt className="font-medium text-slate-600">Postcode</dt>
              <dd className="text-slate-900">{lead.postcode}</dd>
              <dt className="font-medium text-slate-600">Suburb</dt>
              <dd className="text-slate-900">{lead.suburb ?? "—"}</dd>
              <dt className="font-medium text-slate-600">Registered</dt>
              <dd className="text-slate-900">{new Date(lead.createdAt).toLocaleString()}</dd>
            </dl>
          </div>

          <fieldset className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-5">
            <legend className="text-sm font-semibold text-slate-700 px-1">Service interests (edit)</legend>
            <div className="space-y-2 mt-2">
              {(svcData?.services ?? []).map((s) => (
                <label key={s.code} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={codes.includes(s.code)}
                    onChange={() => toggle(s.code)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  {s.label}
                </label>
              ))}
            </div>
            <button
              disabled={saving || !dirty || codes.length === 0}
              onClick={() =>
                save({ variables: { leadId: lead.id, services: codes } }).then(
                  () => setSelected(null)
                )
              }
              className="mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white font-medium py-1.5 px-4 rounded-md transition-colors text-sm"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            {codes.length === 0 && (
              <small className="text-red-600 text-xs mt-2 block">
                Select at least one service.
              </small>
            )}
            {saveError && (
              <p role="alert" className="text-red-600 text-sm mt-2 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {saveError.graphQLErrors[0]?.message ?? saveError.message}
              </p>
            )}
          </fieldset>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Change history</h3>
            {lead.history && lead.history.length > 0 ? (
              <ul className="space-y-2">
                {lead.history.map((h) => (
                  <li key={h.id} className="text-sm text-slate-600 border-l-2 border-indigo-200 pl-3">
                    <strong className="text-slate-800">{h.action}</strong>{" "}
                    {labelFor(h.serviceCode)} —{" "}
                    {h.source} — {new Date(h.changedAt).toLocaleString()}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No changes recorded.</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
