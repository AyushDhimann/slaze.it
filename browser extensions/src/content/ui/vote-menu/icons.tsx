/**
 * SVG icon components for each Slaze category + toolbar button.
 * Inline SVGs inherit `currentColor` from the parent.
 */

import type { JSX } from 'react';

const COMMON = {
  viewBox: "0 0 24 24",
  fill: "none",
  "aria-hidden": true as const,
  focusable: "false" as const,
};

interface IconProps {
  size?: number;
}

export function IconSlaze({ size = 16 }: IconProps): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 -960 960 960"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className="slaze-brand-icon"
    >
      <path d="M617.5-587.5Q600-605 600-630t17.5-42.5Q635-690 660-690t42.5 17.5Q720-655 720-630t-17.5 42.5Q685-570 660-570t-42.5-17.5Zm-360 0Q240-605 240-630t17.5-42.5Q275-690 300-690t42.5 17.5Q360-655 360-630t-17.5 42.5Q325-570 300-570t-42.5-17.5Zm180 110Q420-495 420-520t17.5-42.5Q455-580 480-580t42.5 17.5Q540-545 540-520t-17.5 42.5Q505-460 480-460t-42.5-17.5Zm0-220Q420-715 420-740t17.5-42.5Q455-800 480-800t42.5 17.5Q540-765 540-740t-17.5 42.5Q505-680 480-680t-42.5-17.5Zm2 534.5q-20.5-3-39.5-8v-143q0-35 23.5-60.5T480-400q33 0 56.5 25.5T560-314v143q-19 5-39.5 8t-40.5 3q-20 0-40.5-3ZM340-192q-20-8-38.5-18T266-232q-28-20-44.5-52T205-352q0-26-5.5-48.5T180-443q-10-13-37.5-39.5T92-532q-11-11-11-28t11-28q11-11 28-11t28 11l153 145q20 18 29.5 42.5T340-350v158Zm280 0v-158q0-26 10-51t29-42l153-145q12-11 28.5-11t27.5 11q11 11 11 28t-11 28q-23 23-50.5 49T780-443q-14 20-19.5 42.5T755-352q0 36-16.5 68.5T693-231q-16 11-34.5 21T620-192Z" />
    </svg>
  );
}

/** Filled badge with a transparent check cutout. */
export function IconSelectionCheck({ size = 16 }: IconProps): JSX.Element {
  return (
    <svg {...COMMON} width={size} height={size}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 1.5a8.5 8.5 0 1 1 0 17a8.5 8.5 0 1 1 0-17Z M8.28 11.78L6.56 10.06a0.95 0.95 0 1 0-1.34 1.34l2.39 2.39c0.37 0.37 0.97 0.37 1.34 0l4.89-4.89a0.95 0.95 0 1 0-1.34-1.34L8.28 11.78Z"
      />
    </svg>
  );
}

/* ── Positive categories ──────────────────────────────────────── */

export function IconGenuine({ size = 20 }: IconProps): JSX.Element {
  return (
    <svg {...COMMON} width={size} height={size}>
      <path
        d="M12 3l7 3v6c0 4.5-3.1 7.4-7 8.7C8.1 19.4 5 16.5 5 12V6l7-3z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 12.5l2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconHelpful({ size = 20 }: IconProps): JSX.Element {
  return (
    <svg {...COMMON} width={size} height={size}>
      <path
        d="M14 9V5a3 3 0 0 0-3-3L7 14v7h9.3a2 2 0 0 0 2-1.7l.7-5a2 2 0 0 0-2-2.3H14z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 21H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconWholesome({ size = 20 }: IconProps): JSX.Element {
  return (
    <svg {...COMMON} width={size} height={size}>
      <path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── Negative categories ──────────────────────────────────────── */

export function IconAdPromo({ size = 20 }: IconProps): JSX.Element {
  return (
    <svg {...COMMON} width={size} height={size}>
      <polygon
        points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.54 8.46a5 5 0 0 1 0 7.07"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M19.07 4.93a10 10 0 0 1 0 14.14"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconAiSlop({ size = 20 }: IconProps): JSX.Element {
  return (
    <svg {...COMMON} width={size} height={size}>
      <rect
        x="6"
        y="6"
        width="12"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 10h4v4h-4z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconBait({ size = 20 }: IconProps): JSX.Element {
  return (
    <svg {...COMMON} width={size} height={size}>
      <path
        d="M11 3v11a5 5 0 0 0 5 5 3 3 0 0 0 0-6H8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 6l3-3 3 3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconBrainrot({ size = 20 }: IconProps): JSX.Element {
  return (
    <svg {...COMMON} width={size} height={size}>
      <path
        d="M12 2a7 7 0 0 0-4.9 11.9L6 17h12l-1.1-3.1A7 7 0 0 0 12 2z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 17v3h8v-3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 6l-2 4h4l-2 4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconMisleading({ size = 20 }: IconProps): JSX.Element {
  return (
    <svg {...COMMON} width={size} height={size}>
      <path
        d="M8 3h8l4 4v14H8z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 3v4h4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 10v5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="12" cy="17.2" r="0.8" fill="currentColor" />
    </svg>
  );
}

export function IconRant({ size = 20 }: IconProps): JSX.Element {
  return (
    <svg {...COMMON} width={size} height={size}>
      <path
        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 7v4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="12" cy="13" r="0.8" fill="currentColor" />
    </svg>
  );
}

export const CATEGORY_ICONS: Record<string, React.ComponentType<IconProps>> = {
  genuine: IconGenuine,
  helpful: IconHelpful,
  wholesome: IconWholesome,
  "ad-promo": IconAdPromo,
  "ai-slop": IconAiSlop,
  bait: IconBait,
  brainrot: IconBrainrot,
  misleading: IconMisleading,
  rant: IconRant,
};
