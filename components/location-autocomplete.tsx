"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

type Option = { code?: string; name: string };

export type LocationSelection = {
  countryCode: string;
  stateCode: string;
  city: string;
  location: string;
  isValid: boolean;
};

export default function LocationAutocomplete({
  name = "location",
  label,
  defaultCountryCode = "US",
  defaultStateCode = "",
  defaultCity = "",
  onChange,
  required = true,
}: {
  name?: string;
  label: string;
  defaultCountryCode?: string;
  defaultStateCode?: string;
  defaultCity?: string;
  onChange?: (selection: LocationSelection) => void;
  required?: boolean;
}) {
  const cityListId = useId();
  const [countries, setCountries] = useState<Option[]>([]);
  const [states, setStates] = useState<Option[]>([]);
  const [cities, setCities] = useState<Option[]>([]);
  const [countryCode, setCountryCode] = useState(defaultCountryCode || "US");
  const [stateCode, setStateCode] = useState(defaultStateCode);
  const [city, setCity] = useState(defaultCity);
  const [loadingCities, setLoadingCities] = useState(false);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    fetch("/api/locations?level=countries")
      .then((response) => response.json())
      .then((data) => setCountries(Array.isArray(data.options) ? data.options : []))
      .catch(() => setCountries([]));
  }, []);

  useEffect(() => {
    if (countryCode !== "US") return;
    fetch("/api/locations?level=states&country=US")
      .then((response) => response.json())
      .then((data) => setStates(Array.isArray(data.options) ? data.options : []))
      .catch(() => setStates([]));
  }, [countryCode]);

  useEffect(() => {
    if (city.trim().length < 2 || (countryCode === "US" && !stateCode)) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoadingCities(true);
      try {
        const params = new URLSearchParams({
          level: "cities",
          country: countryCode,
          q: city,
        });
        if (stateCode) params.set("state", stateCode);
        const response = await fetch(`/api/locations?${params}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        setCities(Array.isArray(data.options) ? data.options : []);
      } catch {
        if (!controller.signal.aborted) setCities([]);
      } finally {
        if (!controller.signal.aborted) setLoadingCities(false);
      }
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [city, countryCode, stateCode]);

  const countryName =
    countries.find((country) => country.code === countryCode)?.name ??
    (countryCode === "US" ? "United States" : "");
  const exactCity = cities.find(
    (option) => option.name.toLocaleLowerCase() === city.trim().toLocaleLowerCase(),
  )?.name;
  const isValid = Boolean(
    countryCode &&
      countryName &&
      (countryCode !== "US" || stateCode) &&
      city &&
      (exactCity || city === defaultCity),
  );
  const location = isValid
    ? countryCode === "US"
      ? `${exactCity ?? city}, ${stateCode}, ${countryName}`
      : `${exactCity ?? city}, ${countryName}`
    : "";

  const selection = useMemo(
    () => ({ countryCode, stateCode, city: exactCity ?? city, location, isValid }),
    [countryCode, stateCode, city, exactCity, location, isValid],
  );

  useEffect(() => {
    onChangeRef.current?.(selection);
  }, [selection]);

  return (
    <fieldset className="structured-location">
      <legend>{label}</legend>
      <label>
        Country
        <select
          name="countryCode"
          value={countryCode}
          required={required}
          onChange={(event) => {
            setCountryCode(event.target.value);
            setStateCode("");
            setCity("");
            setCities([]);
          }}
        >
          {!countries.length && <option value="US">United States</option>}
          {countries.map((country) => (
            <option value={country.code} key={country.code}>
              {country.name}
            </option>
          ))}
        </select>
      </label>
      {countryCode === "US" && (
        <label>
          State
          <select
            name="stateCode"
            value={stateCode}
            required={required}
            onChange={(event) => {
              setStateCode(event.target.value);
              setCity("");
              setCities([]);
            }}
          >
            <option value="">Choose a state</option>
            {states.map((state) => (
              <option value={state.code} key={state.code}>
                {state.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        City
        <input
          name="city"
          type="text"
          list={cityListId}
          value={city}
          placeholder={
            countryCode === "US" && !stateCode
              ? "Choose a state first"
              : "Type at least 2 letters"
          }
          disabled={countryCode === "US" && !stateCode}
          required={required}
          autoComplete="off"
          onChange={(event) => {
            setCity(event.target.value);
            event.target.setCustomValidity("");
          }}
          onBlur={(event) => {
            event.currentTarget.setCustomValidity(
              !event.currentTarget.value || isValid
                ? ""
                : "Choose an exact city from the suggestions.",
            );
          }}
        />
        <datalist id={cityListId}>
          {cities.map((option) => (
            <option value={option.name} key={option.name} />
          ))}
        </datalist>
        <small>
          {loadingCities
            ? "Searching the location catalog…"
            : "Choose an exact city from the suggestions."}
        </small>
      </label>
      <input name={name} type="hidden" value={location} />
    </fieldset>
  );
}
