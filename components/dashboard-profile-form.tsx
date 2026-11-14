"use client";
import ProfileCreditsPanel from "@/components/profile-credits-panel";
import SocialProfileInput from "@/components/social-profile-input";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LocationAutocomplete from "@/components/location-autocomplete";

type CreativeProfile = {
  imagePath: string;
  bio: string;
  experienceYears: number;
  height: string | null;
  measurements: string | null;
  bustSize: string | null;
  waistInches: number | null;
  hipInches: number | null;
  showBustSize: boolean;
  showWaist: boolean;
  showHips: boolean;
  hairColor: string | null;
  eyeColor: string | null;
  specialties: string[];
  xUrl: string | null;
  instagramUrl: string | null;
  youtubeUrl: string | null;
  onlyfansUrl: string | null;
  customUrl: string | null;
  isAvailable: boolean;
  isPublished: boolean;
};

type SponsorProfile = {
  name: string;
  category: string;
  logoPath: string | null;
  websiteUrl: string | null;
  description: string;
  location: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  sponsorLevel: string;
  preferredPlacement: string;
  preferredLogoSize: string;
  brandGuidelines: string;
  logoUsageApproved: boolean;
  sponsorshipStartsOn: string | null;
  sponsorshipEndsOn: string | null;
  requiredWording: string;
  trackingUrl: string | null;
} | null;

