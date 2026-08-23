import React from "react";

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="runtime-errors" role="alert">
          <div className="runtime-error">
            <div>
              <strong>Something went wrong</strong>
              <p>{this.state.error.message}</p>
              {this.state.error.stack && <pre>{this.state.error.stack}</pre>}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}