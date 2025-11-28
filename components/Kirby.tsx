"use client";

import React from "react";

export function KirbyIcon() {
  return (
    <div className="Kirby cursor-pointer"> 
      <Kirby />
    </div>
  );
}

const Kirby = () => {
  return (
    <svg
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full drop-shadow-xl filter"
    >
      {/* Left Foot */}
      <ellipse cx="70" cy="160" rx="30" ry="15" fill="#cc3333" />

      {/* Right Foot */}
      <ellipse cx="130" cy="160" rx="30" ry="15" fill="#cc3333" />

      {/* Arms */}
      <ellipse cx="50" cy="120" rx="20" ry="20" className="Kirby-body" fill="#ffb6c1"/>
      <ellipse cx="150" cy="120" rx="20" ry="20" className="Kirby-body" fill="#ffb6c1"/>
      
      {/* Body */}
      <circle
        cx="100"
        cy="110"
        r="60"
        className="Kirby-body"
        fill="#ffb6c1"
      />

      {/* Left Eye */}
      {/* 左眼（眼蓝色椭圆） */}
      <ellipse cx="80" cy="90" rx="10" ry="22" fill="blue" />
      {/* 左眼（黑色椭圆） */}
      <ellipse cx="80" cy="88" rx="10" ry="15" fill="black" />
      {/* 左眼高光（白色椭圆） */}
      <ellipse cx="80" cy="82" rx="8" ry="12" fill="#ffffff" />
      <ellipse
        cx="80"
        cy="90"
        rx="10"
        ry="22"
        fill="#00000000"
        stroke="#000000"
        strokeWidth="4"
      />

      {/* Right Eye */}
      <ellipse cx="120" cy="90" rx="10" ry="22" fill="blue" />
      <ellipse cx="120" cy="88" rx="10" ry="15" fill="black" />

      <ellipse cx="120" cy="82" rx="8" ry="12" fill="#ffffff" />
      <ellipse
        cx="120"
        cy="90"
        rx="10"
        ry="22"
        fill="#00000000"
        stroke="#000000"
        strokeWidth="4"
      />

      {/* Blush */}
      <ellipse cx="60" cy="115" rx="12" ry="6" fill="#ff6688" opacity="0.6" />
      <ellipse cx="140" cy="115" rx="12" ry="6" fill="#ff6688" opacity="0.6" />

      {/* Mouth */}
      <path
        d="M 92 118 Q 100 126, 108 118"
        stroke="#880000"
        strokeWidth="3"
        fill="transparent"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default Kirby;