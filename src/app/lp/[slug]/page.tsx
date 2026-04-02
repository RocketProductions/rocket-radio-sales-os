import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { LeadForm } from "@/components/lp/LeadForm";

export const revalidate = 60;

interface LandingPage {
  id: string;
  slug: string;
  business_name: string | null;
  brand_kit_id: string | null;
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

export default async function LandingPageRoute({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ demo?: string }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
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

  // Fetch tracking fields from brand_kits if linked
  let trackingPhone: string | null = null;
  let metaPixelId: string | null = null;
  let googleAdsId: string | null = null;
  let tiktokPixelId: string | null = null;

  if (page.brand_kit_id) {
    const { data: bk } = await supabase
      .from("brand_kits")
      .select("tracking_phone, meta_pixel_id, google_ads_id, tiktok_pixel_id")
      .eq("id", page.brand_kit_id)
      .single();

    if (bk) {
      const k = bk as { tracking_phone: string | null; meta_pixel_id: string | null; google_ads_id: string | null; tiktok_pixel_id: string | null };
      trackingPhone = k.tracking_phone;
      metaPixelId = k.meta_pixel_id;
      googleAdsId = k.google_ads_id;
      tiktokPixelId = k.tiktok_pixel_id;
    }
  }

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

      {/* Meta Pixel */}
      {metaPixelId && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${metaPixelId}');
              fbq('track', 'PageView');
            `,
          }}
        />
      )}

      {/* Google Ads Remarketing */}
      {googleAdsId && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${googleAdsId}');
            `,
          }}
        />
      )}
      {googleAdsId && (
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${googleAdsId}`} />
      )}

      {/* TikTok Pixel */}
      {tiktokPixelId && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              !function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
              ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
              ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
              for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
              ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
              ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";
              ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;
              ttq._o=ttq._o||{};ttq._o[e]=n||{};
              var o=document.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;
              var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
              ttq.load('${tiktokPixelId}');
              ttq.page();
            }(window, document, 'ttq');
            `,
          }}
        />
      )}

      <div className="min-h-screen bg-white font-sans">

        {/* Demo mode banner — shown when ?demo=true */}
        {resolvedSearchParams?.demo === 'true' && (
          <div className="bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white">
            Demo Mode — this submission will be marked as a test lead
          </div>
        )}

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
            <div className="flex items-center gap-3">
              {/* Click-to-call — visible on all sizes when tracking phone exists */}
              {trackingPhone && (
                <a
                  href={`tel:${trackingPhone.replace(/[^\d+]/g, "")}`}
                  className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                  Call Now
                </a>
              )}
              <a
                href="#lead-form"
                className="lp-btn hidden sm:inline-flex items-center rounded-full px-5 py-2 text-sm font-semibold shadow-lg"
              >
                {ctaText}
              </a>
            </div>
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

                {/* Click-to-call prominent on mobile */}
                {trackingPhone && (
                  <a
                    href={`tel:${trackingPhone.replace(/[^\d+]/g, "")}`}
                    className="lp-btn mt-4 inline-flex items-center gap-2 rounded-full px-6 py-3 text-base font-bold shadow-lg md:hidden"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                    Call {businessName}
                  </a>
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
                  showReferralSource
                  metaPixelId={metaPixelId ?? undefined}
                  isDemo={resolvedSearchParams?.demo === 'true'}
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
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="#lead-form"
              className="lp-btn inline-flex items-center rounded-full px-8 py-3 text-base font-bold shadow-lg"
            >
              {ctaText}
            </a>
            {trackingPhone && (
              <a
                href={`tel:${trackingPhone.replace(/[^\d+]/g, "")}`}
                className="inline-flex items-center gap-2 rounded-full bg-white/20 px-6 py-3 text-base font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/30"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                Or Call Us
              </a>
            )}
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="bg-slate-900 px-6 py-5 text-center space-y-2">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} {businessName}. Campaign powered by{" "}
            <span className="text-slate-400">Federated Media</span>.
          </p>
          <p className="text-xs text-slate-600">
            <a href="/privacy" className="hover:text-slate-400 transition-colors">Privacy Policy</a>
            {" · "}
            <a href="/terms" className="hover:text-slate-400 transition-colors">Terms &amp; Conditions</a>
          </p>
        </footer>
      </div>
    </>
  );
}
