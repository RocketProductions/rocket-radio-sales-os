"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

interface FormField {
  name: string;
  type: string;
  required: boolean;
  placeholder?: string | null;
}

interface LeadFormProps {
  landingPageId: string;
  formFields: FormField[];
  ctaText: string;
  accentColor: string;
}

export function LeadForm({ landingPageId, formFields, ctaText, accentColor }: LeadFormProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    // Map field names to known keys
    const name  = values["Name"]  ?? values["name"]  ?? values["Full Name"] ?? "";
    const phone = values["Phone"] ?? values["phone"] ?? values["Phone Number"] ?? "";
    const email = values["Email"] ?? values["email"] ?? "";

    // Capture any extra fields
    const knownKeys = new Set(["Name", "name", "Full Name", "Phone", "phone", "Phone Number", "Email", "email"]);
    const extraFields: Record<string, string> = {};
    for (const [k, v] of Object.entries(values)) {
      if (!knownKeys.has(k) && v) extraFields[k] = v;
    }

    try {
      const res = await fetch("/api/lp/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ landingPageId, name, phone, email, extraFields }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Submission failed");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-800">You&apos;re all set!</h3>
        <p className="text-slate-500 text-sm max-w-xs">
          We received your request and will be in touch within minutes.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formFields.map((field) => {
        const inputType =
          field.type === "phone" ? "tel" :
          field.type === "email" ? "email" :
          field.type === "textarea" ? undefined :
          "text";

        const placeholder = field.placeholder ?? field.name;

        return (
          <div key={field.name}>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              {field.name}{field.required && " *"}
            </label>
            {field.type === "textarea" ? (
              <textarea
                required={field.required}
                placeholder={placeholder}
                value={values[field.name] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent resize-none min-h-[80px]"
                style={{ "--tw-ring-color": `${accentColor}40` } as React.CSSProperties}
              />
            ) : (
              <input
                type={inputType}
                required={field.required}
                placeholder={placeholder}
                value={values[field.name] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ "--tw-ring-color": `${accentColor}40` } as React.CSSProperties}
              />
            )}
          </div>
        );
      })}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl py-3.5 text-base font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
        style={{ backgroundColor: accentColor }}
      >
        {submitting ? (
          <><Loader2 className="h-5 w-5 animate-spin" />Sending...</>
        ) : ctaText}
      </button>

      <p className="text-center text-xs text-slate-400">
        No spam. We&apos;ll only use this to follow up on your request.
      </p>
    </form>
  );
}
