"use client";

import { useRouter } from "next/navigation";

export default function BackButton({ fallback }: { fallback: string }) {
  const router = useRouter();
  return (
    <button
      className="page-back-button"
      type="button"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      aria-label="Go back"
      title="Go back"
    >
      <span aria-hidden="true">←</span>
      Back
    </button>
  );
}
