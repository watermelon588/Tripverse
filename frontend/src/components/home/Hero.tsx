
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import heroImage from "@media/hero-bg.jpg";
import heroForeground from "@media/hero-bg-transparent.png";

import { PlayIcon, ScrollIndicatorIcon } from "./HomeIcons";

import { useReducedMotion } from "../../hooks/useReducedMotion";

gsap.registerPlugin(ScrollTrigger);

interface HeroProps {
  onStartPlanning: () => void;
  onPlayVideo?: () => void;
}

export function Hero({
  onStartPlanning,
  onPlayVideo,
}: HeroProps) {
  const sectionRef = useRef<HTMLElement>(null);

  const backgroundRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const foregroundRef = useRef<HTMLDivElement>(null);

  const actionsRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLButtonElement>(null);

  const reducedMotion = useReducedMotion();

  const [imagesReady, setImagesReady] = useState(false);

useEffect(() => {
  const images = [heroImage, heroForeground];

  let loaded = 0;

  const handleLoaded = () => {
    loaded += 1;

    if (loaded === images.length) {
      setImagesReady(true);
    }
  };

  images.forEach((src) => {
    const image = new Image();

    image.onload = handleLoaded;
    image.onerror = handleLoaded;

    image.src = src;
  });
}, []);

  /*
   * --------------------------------------------------------------------------
   * HERO MOTION
   * --------------------------------------------------------------------------
   *
   * The hero consists of three independent visual planes:
   *
   *   1. Background photograph
   *   2. TRIPVERSE typography
   *   3. Transparent foreground mountain
   *
   * They intentionally move at different rates during scrolling to create
   * depth.
   */
  useEffect(() => {
    if (reducedMotion || !sectionRef.current || !imagesReady) {
      return;
    }

    const ctx = gsap.context(() => {
      /*
       * Initial entrance
       */
      const intro = gsap.timeline({
        defaults: {
          ease: "power3.out",
        },
      });

      intro
        .from(backgroundRef.current, {
          opacity: 0,
          scale: 1.03,
          duration: 1.2,
        })
        .from(
          titleRef.current,
          {
            opacity: 0,
            y: 30,
            duration: 1,
          },
          "<0.15",
        )
        .from(
          foregroundRef.current,
          {
            opacity: 0,
            y: 20,
            duration: 1,
          },
          "<0.05",
        )
        .from(
          actionsRef.current,
          {
            opacity: 0,
            y: 24,
            duration: 0.8,
          },
          "<0.15",
        )
        .from(
          scrollRef.current,
          {
            opacity: 0,
            duration: 0.6,
          },
          "<0.1",
        );

      /*
       * ----------------------------------------------------------------------
       * PARALLAX
       * ----------------------------------------------------------------------
       *
       * Background:
       * moves the least.
       *
       * Title:
       * moves independently.
       *
       * Foreground:
       * moves the most, creating the strongest depth cue.
       */

      gsap.to(backgroundRef.current, {
        yPercent: 4,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });

      gsap.to(titleRef.current, {
        yPercent: -8,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });

      gsap.to(foregroundRef.current, {
        yPercent: -12,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });
    }, sectionRef);

    return () => {
      ctx.revert();
    };
  }, [reducedMotion, imagesReady]);

  /*
   * --------------------------------------------------------------------------
   * SCROLL TO ABOUT
   * --------------------------------------------------------------------------
   */
  const scrollToAbout = () => {
    const about = document.getElementById("how-it-works");

    if (!about) {
      return;
    }

    about.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
    });
  };

  return (
    <section
      ref={sectionRef}
      className={`home-hero ${imagesReady ? "home-hero--ready" : "home-hero--loading"}`}
      aria-label="TripVerse"
    >
      {/* ------------------------------------------------------------------ */}
      {/* BACKGROUND PLANE                                                   */}
      {/* ------------------------------------------------------------------ */}

      <div
        ref={backgroundRef}
        className="home-hero__background"
        aria-hidden="true"
      >
        <img
          src={heroImage}
          alt=""
          className="home-hero__background-image"
          loading="eager"
          decoding="async"
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* TYPOGRAPHY PLANE                                                   */}
      {/* ------------------------------------------------------------------ */}

      <div
        className="home-hero__title-layer"
        aria-hidden="true"
      >
        <h1
          ref={titleRef}
          className="home-hero__title home-display"
        >
          TRIPVERSE
        </h1>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* FOREGROUND PLANE                                                   */}
      {/* ------------------------------------------------------------------ */}

      <div
        ref={foregroundRef}
        className="home-hero__foreground"
        aria-hidden="true"
      >
        <img
          src={heroForeground}
          alt=""
          className="home-hero__foreground-image"
          loading="eager"
          decoding="async"
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* HERO ACTIONS                                                       */}
      {/* ------------------------------------------------------------------ */}

      <div
        ref={actionsRef}
        className="home-hero__actions home-container home-ui"
      >
        <button
          type="button"
          className="home-hero__cta"
          onClick={onStartPlanning}
        >
          Start Planning
        </button>

        <button
          type="button"
          className="home-hero__play"
          onClick={onPlayVideo}
          aria-label="Play TripVerse introduction video"
        >
          <span className="home-hero__play-icon-wrap">
            <PlayIcon className="home-hero__play-icon" />
          </span>

          <span>Play video</span>
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* SCROLL INDICATOR                                                   */}
      {/* ------------------------------------------------------------------ */}

      <button
        ref={scrollRef}
        type="button"
        className="home-hero__scroll home-ui"
        aria-label="Scroll to How it Works"
        onClick={scrollToAbout}
      >
        <ScrollIndicatorIcon className="home-hero__scroll-icon" />
      </button>
    </section>
  );
}