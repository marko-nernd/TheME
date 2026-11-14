"use client";

import { FormEvent, KeyboardEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { primaryRoles } from "@/lib/roles";
import LocationAutocomplete from "@/components/location-autocomplete";
import { cameraBrands } from "@/lib/camera-brands";
import { useFormDraft } from "@/components/use-form-draft";
import { useConfirmation } from "@/components/use-confirmation";
import type { LocationSelection } from "@/components/location-autocomplete";

const signupSteps = [
  { label: "Your role", title: "How will you use Model Escape?", help: "Choose the role that best matches what you do." },
  { label: "Your account", title: "Tell us who you are.", help: "These details create your account and public profile address." },
  { label: "Your profile", title: "Where do you create?", help: "Choose an exact home market and add any optional professional details." },
  { label: "Review", title: "Secure your account.", help: "Create a password, review your details, and submit your application." },
] as const;

export default function SignupForm() {
  const router = useRouter();
  const { ask, confirmationDialog } = useConfirmation();
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(0);
  const [furthestStep, setFurthestStep] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [identifierEdited, setIdentifierEdited] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [primaryRole, setPrimaryRole] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [location, setLocation] = useState<LocationSelection>({ countryCode: "US", stateCode: "", city: "", location: "", isValid: false });
  const [cameraBrand, setCameraBrand] = useState("");
  const [organization, setOrganization] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [locationVersion, setLocationVersion] = useState(0);
  const [locationDefaults, setLocationDefaults] = useState({ countryCode: "US", stateCode: "", city: "" });
  const draft = useFormDraft({ storageKey: "model-escape:signup-draft", value: { step, furthestStep, primaryRole, name, email, identifier, identifierEdited, location, cameraBrand, organization, portfolioUrl }, restore: (saved) => {
    if (!saved || typeof saved.name !== "string") return;
    setStep(Math.min(3, Math.max(0, saved.step || 0))); setFurthestStep(Math.min(3, saved.furthestStep || 0)); setPrimaryRole(saved.primaryRole || ""); setName(saved.name); setEmail(saved.email || ""); setIdentifier(saved.identifier || ""); setIdentifierEdited(Boolean(saved.identifierEdited));
    setLocation(saved.location || { countryCode: "US", stateCode: "", city: "", location: "", isValid: false }); setLocationDefaults(saved.location || { countryCode: "US", stateCode: "", city: "" }); setCameraBrand(saved.cameraBrand || ""); setOrganization(saved.organization || ""); setPortfolioUrl(saved.portfolioUrl || ""); setLocationVersion((value) => value + 1);
  } });

  function validateStep(currentStep = step) {
    const section = formRef.current?.querySelector<HTMLElement>(`[data-signup-step="${currentStep}"]`);
    if (!section) return false;
    const fields = Array.from(section.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea"));
    for (const field of fields) {
      if (!field.checkValidity()) {
        field.reportValidity();
        return false;
      }
    }
    if (currentStep === signupSteps.length - 1 && password !== confirmPassword) {
      setError("The passwords do not match.");
      return false;
    }
    return true;
  }

  function continueToNextStep() {
    setError("");
    if (!validateStep()) return;
    setStep((current) => Math.min(current + 1, signupSteps.length - 1));
    setFurthestStep((current) => Math.max(current, Math.min(step + 1, signupSteps.length - 1)));
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleFormKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.target instanceof HTMLButtonElement) return;
    if (event.key !== "Enter" || step === signupSteps.length - 1 || event.target instanceof HTMLTextAreaElement) return;
    event.preventDefault();
    continueToNextStep();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    for (let index = 0; index < signupSteps.length; index++) {
      if (!validateStep(index)) {
        setStep(index);
        setError(`Check the required fields in ${signupSteps[index].label.toLowerCase()}.`);
        return;
      }
    }
    setSaving(true);
    setError("");
    setSuggestions([]);
    const values = Object.fromEntries(new FormData(event.currentTarget));

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (!response.ok) {
        setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
        if (Array.isArray(data.suggestions) && data.suggestions.length) setStep(1);
        throw new Error(data.error ?? "Could not create your account.");
      }
      router.push(`/signup/check-email?email=${encodeURIComponent(String(values.email))}`);
      draft.clearDraft();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create your account.");
      setSaving(false);
    }
  }

  return (
    <form ref={formRef} className="styled-form signup-wizard" onSubmit={submit} onKeyDown={handleFormKeyDown}>
      {confirmationDialog}
      <p className="draft-status" role="status">{draft.restored ? "Your saved progress has been restored. " : ""}{draft.savedAt ? `Draft saved on this device at ${draft.savedAt}.` : "Your progress saves automatically on this device."} Passwords are never saved. <button type="button" onClick={async () => { if (await ask({ title: "Start a new application?", message: "This clears only the saved signup draft on this device. No account will be deleted.", confirmLabel: "Clear draft and start over" })) { draft.clearDraft(); window.location.reload(); } }}>Start over</button></p>
      <header className="signup-wizard-header">
        <div className="signup-wizard-heading">
          <span>Step {step + 1} of {signupSteps.length}</span>
          <h2>{signupSteps[step].title}</h2>
          <p>
            {step === 2 && primaryRole === "model"
              ? "Add your exact home market now. You can finish your portfolio and professional details after approval."
              : signupSteps[step].help}
          </p>
        </div>
        <ol className="signup-stepper" aria-label="Signup progress">
          {signupSteps.map((item, index) => (
            <li className={index === step ? "is-active" : index < step ? "is-complete" : ""} aria-current={index === step ? "step" : undefined} key={item.label}>
              <button type="button" disabled={index > furthestStep || saving} onClick={() => {
                if (index > step && !validateStep()) return;
                setError(""); setStep(index);
              }} aria-label={`Go to step ${index + 1}: ${item.label}`}><i>{index < step ? "✓" : index + 1}</i><span>{item.label}</span></button>
            </li>
          ))}
        </ol>
      </header>

      <section className="signup-wizard-step" data-signup-step="0" hidden={step !== 0}>
        <div className="signup-role-grid">
          {primaryRoles.map((role) => (
            <label className={`signup-role-card${primaryRole === role.value ? " is-selected" : ""}`} key={role.value}>
              <input
                name="primaryRole"
                type="radio"
                value={role.value}
                checked={primaryRole === role.value}
                onChange={(event) => setPrimaryRole(event.target.value)}
                required
              />
              <span className="signup-role-mark" aria-hidden="true">{primaryRole === role.value ? "✓" : ""}</span>
              <strong>{role.label}</strong>
              <small>{role.description}</small>
            </label>
          ))}
        </div>
      </section>

      <section className="signup-wizard-step" data-signup-step="1" hidden={step !== 1}>
        <div className="form-grid signup-grid">
          <label>
            Full name
            <input
              name="name"
              type="text"
              autoComplete="name"
              value={name}
              required
              minLength={2}
              placeholder="Your first and last name"
              onChange={(event) => {
                setName(event.target.value);
                if (!identifierEdited) {
                  setIdentifier(
                    event.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-+|-+$/g, "")
                      .slice(0, 48),
                  );
                }
              }}
            />
          </label>
          <label>
            Email address
            <input name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
          </label>
          <label className="full">
            Public profile URL
            <span className="profile-url-input">
              <small>modelescape.com/members/</small>
              <input
                name="profileIdentifier"
                value={identifier}
                aria-describedby="profile-url-help"
                onChange={(event) => {
                  setIdentifierEdited(true);
                  setIdentifier(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 48));
                }}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                minLength={3}
                maxLength={48}
                required
              />
            </span>
            <small id="profile-url-help">This is the link you can share with others. Use lowercase letters, numbers, and hyphens.</small>
          </label>
        </div>
        {suggestions.length > 0 && (
          <div className="profile-identifier-suggestions">
            <span>Available ideas:</span>
            {suggestions.map((suggestion) => (
              <button type="button" onClick={() => { setIdentifierEdited(true); setIdentifier(suggestion); setError(""); }} key={suggestion}>
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="signup-wizard-step" data-signup-step="2" hidden={step !== 2}>
        <div className="form-grid signup-grid">
          <LocationAutocomplete key={locationVersion} name="homeMarket" label="Home market" defaultCountryCode={locationDefaults.countryCode} defaultStateCode={locationDefaults.stateCode} defaultCity={locationDefaults.city} onChange={setLocation} />
          {primaryRole === "photographer" && (
            <label>
              Primary camera system
              <select name="cameraBrand" required value={cameraBrand} onChange={(event) => setCameraBrand(event.target.value)}>
                <option value="" disabled>Choose your camera brand</option>
                {cameraBrands.map((brand) => <option value={brand} key={brand}>{brand}</option>)}
              </select>
              <small>You can change your camera and profile photo later.</small>
            </label>
          )}
          {primaryRole !== "model" && (
            <label className={primaryRole === "photographer" ? "" : "full"}>
              Organization <small>Optional{primaryRole === "sponsor" || primaryRole === "host" ? "; recommended for your role" : ""}</small>
              <input name="organization" type="text" autoComplete="organization" placeholder="Company or organization name" value={organization} onChange={(event) => setOrganization(event.target.value)} />
            </label>
          )}
          {primaryRole !== "model" && (
            <label className="full">
              Portfolio or website <small>Optional</small>
              <input name="portfolioUrl" type="url" placeholder="https://" value={portfolioUrl} onChange={(event) => setPortfolioUrl(event.target.value)} />
            </label>
          )}
          {primaryRole === "model" && (
            <p className="signup-model-profile-note full">
              You can add your portfolio, organization, and other professional details after approval from your Profile dashboard.
            </p>
          )}
        </div>
      </section>

      <section className="signup-wizard-step" data-signup-step="3" hidden={step !== 3}>
        <div className="signup-review-card">
          <div><span>Role</span><strong>{primaryRoles.find((role) => role.value === primaryRole)?.label}</strong></div>
          <div><span>Name</span><strong>{name}</strong></div>
          <div><span>Email</span><strong>{email}</strong></div>
          <div><span>Profile</span><strong>/members/{identifier}</strong></div>
        </div>
        <div className="form-grid signup-grid signup-password-grid">
          <label>
            Password
            <input name="password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={10} />
            <small>Use at least 10 characters.</small>
          </label>
          <label>
            Confirm password
            <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={10} />
            <small>Enter the same password again.</small>
          </label>
        </div>
        <div className="signup-next-steps">
          <strong>What happens next?</strong>
          <span>1. Verify your email</span>
          <span>2. An admin reviews your application</span>
          <span>3. Sign in and finish your profile</span>
        </div>
      </section>

      {error && <p className="form-error signup-wizard-error" role="alert">{error}</p>}

      <footer className="signup-wizard-actions">
        <button
          className="signup-back-button"
          type="button"
          onClick={() => {
            setError("");
            if (step === 0) router.push("/login");
            else setStep((current) => current - 1);
          }}
          disabled={saving}
        >
          {step === 0 ? "Already a member? Sign in" : "← Back"}
        </button>
        {step < signupSteps.length - 1 ? (
          <button className="button signup-continue-button" type="button" onClick={continueToNextStep}>Continue to {signupSteps[step + 1].label.toLowerCase()} <b>→</b></button>
        ) : (
          <button className="button signup-continue-button" type="submit" disabled={saving}>
            {saving ? "Creating account…" : "Submit application ↗"}
          </button>
        )}
      </footer>
    </form>
  );
}
