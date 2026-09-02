import {
  MataponiLoader,
} from "./components/feedback/MataponiLoader";

import AuthProvider from "./providers/AuthProvider";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import AdminPage from "./pages/AdminPage";
import MemberPage from "./pages/MemberPage";
import LoginPage from "./pages/LoginPage";
import { useAuth } from "./hooks/useAuth";

function AppContent() {
  const {
    account,
    loading,
    logout,
  } = useAuth();

  if (loading) {
    return <MataponiLoader />;
  }

  if (!account) {
    return <LoginPage />;
  }

  if (account.must_change_password) {
    return <ChangePasswordPage />;
  }

  if (account.account_type === "admin") {
    return <AdminPage />;
  }

  if (account.account_type === "member") {
    return <MemberPage />;
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <div className="brand-mark">
            A
          </div>

          <div>
            <div className="brand-name">
              Appoponi
            </div>

            <div className="brand-sub">
              {account.account_type}
            </div>
          </div>
        </div>

        <div className="login-heading">
          <h1>
            {account.username}
          </h1>

          <p>
            Authenticated Appoponi
            account.
          </p>
        </div>

        <button
          className="login-submit"
          type="button"
          onClick={() => {
            void logout();
          }}
        >
          Sign out
        </button>
      </section>
    </main>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
