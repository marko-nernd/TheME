"use client";
import { useEffect, useRef } from "react";
import { hasTravelDetails, type EventTravelDetails } from "@/lib/event-travel-fields";

export function PlaneIcon() {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m17.8 19.2-1.8-8.2 3.5-3.5c1.5-1.5 2-3.5 1.5-4.5-.5-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5L3 8l7 4-4 4H3l-1 1 4 2 2 4 1-1v-3l4-4 4 7 1.3-.7c.4-.2.6-.6.5-1.1Z" /></svg>;
}
export function FlightShortcut() {
  return <a className="event-travel-shortcut" href="#travel" onClick={() => { const dropdown = document.querySelector<HTMLDetailsElement>("#travel .event-flight-dropdown"); if (dropdown) dropdown.open = true; }}><PlaneIcon /> Flight information <span aria-hidden="true">⌄</span></a>;
}
export default function EventFlightInstructions({ title, location, airportInfo, flightInstructions, travelDetails = {}, destination = false }: { title: string; location: string; airportInfo?: string | null; flightInstructions?: string | null; travelDetails?: EventTravelDetails; destination?: boolean }) {
  const details = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (window.location.hash === "#travel" && details.current) details.current.open = true;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape" && details.current?.open) { details.current.open = false; details.current.querySelector("summary")?.focus(); } };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, []);
  if (!destination && !airportInfo?.trim() && !flightInstructions?.trim() && !hasTravelDetails(travelDetails)) return null;
  return <details className="event-flight-dropdown" ref={details} open={destination || undefined}>
    <summary><PlaneIcon /><span>Flight information</span><span className="flight-chevron" aria-hidden="true">⌄</span></summary>
    <div className="event-flight-content"><h2>{title}</h2><p className="flight-destination">{location}</p>{!airportInfo?.trim() && !flightInstructions?.trim() && !hasTravelDetails(travelDetails) && <p>The organizer has not added flight details yet. Check back for the recommended airport, arrival window, and transfer arrangements before booking.</p>}<dl>
      {travelDetails.airportName && <div><dt>Airport</dt><dd>{travelDetails.airportName}</dd></div>}
      {travelDetails.airportCode && <div><dt>Airport code</dt><dd>{travelDetails.airportCode}</dd></div>}
      {travelDetails.arrivalWindow && <div><dt>Arrival window</dt><dd>{travelDetails.arrivalWindow}</dd></div>}
      {travelDetails.timezone && <div><dt>Local timezone</dt><dd>{travelDetails.timezone}</dd></div>}
      {travelDetails.transferDetails && <div><dt>Shuttle &amp; transfers</dt><dd>{travelDetails.transferDetails}</dd></div>}
      {travelDetails.pickupLocation && <div><dt>Pickup location</dt><dd>{travelDetails.pickupLocation}</dd></div>}
      {travelDetails.hostContact && <div><dt>Host contact</dt><dd>{travelDetails.hostContact}</dd></div>}
    </dl>{!travelDetails.transferDetails && <section><h3>Shuttle information</h3><p>Check the organizer’s airport and flight instructions below for pickup arrangements. Contact the organizer to confirm shuttle availability before traveling.</p></section>}{airportInfo?.trim() && <section><h3>Airport information</h3><p>{airportInfo}</p></section>}{flightInstructions?.trim() && <section><h3>From your host</h3><p>{flightInstructions}</p></section>}<p className="event-flight-note">Confirm travel arrangements with the host before booking. Follow the local timezone above.</p></div>
  </details>;
}
