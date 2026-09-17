import {
  Component,
  type ErrorInfo,
  type ReactNode,
} from "react";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export default class AppErrorBoundary extends Component<
  Props,
  State
> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(): State {
    return {
      hasError: true,
    };
  }

  componentDidCatch(
    error: Error,
    info: ErrorInfo,
  ) {
    console.error(
      "Appoponi render failure",
      error,
      info,
    );
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="login-page">
        <section
          className="login-card"
          role="alert"
        >
          <div className="login-brand">
            <div className="brand-mark">
              A
            </div>

            <div>
              <div className="brand-name">
                Appoponi
              </div>
              <div className="brand-sub">
                Camp app
              </div>
            </div>
          </div>

          <div className="login-heading">
            <h1>Something went wrong</h1>
            <p>
              Reload Appoponi to return to your current session.
            </p>
          </div>

          <button
            type="button"
            className="app-button app-button-primary app-button-block"
            onClick={() =>
              window.location.reload()
            }
          >
            Reload Appoponi
          </button>
        </section>
      </main>
    );
  }
}
