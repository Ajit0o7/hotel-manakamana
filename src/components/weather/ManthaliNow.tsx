import { Icon, type IconName } from '@/components/ui/Icon';
import { HOTEL } from '@/content/hotel';
import { LocalClock } from './LocalClock';

/* Live conditions in Manthali from Open-Meteo (free, no API key), cached on the server for 30 minutes.
   If the service can't be reached the card simply isn't shown. */

type Current = { temperature_2m: number; apparent_temperature: number; weather_code: number; cloud_cover: number; wind_speed_10m: number; is_day: number };

async function getWeather(): Promise<{ current: Current; sunrise?: string; sunset?: string } | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${HOTEL.geo.lat}&longitude=${HOTEL.geo.lng}` +
    '&current=temperature_2m,apparent_temperature,weather_code,cloud_cover,wind_speed_10m,is_day' +
    '&daily=sunrise,sunset&timezone=Asia%2FKathmandu&forecast_days=1';
  try {
    const res = await fetch(url, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.current) return null;
    return { current: json.current as Current, sunrise: json.daily?.sunrise?.[0], sunset: json.daily?.sunset?.[0] };
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

export async function ManthaliNow({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const data = await getWeather();
  if (!data) return null;
  const { current: c } = data;
  const sky = describe(c.weather_code, c.is_day === 1);
  return (
    <div className={`now now--${tone} reveal`} role="group" aria-label="Weather in Manthali now">
      <span className="now__icon"><Icon name={sky.icon} /></span>
      <div>
        <span className="now__label">Now in Manthali</span>
        <span className="now__temp">{Math.round(c.temperature_2m)}°C</span>
      </div>
      <div>
        <span className="now__label">Sky</span>
        {sky.label} · {Math.round(c.cloud_cover)}% cloud
      </div>
      <div>
        <span className="now__label">Wind</span>
        {Math.round(c.wind_speed_10m)} km/h
      </div>
      <div>
        <span className="now__label">Local time</span>
        <LocalClock />
      </div>
      {data.sunrise && data.sunset && (
        <div>
          <span className="now__label">Sun</span>
          ↑ {hhmm(data.sunrise)} · ↓ {hhmm(data.sunset)}
        </div>
      )}
      <p className="now__note">Mountain flights depend on the weather. Always confirm your flight time with your airline.</p>
    </div>
  );
}
