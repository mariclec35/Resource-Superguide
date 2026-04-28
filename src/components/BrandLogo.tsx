import React from 'react';
import logoMark from '../assets/branding/logo-mark.png';
import logoCompact from '../assets/branding/logo-compact.png';
import logoLockup from '../assets/branding/logo-lockup.png';
import logoBadge from '../assets/branding/logo-badge.png';

type BrandLogoVariant = 'mark' | 'compact' | 'lockup' | 'badge' | 'navbar';

const sources: Record<BrandLogoVariant, string> = {
  mark: logoMark,
  compact: logoCompact,
  lockup: logoLockup,
  badge: logoBadge,
  navbar: logoMark,
};

const alts: Record<BrandLogoVariant, string> = {
  mark: 'Recovery Hub Twin Cities icon',
  compact: 'Recovery Hub Twin Cities logo',
  lockup: 'Recovery Hub Twin Cities full logo',
  badge: 'Recovery Hub Twin Cities badge',
  navbar: 'Recovery Hub Twin Cities navigation logo',
};

export default function BrandLogo({
  variant = 'mark',
  alt,
  className = '',
  imageClassName = '',
}: {
  variant?: BrandLogoVariant;
  alt?: string;
  className?: string;
  imageClassName?: string;
}) {
  if (variant === 'navbar') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <img
          src={logoMark}
          alt={alt || alts[variant]}
          className={imageClassName || 'h-14 w-14 object-contain shrink-0'}
        />
        <div className="min-w-0 leading-none">
          <div className="text-[2rem] font-black tracking-tight text-[#173f73]">
            Recovery<span className="text-[#63a341]">Hub</span>
          </div>
          <div className="mt-1 flex items-center gap-3">
            <span className="h-[2px] w-8 rounded-full bg-[#63a341]" />
            <span className="text-[0.9rem] font-black uppercase tracking-[0.42em] text-[#1e7aa4]">
              Twin Cities
            </span>
            <span className="h-[2px] w-8 rounded-full bg-[#63a341]" />
          </div>
          <div className="mt-1.5 text-[0.78rem] font-semibold tracking-[0.02em] text-zinc-500">
            Connecting people to recovery in the Twin Cities
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <img
        src={sources[variant]}
        alt={alt || alts[variant]}
        className={imageClassName}
      />
    </div>
  );
}
