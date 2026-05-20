import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import {
  ALL_SERVICES,
  CREATE_SERVICE,
  UPDATE_SERVICE,
  SET_SERVICE_ACTIVE,
  type Service,
} from "../graphql";

export function ServiceManager() {
  const { data, loading, error, refetch } = useQuery<{ allServices: Service[] }>(
    ALL_SERVICES,
    { fetchPolicy: "cache-and-network" }
  );

  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [labels, setLabels] = useState<Record<string, string>>({});

  const [createService, { loading: creating, error: createError }] = useMutation(
    CREATE_SERVICE,
    {
      onCompleted: () => {
        setCode("");
        setLabel("");
        refetch();
      },
    }
  );
  const [updateService, { error: updateError }] = useMutation(UPDATE_SERVICE, {
    onCompleted: () => refetch(),
  });
  const [setServiceActive] = useMutation(SET_SERVICE_ACTIVE, {
    onCompleted: () => refetch(),
  });

  const services = data?.allServices ?? [];
  const mutationError = createError ?? updateError;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-800">Manage services</h2>

      {/* Add new */}
      <form
        className="mb-6 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!code.trim() || !label.trim()) return;
          createService({ variables: { code: code.trim(), label: label.trim() } });
        }}
      >
        <label className="flex flex-col text-sm text-slate-600">
          Code
          <input
            className="mt-1 rounded border border-slate-300 px-2 py-1"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="installation"
          />
        </label>
        <label className="flex flex-col text-sm text-slate-600">
          Label
          <input
            className="mt-1 rounded border border-slate-300 px-2 py-1"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Installation"
          />
        </label>
        <button
          type="submit"
          disabled={creating || !code.trim() || !label.trim()}
          className="rounded bg-indigo-600 px-3 py-1.5 text-white disabled:opacity-50"
        >
          {creating ? "Adding…" : "Add service"}
        </button>
      </form>

      {mutationError && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {mutationError.graphQLErrors[0]?.message ?? mutationError.message}
        </p>
      )}

      {loading && !data && <p className="text-slate-500">Loading services…</p>}
      {error && (
        <div role="alert" className="text-red-600">
          Failed to load services.{" "}
          <button className="underline" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      )}

      {services.length > 0 && (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-2">Code</th>
              <th className="py-2">Label</th>
              <th className="py-2">Status</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.code} className="border-t border-slate-100">
                <td className="py-2 font-mono text-slate-700">{s.code}</td>
                <td className="py-2">
                  <input
                    className="rounded border border-slate-300 px-2 py-1"
                    aria-label={`label for ${s.code}`}
                    value={labels[s.code] ?? s.label}
                    onChange={(e) =>
                      setLabels((m) => ({ ...m, [s.code]: e.target.value }))
                    }
                  />
                </td>
                <td className="py-2">
                  <span
                    className={
                      s.active ? "text-green-600" : "text-slate-400"
                    }
                  >
                    {s.active ? "active" : "retired"}
                  </span>
                </td>
                <td className="py-2">
                  <div className="flex gap-2">
                    <button
                      className="rounded border border-slate-300 px-2 py-1 disabled:opacity-50"
                      disabled={(labels[s.code] ?? s.label) === s.label}
                      onClick={() =>
                        updateService({
                          variables: {
                            code: s.code,
                            label: labels[s.code] ?? s.label,
                          },
                        })
                      }
                    >
                      Save
                    </button>
                    <button
                      className="rounded border border-slate-300 px-2 py-1"
                      onClick={() =>
                        setServiceActive({
                          variables: { code: s.code, active: !s.active },
                        })
                      }
                    >
                      {s.active ? "Retire" : "Restore"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
