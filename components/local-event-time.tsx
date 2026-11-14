"use client";
import { useSyncExternalStore } from "react";
const subscribe = () => () => {};
export default function LocalEventTime({ at }: { at: string }) {
  const zone = useSyncExternalStore(subscribe, () => Intl.DateTimeFormat().resolvedOptions().timeZone, () => "America/Phoenix");
  return <time dateTime={at}>{new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeStyle: "short", timeZone: zone }).format(new Date(at))} ({zone.replaceAll("_", " ")})</time>;
}
