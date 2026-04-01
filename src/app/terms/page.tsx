import { Metadata } from "next";

export const metadata: Metadata = { title: "Terms & Conditions — Rocket Radio" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold text-rocket-dark">Terms &amp; Conditions</h1>
      <p className="mt-2 text-sm text-rocket-muted">Last updated: April 1, 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700">
        <section>
          <h2 className="text-lg font-semibold text-rocket-dark">1. Service Description</h2>
          <p>
            Rocket Radio Sales OS, operated by Federated Media, provides lead capture, automated
            follow-up, and campaign management services for local businesses. Our landing pages
            collect consumer inquiries and facilitate communication between consumers and businesses.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-rocket-dark">2. SMS Terms</h2>
          <p>By submitting a form on our landing pages or texting a keyword to our number, you agree to the following:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>You consent to receive automated text messages related to your inquiry</li>
            <li>Message and data rates may apply</li>
            <li>Message frequency varies based on your inquiry and follow-up schedule</li>
            <li>You may opt out at any time by replying <strong>STOP</strong></li>
            <li>Reply <strong>HELP</strong> for assistance</li>
            <li>Carriers are not liable for delayed or undelivered messages</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-rocket-dark">3. Opt-In</h2>
          <p>
            Consent to receive text messages is obtained when you: (a) submit a form on one of our
            campaign landing pages, which includes SMS consent language, or (b) text an opt-in
            keyword (e.g. &ldquo;ROCKET&rdquo;) to our designated phone number. Consent is not a
            condition of purchase.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-rocket-dark">4. Opt-Out</h2>
          <p>
            To stop receiving messages, reply <strong>STOP</strong> to any message. You will receive
            a confirmation and no further messages will be sent. You may also contact us at{" "}
            <a href="mailto:support@rocketradiosales.com" className="text-rocket-blue hover:underline">
              support@rocketradiosales.com
            </a>{" "}
            to opt out.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-rocket-dark">5. Privacy</h2>
          <p>
            Your information is handled in accordance with our{" "}
            <a href="/privacy" className="text-rocket-blue hover:underline">Privacy Policy</a>.
            We do not sell personal information to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-rocket-dark">6. Disclaimer</h2>
          <p>
            The businesses featured on our landing pages are independent entities. Federated Media
            facilitates the lead capture and communication but is not responsible for the products,
            services, or conduct of the advertised businesses.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-rocket-dark">7. Contact</h2>
          <p>
            Federated Media<br />
            Fort Wayne, Indiana<br />
            <a href="mailto:support@rocketradiosales.com" className="text-rocket-blue hover:underline">
              support@rocketradiosales.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
