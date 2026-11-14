import "server-only";
import { City, Country, State } from "country-state-city";

export type StructuredLocation = {
  countryCode: string;
  countryName: string;
  stateCode: string | null;
  stateName: string | null;
  city: string;
  label: string;
};

export function getCountries() {
  return Country.getAllCountries()
    .map((country) => ({ code: country.isoCode, name: country.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getUnitedStates() {
  return State.getStatesOfCountry("US")
    .map((state) => ({ code: state.isoCode, name: state.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function searchCities({
  countryCode,
  stateCode,
  query,
  limit = 80,
}: {
  countryCode: string;
  stateCode?: string | null;
  query: string;
  limit?: number;
}) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (normalizedQuery.length < 2) return [];
  const cities =
    countryCode === "US"
      ? stateCode
        ? City.getCitiesOfState(countryCode, stateCode)
        : []
      : City.getCitiesOfCountry(countryCode) ?? [];
  const unique = new Map<string, { name: string }>();
  for (const city of cities) {
    if (!city.name.toLocaleLowerCase().includes(normalizedQuery)) continue;
    unique.set(city.name.toLocaleLowerCase(), { name: city.name });
    if (unique.size >= limit) break;
  }
  return [...unique.values()].sort((a, b) => {
    const aStarts = a.name.toLocaleLowerCase().startsWith(normalizedQuery);
    const bStarts = b.name.toLocaleLowerCase().startsWith(normalizedQuery);
    return Number(bStarts) - Number(aStarts) || a.name.localeCompare(b.name);
  });
}

export function resolveStructuredLocation(input: {
  countryCode?: unknown;
  stateCode?: unknown;
  city?: unknown;
}): StructuredLocation | null {
  const countryCode =
    typeof input.countryCode === "string" ? input.countryCode.trim().toUpperCase() : "";
  const stateCode =
    typeof input.stateCode === "string" ? input.stateCode.trim().toUpperCase() : "";
  const city = typeof input.city === "string" ? input.city.trim() : "";
  const country = Country.getCountryByCode(countryCode);
  if (!country || !city) return null;

  if (countryCode === "US") {
    const state = State.getStateByCodeAndCountry(stateCode, countryCode);
    if (!state) return null;
    const matchedCity = City.getCitiesOfState(countryCode, stateCode).find(
      (candidate) => candidate.name.toLocaleLowerCase() === city.toLocaleLowerCase(),
    );
    if (!matchedCity) return null;
    return {
      countryCode,
      countryName: country.name,
      stateCode,
      stateName: state.name,
      city: matchedCity.name,
      label: `${matchedCity.name}, ${stateCode}, ${country.name}`,
    };
  }

  const matchedCity = (City.getCitiesOfCountry(countryCode) ?? []).find(
    (candidate) => candidate.name.toLocaleLowerCase() === city.toLocaleLowerCase(),
  );
  if (!matchedCity) return null;
  return {
    countryCode,
    countryName: country.name,
    stateCode: null,
    stateName: null,
    city: matchedCity.name,
    label: `${matchedCity.name}, ${country.name}`,
  };
}
