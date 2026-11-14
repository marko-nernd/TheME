"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const consentKey = "model-escape-cookie-consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!window.localStorage.getItem(consentKey));
  }, []);

  function choose(value: "all" | "necessary") {
    window.localStorage.setItem(consentKey, value);
    setVisible(false);
  }

  if (!visible) return null;
  return (
    <aside className="cookie-consent" aria-label="Cookie preferences">
      <div>
        <strong>Your privacy, your choice.</strong>
        <p>We use essential cookies for sign-in and security. With your permission, optional cookies can help us understand and improve the experience. <Link href="/privacy">Privacy details</Link></p>
      </div>
      <div>
        <button type="button" onClick={() => choose("necessary")}>Necessary only</button>
        <button className="button" type="button" onClick={() => choose("all")}>Accept all</button>
      </div>
    </aside>
  );
}
