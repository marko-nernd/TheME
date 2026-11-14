export function parseExternalEventDestination(body: Record<string, unknown>) {
  const raw = typeof body.externalEventUrl === "string" ? body.externalEventUrl.trim() : "";
  const redirectToExternal = body.redirectToExternal === true;
  if (!raw) {
    if (redirectToExternal) throw new Error("INVALID_EXTERNAL_EVENT_URL");
    return { externalEventUrl: null, redirectToExternal: false };
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("INVALID_EXTERNAL_EVENT_URL");
  }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("INVALID_EXTERNAL_EVENT_URL");
  return { externalEventUrl: url.toString(), redirectToExternal };
}
