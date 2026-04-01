"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare, Webhook, CheckCircle2, AlertCircle,
  Loader2, X, Plus, Eye, EyeOff,
} from "lucide-react";

type Provider = "none" | "twilio" | "simpletexting" | "eztext" | "webhook";

interface SmsConfig {
  provider: Provider;
  notifyPhones: string[];
  notifyEmails: string[];
  isActive: boolean;
  hasCredentials: boolean;
  // Masked fields from server
  fromNumber?: string;
  accountSidMask?: string;
  username?: string;
  webhookUrl?: string;
}

interface Props {
  initial: SmsConfig;
}

const PROVIDERS: { id: Provider; label: string; description: string }[] = [
  { id: "none",          label: "Disabled",       description: "No SMS notifications" },
  { id: "twilio",        label: "Twilio",          description: "Account SID + Auth Token" },
  { id: "simpletexting", label: "SimpleTexting",   description: "API Key from your SimpleTexting account" },
  { id: "eztext",        label: "EZTexting",       description: "Username + Password" },
  { id: "webhook",       label: "Webhook / Zapier / Make", description: "POST JSON to any URL — works with any platform" },
];

export function SmsNotificationsManager({ initial }: Props) {
  const [provider, setProvider]         = useState<Provider>(initial.provider);
  const [isActive, setIsActive]         = useState(initial.isActive);
  const [notifyPhones, setNotifyPhones] = useState<string[]>(initial.notifyPhones);
  const [notifyEmails, setNotifyEmails] = useState<string[]>(initial.notifyEmails);
  const [phoneInput, setPhoneInput]     = useState("");
  const [emailInput, setEmailInput]     = useState("");

  // Credential fields
  const [accountSid,    setAccountSid]    = useState("");
  const [authToken,     setAuthToken]     = useState("");
  const [apiKey,        setApiKey]        = useState("");
  const [fromNumber,    setFromNumber]    = useState(initial.fromNumber ?? "");
  const [username,      setUsername]      = useState(initial.username ?? "");
  const [password,      setPassword]      = useState("");
  const [webhookUrl,    setWebhookUrl]    = useState(initial.webhookUrl ?? "");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [showSecrets,   setShowSecrets]   = useState(false);

  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [saveErr,  setSaveErr]  = useState("");

  // True if user has typed new creds in the current session
  const hasNewCreds = !!(accountSid || authToken || apiKey || password || webhookUrl);
  const keepExisting = initial.hasCredentials && !hasNewCreds && provider === initial.provider;

  function addPhone() {
    const v = phoneInput.trim();
    if (v && !notifyPhones.includes(v)) setNotifyPhones((p) => [...p, v]);
    setPhoneInput("");
  }

  function addEmail() {
    const v = emailInput.trim();
    if (v && !notifyEmails.includes(v)) setNotifyEmails((p) => [...p, v]);
    setEmailInput("");
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setSaveErr("");
    try {
      const res = await fetch("/api/settings/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          isActive,
          notifyPhones,
          notifyEmails,
          keepExistingCredentials: keepExisting,
          // Twilio
          accountSid:    accountSid    || undefined,
          authToken:     authToken     || undefined,
          // SimpleTexting
          apiKey:        apiKey        || undefined,
          // Shared
          fromNumber:    fromNumber    || undefined,
          // EZText
          username:      username      || undefined,
          password:      password      || undefined,
          // Webhook
          webhookUrl:    webhookUrl    || undefined,
          webhookSecret: webhookSecret || undefined,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">

      {/* ── Provider picker ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-rocket-blue" />
            SMS Provider
          </CardTitle>
          <CardDescription>
            Choose the texting service you already use. Your credentials are encrypted and never shared.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => setProvider(p.id)}
              className={`w-full flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
                provider === p.id
                  ? "border-rocket-blue bg-rocket-blue/5"
                  : "border-rocket-border hover:bg-rocket-bg"
              }`}
            >
              <div className={`mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 ${
                provider === p.id ? "border-rocket-blue bg-rocket-blue" : "border-slate-300"
              }`} />
              <div>
                <p className="text-sm font-semibold text-rocket-dark">{p.label}</p>
                <p className="text-xs text-rocket-muted">{p.description}</p>
              </div>
              {p.id !== "none" && initial.provider === p.id && initial.hasCredentials && (
                <Badge variant="success" className="ml-auto text-xs shrink-0">Connected</Badge>
              )}
            </button>
          ))}
        </CardContent>
      </Card>

      {/* ── Credentials (conditional on provider) ── */}
      {provider !== "none" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Credentials</CardTitle>
              {initial.hasCredentials && provider === initial.provider && (
                <Badge variant="success" className="text-xs">
                  <CheckCircle2 className="mr-1 h-3 w-3" />Saved
                </Badge>
              )}
              <button
                onClick={() => setShowSecrets(!showSecrets)}
                className="flex items-center gap-1.5 text-xs text-rocket-muted hover:text-rocket-dark"
              >
                {showSecrets ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showSecrets ? "Hide" : "Show"}
              </button>
            </div>
            {initial.hasCredentials && provider === initial.provider && !hasNewCreds && (
              <p className="text-xs text-rocket-muted">
                Credentials are saved. Enter new values below only if you want to replace them.
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">

            {provider === "twilio" && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium">Account SID</label>
                  {initial.accountSidMask && !accountSid ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-rocket-muted">{initial.accountSidMask}</span>
                      <button onClick={() => setAccountSid(" ")} className="text-xs text-rocket-blue underline">Replace</button>
                    </div>
                  ) : (
                    <Input value={accountSid} onChange={(e) => setAccountSid(e.target.value)}
                      type={showSecrets ? "text" : "password"} placeholder="ACxxxxxxxxxxxxxxxx" />
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Auth Token</label>
                  <Input value={authToken} onChange={(e) => setAuthToken(e.target.value)}
                    type={showSecrets ? "text" : "password"}
                    placeholder={initial.hasCredentials && !authToken ? "●●●●●●●● (saved)" : "Your auth token"} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">From Number</label>
                  <Input value={fromNumber} onChange={(e) => setFromNumber(e.target.value)}
                    placeholder="+15551234567" />
                </div>
              </>
            )}

            {provider === "simpletexting" && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium">API Key</label>
                  <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                    type={showSecrets ? "text" : "password"}
                    placeholder={initial.hasCredentials && !apiKey ? "●●●●●●●● (saved)" : "Your SimpleTexting API key"} />
                  <p className="mt-1 text-xs text-rocket-muted">
                    Found in SimpleTexting → Account → API &amp; Integrations
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">From Number / Keyword</label>
                  <Input value={fromNumber} onChange={(e) => setFromNumber(e.target.value)}
                    placeholder="+15551234567 or your keyword" />
                </div>
              </>
            )}

            {provider === "eztext" && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium">Username</label>
                  <Input value={username} onChange={(e) => setUsername(e.target.value)}
                    placeholder="Your EZTexting username" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Password</label>
                  <Input value={password} onChange={(e) => setPassword(e.target.value)}
                    type={showSecrets ? "text" : "password"}
                    placeholder={initial.hasCredentials && !password ? "●●●●●●●● (saved)" : "Your EZTexting password"} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">From Number</label>
                  <Input value={fromNumber} onChange={(e) => setFromNumber(e.target.value)}
                    placeholder="+15551234567" />
                </div>
              </>
            )}

            {provider === "webhook" && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium flex items-center gap-2">
                    <Webhook className="h-3.5 w-3.5" />
                    Webhook URL
                  </label>
                  <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://hooks.zapier.com/hooks/catch/..." />
                  <p className="mt-1.5 text-xs text-rocket-muted leading-relaxed">
                    We&apos;ll POST JSON to this URL on every lead submission:
                    <code className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px]">
                      {`{ event, name, phone, email, businessName, pageUrl, submittedAt }`}
                    </code>
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Secret Header <span className="text-rocket-muted font-normal">(optional)</span></label>
                  <Input value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)}
                    type={showSecrets ? "text" : "password"}
                    placeholder="Sent as X-Webhook-Secret" />
                </div>
              </>
            )}

          </CardContent>
        </Card>
      )}

      {/* ── Notify numbers & emails ── */}
      {provider !== "none" && provider !== "webhook" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Who Gets Notified</CardTitle>
            <CardDescription>Add the phone numbers and email addresses that should receive an alert for every new lead.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Phone numbers */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Phone numbers (SMS)</p>
              <div className="flex gap-2">
                <Input
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPhone(); } }}
                  placeholder="+15551234567"
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={addPhone} className="shrink-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {notifyPhones.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {notifyPhones.map((p) => (
                    <span key={p} className="flex items-center gap-1.5 rounded-full bg-rocket-bg px-3 py-1 text-sm font-mono">
                      {p}
                      <button onClick={() => setNotifyPhones((prev) => prev.filter((x) => x !== p))}>
                        <X className="h-3 w-3 text-rocket-muted hover:text-rocket-danger" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Email addresses */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Email addresses <span className="text-rocket-muted font-normal">(optional — coming soon)</span></p>
              <div className="flex gap-2">
                <Input
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEmail(); } }}
                  placeholder="rep@youragency.com"
                  type="email"
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={addEmail} className="shrink-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {notifyEmails.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {notifyEmails.map((e) => (
                    <span key={e} className="flex items-center gap-1.5 rounded-full bg-rocket-bg px-3 py-1 text-sm">
                      {e}
                      <button onClick={() => setNotifyEmails((prev) => prev.filter((x) => x !== e))}>
                        <X className="h-3 w-3 text-rocket-muted hover:text-rocket-danger" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Enable / Save ── */}
      {provider !== "none" && (
        <Card>
          <CardContent className="pt-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setIsActive(!isActive)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${isActive ? "bg-rocket-success" : "bg-slate-300"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-5" : ""}`} />
                </div>
                <span className="text-sm font-medium text-rocket-dark">
                  {isActive ? "Notifications enabled" : "Notifications disabled"}
                </span>
              </label>

              <div className="flex items-center gap-3">
                {saved && (
                  <span className="flex items-center gap-1.5 text-sm text-rocket-success">
                    <CheckCircle2 className="h-4 w-4" />Saved
                  </span>
                )}
                {saveErr && (
                  <span className="flex items-center gap-1.5 text-sm text-rocket-danger">
                    <AlertCircle className="h-4 w-4" />{saveErr}
                  </span>
                )}
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Settings"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {provider === "none" && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} variant="outline">
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save (Disabled)"}
          </Button>
        </div>
      )}

    </div>
  );
}
