import { NextResponse } from "next/server";
import { getCountries, getUnitedStates, searchCities } from "@/lib/locations";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const level = searchParams.get("level");
  if (level === "countries") {
    return NextResponse.json({ options: getCountries() });
  }
  if (level === "states") {
    if ((searchParams.get("country") ?? "US").toUpperCase() !== "US") {
      return NextResponse.json({ options: [] });
    }
    return NextResponse.json({ options: getUnitedStates() });
  }
  if (level === "cities") {
    const countryCode = (searchParams.get("country") ?? "").toUpperCase();
    const stateCode = (searchParams.get("state") ?? "").toUpperCase();
    const query = searchParams.get("q") ?? "";
    if (!/^[A-Z]{2}$/.test(countryCode) || (countryCode === "US" && !stateCode)) {
      return NextResponse.json({ options: [] });
    }
    return NextResponse.json({
      options: searchCities({ countryCode, stateCode, query }),
    });
  }
  return NextResponse.json({ error: "Unknown location level." }, { status: 400 });
}
