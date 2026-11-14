const paths: Record<string, string> = {
  stats: "M4 20V12 M10 20V4 M16 20V8 M22 20V2",
  overview: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.9 M16 3.1a4 4 0 0 1 0 7.8",
  events: "M4 5h16v16H4z M16 3v4 M8 3v4 M4 11h16 M8 15h2 M14 15h2",
  sponsors: "m12 3 9 5-9 5-9-5 9-5Z M3 12l9 5 9-5 M3 16l9 5 9-5",
  messages: "M21 15a3 3 0 0 1-3 3H8l-5 4V5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v10Z M7 7h10 M7 11h6",
  ratings: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z",
  billing: "M3 5h18v14H3z M3 10h18 M7 15h3",
  pages: "M5 3h14v18H5z M8 7h8 M8 11h8 M8 15h5",
  homepage: "M3 4h18v16H3z M10 8l6 4-6 4V8Z",
  branding: "m12 3 9 9-9 9-9-9 9-9Z M8 12h8 M12 8v8",
  media: "M3 3h18v18H3z M3 17l6-6 4 4 3-3 5 5 M15 7h.01",
  system: "M3 4h18v6H3z M3 14h18v6H3z M7 7h.01 M7 17h.01 M11 7h6 M11 17h6",
  refresh: "M20 7v5h-5 M4 17v-5h5 M6.1 7a7 7 0 0 1 11.6-2L20 8 M4 16l2.3 3A7 7 0 0 0 18 17",
  logout: "M9 3H4v18h5 M14 8l5 4-5 4 M8 12h11",
};
export default function AdminNavIcon({ name }: { name: string }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] ?? paths.overview} /></svg>;
}
