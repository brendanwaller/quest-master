import type { ReactNode } from "react";

export interface RuntimeError {
  id: string;
  message: string;
  source?: string;
  stack?: string;
}

interface ErrorBannerProps {
  errors: RuntimeError[];
  onDismiss: (id: string) => void;
}

let installed = false;

export function installGlobalErrorReporter(onError: (error: RuntimeError) => void) {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", event => {
    onError({
      id: createErrorId(),
      message: event.message,
      source: event.filename || undefined,
      stack: event.error?.stack,
    });
  });

  window.addEventListener("unhandledrejection", event => {
    onError({
      id: createErrorId(),
      message: `Unhandled promise rejection: ${formatErrorReason(event.reason)}`,
      stack: event.reason?.stack,
    });
  });
}

export function ErrorBanner({ errors, onDismiss }: ErrorBannerProps) {
  if (errors.length === 0) return null;

  return (
    <div className="runtime-errors" role="alert" aria-live="polite">
      {errors.map(error => (
        <div className="runtime-error" key={error.id}>
          <div>
            <strong>Something went wrong</strong>
            <p>{error.message}</p>
            {error.source && <p className="runtime-error-source">Source: {error.source}</p>}
            {error.stack && <pre>{error.stack}</pre>}
          </div>
          <button type="button" onClick={() => onDismiss(error.id)} aria-label="Dismiss error">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export function ErrorPanel({ children }: { children: ReactNode }) {
  return (
    <div className="runtime-errors" role="alert">
      <div className="runtime-error">
        <div>
          <strong>Something went wrong</strong>
          <p>{children}</p>
        </div>
      </div>
    </div>
  );
}

function createErrorId() {
  return `error-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatErrorReason(reason: unknown) {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === "string") return reason;
  try {
    return JSON.stringify(reason);
  } catch {
    return String(reason);
  }
}