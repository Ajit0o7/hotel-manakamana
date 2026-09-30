import { Icon, type IconName } from '@/components/ui/Icon';
import { HOTEL } from '@/content/hotel';
import { LocalClock } from './LocalClock';

/* Live conditions in Manthali and at Lukla (Tenzing-Hillary Airport) from Open-Meteo (free, no API key),
   in one request, cached on the server for 30 minutes. Lukla's weather is what usually decides the flights.
   If the service can't be reached the card simply isn't shown. This is weather, not flight status. */

type Current = { temperature_2m: number; weather_code: number; cloud_cover: number; wind_speed_10m: number; is_day: number; visibility?: number };
type Place = { current: Current; sunrise?: string; sunset?: string };

const LUKLA = { lat: 27.6869, lng: 86.7297 };

async function getWeather(): Promise<{ manthali: Place; lukla: Place } | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${HOTEL.geo.lat},${LUKLA.lat}&longitude=${HOTEL.geo.lng},${LUKLA.lng}` +
    '&current=temperature_2m,weather_code,cloud_cover,wind_speed_10m,is_day,visibility' +
    '&daily=sunrise,sunset&timezone=Asia%2FKathmandu&forecast_days=1';
  try {
    const res = await fetch(url, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const json = await res.json();
    if (!Array.isArray(json) || json.length < 2 || !json[0]?.current || !json[1]?.current) return null;
    const place = (p: { current: Current; daily?: { sunrise?: string[]; sunset?: string[] } }): Place => ({
      current: p.current,
      sunrise: p.daily?.sunrise?.[0],
      sunset: p.daily?.sunset?.[0],
    });
    return { manthali: place(json[0]), lukla: place(json[1]) };
  } catch {
    return null;
  }
}

// WMO weather codes → words + icon
function describe(code: number, isDay: boolean): { label: string; icon: IconName } {
  if (code === 0) return { label: isDay ? 'Clear sky' : 'Clear night', icon: isDay ? 'sun' : 'moon' };
  if (code <= 2) return { label: 'Partly cloudy', icon: 'cloudSun' };
  if (code === 3) return { label: 'Overcast', icon: 'cloud' };
  if (code === 45 || code === 48) return { label: 'Fog', icon: 'fog' };
  if (code >= 51 && code <= 67) return { label: 'Rain', icon: 'rain' };
  if (code >= 71 && code <= 77) return { label: 'Snow', icon: 'snow' };
  if (code >= 80 && code <= 82) return { label: 'Showers', icon: 'rain' };
  if (code >= 95) return { label: 'Thunderstorm', icon: 'storm' };
  return { label: 'Cloudy', icon: 'cloud' };
}

const hhmm = (iso?: string) => (iso ? iso.slice(11, 16) : '');
const km = (m?: number) => (m == null ? null : m >= 10_000 ? '10+ km' : `${(m / 1000).toFixed(1)} km`);

function PlaceCard({ name, sub, p }: { name: string; sub: string; p: Place }) {
  const c = p.current;
  const sky = describe(c.weather_code, c.is_day === 1);
  const vis = km(c.visibility);
  return (
    <div className="now__place">
      <span className="now__label">{name} <span className="now__sub">· {sub}</span></span>
      <div className="now__main">
        <span className="now__icon"><Icon name={sky.icon} /></span>
        <span className="now__temp">{Math.round(c.temperature_2m)}°C</span>
      </div>
      <p className="now__line">
        {sky.label} · {Math.round(c.cloud_cover)}% cloud · wind {Math.round(c.wind_speed_10m)} km/h
        {vis && <> · visibility {vis}</>}
      </p>
    </div>
  );
}

export async function ManthaliNow({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const data = await getWeather();
  if (!data) return null;
  const { manthali, lukla } = data;
  return (
    <div className={`now now--${tone} reveal`} role="group" aria-label="Weather now in Manthali and Lukla">
      <div className="now__places">
        <PlaceCard name="Manthali" sub="Ramechhap Airport" p={manthali} />
        <PlaceCard name="Lukla" sub="about 2,850 m" p={lukla} />
      </div>
      <div className="now__foot">
        <span><span className="now__label">Local time</span> <LocalClock /></span>
        {manthali.sunrise && manthali.sunset && (
          <span><span className="now__label">Sun</span> ↑ {hhmm(manthali.sunrise)} · ↓ {hhmm(manthali.sunset)}</span>
        )}
      </div>
      <p className="now__note">
        This is weather, not flight status. Lukla flights depend on conditions at Lukla and along the route, so always
        confirm your flight time with your airline.
      </p>
    </div>
  );
}
