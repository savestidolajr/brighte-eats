import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { REGISTER, SERVICES, type Service } from "../graphql";
import { registerFormSchema } from "../validation";

const EMPTY = { name: "", email: "", mobile: "", postcode: "" };

export function RegistrationForm() {
  const { data: svcData } = useQuery<{ services: Service[] }>(SERVICES);
  const [fields, setFields] = useState(EMPTY);
  const [services, setServices] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const [register, { loading, error }] = useMutation(REGISTER, {
    onCompleted: () => {
      setSuccess(true);
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
    setSuccess(false);
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
    <form onSubmit={onSubmit} noValidate>
      {(["name", "email", "mobile", "postcode"] as const).map((k) => (
        <div key={k} style={{ marginBottom: 12 }}>
          <label htmlFor={k} style={{ display: "block", textTransform: "capitalize" }}>
            {k}
          </label>
          <input id={k} value={fields[k]} onChange={set(k)} />
          {errors[k] && (
            <small style={{ color: "crimson" }}>{errors[k]}</small>
          )}
        </div>
      ))}

      <fieldset style={{ marginBottom: 12 }}>
        <legend>Services</legend>
        {(svcData?.services ?? []).map((s) => (
          <label key={s.code} style={{ display: "block" }}>
            <input
              type="checkbox"
              checked={services.includes(s.code)}
              onChange={() => toggleService(s.code)}
            />
            {s.label}
          </label>
        ))}
        {errors.services && (
          <small style={{ color: "crimson" }}>{errors.services}</small>
        )}
      </fieldset>

      <button type="submit" disabled={loading}>
        {loading ? "Submitting…" : "Submit"}
      </button>

      {error && (
        <p role="alert" style={{ color: "crimson" }}>
          {error.graphQLErrors[0]?.message ?? error.message}
        </p>
      )}
      {success && (
        <p role="status" style={{ color: "green" }}>
          Thanks — your interest has been registered.
        </p>
      )}
    </form>
  );
}
