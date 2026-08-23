// ============================================================================
// Quest Master v3 UI Component Library ("wizard's desk")
// Self-contained presentational components. No external deps beyond React.
// Styles live in src/styles/theme.css (import once at the app root).
// ============================================================================
import type { CSSProperties, ReactNode } from "react";
import "../styles/theme.css";

// ---------------------------------------------------------------------------
// ThemedApp: wraps the whole app in the candlelit wizard's desk background.
// ---------------------------------------------------------------------------
export function ThemedApp({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`qm-app${className ? ` ${className}` : ""}`} style={style}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------
type ButtonVariant = "primary" | "default";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = "default", className, style, ...rest }: ButtonProps) {
  const base = variant === "primary" ? "qm-btn qm-btn--primary" : "qm-btn qm-btn--default";
  return <button type="button" className={`${base}${className ? ` ${className}` : ""}`} style={style} {...rest} />;
}

export function GoldButton({ className, style, ...rest }: ButtonProps) {
  return <Button variant="primary" className={className} style={style} {...rest} />;
}

// ---------------------------------------------------------------------------
// Card & Panel
// ---------------------------------------------------------------------------
export function Card({
  children,
  className,
  style,
}: {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`qm-card${className ? ` ${className}` : ""}`} style={style}>
      {children}
    </div>
  );
}

export function Panel({
  children,
  className,
  style,
}: {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`qm-panel${className ? ` ${className}` : ""}`} style={style}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// OrbFrame: glowing crystal-ball frame for avatars and hero art.
// ---------------------------------------------------------------------------
export function OrbFrame({
  children,
  size = 96,
  className,
  style,
}: {
  children?: ReactNode;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`qm-orb${className ? ` ${className}` : ""}`}
      style={{ width: size, height: size, fontSize: size * 0.5, ...style }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StepShell: framed stage for one step of a multi-step flow (title, subtitle).
// ---------------------------------------------------------------------------
export function StepShell({
  step,
  totalSteps,
  title,
  subtitle,
  children,
  footer,
}: {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Card
      style={{
        width: "100%",
        maxWidth: 720,
        margin: "0 auto",
        padding: "clamp(20px, 4vw, 36px)",
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <header style={{ textAlign: "center", display: "grid", gap: 6 }}>
        <div
          style={{
            fontFamily: "var(--qm-font)",
            fontSize: 13,
            letterSpacing: 2.5,
            textTransform: "uppercase",
            color: "var(--qm-gold)",
          }}
        >
          Step {step} of {totalSteps}
        </div>
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--qm-font)",
            fontWeight: 700,
            fontSize: "clamp(26px, 5vw, 40px)",
            color: "var(--qm-text)",
          }}
        >
          {title}
        </h1>
        {subtitle ? (
          <p style={{ margin: 0, color: "var(--qm-muted)", fontFamily: "var(--qm-font-ui)" }}>{subtitle}</p>
        ) : null}
      </header>

      <div style={{ display: "grid", gap: 12 }}>{children}</div>

      {(footer || totalSteps > 0) && (
        <footer
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            paddingTop: 8,
          }}
        >
          {totalSteps > 0 && <ProgressDots count={totalSteps} current={step - 1} />}
          {footer}
        </footer>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// ChoiceButton: full-width selectable option row with icon.
// ---------------------------------------------------------------------------
export function ChoiceButton({
  icon,
  label,
  description,
  selected = false,
  className,
  ...rest
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon?: string;
  label: string;
  description?: string;
  selected?: boolean;
}) {
  return (
    <button
      type="button"
      className={`qm-choice${className ? ` ${className}` : ""}`}
      style={{
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        borderColor: selected ? "var(--qm-gold)" : undefined,
        boxShadow: selected ? "0 0 22px rgba(240, 199, 94, 0.3)" : undefined,
      }}
      aria-pressed={selected}
      {...rest}
    >
      {icon ? <span style={{ fontSize: 28, lineHeight: 1 }}>{icon}</span> : null}
      <span style={{ textAlign: "left", flex: 1 }}>
        <span
          style={{
            display: "block",
            fontWeight: 700,
            fontFamily: "var(--qm-font)",
            fontSize: 17,
            color: selected ? "var(--qm-gold-bright)" : "var(--qm-text)",
          }}
        >
          {label}
        </span>
        {description ? (
          <span style={{ display: "block", marginTop: 2, fontSize: 14, color: "var(--qm-muted)" }}>
            {description}
          </span>
        ) : null}
      </span>
      {selected ? <span aria-hidden="true" style={{ color: "var(--qm-gold)" }}>✦</span> : null}
    </button>
  );
}

// ---------------------------------------------------------------------------
// ProgressDots: small gold dots marking progress through steps.
// ---------------------------------------------------------------------------
export function ProgressDots({
  count,
  current,
  size = 10,
}: {
  count: number;
  current: number; // 0-indexed active dot
  size?: number;
}) {
  return (
    <div role="progressbar" aria-valuemin={1} aria-valuemax={count} aria-valuenow={current + 1} style={{ display: "flex", gap: 8 }}>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: i <= current ? "var(--qm-gold)" : "rgba(169, 159, 209, 0.3)",
            boxShadow: i === current ? "0 0 10px rgba(240, 199, 94, 0.7)" : "none",
            transition: "background 150ms ease",
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hearts: hp as filled/empty hearts, capped at 12.
// ---------------------------------------------------------------------------
const MAX_HEARTS = 12;

export function Hearts({
  hp,
  maxHp,
  size = 22,
  label = "Health",
}: {
  hp: number;
  maxHp: number;
  size?: number;
  label?: string;
}) {
  const max = Math.min(Math.max(0, Math.floor(maxHp)), MAX_HEARTS);
  const clampedHp = Math.max(0, Math.min(Math.floor(hp), max));
  return (
    <div
      role="status"
      aria-label={`${label}: ${clampedHp} of ${max}`}
      style={{ display: "flex", flexWrap: "wrap", gap: 4 }}
      title={`${clampedHp} / ${max}`}
    >
      {Array.from({ length: max }, (_, i) => (
        <span key={i} aria-hidden="true" style={{ fontSize: size, lineHeight: 1 }}>
          {i < clampedHp ? "❤️" : "🤍"}
        </span>
      ))}
    </div>
  );
}
