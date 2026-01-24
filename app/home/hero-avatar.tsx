"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const avatarSteps = [
  { weight: 60, src: "/images/guigui60kg.png" },
  { weight: 70, src: "/images/guigui70kg.png" },
  { weight: 80, src: "/images/guigui80kg.png" },
  { weight: 90, src: "/images/guigui90kg.png" },
  { weight: 100, src: "/images/guigui100kg.png" },
];

const snapPoints = [70, 80, 90, 100];
const minWeight = 60;
const maxWeight = 100;

type HeroAvatarProps = {
  className?: string;
};

export function HeroAvatar({ className }: HeroAvatarProps) {
  const [weight, setWeight] = useState(85);
  const [autoPlay, setAutoPlay] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [speedLevel, setSpeedLevel] = useState(3);
  const [pointerOffset, setPointerOffset] = useState({ x: 0, y: 0 });
  const [scrollOffset, setScrollOffset] = useState(0);
  const directionRef = useRef<1 | -1>(-1);
  const avatarRef = useRef<HTMLDivElement | null>(null);

  const { lower, upper, ratio } = useMemo(() => {
    const steps = avatarSteps;
    let lowerStep = steps[0];
    let upperStep = steps[steps.length - 1];

    for (let i = 0; i < steps.length; i += 1) {
      if (weight <= steps[i].weight) {
        upperStep = steps[i];
        lowerStep = steps[Math.max(0, i - 1)];
        break;
      }
    }

    if (weight >= steps[steps.length - 1].weight) {
      lowerStep = steps[steps.length - 1];
      upperStep = steps[steps.length - 1];
    }

    const range = upperStep.weight - lowerStep.weight;
    const blend = range === 0 ? 0 : (weight - lowerStep.weight) / range;

    return { lower: lowerStep, upper: upperStep, ratio: blend };
  }, [weight]);

  const progress = Math.round(
    ((weight - minWeight) / (maxWeight - minWeight)) * 100
  );

  useEffect(() => {
    const bounceTimeout = setTimeout(() => {
      setIsBouncing(false);
    }, 520);
    setIsBouncing(true);
    return () => clearTimeout(bounceTimeout);
  }, [weight]);

  useEffect(() => {
    if (!autoPlay) {
      return;
    }
    const intervalMs = Math.max(90, 400 - speedLevel * 60);
    const intervalId = window.setInterval(() => {
      setWeight((current) => {
        let next = current + directionRef.current;
        if (next <= minWeight) {
          next = minWeight;
          directionRef.current = 1;
        } else if (next >= maxWeight) {
          next = maxWeight;
          directionRef.current = -1;
        }
        return next;
      });
    }, intervalMs);
    return () => window.clearInterval(intervalId);
  }, [autoPlay, speedLevel]);

  useEffect(() => {
    const container = avatarRef.current;
    if (!container) {
      return;
    }

    let pointerFrame = 0;
    let scrollFrame = 0;
    const canHover = window.matchMedia("(hover: hover)").matches;

    const updatePointer = (event: PointerEvent) => {
      if (!container) {
        return;
      }
      const rect = container.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      setPointerOffset({ x, y });
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!canHover) {
        return;
      }
      if (pointerFrame) {
        cancelAnimationFrame(pointerFrame);
      }
      pointerFrame = requestAnimationFrame(() => updatePointer(event));
    };

    const handlePointerLeave = () => {
      setPointerOffset({ x: 0, y: 0 });
    };

    const handleScroll = () => {
      if (scrollFrame) {
        cancelAnimationFrame(scrollFrame);
      }
      scrollFrame = requestAnimationFrame(() => {
        if (!container) {
          return;
        }
        const rect = container.getBoundingClientRect();
        const viewport = window.innerHeight || 1;
        const centerOffset =
          (rect.top + rect.height / 2 - viewport / 2) / (viewport / 2);
        const clamped = Math.max(-1, Math.min(1, centerOffset));
        setScrollOffset(clamped * -6);
      });
    };

    if (canHover) {
      container.addEventListener("pointermove", handlePointerMove);
      container.addEventListener("pointerleave", handlePointerLeave);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    handleScroll();

    return () => {
      if (canHover) {
        container.removeEventListener("pointermove", handlePointerMove);
        container.removeEventListener("pointerleave", handlePointerLeave);
      }
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (pointerFrame) {
        cancelAnimationFrame(pointerFrame);
      }
      if (scrollFrame) {
        cancelAnimationFrame(scrollFrame);
      }
    };
  }, []);

  const applySnap = () => {
    if (!snapEnabled) {
      return;
    }
    const closest = snapPoints.reduce((prev, current) =>
      Math.abs(current - weight) < Math.abs(prev - weight) ? current : prev
    );
    setWeight(closest);
  };

  const parallaxX = pointerOffset.x * 10;
  const parallaxY = pointerOffset.y * 14 + scrollOffset;

  return (
    <div className={cn("relative space-y-6", className)}>
      <div className="pointer-events-none absolute -top-12 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(12,141,133,0.35),transparent_70%)] blur-2xl" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          Evolution du poids
        </p>
        <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
          {weight} kg
        </span>
      </div>

      <div
        ref={avatarRef}
        className="relative mx-auto w-full max-w-[360px] sm:max-w-[440px] lg:max-w-[500px]"
      >
        <div className="pointer-events-none absolute -inset-8 rounded-[40px] bg-[radial-gradient(circle_at_center,rgba(12,141,133,0.18),transparent_70%)] blur-2xl" />
        <div
          className={`relative aspect-[3/4] ${
            isBouncing ? "avatar-spring" : ""
          }`}
        >
          <div className="pointer-events-none absolute inset-x-8 bottom-6 h-8 rounded-full bg-[radial-gradient(circle_at_center,rgba(17,16,14,0.25),transparent_70%)] blur-2xl" />
          <Image
            src={lower.src}
            alt={`Avatar ${lower.weight} kg`}
            fill
            priority
            sizes="(max-width: 768px) 80vw, 520px"
            className="object-contain object-bottom drop-shadow-[0_30px_60px_rgba(17,16,14,0.16)] transition-[opacity,transform] duration-700"
            style={{
              opacity: 1 - ratio,
              transform: `translate(${parallaxX * 0.6}px, ${
                parallaxY * 0.6
              }px) scale(0.96)`,
              transitionTimingFunction: "cubic-bezier(0.2, 0.9, 0.2, 1)",
            }}
          />
          <Image
            src={upper.src}
            alt={`Avatar ${upper.weight} kg`}
            fill
            sizes="(max-width: 768px) 80vw, 520px"
            className="object-contain object-bottom drop-shadow-[0_30px_60px_rgba(17,16,14,0.16)] transition-[opacity,transform] duration-700"
            style={{
              opacity: ratio,
              transform: `translate(${parallaxX}px, ${parallaxY}px) scale(0.96)`,
              transitionTimingFunction: "cubic-bezier(0.2, 0.9, 0.2, 1)",
            }}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          <span>60 kg</span>
          <span>100 kg</span>
        </div>
        <input
          type="range"
          min={minWeight}
          max={maxWeight}
          step={1}
          value={weight}
          onChange={(event) => {
            setWeight(Number(event.target.value));
            if (autoPlay) {
              setAutoPlay(false);
            }
          }}
          onMouseUp={applySnap}
          onTouchEnd={applySnap}
          onKeyUp={applySnap}
          className="weight-slider w-full"
          style={{
            background: `linear-gradient(90deg, var(--accent) 0%, var(--accent-strong) ${progress}%, rgba(10,109,105,0.12) ${progress}%)`,
          }}
          aria-label="Evolution du poids"
        />
        <div className="grid grid-cols-5 text-xs font-semibold text-[var(--muted)]">
          {[60, 70, 80, 90, 100].map((value) => (
            <span key={value} className="text-center">
              {value}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--muted)]">
          <p>
            Objectif du mois:{" "}
            <span className="font-semibold text-[var(--foreground)]">
              {weight} kg
            </span>
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={snapEnabled ? "primary" : "soft"}
              onClick={() => setSnapEnabled((value) => !value)}
              aria-pressed={snapEnabled}
            >
              Snap
            </Button>
            <Button
              type="button"
              size="sm"
              variant={autoPlay ? "primary" : "soft"}
              onClick={() => setAutoPlay((value) => !value)}
              aria-pressed={autoPlay}
            >
              {autoPlay ? "Pause auto" : "Auto-play"}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
          <span>Vitesse auto-play</span>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={speedLevel}
            onChange={(event) => setSpeedLevel(Number(event.target.value))}
            className="speed-slider w-32"
            aria-label="Vitesse auto-play"
          />
          <span className="text-[var(--foreground)]">
            {["Lent", "Fluide", "Modere", "Rapide", "Turbo"][speedLevel - 1]}
          </span>
        </div>
        <p className="text-xs text-[var(--muted)]">
          Glisse pour voir l&apos;avatar evoluer, ou lance l&apos;auto-play.
        </p>
      </div>
    </div>
  );
}
