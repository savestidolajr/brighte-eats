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
      <button onClick={onBack}>← Back to list</button>
      {loading && !lead && <p>Loading lead…</p>}
      {error && (
        <div role="alert" style={{ color: "crimson" }}>
          {error.message || "Failed to load lead."}{" "}
          <button onClick={() => refetch()}>Retry</button>
        </div>
      )}
      {data && !lead && <p>Lead not found.</p>}

      {lead && (
        <>
          <dl>
            <dt>Name</dt><dd>{lead.name}</dd>
            <dt>Email</dt><dd>{lead.email}</dd>
            <dt>Mobile</dt><dd>{lead.mobile}</dd>
            <dt>Postcode</dt><dd>{lead.postcode}</dd>
            <dt>Registered</dt>
            <dd>{new Date(lead.createdAt).toLocaleString()}</dd>
          </dl>

          <fieldset>
            <legend>Service interests (edit)</legend>
            {(svcData?.services ?? []).map((s) => (
              <label key={s.code} style={{ display: "block" }}>
                <input
                  type="checkbox"
                  checked={codes.includes(s.code)}
                  onChange={() => toggle(s.code)}
                />
                {s.label}
              </label>
            ))}
            <button
              disabled={saving || !dirty || codes.length === 0}
              onClick={() =>
                save({ variables: { leadId: lead.id, services: codes } }).then(
                  () => setSelected(null)
                )
              }
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            {codes.length === 0 && (
              <small style={{ color: "crimson", display: "block" }}>
                Select at least one service.
              </small>
            )}
            {saveError && (
              <p role="alert" style={{ color: "crimson" }}>
                {saveError.graphQLErrors[0]?.message ?? saveError.message}
              </p>
            )}
          </fieldset>

          <h3>Change history</h3>
          {lead.history && lead.history.length > 0 ? (
            <ul>
              {lead.history.map((h) => (
                <li key={h.id}>
                  <strong>{h.action}</strong> {labelFor(h.serviceCode)} —{" "}
                  {h.source} — {new Date(h.changedAt).toLocaleString()}
                </li>
              ))}
            </ul>
          ) : (
            <p>No changes recorded.</p>
          )}
        </>
      )}
    </section>
  );
}
