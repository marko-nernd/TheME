"use client";
import { useState } from "react";
import { normalizeSocialProfile, socialPlatforms, socialUsername, type SocialPlatform } from "@/lib/social-profiles";
export default function SocialProfileInput({ platform, name, defaultValue }: { platform: SocialPlatform; name: string; defaultValue?: string | null }) {
 const [value, setValue] = useState(socialUsername(platform, defaultValue));
 return <label>{socialPlatforms[platform].label} username<span className="social-username-input"><span>{socialPlatforms[platform].prefix.replace("https://", "")}</span><input name={name} value={value} placeholder="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} onChange={(event) => { event.target.setCustomValidity(""); setValue(event.target.value); }} onBlur={(event) => { try { normalizeSocialProfile(platform, value); event.target.setCustomValidity(""); } catch (error) { event.target.setCustomValidity(error instanceof Error ? error.message : "Check username"); } }} /></span><small>Enter your username or paste your profile link.</small></label>;
}
