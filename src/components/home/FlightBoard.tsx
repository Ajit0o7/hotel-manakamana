import { Icon, type IconName } from '@/components/ui/Icon';
import { LocalClock } from '@/components/weather/LocalClock';
import { AIRLINES, FLIGHT_WINDOW } from '@/content/airlines';
import { SplitFlap } from './SplitFlap';

const TIPS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'calendar',
    title: 'Confirm the evening before',
    text: 'Lukla schedules move with the mountain weather. Check your flight time with your airline or agency the evening before, and again in the morning.',
  },
  {
    icon: 'bag',
    title: 'Pack light, leave the rest',
    text: 'Lukla flights have strict baggage limits, so check yours with the airline. Leave extra bags with us while you trek.',
  },
  {
    icon: 'plane',
    title: '500 m to the terminal',
    text: 'Wake up close to Manthali Airport: an easy walk or a very short ride, with no pre-dawn drive from Kathmandu.',
  },
];

/* Airport departures board for Manthali (Ramechhap) → Lukla. Overlaps the bottom of the Lukla banner
   the same way the booking card overlaps the hero. */
export function FlightBoard() {
  return (
    <section className="flights" aria-labelledby="flights-title">
      <div className="container">
        <div className="board reveal">
          <header className="board__head">
            <div className="board__title">
              <span className="board__icon"><Icon name="plane" /></span>
              <div>
                <p className="board__kicker">Departures · Manthali (Ramechhap) Airport</p>
                <h2 id="flights-title" className="board__h">
                  <span className="board__h-text">Flights to</span> <SplitFlap text="Lukla" delay={150} />
                </h2>
              </div>
            </div>
            <dl className="board__meta">
              <div><dt>Local time</dt><dd><LocalClock /></dd></div>
              <div><dt>Usual window</dt><dd>{FLIGHT_WINDOW}</dd></div>
              <div><dt>From the hotel</dt><dd>500 m</dd></div>
            </dl>
          </header>

          <div className="board__cols" aria-hidden="true">
            <span>Airline</span><span>Aircraft</span><span>Status</span><span>Contact the airline</span>
          </div>
          <ul className="board__rows">
            {AIRLINES.map((a, i) => (
              <li className="board__row" key={a.name}>
                <div className="board__airline">
                  <h3><SplitFlap text={a.name} delay={450 + i * 260} /></h3>
                  <p>{a.about}</p>
                </div>
                <div className="board__cell" data-label="Aircraft">
                  <Icon name="plane" /> {a.aircraft}
                </div>
                <div className="board__cell" data-label="Status">
                  <span className="board__status"><i aria-hidden="true" /> Weather permitting</span>
                </div>
                <div className="board__actions">
                  <a className="board__btn" href={`tel:${a.phoneTel}`} aria-label={`Call ${a.name} on ${a.phoneDisplay}`}>
                    <Icon name="phone" /> {a.phoneDisplay}
                  </a>
                  <a className="board__btn" href={a.url} target="_blank" rel="noopener noreferrer" aria-label={`${a.name} website (opens in a new tab)`}>
                    {a.site} <Icon name="arrowRight" className="board__arrow" />
                  </a>
                </div>
              </li>
            ))}
          </ul>
          <p className="board__note">
            Flights usually leave early in the morning and move with the weather. Tickets are booked with the airline or
            your trekking agency, so always confirm your departure time with them.
          </p>
        </div>

        <div className="grid grid--3 flight-tips" data-stagger="">
          {TIPS.map((t, i) => (
            <div className="feature reveal" key={t.title}>
              <span className="feature__num">0{i + 1}</span>
              <div className="feature__icon"><Icon name={t.icon} /></div>
              <h3>{t.title}</h3>
              <p>{t.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
