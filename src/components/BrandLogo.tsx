import React from 'react';
import logoMark from '../assets/branding/logo-mark.png';
import logoCompact from '../assets/branding/logo-compact.png';
import logoLockup from '../assets/branding/logo-lockup.png';
import logoBadge from '../assets/branding/logo-badge.png';
import logoNavbarCropped from '../assets/branding/logo-navbar-cropped.png';

type BrandLogoVariant = 'mark' | 'compact' | 'lockup' | 'badge' | 'navbar';

const sources: Record<BrandLogoVariant, string> = {
  mark: logoMark,
  compact: logoCompact,
  lockup: logoLockup,
  badge: logoBadge,
  navbar: logoNavbarCropped,
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
