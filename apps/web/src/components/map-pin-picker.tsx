"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Crosshair, LocateFixed, MapPin, PinOff } from "lucide-react";
import type { LatLngTuple, LeafletMouseEvent, Map as LeafletMap, Marker } from "leaflet";

type LeafletNamespace = typeof import("leaflet");

const BANGLADESH_CENTER: LatLngTuple = [23.685, 90.3563];

export function MapPinPicker({
  label = "Map pin",
  latitudeName = "latitude",
  longitudeName = "longitude",
  sourceName = "map_pin_source",
  initialLatitude = null,
  initialLongitude = null,
  initialAddress = null,
  addressInputName = "address",
  required = false,
  showMapAddressButton = true
}: {
  label?: string;
  latitudeName?: string;
  longitudeName?: string;
  sourceName?: string;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  initialAddress?: string | null;
  addressInputName?: string;
  required?: boolean;
  showMapAddressButton?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const leafletRef = useRef<LeafletNamespace | null>(null);
  const [latitude, setLatitude] = useState<number | null>(initialLatitude);
  const [longitude, setLongitude] = useState<number | null>(initialLongitude);
  const [pinSource, setPinSource] = useState("manual");
  const [message, setMessage] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeLanguage, setGeocodeLanguage] = useState("en");
  const lastGeocodedAddressRef = useRef<string | null>(null);

  const applyPin = useCallback((
    nextLatitude: number,
    nextLongitude: number,
    shouldZoom = true,
    nextSource = "manual"
  ) => {
    setLatitude(nextLatitude);
    setLongitude(nextLongitude);
    setPinSource(nextSource);
    setMessage(null);

    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    const position: LatLngTuple = [nextLatitude, nextLongitude];
    if (!markerRef.current) {
      markerRef.current = L.marker(position, { icon: createPinIcon(L) }).addTo(map);
    } else {
      markerRef.current.setLatLng(position);
    }

    if (shouldZoom) {
      map.setView(position, Math.max(map.getZoom(), 14));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function setupMap() {
      if (!mapElementRef.current || mapRef.current) return;

      const L = await import("leaflet");
      if (cancelled || !mapElementRef.current) return;

      leafletRef.current = L;

      const hasInitialPin = initialLatitude !== null && initialLongitude !== null;
      const center: LatLngTuple = hasInitialPin
        ? [initialLatitude, initialLongitude]
        : BANGLADESH_CENTER;

      const map = L.map(mapElementRef.current, {
        center,
        zoom: hasInitialPin ? 14 : 7,
        zoomControl: true
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      map.on("click", (event: LeafletMouseEvent) => {
        applyPin(event.latlng.lat, event.latlng.lng, true, "manual");
      });

      mapRef.current = map;
      if (hasInitialPin) {
        applyPin(initialLatitude, initialLongitude, false, "manual");
      }

      window.setTimeout(() => map.invalidateSize(), 0);
    }

    setupMap();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      leafletRef.current = null;
    };
  }, [applyPin, initialLatitude, initialLongitude]);

  const geocodeAddress = useCallback(async (
    address: string,
    shouldOverwriteExistingPin = false,
    forceLookup = false
  ) => {
    const trimmedAddress = address.trim();
    if (!trimmedAddress || (!forceLookup && lastGeocodedAddressRef.current === trimmedAddress)) return;
    if (!shouldOverwriteExistingPin && latitude !== null && longitude !== null) return;

    setIsGeocoding(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/geocode?address=${encodeURIComponent(trimmedAddress)}&language=${encodeURIComponent(geocodeLanguage)}`
      );
      if (!response.ok) throw new Error("Geocoding failed");

      const payload = (await response.json()) as {
        result?: { latitude: number; longitude: number; label?: string } | null;
      };
      lastGeocodedAddressRef.current = trimmedAddress;

      if (!payload.result) {
        setMessage("No map match found for this address. Drop the pin manually.");
        return;
      }

      applyPin(payload.result.latitude, payload.result.longitude, true, "geocoded_address");
      setMessage("Pin placed from the address. Adjust it on the map if needed.");
    } catch {
      setMessage("Could not map this address. Drop the pin manually.");
    } finally {
      setIsGeocoding(false);
    }
  }, [applyPin, geocodeLanguage, latitude, longitude]);

  useEffect(() => {
    if (initialLatitude !== null && initialLongitude !== null) return;
    if (!initialAddress) return;
    geocodeAddress(initialAddress);
  }, [geocodeAddress, initialAddress, initialLatitude, initialLongitude]);

  useEffect(() => {
    const form = containerRef.current?.closest("form");
    const addressInput = form?.querySelector<HTMLInputElement>(`input[name="${addressInputName}"]`);
    if (!addressInput) return;

    const addressField = addressInput;
    let timeout: number | null = null;

    function scheduleGeocode() {
      if (timeout) window.clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        if (addressField.value.trim()) {
          geocodeAddress(addressField.value, pinSource === "geocoded_address");
        }
      }, 700);
    }

    addressField.addEventListener("blur", scheduleGeocode);
    addressField.addEventListener("change", scheduleGeocode);

    return () => {
      if (timeout) window.clearTimeout(timeout);
      addressField.removeEventListener("blur", scheduleGeocode);
      addressField.removeEventListener("change", scheduleGeocode);
    };
  }, [addressInputName, geocodeAddress, pinSource]);

  useEffect(() => {
    const form = containerRef.current?.closest("form");
    const button = form?.querySelector<HTMLButtonElement>(`button[data-map-address-button="${addressInputName}"]`);
    const addressInput = form?.querySelector<HTMLInputElement>(`input[name="${addressInputName}"]`);
    if (!button || !addressInput) return;

    function handleClick() {
      if (!addressInput?.value.trim()) {
        setMessage("Enter an address before mapping it.");
        return;
      }
      geocodeAddress(addressInput.value, true, true);
    }

    button.addEventListener("click", handleClick);
    return () => button.removeEventListener("click", handleClick);
  }, [addressInputName, geocodeAddress]);

  useEffect(() => {
    if (!required) return;

    const form = containerRef.current?.closest("form");
    if (!form) return;

    function handleSubmit(event: SubmitEvent) {
      if (latitude !== null && longitude !== null) return;
      event.preventDefault();
      setMessage("Drop a pin on the map before creating the school.");
      containerRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }

    form.addEventListener("submit", handleSubmit);
    return () => form.removeEventListener("submit", handleSubmit);
  }, [latitude, longitude, required]);

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setMessage("Current location is not available in this browser.");
      return;
    }

    setIsLocating(true);
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        applyPin(position.coords.latitude, position.coords.longitude, true, "current_location");
        setIsLocating(false);
      },
      () => {
        setMessage("Could not use current location. Drop the pin manually instead.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function removePin() {
    markerRef.current?.remove();
    markerRef.current = null;
    setLatitude(null);
    setLongitude(null);
    setPinSource("manual");
    setMessage("Pin removed. Click the map, use current location, or map the address to add one.");
  }

  return (
    <div ref={containerRef} className="md:col-span-2">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm font-medium text-slate-700">
          {label}
          {required ? <span className="ml-1 text-red-600">*</span> : null}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
            Address language
            <select
              value={geocodeLanguage}
              onChange={(event) => setGeocodeLanguage(event.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs outline-none focus:border-red-700"
            >
              <option value="en">English</option>
              <option value="bn">Bangla</option>
            </select>
          </label>
          {showMapAddressButton ? (
            <button
              type="button"
              onClick={() => {
                const form = containerRef.current?.closest("form");
                const addressInput = form?.querySelector<HTMLInputElement>(`input[name="${addressInputName}"]`);
                if (!addressInput?.value.trim()) {
                  setMessage("Enter an address before mapping it.");
                  return;
                }
                geocodeAddress(addressInput.value, true, true);
              }}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <LocateFixed className="h-3.5 w-3.5" />
              {isGeocoding ? "Mapping..." : "Map address"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={useCurrentLocation}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Crosshair className="h-3.5 w-3.5" />
            {isLocating ? "Locating..." : "Use current location"}
          </button>
          {latitude !== null && longitude !== null ? (
            <button
              type="button"
              onClick={removePin}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <PinOff className="h-3.5 w-3.5" />
              Remove pin
            </button>
          ) : null}
        </div>
      </div>

      <input name={latitudeName} type="hidden" value={latitude?.toFixed(7) ?? ""} />
      <input name={longitudeName} type="hidden" value={longitude?.toFixed(7) ?? ""} />
      <input name={sourceName} type="hidden" value={pinSource} />

      <div
        ref={mapElementRef}
        className="h-80 overflow-hidden rounded-md border border-slate-300 bg-slate-100"
        aria-label="Map pin selector"
      />

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-red-700" />
          {latitude !== null && longitude !== null
            ? `Selected: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
            : isGeocoding
              ? "Mapping address..."
              : "Click the map to drop a pin."}
        </span>
        {message ? <span className="font-medium text-red-600">{message}</span> : null}
      </div>
    </div>
  );
}

function createPinIcon(L: LeafletNamespace) {
  return L.divIcon({
    className: "",
    html: '<div class="leaflet-lily-pin"></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 24]
  });
}
