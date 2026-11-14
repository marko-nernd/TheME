"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Country = { code: string; name: string };

export default function IdentityVerificationForm({
  status,
  reviewNotes,
}: {
  status: string;
  reviewNotes: string | null;
}) {
  const router = useRouter();
  const [countries, setCountries] = useState<Country[]>([]);
  const [documentType, setDocumentType] = useState("drivers_license");
  const [minimumExpiration] = useState(
    () => new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/locations?level=countries")
      .then((response) => response.json())
      .then((data) => setCountries(Array.isArray(data.options) ? data.options : []))
      .catch(() => setCountries([]));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/account/verification", {
      method: "POST",
      body: new FormData(event.currentTarget),
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error ?? "Could not submit your ID.");
      setSaving(false);
      return;
    }
    setMessage("ID submitted securely for admin review.");
    setSaving(false);
    router.refresh();
  }

  return (
    <section className="identity-verification-panel">
      <div className="identity-verification-copy">
        <span>IDENTITY VERIFICATION</span>
        <h2>{status === "approved" ? "Identity approved." : status === "pending" ? "Review in progress." : "Verify the person behind the profile."}</h2>
        <p>Upload a valid passport or driver’s license. These images are private and visible only to authorized administrators.</p>
        <strong className={`verification-status status-${status}`}>{status.replaceAll("_", " ")}</strong>
        {reviewNotes && <p className="verification-review-notes"><b>Admin note:</b> {reviewNotes}</p>}
      </div>
      <form onSubmit={submit}>
        <label>Document type<select name="documentType" value={documentType} onChange={(event) => setDocumentType(event.target.value)}><option value="drivers_license">Driver’s license</option><option value="passport">Passport</option></select></label>
        <label>Legal name<input name="legalName" required minLength={2} autoComplete="name" /></label>
        <label>Issuing country<select name="issuingCountry" required defaultValue="US"><option value="US">United States</option>{countries.filter((country) => country.code !== "US").map((country) => <option value={country.code} key={country.code}>{country.name}</option>)}</select></label>
        <label>Expiration date<input name="expiresOn" type="date" min={minimumExpiration} required /></label>
        <label className="full">Front image<input name="front" type="file" accept="image/jpeg,image/png,image/webp" required /><small>JPG, PNG, or WebP · maximum 10 MB</small></label>
        {documentType === "drivers_license" && <label className="full">Back image<input name="back" type="file" accept="image/jpeg,image/png,image/webp" required /><small>Required for a driver’s license.</small></label>}
        <label className="full">Current selfie<input name="selfie" type="file" accept="image/jpeg,image/png,image/webp" capture="user" required /><small>Used by the administrator to compare you with the submitted ID. This is not published.</small></label>
        <div className="identity-form-actions full">
          <button className="button" type="submit" disabled={saving}>{saving ? "Uploading securely…" : status === "not_submitted" ? "Submit ID for review ↗" : "Replace submitted ID ↗"}</button>
          {message && <small role="status">{message}</small>}
        </div>
      </form>
    </section>
  );
}
