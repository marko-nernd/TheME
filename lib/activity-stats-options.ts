export function activityStatsOptions(input: URLSearchParams) {
 const requestedDays = Number(input.get("days") || 30);
 const days = [7,30,90].includes(requestedDays) ? requestedDays : 30;
 const role = ["model","photographer"].includes(input.get("role") || "") ? input.get("role")! : "all";
 const day = input.get("date") || "";
 if (day && (!/^\d{4}-\d{2}-\d{2}$/.test(day) || new Date(day+"T12:00:00Z").toISOString().slice(0,10) !== day)) throw new Error("Invalid date");
 function bounded(name: string, max: number) { const value = input.get(name); if (value === null || value === "") return null; const n = Number(value); if (!Number.isInteger(n) || n < 0 || n > max) throw new Error("Invalid filter"); return n; }
 return { days, role, day, hour: bounded("hour",23), weekday: bounded("weekday",6), page: Math.min(100000,Math.max(1,Math.floor(Number(input.get("page")) || 1))), online: input.get("online") === "1" };
}
