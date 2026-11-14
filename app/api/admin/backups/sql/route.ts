import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
const run = promisify(execFile);

export async function GET() {
  if (!(await getCurrentAdmin())) return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  try {
    const { stdout } = await run("pg_dump", ["--no-owner", "--no-privileges", "--clean", "--if-exists", databaseUrl], {
      maxBuffer: 100 * 1024 * 1024,
    });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    return new Response(stdout, {
      headers: {
        "content-type": "application/sql; charset=utf-8",
        "content-disposition": `attachment; filename="model-escape-${stamp}.sql"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("SQL backup failed", error);
    return NextResponse.json({ error: "The SQL backup could not be created." }, { status: 500 });
  }
}
