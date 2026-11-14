"use client";
import { travelFieldDefinitions, type EventTravelDetails } from "@/lib/event-travel-fields";
export default function EventTravelEditor({ initial = {}, value, onChange }: { initial?: EventTravelDetails; value?: EventTravelDetails; onChange?: (value: EventTravelDetails) => void }) {
  const current = value ?? initial;
  const inputProps = (key: keyof EventTravelDetails) => onChange ? { value: current[key] ?? "", onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...current, [key]: event.target.value }) } : { defaultValue: current[key] ?? "" };
  return <div className="travel-editor-grid">{travelFieldDefinitions.map(([key, label, max]) => <label key={key} className={["transferDetails", "pickupLocation", "hostContact"].includes(key) ? "full" : ""}>{label}{key === "transferDetails" ? <textarea name={`travel_${key}`} rows={3} maxLength={max} {...inputProps(key)} /> : <input name={`travel_${key}`} maxLength={max} placeholder={key === "timezone" ? "America/Costa_Rica" : key === "airportCode" ? "SJO" : undefined} {...inputProps(key)} />}{key === "timezone" && <small>Use an IANA timezone, such as America/New_York, America/Phoenix, or America/Costa_Rica. Arrival times are displayed in this timezone.</small>}</label>)}</div>;
}
