import { NextRequest } from "next/server";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

type NominatimResult = {
  lat?: string;
  lon?: string;
  display_name?: string;
};

export async function GET(request: NextRequest) {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
    if (!data.user) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const address = new URL(request.url).searchParams.get("address")?.trim();
  const requestedLanguage = new URL(request.url).searchParams.get("language")?.trim();
  const language = requestedLanguage === "bn" ? "bn,en;q=0.8" : "en,bn;q=0.8";
  if (!address) {
    return Response.json({ error: "address is required" }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "bd");
  url.searchParams.set("accept-language", language);
  url.searchParams.set("q", address);

  const response = await fetch(url, {
    headers: {
      "Accept-Language": language,
      "User-Agent": "lily-charities-operations/0.1"
    },
    next: { revalidate: 60 * 60 * 24 * 30 }
  });

  if (!response.ok) {
    return Response.json({ error: "Could not geocode address" }, { status: 502 });
  }

  const results = (await response.json()) as NominatimResult[];
  const [result] = results;
  if (!result?.lat || !result.lon) {
    return Response.json({ result: null });
  }

  return Response.json({
    result: {
      latitude: Number(result.lat),
      longitude: Number(result.lon),
      label: result.display_name ?? address
    }
  });
}
