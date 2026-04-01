import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { LeadForm } from "@/components/lp/LeadForm";

export const revalidate = 60; // ISR — rebuild every 60s after publish

interface LandingPage {
  id: string;
  slug: string;
  business_name: string | null;
  content: {
    headline?: string;
    subheadline?: string;
    bodyCopy?: string[];
    trustElements?: string[];
    ctaText?: string;
    formFields?: Array<{ name: string; type: string; required: boolean; placeholder?: string | null }>;
  };
  brand_colors: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    logoUrl?: string;
    tagline?: string;
  };
  is_live: boolean;
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("landing_pages")
    .select("*")
    .eq("slug", slug)
    .eq("is_live", true)
    .single();

  if (error || !data) notFound();

  const page = data as LandingPage;
  const { content, brand_colors: colors } = page;

  const primary   = colors.primaryColor   ?? "#1e40af";
  const accent    = colors.accentColor    ?? "#f97316";
  const secondary = colors.secondaryColor ?? "#0f172a";

  const headline      = content.headline      ?? "Get Your Free Estimate Today";
  const subheadline   = content.subheadline   ?? "";
  const bodyCopy      = content.bodyCopy      ?? [];
  const trustElements = content.trustElements ?? [];
  const ctaText       = content.ctaText       ?? "Get My Free Estimate";
  const formFields    = content.formFields    ?? [
    { name: "Name",  type: "text",  required: true,  placeholder: "Your name" },
    { name: "Phone", type: "phone", required: true,  placeholder: "Your phone number" },
  ];
  const businessName = page.business_name ?? "Local Business";

  return (
    <>
      {/* Inject brand CSS variables */}
      <style>{`
        :root {
          --lp-primary:   ${primary};
          --lp-secondary: ${secondary};
          --lp-accent:    ${accent};
        }
        .lp-btn {
          background-color: var(--lp-accent);
          color: #fff;
          transition: filter 0.15s;
        }
        .lp-btn:hover { filter: brightness(1.1); }
        .lp-header { background-color: var(--lp-primary); }
        .lp-accent-text { color: var(--lp-accent); }
        .lp-check { color: var(--lp-accent); }
      `}</style>

      <div className="min-h-screen bg-white font-sans">

        {/* ── Sticky nav ── */}
        <header className="lp-header sticky top-0 z-50 px-6 py-4 shadow-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <div className="flex items-center gap-3">
              {colors.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={colors.logoUrl}
                  alt={businessName}
                  className="h-9 w-auto object-contain"
                />
              ) : (
                <span className="text-xl font-bold text-white">{businessName}</span>
              )}
            </div>
            <a
              href="#lead-form"
              className="lp-btn hidden sm:inline-flex items-center rounded-full px-5 py-2 text-sm font-semibold shadow-lg"
            >
              {ctaText}
            </a>
          </div>
        </header>

        {/* ── Hero ── */}
        <section className="bg-slate-50 border-b border-slate-100">
          <div className="mx-auto max-w-5xl px-6 py-14 md:py-20">
            <div className="grid gap-12 md:grid-cols-2 md:items-center">

              {/* Copy */}
              <div className="space-y-5">
                <h1 className="text-4xl font-extrabold leading-tight text-slate-900 md:text-5xl">
                  {headline}
                </h1>
                {subheadline && (
                  <p className="text-xl text-slate-600 leading-relaxed">{subheadline}</p>
                )}
                {trustElements.length > 0 && (
                  <ul className="space-y-2 pt-2">
                    {trustElements.slice(0, 3).map((t, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-slate-700">
                        <svg className="lp-check mt-0.5 h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-base font-medium">{t}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Lead form */}
              <div id="lead-form" className="rounded-2xl bg-white shadow-xl border border-slate-100 p-8">
                <h2 className="text-xl font-bold text-slate-800 mb-1">{ctaText}</h2>
                <p className="text-sm text-slate-500 mb-6">Fill out the form and we&apos;ll be in touch within minutes.</p>
                <LeadForm
                  landingPageId={page.id}
                  formFields={formFields}
                  ctaText={ctaText}
                  accentColor={accent}
                  businessName={businessName}
                  shareText={`I just connected with ${businessName}! ${headline} — check out their offer:`}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Body copy ── */}
        {bodyCopy.length > 0 && (
          <section className="mx-auto max-w-3xl px-6 py-14 space-y-5">
            {bodyCopy.map((p, i) => (
              <p key={i} className="text-lg text-slate-700 leading-relaxed">{p}</p>
            ))}
          </section>
        )}

        {/* ── Trust elements (full list) ── */}
        {trustElements.length > 3 && (
          <section className="bg-slate-50 border-t border-slate-100">
            <div className="mx-auto max-w-3xl px-6 py-12">
              <h3 className="text-xl font-bold text-slate-800 mb-6">Why choose {businessName}?</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {trustElements.map((t, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl bg-white border border-slate-100 p-4 shadow-sm">
                    <svg className="lp-check mt-0.5 h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-slate-700">{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Bottom CTA ── */}
        <section className="lp-header px-6 py-12 text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Ready to get started?</h2>
          <p className="text-white/80 mb-6">
            Don&apos;t wait — {businessName} is ready to help you today.
          </p>
          <a
            href="#lead-form"
            className="lp-btn inline-flex items-center rounded-full px-8 py-3 text-base font-bold shadow-lg"
          >
            {ctaText}
          </a>
        </section>

        {/* ── Footer ── */}
        <footer className="bg-slate-900 px-6 py-5 text-center">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} {businessName}. Campaign powered by{" "}
            <span className="text-slate-400">Federated Media</span>.
          </p>
        </footer>
      </div>
    </>
  );
}
