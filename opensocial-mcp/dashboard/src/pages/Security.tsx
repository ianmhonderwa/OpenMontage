import { api, post, put } from "../api";
import { Card, fmt, Loading, Status, useAction, useLoad } from "../ui";
import type { PageProps } from "./types";

const MODES = [
  { value: "observer", label: "Observer", text: "AI can read and analyse only. No drafts, publishing, deleting or messaging." },
  { value: "assistant", label: "Assistant", text: "AI can prepare drafts and responses. Every external action needs your approval." },
  { value: "authorised_manager", label: "Authorised manager", text: "AI may act without approval only on accounts where you enabled autonomy, within daily limits. Deletion always needs approval." },
];

export function Security({ me, refreshMe }: PageProps) {
  const controls = useLoad(() => api("/api/controls"));
  const auditLog = useLoad(() => api("/api/audit?limit=100"));
  const keys = useLoad(() => api("/api/me/keys"));
  const action = useAction();
  const setMode = (mode: string) => void action.run(() => put("/api/me/mode", { mode }), `Mode set to ${mode}.`).then(() => refreshMe());
  const toggle = (field: string, value: boolean) => {
    if (value && !window.confirm(`Activate emergency control "${field}"?`)) return;
    void action.run(() => post("/api/controls", { [field]: value }), "Emergency controls updated.").then(controls.reload);
  };
  return (
    <>
      <h1>Security</h1>
      {action.view}
      <Card title="Operating mode">
        <fieldset>
          <legend className="sr-only">Operating mode</legend>
          {MODES.map((m) => (
            <label key={m.value} className="radio">
              <input type="radio" name="mode" checked={me?.mode === m.value} onChange={() => setMode(m.value)} />
              <strong>{m.label}</strong> — <span className="muted">{m.text}</span>
            </label>
          ))}
        </fieldset>
      </Card>
      <Card title="Emergency controls">
        {!me?.is_admin && <p className="muted">Only administrators can change these.</p>}
        <Loading loading={controls.loading} error={controls.error} />
        {controls.data && (
          <ul className="list">
            {[["publishing_disabled", "Disable all publishing and edits"], ["messaging_disabled", "Disable all outgoing messages"], ["shutdown", "Emergency shutdown (all operations)"]].map(([field, label]) => (
              <li key={field}>
                <Status value={controls.data[field] ? "active" : "off"} /> {label}{" "}
                <button className={`btn small ${controls.data[field] ? "" : "danger"}`} disabled={!me?.is_admin || action.busy} onClick={() => toggle(field, !controls.data[field])}>{controls.data[field] ? "Deactivate" : "Activate"}</button>
              </li>
            ))}
          </ul>
        )}
        <p className="muted small">Disconnect or revoke individual accounts on the Platforms page.</p>
      </Card>
      <Card title="API keys and sessions">
        <Loading loading={keys.loading} error={keys.error} />
        <table>
          <thead><tr><th scope="col">Role</th><th scope="col">Label</th><th scope="col">Created</th><th scope="col">Last used</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{keys.data?.keys.map((k: any) => (
            <tr key={k.key_id}><td>{k.role}</td><td>{k.label || "—"}</td><td>{fmt(k.created_at)}</td><td>{fmt(k.last_used_at)}</td><td><Status value={k.revoked ? "revoked" : "active"} /></td>
              <td>{!k.revoked && <button className="btn small danger" onClick={() => window.confirm("Revoke this key? Clients using it stop working immediately.") && void action.run(() => post(`/api/me/keys/${k.key_id}/revoke`), "Key revoked.").then(keys.reload)}>Revoke</button>}</td></tr>
          ))}</tbody>
        </table>
      </Card>
      <Card title="Audit history">
        <Loading loading={auditLog.loading} error={auditLog.error} />
        <div className="table-wrap">
          <table>
            <thead><tr><th scope="col">Time</th><th scope="col">Actor</th><th scope="col">Tool</th><th scope="col">Platform</th><th scope="col">Account</th><th scope="col">Approval</th><th scope="col">Outcome</th><th scope="col">Reason</th></tr></thead>
            <tbody>{auditLog.data?.entries.map((e: any) => (
              <tr key={e.id}><td>{fmt(e.ts)}</td><td>{e.actor}</td><td><code>{e.tool}</code></td><td>{e.platform ?? "—"}</td><td className="small">{e.account_id ?? "—"}</td><td className="small">{e.approval_status ?? "—"}</td><td><Status value={e.outcome} /></td><td className="small">{e.failure_reason ?? ""}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
