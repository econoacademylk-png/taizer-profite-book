import React from 'react';

interface TaizerLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const TaizerLogo: React.FC<TaizerLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
}) => {
  const dimensions = {
    sm: { box: 28, icon: 28, text: 'text-sm', sub: 'text-[9px]' },
    md: { box: 38, icon: 38, text: 'text-base', sub: 'text-[10px]' },
    lg: { box: 48, icon: 48, text: 'text-xl', sub: 'text-xs' },
    xl: { box: 64, icon: 64, text: 'text-2xl', sub: 'text-sm' },
  }[size];

  return (
    <div className={`flex items-center space-x-2.5 select-none ${className}`}>
      {/* Precision Geometric Crypto Emblem */}
      <div className="relative shrink-0 flex items-center justify-center">
        <svg
          width={dimensions.box}
          height={dimensions.box}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-sm transition-transform duration-300 hover:scale-105"
        >
          <defs>
            {/* Outer Hexagon Gradient */}
            <linearGradient id="taizer-outer-hex" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#090d16" />
            </linearGradient>

            {/* Emerald Accent Gradient */}
            <linearGradient id="taizer-emerald-accent" x1="20" y1="15" x2="80" y2="85" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            {/* Gold/Cyan subtle highlight */}
            <linearGradient id="taizer-glow-accent" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0.2" />
            </linearGradient>

            {/* Inner T Monogram Gradient */}
            <linearGradient id="taizer-t-gradient" x1="30" y1="25" x2="70" y2="85" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="70%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
          </defs>

          {/* Hexagonal Crypto Shield / Coin Base */}
          <polygon
            points="50,4 92,26 92,74 50,96 8,74 8,26"
            fill="url(#taizer-outer-hex)"
            stroke="url(#taizer-emerald-accent)"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* Inner Hexagon Ring Line */}
          <polygon
            points="50,12 84,30 84,70 50,88 16,70 16,30"
            fill="none"
            stroke="#334155"
            strokeWidth="1.2"
            strokeDasharray="4 2"
            opacity="0.7"
          />

          {/* Glowing Blockchain Corner Nodes */}
          <circle cx="50" cy="4" r="2.5" fill="#34d399" />
          <circle cx="92" cy="26" r="2.5" fill="#34d399" />
          <circle cx="92" cy="74" r="2.5" fill="#34d399" />
          <circle cx="50" cy="96" r="2.5" fill="#34d399" />
          <circle cx="8" cy="74" r="2.5" fill="#34d399" />
          <circle cx="8" cy="26" r="2.5" fill="#34d399" />

          {/* Futuristic Stylized "T" Monogram with angled cuts */}
          {/* Top Bar of the T */}
          <path
            d="M26 31 C26 28.5, 28 26.5, 30.5 26.5 L69.5 26.5 C72 26.5, 74 28.5, 74 31 L69 40 L31 40 Z"
            fill="url(#taizer-emerald-accent)"
          />

          {/* Center Vertical Stem of the T */}
          <path
            d="M44 38 L56 38 L54 75 L50 79 L46 75 Z"
            fill="url(#taizer-t-gradient)"
          />

          {/* Left Wing Facet */}
          <polygon
            points="24,35 34,46 41,40 31,35"
            fill="#10b981"
            opacity="0.9"
          />

          {/* Right Wing Facet */}
          <polygon
            points="76,35 66,46 59,40 69,35"
            fill="#059669"
            opacity="0.9"
          />

          {/* Center Core Crypto Gem */}
          <polygon
            points="50,45 57,54 50,63 43,54"
            fill="#34d399"
          />
        </svg>
      </div>

      {/* Brand Name & Identity Text */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center space-x-1.5 leading-none">
            <span className={`font-black tracking-tight text-stone-900 ${dimensions.text}`}>
              Taizer
            </span>
            <span className={`font-black tracking-tight text-emerald-600 ${dimensions.text}`}>
              Crypto
            </span>
          </div>
          <span className={`text-stone-400 font-medium tracking-wide leading-tight mt-0.5 hidden xs:block ${dimensions.sub}`}>
            Income &amp; Target Sheet
          </span>
        </div>
      )}
    </div>
  );
};
