import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import firstImg from '@media/1st.jpg';
import secondImg from '@media/2nd.jpg';
import thirdImg from '@media/3rd.jpg';
import fourthImg from '@media/4th.jpg';
import { useReducedMotion } from '../../hooks/useReducedMotion';

gsap.registerPlugin(ScrollTrigger);

const GALLERY_ITEMS = [
  {
    id: 'panel-1',
    src: firstImg,
    alt: 'AI Trip Planning',
    objectPosition: 'center center',
    title: 'AI Trip Planning',
    description:
      'Tell us where you want to go, how you like to travel, and what matters to you. TripVerse turns your preferences into a personalized journey built around you.',
    expandable: true,
  },
  {
    id: 'panel-2',
    src: secondImg,
    alt: 'Routes & Experiences',
    objectPosition: 'center center',
    title: 'Routes & Experiences',
    description:
      'Explore routes, activities, and experiences that fit your journey. See how every stop connects and discover possibilities beyond the usual itinerary.',
    expandable: true,
  },
  {
    id: 'panel-3',
    src: thirdImg,
    alt: 'Destinations',
    objectPosition: 'center center',
    title: 'Destinations',
    description:
      'Discover places worth experiencing, from iconic landmarks to hidden corners. TripVerse helps you understand what makes each destination worth the journey.',
    expandable: true,
  },
  {
    id: 'panel-4',
    src: fourthImg,
    alt: 'Spatial Travel Planning',
    objectPosition: 'center center',
    title: 'Spatial Travel Planning',
    description:
      'See your entire journey as a connected world. Understand distances, transit, locations, and the relationships between every part of your trip.',
    expandable: true,
  },
] as const;

const ABOUT_COPY =
  'Rather than viewing flat text itineraries, TripVerse visualizes destinations, cities, attractions, activities, restaurants, transit routes, costs, and schedule constraints as nodes and edges in a spatial graph. Users can interactively explore their trip in 3D, request modifications, and watch AI agents reason and dynamically replan the trip universe.';

export function About() {
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion || !sectionRef.current) return;

    const ctx = gsap.context(() => {
      gsap.from('.home-about__reveal', {
        opacity: 0,
        y: 28,
        duration: 0.9,
        stagger: 0.12,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 75%',
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section ref={sectionRef} id="how-it-works" className="home-about" aria-labelledby="how-it-works-title">
      <div className="home-container">
        <h2 id="how-it-works-title" className="home-about__title home-about__reveal home-body">
          How it Works
        </h2>
        <p className="home-about__description home-about__reveal home-body">{ABOUT_COPY}</p>
      </div>

      <div className="home-gallery home-about__reveal home-container" role="list" aria-label="How TripVerse works gallery">
        {GALLERY_ITEMS.map((item) => (
          <article
            key={item.id}
            role="listitem"
            className="home-gallery__panel home-gallery__panel--expandable"
          >
            <div className="home-gallery__image-wrap">
              <img
                src={item.src}
                alt={item.alt}
                className="home-gallery__image"
                style={{ objectPosition: item.objectPosition }}
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="home-gallery__hover-card">
              <h3 className="home-gallery__hover-title">{item.title}</h3>
              <p className="home-gallery__hover-desc">{item.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
