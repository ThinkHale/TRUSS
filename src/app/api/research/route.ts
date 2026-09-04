/**
 * Area research.
 *
 * Pulls real data — Google Geocoding, Google Places, Google Weather, and NOAA
 * storm reports — then has the model write a brief on top of it. The model is
 * never asked to recall facts about a place; it only interprets what we fetched.
 * That is the difference between a useful brief and a confident fabrication.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { openai, MODELS, isOpenAIConfigured } from '@/lib/ai/openai';
import { researchSystemPrompt } from '@/lib/ai/prompts';
import { geocode } from '@/lib/google/geocode';
import { searchNearby } from '@/lib/google/places';
import { currentConditions, forecastDays, assessWorkWindows } from '@/lib/google/weather';
import { stormSignal } from '@/lib/google/storms';
import { getSessionContext, loadOrgContext } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 90;

const bodySchema = z.object({
  query: z.string().min(2).max(200),
  radiusMiles: z.number().int().min(1).max(50).default(10),
  includeCommercial: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const session = await getSessionContext();
  if (!session) return Response.json({ error: 'Sign in to run research.' }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Invalid request.' }, { status: 400 });

  const { query, radiusMiles, includeCommercial } = parsed.data;
  const supabase = await supabaseServer();

  const { data: allowed } = await supabase.rpc('within_quota', {
    target_org: session.orgId,
    event_kind: 'research_brief',
  });
  if (allowed === false) {
    return Response.json(
      { error: 'quota_exceeded', message: 'You have used all your research briefs this month.' },
      { status: 429 },
    );
  }

  let location;
  try {
    location = await geocode(query);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Could not find that location.' },
      { status: 400 },
    );
  }

  const radiusMeters = radiusMiles * 1609.34;

  // Fetch everything at once. Weather and storms are the load-bearing data for
  // this audience, so a Places failure must not take the whole brief down.
  const [current, forecast, storms, places] = await Promise.all([
    currentConditions(location.lat, location.lng).catch(() => null),
    forecastDays(location.lat, location.lng, 7).catch(() => []),
    stormSignal(location.lat, location.lng, Math.max(radiusMiles, 25), 365).catch(() => null),
    includeCommercial
      ? searchNearby(location.lat, location.lng, radiusMeters).catch(() => [])
      : Promise.resolve([]),
  ]);

  const workWindows = assessWorkWindows(forecast);

  let brief: string | null = null;
  if (isOpenAIConfigured()) {
    try {
      const orgContext = await loadOrgContext(session);
      const completion = await openai().chat.completions.create({
        model: MODELS.structured,
        temperature: 0.4,
        max_tokens: 1200,
        messages: [
          { role: 'system', content: researchSystemPrompt(orgContext) },
          { role: 'user', content: buildResearchPrompt({
              address: location.formattedAddress,
              radiusMiles,
              current,
              forecast,
              workWindows,
              storms,
              places,
            }) },
        ],
      });
      brief = completion.choices[0]?.message?.content?.trim() ?? null;
    } catch {
      // The data below is useful on its own; the narrative is a bonus.
      brief = null;
    }
  }

  const { data: saved } = await supabase
    .from('area_research')
    .insert({
      org_id: session.orgId,
      user_id: session.userId,
      query,
      formatted_address: location.formattedAddress,
      lat: location.lat,
      lng: location.lng,
      state: location.state,
      postal_code: location.postalCode,
      radius_miles: radiusMiles,
      weather_current: current,
      weather_forecast: forecast,
      work_windows: workWindows,
      storm_signal: storms,
      places,
      brief,
    })
    .select('id')
    .single();

  await supabase.rpc('record_usage', {
    target_org: session.orgId,
    target_user: session.userId,
    event_kind: 'research_brief',
    qty: 1,
    model_name: MODELS.structured,
  });

  return Response.json({
    id: saved?.id ?? null,
    location,
    radiusMiles,
    current,
    forecast,
    workWindows,
    storms,
    places,
    brief,
  });
}

function buildResearchPrompt(input: {
  address: string;
  radiusMiles: number;
  current: Awaited<ReturnType<typeof currentConditions>> | null;
  forecast: Awaited<ReturnType<typeof forecastDays>>;
  workWindows: ReturnType<typeof assessWorkWindows>;
  storms: Awaited<ReturnType<typeof stormSignal>> | null;
  places: Awaited<ReturnType<typeof searchNearby>>;
}): string {
  const { address, radiusMiles, current, forecast, workWindows, storms, places } = input;

  const sections: string[] = [
    `AREA: ${address} (within ${radiusMiles} miles)`,
  ];

  if (current) {
    sections.push(
      `CURRENT CONDITIONS\n${current.description}, ${current.tempF}°F (feels ${current.feelsLikeF}°F), ` +
        `wind ${current.windMph} mph${current.windGustMph ? ` gusting ${current.windGustMph}` : ''}, ` +
        `${current.precipProbability}% precip.`,
    );
  }

  if (forecast.length) {
    const rows = forecast
      .map((d, i) => {
        const w = workWindows[i];
        return `${d.date}: ${d.description}, ${d.highF}/${d.lowF}°F, wind ${d.windMph} mph, ` +
          `${d.precipProbability}% precip, ${d.thunderstormProbability}% storms | ` +
          `install: ${w?.install.rating} | canvass: ${w?.canvass.rating}`;
      })
      .join('\n');
    sections.push(`SEVEN DAY FORECAST AND WORK WINDOWS\n${rows}`);
  }

  if (storms) {
    const reports = storms.reports
      .slice(0, 20)
      .map(
        (r) =>
          `${r.occurredAt.slice(0, 10)} ${r.type}` +
          `${r.magnitude ? ` ${r.magnitude}${r.unit ?? ''}` : ''} near ${r.city}, ${r.state} ` +
          `(${r.distanceMiles} mi)`,
      )
      .join('\n');

    sections.push(
      `SEVERE WEATHER SIGNAL\n${storms.summary}\n` +
        (storms.alerts.length
          ? `Active alerts: ${storms.alerts.map((a) => a.event).join(', ')}\n`
          : '') +
        (reports ? `Recent reports:\n${reports}` : 'No individual reports in the window.'),
    );
  }

  if (places.length) {
    const list = places
      .slice(0, 25)
      .map((p) => `- ${p.name} (${p.primaryType ?? 'business'}) — ${p.address}`)
      .join('\n');
    sections.push(`NEARBY COMMERCIAL PROPERTIES (Google Places)\n${list}`);
  }

  sections.push(
    `Write the brief. Start with the single most useful sentence for a rep about to work this area today. ` +
      `Then cover: the storm story and whether it is still claimable, what the week's weather means for ` +
      `crews and for knocking, and which commercial properties are worth a call and why. ` +
      `Only use the data above. If something is not supported by it, say so.`,
  );

  return sections.join('\n\n');
}
