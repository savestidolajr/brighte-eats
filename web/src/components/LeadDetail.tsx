import { useQuery } from "@apollo/client";
import { LEAD, type Lead } from "../graphql";

export function LeadDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { data, loading, error, refetch } = useQuery<{ lead: Lead | null }>(LEAD, {
    variables: { id },
  });

  return (
    <section>
      <button onClick={onBack}>← Back to list</button>
      {loading && <p>Loading lead…</p>}
      {error && (
        <div role="alert" style={{ color: "crimson" }}>
          Failed to load lead. <button onClick={() => refetch()}>Retry</button>
        </div>
      )}
      {data && !data.lead && <p>Lead not found.</p>}
      {data?.lead && (
        <dl>
          <dt>Name</dt><dd>{data.lead.name}</dd>
          <dt>Email</dt><dd>{data.lead.email}</dd>
          <dt>Mobile</dt><dd>{data.lead.mobile}</dd>
          <dt>Postcode</dt><dd>{data.lead.postcode}</dd>
          <dt>Services</dt>
          <dd>{data.lead.services.map((s) => s.label).join(", ") || "—"}</dd>
          <dt>Registered</dt>
          <dd>{new Date(data.lead.createdAt).toLocaleString()}</dd>
        </dl>
      )}
    </section>
  );
}
