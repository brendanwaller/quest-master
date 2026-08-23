// ============================================================================
// Quest Master — AvatarPortrait: composited circular hero portrait.
// Background palette color + layered emoji familiar / emblem / accessory,
// optional glowing rim for reveal moments.
// ============================================================================

import type { AvatarPreset } from "../lib/types";

export interface AvatarPortraitProps {
  avatar: AvatarPreset;
  size?: number;
  glow?: boolean;
  className?: string;
}

export default function AvatarPortrait({
  avatar,
  size = 160,
  glow = false,
  className = "",
}: AvatarPortraitProps) {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    background: `radial-gradient(circle at 35% 30%, #ffffff55, transparent 60%), ${avatar.palette}`,
    boxShadow: glow
      ? `0 0 ${size * 0.18}px ${avatar.palette}, 0 0 ${size * 0.4}px ${avatar.palette}88`
      : undefined,
  };

  return (
    <div className={"qm-avatar" + (glow ? " qm-avatar-glow" : "") + " " + className} style={style}>
      <span
        className="qm-avatar-familiar"
        role="img"
        aria-label="hero familiar"
        style={{ fontSize: size * 0.42 }}
      >
        {avatar.familiar}
      </span>
      <span
        className="qm-avatar-emblem"
        role="img"
        aria-label="emblem"
        style={{ fontSize: size * 0.22 }}
      >
        {avatar.emblem}
      </span>
      <span
        className="qm-avatar-accessory"
        role="img"
        aria-label="accessory"
        style={{ fontSize: size * 0.2 }}
      >
        {avatar.accessory}
      </span>
    </div>
  );
}
