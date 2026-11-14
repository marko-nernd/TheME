"use client";

import type { ReactNode } from "react";
import { defineTheme, Theme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";

const modelEscapeTheme = defineTheme({
  name: "model-escape-product",
  extends: neutralTheme,
  typography: {
    scale: { base: 14, ratio: 1.2 },
    body: {
      family: "Montserrat Variable",
      fallbacks: "Montserrat, sans-serif",
    },
    heading: {
      family: "Montserrat Variable",
      fallbacks: "Montserrat, sans-serif",
      weight: "semibold",
    },
    code: {
      family: "ui-monospace",
      fallbacks: "\"SF Mono\", Monaco, Consolas, monospace",
    },
  },
  radius: { base: 8, multiplier: 0.5 },
  tokens: {
    "--color-accent": "#ff2d95",
    "--color-accent-muted": "#ff2d9520",
    "--color-text-accent": "#ff80be",
    "--color-icon-accent": "#ff2d95",
    "--color-on-accent": "#ffffff",
    "--color-background-body": "#141519",
    "--color-background-muted": "#191a20",
    "--color-background-card": "#202127",
    "--color-background-surface": "#202127",
    "--color-text-primary": "#f1f2f6",
    "--color-text-secondary": "#a7a9b6",
    "--color-border-emphasized": "#34353f",
  },
  components: {
    button: {
      base: {
        fontWeight: "700",
        letterSpacing: "0.02em",
      },
    },
  },
});

export default function AstryxSurface({ children }: { children: ReactNode }) {
  return (
    <Theme theme={modelEscapeTheme} mode="dark">
      <div className="model-astryx-surface">{children}</div>
    </Theme>
  );
}
