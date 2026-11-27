import { ReactNode, useCallback, useEffect, useState } from "react";
import { ApiError } from "./api";

export function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loader());
    } catch (e) {
      setError(e instanceof ApiError ? `${e.message} (${e.code})` : String(e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { data, error, loading, reload };
}

export function Card({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="card" aria-labelledby={slug(title)}>
      <header className="card-head">
        <h2 id={slug(title)}>{title}</h2>
        {actions}
      </header>
      {children}
    </section>
  );
}

export function Status({ value }: { value: string }) {
  return <span className={`badge badge-${value.toLowerCase().replace(/[^a-z]/g, "")}`}>{value}</span>;
}

export function Notice({ kind = "info", children }: { kind?: "info" | "error" | "ok"; children: ReactNode }) {
  return (
    <p className={`notice notice-${kind}`} role={kind === "error" ? "alert" : "status"}>
      {children}
    </p>
  );
}

export function Loading({ loading, error }: { loading: boolean; error: string | null }) {
  if (error) return <Notice kind="error">{error}</Notice>;
  if (loading) return <p className="muted">Loading…</p>;
  return null;
}

export function fmt(ts: string | null | undefined): string {
  if (!ts) return "—";
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? ts : d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function useAction() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const run = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      setMessage({ kind: "ok", text: success });
      return true;
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof ApiError ? e.message : String(e) });
      return false;
    } finally {
      setBusy(false);
    }
  };
  const view = message ? <Notice kind={message.kind}>{message.text}</Notice> : null;
  return { busy, run, view };
}
