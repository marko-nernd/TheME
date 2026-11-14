"use client";
import { useState } from "react";

export default function OrderedEventListEditor({ label, name, initial = [], template = [], value, onChange }: { label: string; name?: string; initial?: string[]; template?: string[]; value?: string; onChange?: (value: string) => void }) {
  const [local, setLocal] = useState(initial);
  const items = value === undefined ? local : value.split("\n");
  function update(next: string[]) { setLocal(next); onChange?.(next.join("\n")); }
  function move(index: number, step: number) { const next = [...items]; [next[index], next[index + step]] = [next[index + step], next[index]]; update(next); }
  return <fieldset className="ordered-event-list full"><legend>{label}</legend><p>Add items and use the arrows to choose their display order.</p>
    {name && <input type="hidden" name={name} value={items.join("\n")} />}
    <ol>{items.map((item, index) => <li key={index}><textarea aria-label={`${label} item ${index + 1}`} rows={2} maxLength={1000} value={item} onChange={(event) => update(items.map((text, at) => at === index ? event.target.value.replace(/\n/g, " ") : text))} /><div>
      <button type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move item ${index + 1} up`}>↑</button>
      <button type="button" disabled={index === items.length - 1} onClick={() => move(index, 1)} aria-label={`Move item ${index + 1} down`}>↓</button>
      <button type="button" onClick={() => update(items.filter((_, at) => at !== index))} aria-label={`Remove item ${index + 1}`}>Remove</button>
    </div></li>)}</ol><div className="ordered-list-actions"><button type="button" disabled={items.length >= 30} onClick={() => update([...items, ""])}>Add item +</button>{!items.some((item) => item.trim()) && template.length > 0 && <button type="button" onClick={() => update(template)}>Use template</button>}</div>
  </fieldset>;
}
