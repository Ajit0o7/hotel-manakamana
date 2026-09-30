import { Eyebrow } from '@/components/ui/Eyebrow';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { Icon } from '@/components/ui/Icon';

export function FlightBoard() {
  const airlines = [
    {
      name: 'Tara Air',
      website: 'www.taraair.com',
      url: 'https://www.taraair.com',
      phone: '+977 1-4110828',
      aircraft: 'Twin Otter (DHC-6) & Dornier 228',
      desc: 'One of the largest operators for the Lukla route, flying rugged STOL aircraft perfectly designed for mountain airstrips.'
    },
    {
      name: 'Summit Air',
      website: 'summitair.com.np',
      url: 'https://summitair.com.np',
      phone: '+977 1-4488340',
      aircraft: 'Let L-410 Turbolet',
      desc: 'Operates a fleet of specialized Let L-410 twin-engine turboprops, highly suited for the short and steep Lukla runway.'
    },
    {
      name: 'Sita Air',
      website: 'www.sitaair.com.np',
      url: 'http://www.sitaair.com.np',
      phone: '+977 1-4467026',
      aircraft: 'Dornier 228',
      desc: 'Provides daily morning flights using highly reliable Dornier 228 twin-turboprop STOL aircraft.'
    }
  ];

  return (
    <section className="section section--pine" id="flight-info-section">
      <div className="container">
        <div className="section__head center" style={{ maxWidth: '700px', margin: '0 auto 60px' }}>
          <Eyebrow>Airlines & Flight Information</Eyebrow>
          <SplitHeading>Manthali to Lukla Flights</SplitHeading>
          <p className="reveal">
            Flights to Lukla typically operate between <strong>6:00 AM and 10:00 AM</strong>. 
            Because schedules are highly dependent on mountain weather, we strongly recommend contacting your airline directly for the most accurate and up-to-date departure times.
          </p>
        </div>

        <div className="grid grid--3">
          {airlines.map((airline, i) => (
            <div key={i} className="flight-card reveal" style={{ transitionDelay: `${i * 0.15}s` }}>
              <div className="flight-card__logo">{airline.name.charAt(0)}</div>
              <h3>{airline.name}</h3>
              <p>{airline.desc}</p>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.04)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', color: '#c3d1ca', margin: '0 0 12px 0', width: '100%', border: '1px solid rgba(255,255,255,0.05)' }}>
                <Icon name="plane" className="aircraft-icon" />
                <strong>Aircraft:</strong> {airline.aircraft}
              </div>
              <div className="flight-card__links">
                <a href={airline.url} target="_blank" rel="noopener noreferrer" className="flight-link">
                  <Icon name="arrowRight" /> {airline.website}
                </a>
                <a href={`tel:${airline.phone.replace(/[\s-]/g, '')}`} className="flight-link">
                  <Icon name="phone" /> {airline.phone}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
