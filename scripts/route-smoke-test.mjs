import pg from "pg";

const { Pool } = pg;
const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
});

async function signIn(path, body) {
  const response = await fetch(`${origin}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${await response.text()}`);
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error(`${path} did not return a session cookie.`);
  return cookie;
}

async function check(path, cookie = "") {
  const response = await fetch(`${origin}${path}`, {
    headers: cookie ? { cookie } : {},
    redirect: "manual",
  });
  const body = await response.text();
  if (response.status >= 500 || /Application error|code ERROR|internal server error/i.test(body)) {
    throw new Error(`${path} failed with ${response.status}`);
  }
  return { path, status: response.status };
}

try {
  const [{ rows: profiles }, { rows: events }, { rows: members }] = await Promise.all([
    pool.query("select slug from profiles where is_published = true order by slug"),
    pool.query("select slug from events where is_published = true order by slug"),
    pool.query("select username, primary_role from members where deleted_at is null and email_verified_at is not null and admin_approved_at is not null order by username"),
  ]);
  const staticPages = [
    "/", "/about", "/contact", "/discover", "/events", "/gallery", "/host",
    "/login", "/membership", "/models", "/privacy", "/signup",
    "/signup/check-email", "/sponsorships", "/terms", "/checkout", "/billing/success",
  ];
  const publicPages = [
    ...staticPages,
    ...profiles.flatMap(({ slug }) => [`/members/${slug}`, `/invite/${slug}`]),
    ...events.flatMap(({ slug }) => [`/events/${slug}`, `/events/${slug}/join`]),
    ...members.map(({ username }) => `/users/${username}`),
  ];
  const results = [];
  for (const page of publicPages) results.push(await check(page));

  const regular = members.find((member) => member.primary_role === "model") ?? members[0];
  const host = members.find((member) => member.primary_role === "host");
  if (!regular || !host) throw new Error("Smoke-test member accounts are missing.");
  const regularCookie = await signIn("/api/auth/login", { credential: regular.username, password: process.env.TEST_PASSWORD });
  const hostCookie = await signIn("/api/auth/login", { credential: host.username, password: process.env.TEST_PASSWORD });
  results.push(await check("/dashboard", regularCookie));
  results.push(await check("/dashboard", hostCookie));
  results.push(await check("/host/new", hostCookie));

  const adminCookie = await signIn("/api/admin/login", { username: "admin", password: process.env.TEST_PASSWORD });
  results.push(await check("/admin", adminCookie));

  const counts = results.reduce((summary, result) => {
    summary[result.status] = (summary[result.status] ?? 0) + 1;
    return summary;
  }, {});
  console.log(`Route smoke test passed: ${results.length} pages checked (${Object.entries(counts).map(([status, count]) => `${count}×${status}`).join(", ")}).`);
} finally {
  await pool.end();
}
