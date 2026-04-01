import { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy — Rocket Radio" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold text-rocket-dark">Privacy Policy</h1>
      <p className="mt-2 text-sm text-rocket-muted">Last updated: April 1, 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700">
        <section>
          <h2 className="text-lg font-semibold text-rocket-dark">1. Who We Are</h2>
          <p>
            Rocket Radio Sales OS is operated by Federated Media, a radio and digital media company
            based in Indiana. We provide campaign management, lead capture, and automated follow-up
            services for local businesses advertising through our radio stations.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-rocket-dark">2. Information We Collect</h2>
          <p>When you submit a form on one of our landing pages, we collect:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Name</li>
            <li>Phone number</li>
            <li>Email address (if provided)</li>
            <li>Your response to &ldquo;How did you hear about us?&rdquo;</li>
            <li>Any additional information you provide in the form</li>
          </ul>
          <p className="mt-2">
            When you text a keyword to our SMS number, we collect your phone number and the message content.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-rocket-dark">3. How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>To respond to your inquiry via text message and/or email</li>
            <li>To send follow-up messages related to your request</li>
            <li>To connect you with the local business you contacted</li>
            <li>To track campaign performance for the advertising business</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-rocket-dark">4. Text Messaging</h2>
          <p>
            By submitting a form or texting a keyword, you consent to receive text messages from us
            and/or the business you contacted. Message and data rates may apply. Message frequency
            varies. You can opt out at any time by replying <strong>STOP</strong> to any message.
            Reply <strong>HELP</strong> for assistance.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-rocket-dark">5. Information Sharing</h2>
          <p>
            Your information is shared only with the local business whose landing page you submitted
            a form on. We do not sell your personal information to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-rocket-dark">6. Data Retention</h2>
          <p>
            We retain your information for as long as needed to fulfill the purpose of your inquiry
            and to support the advertising business&apos;s campaign reporting. You may request deletion
            by contacting us.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-rocket-dark">7. Contact</h2>
          <p>
            Questions about this policy? Contact us at{" "}
            <a href="mailto:support@rocketradiosales.com" className="text-rocket-blue hover:underline">
              support@rocketradiosales.com
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}
