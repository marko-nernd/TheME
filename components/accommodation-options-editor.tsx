"use client";
import { useId, useState } from "react";
import type { AccommodationOption } from "@/lib/accommodation-options";
export default function AccommodationOptionsEditor({ details, links = [], template, onChange }: { details: string[]; links?: string[]; template: string[]; onChange: () => void }) {
 const id = useId();
 const [items, setItems] = useState<AccommodationOption[]>(details.map((description, index) => ({ description, bookingUrl: links[index] || "" })));
 function update(next: AccommodationOption[]) { setItems(next); onChange(); }
 function move(index: number, delta: number) { const next = [...items]; [next[index], next[index + delta]] = [next[index + delta], next[index]]; update(next); }
 return <fieldset className="ordered-event-list full"><legend>Accommodation options</legend><p>Add descriptions and optional links to booking sites. Reordering an item keeps its link with it.</p>
  <input type="hidden" name="accommodationOptions" value={JSON.stringify(items)} />
  <ol>{items.map((item, index) => <li key={index}>
   <label htmlFor={`${id}-${index}-description`}>Description</label><textarea id={`${id}-${index}-description`} rows={3} maxLength={1000} value={item.description} onChange={(event) => update(items.map((value, at) => at === index ? { ...value, description: event.target.value } : value))} />
   <label htmlFor={`${id}-${index}-link`}>Booking link <small>Optional</small></label><input id={`${id}-${index}-link`} type="url" placeholder="https://booking-site.com/property" maxLength={2048} value={item.bookingUrl} onChange={(event) => update(items.map((value, at) => at === index ? { ...value, bookingUrl: event.target.value } : value))} />
   <div><button type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move accommodation ${index + 1} up`}>↑</button><button type="button" disabled={index === items.length - 1} onClick={() => move(index, 1)} aria-label={`Move accommodation ${index + 1} down`}>↓</button><button type="button" onClick={() => update(items.filter((_, at) => at !== index))} aria-label={`Remove accommodation ${index + 1}`}>Remove</button></div>
  </li>)}</ol><div className="ordered-list-actions"><button type="button" disabled={items.length >= 30} onClick={() => update([...items, { description: "", bookingUrl: "" }])}>Add accommodation +</button>{items.length === 0 && <button type="button" onClick={() => update(template.map((description) => ({ description, bookingUrl: "" })))}>Use template</button>}</div>
 </fieldset>;
}