export default function DashboardProfileForm({
  member,
  creative,
  sponsor,
  sponsorSection = "public",
}: {
  member: {
    name: string;
    email: string;
    username: string | null;
    primaryRole: string;
    countryCode: string | null;
    stateCode: string | null;
    city: string | null;
    organization: string | null;
    bio: string;
    phone: string | null;
    websiteUrl: string | null;
    portfolioUrl: string | null;
  };
  creative: CreativeProfile | null;
  sponsor: SponsorProfile;
  sponsorSection?: "public" | "contact" | "company" | "brand";
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const form = formRef.current;
    if (!form || member.primaryRole !== "sponsor") return;
    for (const control of form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select")) {
      let parent = control.parentElement;
      let hidden = false;
      while (parent && parent !== form) { if (parent.hidden) hidden = true; parent = parent.parentElement; }
      control.disabled = hidden;
    }
  }, [member.primaryRole, sponsorSection]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const heightMatch = creative?.height?.match(/(\d)\D+(\d{1,2})/);
  const [heightFeet, setHeightFeet] = useState(Number(heightMatch?.[1] ?? 5));
  const [heightInches, setHeightInches] = useState(Number(heightMatch?.[2] ?? 8));
  const [profileIdentifier, setProfileIdentifier] = useState(member.username ?? "");
  const [identifierEdited, setIdentifierEdited] = useState(false);
  const [identifierStatus, setIdentifierStatus] = useState<"idle" | "checking" | "available" | "unavailable">("idle");
  const [identifierMessage, setIdentifierMessage] = useState("");

  useEffect(() => {
    const candidate = profileIdentifier.trim();
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      if (!candidate) { setIdentifierStatus("idle"); setIdentifierMessage(""); return; }
      setIdentifierStatus("checking");
      try {
        const response = await fetch(`/api/account/profile-identifier?value=${encodeURIComponent(candidate)}`, { signal: controller.signal });
        const result = await response.json();
        setIdentifierStatus(result.available ? "available" : "unavailable");
        setIdentifierMessage(result.message || "");
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setIdentifierStatus("idle");
          setIdentifierMessage("Availability could not be checked. Save will still verify it.");
        }
      }
    }, 350);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [profileIdentifier]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
    values.isAvailable = String(new FormData(event.currentTarget).has("isAvailable"));
    values.isPublished = String(new FormData(event.currentTarget).has("isPublished"));
    values.logoUsageApproved = String(new FormData(event.currentTarget).has("logoUsageApproved"));
    values.showBustSize = String(new FormData(event.currentTarget).has("showBustSize"));
    values.showWaist = String(new FormData(event.currentTarget).has("showWaist"));
    values.showHips = String(new FormData(event.currentTarget).has("showHips"));
    const response = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...values,
        sponsorSection: member.primaryRole === "sponsor" ? sponsorSection : undefined,
        isAvailable: values.isAvailable === "true",
        isPublished: values.isPublished === "true",
        logoUsageApproved: values.logoUsageApproved === "true",
        showBustSize: values.showBustSize === "true",
        showWaist: values.showWaist === "true",
        showHips: values.showHips === "true",
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error ?? "Could not save your profile.");
      setSaving(false);
      return;
    }
    setMessage("Profile saved. Your dashboard and public information are current.");
    window.dispatchEvent(new Event("profile-allowance-changed"));
    setDirty(false);
    setSaving(false);
    router.refresh();
    } catch { setMessage("Connection lost. Your edits are still here. Please try saving again."); setSaving(false); }
  }

  const isCreative = member.primaryRole === "model" || member.primaryRole === "photographer";
  const isSponsor = member.primaryRole === "sponsor";

  return (
    <form ref={formRef} className="dashboard-profile-form" onSubmit={submit} onChange={() => setDirty(true)} data-unsaved={dirty ? "true" : "false"}>
      <div className="dashboard-form-heading">
        <div>
          <span>PROFILE CONTROL</span>
          <h2>Keep your information current.</h2>
        </div>
        <button className="button" type="submit" disabled={saving || identifierStatus === "checking" || identifierStatus === "unavailable"}>
          {saving ? "Saving…" : "Save profile ↗"}
        </button>
      </div>
      <ProfileCreditsPanel compact />
      <div className="dashboard-form-grid">
        <label hidden={isSponsor && sponsorSection !== "public"}>
          {isSponsor ? "Contact name" : "Display name"}
          <input
            name="name"
            defaultValue={member.name}
            required
            minLength={2}
            onChange={(event) => {
              if (!identifierEdited) {
                setProfileIdentifier(
                  event.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-+|-+$/g, "")
                    .slice(0, 48),
                );
              }
            }}
          />
          <small>Your name and public link share 3 free changes. Additional changes use credits.</small>
        </label>
        <label hidden={isSponsor && sponsorSection !== "public"}>
          Public profile URL
          <span className="profile-url-input">
            <small>{isCreative ? "/members/" : "/users/"}</small>
            <input
              name="profileIdentifier"
              value={profileIdentifier}
              onChange={(event) => {
                setIdentifierEdited(true);
                setProfileIdentifier(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 48));
              }}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              minLength={3}
              maxLength={48}
              required
            />
          </span>
          <small className={`profile-identifier-status is-${identifierStatus}`}>{identifierStatus === "checking" ? "Checking availability…" : identifierMessage || "Changing your name also updates this public link."}</small>
        </label>
        {!isSponsor && (
          <label>
            Organization
            <input name="organization" defaultValue={member.organization ?? ""} placeholder="Optional" />
          </label>
        )}
        <div className="location-form-slot" hidden={isSponsor && sponsorSection !== "company"}><LocationAutocomplete
          name="homeMarket"
          label={isSponsor ? "Company location" : "Home market"}
          defaultCountryCode={member.countryCode ?? "US"}
          defaultStateCode={member.stateCode ?? ""}
          defaultCity={member.city ?? ""}
        /></div>
        <label hidden={isSponsor}>
          Phone <small>Private account information</small>
          <input name="phone" type="tel" defaultValue={member.phone ?? ""} />
        </label>
        <label hidden={isSponsor && sponsorSection !== "public"}>
          Website
          <input
            name="websiteUrl"
            type="url"
            placeholder="https://"
            defaultValue={sponsor?.websiteUrl ?? member.websiteUrl ?? ""}
          />
        </label>
        {isCreative && (
          <label>
            Portfolio website
            <input name="portfolioUrl" type="url" placeholder="https://" defaultValue={member.portfolioUrl ?? ""} />
          </label>
        )}
        {isSponsor && (
          <>
            <div className="sponsor-profile-group" hidden={sponsorSection !== "company"}>
            <label>
              Company / organization name
              <input name="organization" defaultValue={sponsor?.name ?? member.organization ?? ""} required />
            </label>
            <label>
              Sponsor category
              <input name="category" defaultValue={sponsor?.category ?? ""} placeholder="Beauty, media, hospitality…" />
            </label>
            <label>
              Sponsor level <small>Automatically matches the active membership</small>
              <input name="sponsorLevel" value={sponsor?.sponsorLevel ?? "Partner"} readOnly />
            </label>
            <input name="logoPath" type="hidden" value={sponsor?.logoPath ?? ""} />
            </div>
            <div className="sponsor-profile-group" hidden={sponsorSection !== "contact"}>
            <label>Contact person<input name="contactName" defaultValue={sponsor?.contactName ?? member.name} required /></label>
            <label>Contact email<input value={sponsor?.contactEmail ?? member.email} type="email" readOnly /></label>
            <label>Contact phone<input name="contactPhone" type="tel" defaultValue={sponsor?.contactPhone ?? member.phone ?? ""} /></label>
            </div>
            <div className="sponsor-profile-group" hidden={sponsorSection !== "brand"}>
            <label>Preferred placement<input name="preferredPlacement" defaultValue={sponsor?.preferredPlacement ?? ""} placeholder="Hero, event page, step-and-repeat…" /></label>
            <label>Preferred logo size<input name="preferredLogoSize" defaultValue={sponsor?.preferredLogoSize ?? ""} placeholder="Large, 320px wide, equal partner sizing…" /></label>
            <label className="full">Brand guidelines or required colors<textarea name="brandGuidelines" rows={3} defaultValue={sponsor?.brandGuidelines ?? ""} /></label>
            <label>Sponsorship starts<input name="sponsorshipStartsOn" type="date" defaultValue={sponsor?.sponsorshipStartsOn ?? ""} /></label>
            <label>Sponsorship ends<input name="sponsorshipEndsOn" type="date" defaultValue={sponsor?.sponsorshipEndsOn ?? ""} /></label>
            <label className="full">Required wording or disclaimer<textarea name="requiredWording" rows={3} defaultValue={sponsor?.requiredWording ?? ""} /></label>
            <label className="full">Campaign tracking link<input name="trackingUrl" type="url" defaultValue={sponsor?.trackingUrl ?? ""} placeholder="https://" /></label>
            <label className="dashboard-check full"><input name="logoUsageApproved" type="checkbox" defaultChecked={sponsor?.logoUsageApproved ?? false} /> I have written approval to display this logo and brand on Model Escape.</label>
            </div>
          </>
        )}
        {isCreative && creative && (
          <>
            <label>
              Experience in years
              <input name="experienceYears" type="number" min={0} max={80} defaultValue={creative.experienceYears} />
            </label>
            <label className="full">
              Specialties <small>Separate with commas</small>
              <input name="specialties" defaultValue={creative.specialties.join(", ")} placeholder="Editorial, swim, campaign" />
            </label>
            {member.primaryRole === "model" && (
              <>
                <fieldset className="model-height-field">
                  <legend>Height</legend>
                  <label>
                    Feet
                    <select name="heightFeet" value={heightFeet} onChange={(event) => {
                      const next = Number(event.target.value);
                      setHeightFeet(next);
                      if (next === 6 && heightInches > 7) setHeightInches(7);
                    }}>
                      {[4, 5, 6].map((feet) => <option value={feet} key={feet}>{feet} ft</option>)}
                    </select>
                    <span className="measurement-privacy"><input name="showBustSize" type="checkbox" defaultChecked={creative.showBustSize} /> Show to eligible paid members</span>
                  </label>
                  <label>
                    Inches
                    <select name="heightInches" value={heightInches} onChange={(event) => setHeightInches(Number(event.target.value))}>
                      {Array.from({ length: heightFeet === 6 ? 8 : 12 }, (_, inches) => (
                        <option value={inches} key={inches}>{inches} in</option>
                      ))}
                    </select>
                    <span className="measurement-privacy"><input name="showWaist" type="checkbox" defaultChecked={creative.showWaist} /> Show to eligible paid members</span>
                  </label>
                </fieldset>
                <fieldset className="model-measurements-field full">
                  <legend>Measurements</legend>
                  <label>
                    Bust / cup
                    <select name="bustSize" defaultValue={creative.bustSize ?? ""}>
                      <option value="">Private / not specified</option>
                      {Array.from({ length: 13 }, (_, index) => 28 + index * 2).flatMap((band) =>
                        ["A", "B", "C", "D", "DD", "E", "EE"].map((cup) => (
                          <option value={`${band}${cup}`} key={`${band}${cup}`}>{band}{cup}</option>
                        )),
                      )}
                    </select>
                    <span className="measurement-privacy"><input name="showHips" type="checkbox" defaultChecked={creative.showHips} /> Show to eligible paid members</span>
                  </label>
                  <label>
                    Waist
                    <select name="waistInches" defaultValue={creative.waistInches ?? ""}>
                      <option value="">Private / not specified</option>
                      {Array.from({ length: 35 }, (_, index) => 18 + index).map((size) => <option value={size} key={size}>{size} in</option>)}
                    </select>
                  </label>
                  <label>
                    Hips
                    <select name="hipInches" defaultValue={creative.hipInches ?? ""}>
                      <option value="">Private / not specified</option>
                      {Array.from({ length: 39 }, (_, index) => 24 + index).map((size) => <option value={size} key={size}>{size} in</option>)}
                    </select>
                  </label>
                </fieldset>
                <label>Hair color<input name="hairColor" defaultValue={creative.hairColor ?? ""} /></label>
                <label>Eye color<input name="eyeColor" defaultValue={creative.eyeColor ?? ""} /></label>
              </>
            )}
            <SocialProfileInput platform="x" name="xUrl" defaultValue={creative.xUrl} />
            <SocialProfileInput platform="instagram" name="instagramUrl" defaultValue={creative.instagramUrl} />
            <SocialProfileInput platform="youtube" name="youtubeUrl" defaultValue={creative.youtubeUrl} />
            <SocialProfileInput platform="onlyfans" name="onlyfansUrl" defaultValue={creative.onlyfansUrl} />
            <label className="full">Custom profile URL<input name="customUrl" type="url" defaultValue={creative.customUrl ?? ""} /></label>
            <label className="dashboard-check"><input name="isAvailable" type="checkbox" defaultChecked={creative.isAvailable} /> Available for work</label>
            <label className="dashboard-check"><input name="isPublished" type="checkbox" defaultChecked={creative.isPublished} /> Show public profile</label>
          </>
        )}
        <label className="full" hidden={isSponsor && sponsorSection !== "public"}>
          {isSponsor ? "Company description" : "Bio"}
          <textarea
            name="bio"
            minLength={20}
            maxLength={1800}
            defaultValue={sponsor?.description ?? creative?.bio ?? member.bio}
            rows={6}
            required
          />
          <small>20–1,800 characters. This is shown wherever your public information appears.</small>
        </label>
      </div>
      {message && <p className="dashboard-form-message" role="status">{message}</p>}
      <button className="button sponsor-profile-save-bottom" type="submit" disabled={saving || identifierStatus === "checking" || identifierStatus === "unavailable"}>
        {saving ? "Saving…" : "Save profile ↗"}
      </button>
    </form>
  );
}
