import { FormEvent, useEffect, useState } from "react";
import { api, getKey, setKey } from "./api";
import { Overview } from "./pages/Overview";
import { Accounts } from "./pages/Accounts";
import { Studio } from "./pages/Studio";
import { Approvals } from "./pages/Approvals";
import { Analytics } from "./pages/Analytics";
import { Security } from "./pages/Security";

const PAGES = {
  overview: { label: "Overview", el: Overview },
  accounts: { label: "Platforms", el: Accounts },
  studio: { label: "Content studio", el: Studio },
  approvals: { label: "Approvals", el: Approvals },
  analytics: { label: "Analytics", el: Analytics },
  security: { label: "Security", el: Security },
} as const;
type PageKey = keyof typeof PAGES;

function currentPage(): PageKey {
  const hash = window.location.hash.replace("#/", "") as PageKey;
  return hash in PAGES ? hash : "overview";
}

export function App() {
  const [authed, setAuthed] = useState(Boolean(getKey()));
  const [page, setPage] = useState<PageKey>(currentPage());
  const [me, setMe] = useState<{ email: string; mode: string; role: string; is_admin: boolean } | null>(null);
  const [env, setEnv] = useState<string>("");

  useEffect(() => {
    const onHash = () => setPage(currentPage());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    api("/api/health").then((h) => setEnv(h.environment)).catch(() => setEnv("unreachable"));
    if (!authed) return;
    api("/api/me")
      .then((m) => {
        if (m.role !== "owner") throw new Error("owner key required");
        setMe(m);
      })
      .catch(() => {
        setKey(null);
        setAuthed(false);
      });
  }, [authed]);

  if (!authed) return <Login onDone={() => setAuthed(true)} env={env} />;
  const Page = PAGES[page].el;
  return (
    <div className="layout">
      <a className="skip" href="#main">Skip to content</a>
      <header className="topbar">
        <strong className="brand">OpenSocial MCP</strong>
        {env === "demo-mock" && <span className="badge badge-demo" title="All platform data is simulated">DEMO · simulated APIs</span>}
        <span className="spacer" />
        {me && (
          <span className="muted small who">
            {me.email} · mode <Mode mode={me.mode} />
          </span>
        )}
        <button className="btn ghost" onClick={() => { setKey(null); setAuthed(false); }}>Sign out</button>
      </header>
      <nav className="sidenav" aria-label="Main">
        <ul>
          {(Object.keys(PAGES) as PageKey[]).map((k) => (
            <li key={k}>
              <a href={`#/${k}`} aria-current={page === k ? "page" : undefined}>{PAGES[k].label}</a>
            </li>
          ))}
        </ul>
      </nav>
      <main id="main" tabIndex={-1}>
        <Page me={me} refreshMe={() => api("/api/me").then(setMe)} />
      </main>
    </div>
  );
}

function Mode({ mode }: { mode: string }) {
  return <span className={`badge badge-${mode.replace("_", "")}`}>{mode.replace("_", " ")}</span>;
}

function Login({ onDone, env }: { onDone: () => void; env: string }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setKey(value.trim());
    try {
      const me = await api("/api/me");
      if (me.role !== "owner") throw new Error("This is an agent key. The dashboard needs your owner key.");
      onDone();
    } catch (err) {
      setKey(null);
      setError(err instanceof Error ? err.message : "Invalid key");
    }
  };
  return (
    <main className="login">
      <form onSubmit={submit} className="card" aria-labelledby="login-title">
        <h1 id="login-title">OpenSocial MCP</h1>
        <p className="muted">Sign in with your <strong>owner key</strong> (from <code>opensocial create-user</code>). Agent keys cannot use the dashboard.</p>
        {env === "demo-mock" && <p className="notice notice-info">Demo mode: all platform data is simulated.</p>}
        <label htmlFor="key">Owner key</label>
        <input id="key" type="password" autoComplete="off" value={value} onChange={(e) => setValue(e.target.value)} required />
        {error && <p className="notice notice-error" role="alert">{error}</p>}
        <button className="btn primary" type="submit">Sign in</button>
      </form>
    </main>
  );
}
