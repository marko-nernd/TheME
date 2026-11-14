import type { Appearance } from "@stripe/stripe-js";

export function getModelEscapeStripeAppearance(): Appearance {
  const css = typeof document === "undefined" ? null : getComputedStyle(document.documentElement);
  const value = (name: string, fallback: string) => css?.getPropertyValue(name).trim() || fallback;
  const primary = value("--accent", "#ff2d95");
  return {
  theme: "night",
  variables: {
    colorPrimary: primary,
    colorBackground: value("--input-background", "#17181d"),
    colorText: value("--input-text", "#f1f2f6"),
    colorDanger: value("--danger", "#a31616"),
    fontFamily: '"Montserrat Variable", Montserrat, Arial, sans-serif',
    fontSizeBase: "16px",
    spacingUnit: "5px",
    borderRadius: value("--button-radius", "8px"),
  },
  rules: {
    ".Label": {
      fontSize: "14px",
      fontWeight: "600",
      letterSpacing: "0",
      textTransform: "none",
    },
    ".Input": {
      border: `1px solid ${value("--brand-border", "#34353f")}`,
      boxShadow: "none",
      padding: "14px",
    },
    ".Input:focus": {
      borderColor: primary,
      boxShadow: `0 0 0 1px ${primary}`,
    },
    ".Tab": {
      border: `1px solid ${value("--brand-border", "#34353f")}`,
      boxShadow: "none",
    },
    ".Tab--selected": {
      borderColor: primary,
      boxShadow: `0 0 0 1px ${primary}`,
    },
  },
  };
}
