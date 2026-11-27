import { api, Account, Approval } from "../api";
import { Card, fmt, Loading, Status, useLoad } from "../ui";
import type { PageProps } from "./types";

export function Overview(_: PageProps) {
  const { data, error, loading } = useLoad(async () => {
    const [health, accounts, approvals, audit, calendar, report] = await Promise.all([
      api("/api/health"),
      api<{ accounts: Account[] }>("/api/accounts"),
      api<{ approvals: Approval[] }>("/api/approvals?status=pending"),
      api("/api/audit?limit=8"),
      api("/api/calendar"),
      api("/api/reports/weekly"),
    ]);
    return { health, accounts: accounts.accounts, pending: approvals.approvals, audit: audit.entries, calendar: calendar.entries, report };
  });
  if (!data) return <Loading loading={loading} error={error} />;
  const connected = data.accounts.filter((a) => a.status === "connected").length;
  return (
    <>
      <h1>Overview</h1>
      <div className="stats" role="list">
        <Stat label="Connected accounts" value={`${connected} / ${data.accounts.length}`} />
        <Stat label="Pending approvals" value={String(data.pending.length)} href="#/approvals" />
        <Stat label="External actions (7 days)" value={String(data.report.publishing_activity.successful_external_actions)} />
        <Stat label="Scheduled items" value={String(data.calendar.length)} />
      </div>
      <div className="grid">
        <Card title="Integration health">
          <ul className="list">
            {Object.entries(data.health.integrations as Record<string, string>).map(([name, state]) => (
              <li key={name}><span className="cap">{name}</span> <Status value={state} /></li>
            ))}
          </ul>
          {Object.entries(data.health.controls as Record<string, boolean>).some(([, v]) => v) && (
            <p className="notice notice-error" role="alert">An emergency control is active. See Security.</p>
          )}
        </Card>
        <Card title="Pending approvals">
          {data.pending.length === 0 ? <p className="muted">Nothing waiting for you.</p> : (
            <ul className="list">
              {data.pending.slice(0, 6).map((a) => (
                <li key={a.approval_id}><span className="cap">{a.platform}</span> {a.summary}</li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Publishing calendar">
          {data.calendar.length === 0 ? <p className="muted">No scheduled items in the next 30 days.</p> : (
            <ul className="list">
              {data.calendar.map((e: any) => (
                <li key={`${e.type}-${e.approval_id ?? e.variant_id}`}>{fmt(e.when)} · <span className="cap">{e.platform}</span> · {e.title} <Status value={e.status} /></li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Recent activity">
          <ul className="list">
            {data.audit.map((e: any) => (
              <li key={e.id}>{fmt(e.ts)} · {e.tool} <Status value={e.outcome} /></li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

function Stat({ label, value, href }: { label: string; value: string; href?: string }) {
  const body = (<><span className="stat-value">{value}</span><span className="stat-label">{label}</span></>);
  return <div className="stat" role="listitem">{href ? <a href={href}>{body}</a> : body}</div>;
}
