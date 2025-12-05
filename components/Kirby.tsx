

"use client";

import React from "react";
import { Theme } from "../types";

/**
 * KirbyIcon Component
 * 
 * A SVG representation of the Kirby character used as the application logo/mascot.
 * Standardized as a React Functional Component.
 * Can adapt colors based on application theme.
 */
interface KirbyIconProps {
  className?: string;
  onClick?: () => void;
  theme?: Theme;
  isThemed?: boolean;
}

const themeColors: Record<string, { body: string, feet: string, blush: string }> = {
  light: { body: '#60a5fa', feet: '#1d4ed8', blush: '#93c5fd' }, // Blue 400, 700, 300
  dark: { body: '#60a5fa', feet: '#1d4ed8', blush: '#93c5fd' },
  twilight: { body: '#a855f7', feet: '#6b21a8', blush: '#d8b4fe' }, // Purple 500, 800, 300
  sky: { body: '#38bdf8', feet: '#0369a1', blush: '#7dd3fc' }, // Sky 400, 700, 300
  pink: { body: '#f472b6', feet: '#be185d', blush: '#fbcfe8' }, // Pink 400, 700, 200
  sunrise: { body: '#fb923c', feet: '#c2410c', blush: '#fdba74' }, // Orange 400, 700, 300
  lime: { body: '#a3e635', feet: '#3f6212', blush: '#bef264' }, // Lime 400, 800, 300
};

const defaultColors = {
  body: '#ffb6c1',
  feet: '#cc3333',
  blush: '#ff6688'
};

export const KirbyIcon: React.FC<KirbyIconProps> = ({ className, onClick, theme, isThemed }) => {
  const colors = (isThemed && theme && themeColors[theme]) ? themeColors[theme] : defaultColors;

  return (
    <div 
      className={`relative flex justify-center items-center w-full h-full transition-transform duration-300 ease-in-out hover:scale-105 cursor-pointer ${className || ''}`}
      onClick={onClick}
      role="img"
      aria-label="Kirby Icon"
    > 
      <svg
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-xl filter"
      >
        {/* Left Foot */}
        <ellipse cx="70" cy="160" rx="30" ry="15" fill={colors.feet} />

        {/* Right Foot */}
        <ellipse cx="130" cy="160" rx="30" ry="15" fill={colors.feet} />

        {/* Arms */}
        <ellipse cx="50" cy="120" rx="20" ry="20" fill={colors.body} />
        <ellipse cx="150" cy="120" rx="20" ry="20" fill={colors.body} />
        
        {/* Body */}
        <circle
          cx="100"
          cy="110"
          r="60"
          fill={colors.body}
        />

        {/* Left Eye */}
        {/* Blue iris */}
        <ellipse cx="80" cy="90" rx="10" ry="22" fill="blue" />
        {/* Black pupil */}
        <ellipse cx="80" cy="88" rx="10" ry="15" fill="black" />
        {/* White highlight */}
        <ellipse cx="80" cy="82" rx="8" ry="12" fill="#ffffff" />
        {/* Outline */}
        <ellipse cx="80" cy="90" rx="10"ry="22" fill="transparent"stroke="#000000" strokeWidth="4"/>

        {/* Right Eye */}
        <ellipse cx="120" cy="90" rx="10" ry="22" fill="blue" />
        <ellipse cx="120" cy="88" rx="10" ry="15" fill="black" />
        <ellipse cx="120" cy="82" rx="8" ry="12" fill="#ffffff" />
        <ellipse
          cx="120"
          cy="90"
          rx="10"
          ry="22"
          fill="transparent"
          stroke="#000000"
          strokeWidth="4"
        />

        {/* Blush */}
        <ellipse cx="60" cy="115" rx="12" ry="6" fill={colors.blush} opacity="0.6" />
        <ellipse cx="140" cy="115" rx="12" ry="6" fill={colors.blush} opacity="0.6" />

        {/* Mouth */}
        <path
          d="M 92 118 Q 100 126, 108 118"
          stroke="#880000"
          strokeWidth="3"
          fill="transparent"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

export default KirbyIcon;