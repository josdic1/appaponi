import { useEffect, useState } from "react";
import { MataponiLoader } from "./components/feedback/MataponiLoader";

export default function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  if (loading) {
    return <MataponiLoader />;
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <div className="brand-mark">A</div>
          <div>
            <div className="brand-name">Appoponi</div>
            <div className="brand-sub">Camp App</div>
          </div>
        </div>

        <div className="login-heading">
          <h1>Appoponi</h1>
          <p>Frontend foundation is running.</p>
        </div>

        <button className="login-submit" type="button">
          Continue
        </button>
      </section>
    </main>
  );
}
