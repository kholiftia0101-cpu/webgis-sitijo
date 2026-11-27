import Header from "@/components/layout/header";
import PasswordInput from "./PasswordInput";

type SigninPageProps = {
  searchParams: Promise<{
    error?: string;
    redirect?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  empty: "Username dan password harus diisi.",
  username: "Username tidak ditemukan.",
  password: "Password salah.",
  database: "Terjadi kesalahan saat mengakses database.",
  server: "Terjadi kesalahan pada server.",
};

export default async function SigninPage({
  searchParams,
}: SigninPageProps) {
  const params = await searchParams;

  const error = params.error
    ? errorMessages[params.error]
    : undefined;

  const redirectTo =
    params.redirect?.startsWith("/") &&
    !params.redirect.startsWith("//")
      ? params.redirect
      : "/";

return (
  <>
    <Header />

    <main className="page-signin">
      <div className="login-container">
        <div className="login-box">
          <h2>SIGN IN</h2>

          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}

          <form action="/api/auth/cek_signin" method="POST">
            <input
              type="hidden"
              name="redirect"
              value={redirectTo}
            />

            <label htmlFor="username">
              Username
            </label>

            <input
              type="text"
              id="username"
              name="username"
              placeholder="Masukkan username"
              autoComplete="username"
              required
            />

            <label htmlFor="password">
              Password
            </label>

            <PasswordInput />

            <div className="remember">
              <input
                type="checkbox"
                id="remember"
                name="remember"
              />

              <label htmlFor="remember">
                Remember me!
              </label>
            </div>

            <button type="submit">
              SIGN IN
            </button>
          </form>
        </div>
      </div>
    </main>
  </>
);
}
