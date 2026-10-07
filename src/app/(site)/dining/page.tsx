import type { Metadata } from 'next';
import Image from 'next/image';
import { CtaBand } from '@/components/sections/CtaBand';
import { PageHero } from '@/components/sections/PageHero';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { IMG, type Photo } from '@/content/images';
import { pageMetadata } from '@/lib/cms/site';

const FALLBACK: Metadata = {
  title: 'Rooftop Restaurant',
  description: 'Nepali thali, dal bhat, breakfasts and tea on our rooftop terrace in Manthali, Ramechhap. Room service available.',
  alternates: { canonical: '/dining' },
};

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata('dining', '/dining', FALLBACK);
}

const MENU: (Photo & { tag: string; title: string; text: string })[] = [
  { src: IMG.foodThali, alt: 'Nepali thali', tag: 'Signature', title: 'Nepali thali', text: 'Rice, dal, vegetable curry, saag, pickles, papad and curd, served the traditional way.' },
  { src: IMG.foodDalBhat, alt: 'Dal bhat', tag: 'Everyday favourite', title: 'Dal bhat', text: "The classic trekker's meal. It's filling and wholesome, and refills are always welcome." },
  { src: IMG.foodBreakfast, alt: 'Breakfast plate', tag: 'Morning', title: 'Breakfast', text: 'Eggs, potatoes and local sides, so you set off well fed.' },
  { src: IMG.foodSandwich, alt: 'Sandwich with fries', tag: 'Light bites', title: 'Sandwiches & snacks', text: 'Toasted sandwiches, fries and snacks when you arrive hungry.' },
];

export default function DiningPage() {
  return (
    <>
      <PageHero
        photo={{ src: IMG.ebnRooftopTerrace, alt: 'Rooftop terrace with tables and a view of the hills' }}
        eyebrow="Dining"
        title={<>Rooftop <em className="accent">restaurant</em></>}
        text="Home-cooked Nepali food, hearty breakfasts and hot tea, served with views of the hills."
        crumbs={[{ label: 'Dining' }]}
      />

      <section className="section">
        <div className="container split">
          <div className="split__media">
            <div className="reveal-img">
              <Image src={IMG.foodDalBhat} alt="Dal bhat set with rice, curry and pickles" sizes="(max-width: 680px) 100vw, 560px" placeholder="blur" />
            </div>
          </div>
          <div data-stagger="">
            <Eyebrow>Our kitchen</Eyebrow>
            <SplitHeading>Cooked fresh, <em className="accent">Nepali</em> style</SplitHeading>
            <p className="lead reveal">&quot;Dal bhat power, 24 hour!&quot; There&apos;s no better fuel before the mountains.</p>
            <p className="reveal">
              We cook everything fresh for our guests. You can have a full Nepali thali with rice, dal, seasonal greens and
              pickles, or a quick breakfast before the airport. Groups are welcome and we&apos;re happy to cater for
              vegetarians. Prefer to eat in? Room service is available.
            </p>
            <Button href="/contact#enquiry" label="Book a table or group meal" variant="outline" arrow className="reveal" />
          </div>
        </div>
      </section>

      <section className="banner">
        <div className="banner__media" data-parallax="0.12">
          <Image src={IMG.fbRooftopTerrace} alt="Trekking group at dinner on the rooftop at night" fill sizes="100vw" placeholder="blur" />
        </div>
        <div className="container">
          <Eyebrow>The rooftop</Eyebrow>
          <SplitHeading>Where travellers <em className="accent">meet</em></SplitHeading>
          <p className="reveal">Pull up a chair, order a pot of tea and watch the hills. Trekking groups love our rooftop for dinner the night before they fly.</p>
          <div className="hero__ctas reveal">
            <Button href="/contact#enquiry" label="Plan a group dinner" variant="gold" arrow magnetic />
          </div>
        </div>
      </section>

      <section className="section section--sand">
        <div className="container">
          <div className="section__head">
            <div>
              <Eyebrow>Menu highlights</Eyebrow>
              <SplitHeading>What we <em className="accent">serve</em></SplitHeading>
            </div>
          </div>
          <div className="grid grid--2" data-stagger="">
            {MENU.map((m) => (
              <article className="menu-card reveal" key={m.title}>
                <div className="menu-card__media">
                  <Image src={m.src} alt={m.alt} sizes="(max-width: 680px) 100vw, 200px" placeholder="blur" />
                </div>
                <div className="menu-card__body">
                  <span className="tag">{m.tag}</span>
                  <h3>{m.title}</h3>
                  <p>{m.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
