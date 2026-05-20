import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { REGISTER, SERVICES, type Service } from "../graphql";
import { registerFormSchema } from "../validation";

const EMPTY = { name: "", email: "", mobile: "", postcode: "" };

export function RegistrationForm() {
  const {
    data: svcData,
    loading: svcLoading,
    error: svcError,
  } = useQuery<{ services: Service[] }>(SERVICES);
  const [fields, setFields] = useState(EMPTY);
  const [services, setServices] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [register, { loading, error, reset, data }] = useMutation(REGISTER, {
    // Optimistic: Apollo sets `data` to this immediately on submit, so the
    // success banner shows at once. If the server errors, `data` is rolled
    // back and `error` is set — the form below stays filled for a retry.
    optimisticResponse: (vars: { input: { name: string; email: string; services: string[] } }) => ({
      register: {
        __typename: "Lead" as const,
        id: "optimistic",
        name: vars.input.name,
        email: vars.input.email,
        services: vars.input.services.map((code) => ({
          __typename: "Service" as const,
          code,
          label: code,
        })),
      },
    }),
    onCompleted: () => {
      // Real success — now safe to reset the form.
      setFields(EMPTY);
      setServices([]);
      setErrors({});
    },
  });

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  const toggleService = (code: string) =>
    setServices((s) => (s.includes(code) ? s.filter((c) => c !== code) : [...s, code]));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    reset(); // clear any error from a previous submit so stale banners don't linger
    const parsed = registerFormSchema.safeParse({ ...fields, services });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[String(issue.path[0])] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    try {
      await register({ variables: { input: parsed.data } });
    } catch {
      /* surfaced via `error` from useMutation */
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-5">Register your interest</h2>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {(["name", "email", "mobile", "postcode"] as const).map((k) => (
          <div key={k}>
            <label
              htmlFor={k}
              className="block text-sm font-medium text-slate-700 capitalize mb-1"
            >
              {k}
            </label>
            <input
              id={k}
              value={fields[k]}
              onChange={set(k)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {errors[k] && (
              <small className="text-red-600 text-xs mt-1 block">{errors[k]}</small>
            )}
          </div>
        ))}

        <fieldset className="border border-slate-200 rounded-md p-4">
          <legend className="text-sm font-medium text-slate-700 px-1">Services</legend>
          {svcLoading && <small className="text-slate-500">Loading services…</small>}
          {svcError && (
            <small className="text-red-600 text-xs">
              Could not load services. Refresh to try again.
            </small>
          )}
          <div className="space-y-2 mt-2">
            {(svcData?.services ?? []).map((s) => (
              <label key={s.code} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={services.includes(s.code)}
                  onChange={() => toggleService(s.code)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                {s.label}
              </label>
            ))}
          </div>
          {errors.services && (
            <small className="text-red-600 text-xs mt-1 block">{errors.services}</small>
          )}
        </fieldset>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors text-sm"
        >
          {loading ? "Submitting…" : "Submit"}
        </button>

        {error && (
          <p role="alert" className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error.graphQLErrors[0]?.message ?? error.message}
          </p>
        )}
        {data?.register && !error && (
          <p role="status" className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-md px-3 py-2">
            Thanks — your interest has been registered.
          </p>
        )}
      </form>
    </div>
  );
}
