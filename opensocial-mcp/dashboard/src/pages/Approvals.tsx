import { useState } from "react";
import { api, Approval, post } from "../api";
import { Card, fmt, Loading, Notice, Status, useAction, useLoad } from "../ui";
import type { PageProps } from "./types";

export function Approvals(_: PageProps) {
  const [status, setStatus] = useState("pending");
  const [done, setDone] = useState<string | null>(null);
  const { data, error, loading, reload } = useLoad(
    () => api<{ approvals: Approval[] }>(`/api/approvals${status === "all" ? "" : `?status=${status}`}`), [status]);
  return (
    <>
      <h1>Approval queue</h1>
      <p className="muted">Every external action the AI proposes waits here. Approving covers exactly the content shown; any change needs a new approval.</p>
      <div className="row">
        <label htmlFor="status-filter">Show</label>
        <select id="status-filter" value={status} onChange={(e) => setStatus(e.target.value)}>
          {["pending", "approved", "executed", "rejected", "failed", "expired", "all"].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      {done && <Notice kind="ok">{done}</Notice>}
      <Loading loading={loading} error={error} />
      {data?.approvals.length === 0 && <p className="muted">No approvals with this status.</p>}
      {data?.approvals.map((a) => <ApprovalCard key={a.approval_id} approval={a} reload={reload} notify={setDone} />)}
    </>
  );
}

function ApprovalCard({ approval, reload, notify }: { approval: Approval; reload: () => void; notify: (m: string) => void }) {
  const action = useAction();
  const [when, setWhen] = useState("");
  const decide = (path: string, body: object, msg: string) =>
    void action.run(() => post(path, body), msg).then((ok) => { if (ok) notify(`${approval.summary}: ${msg}`); reload(); });
  return (
    <Card title={approval.summary} actions={<Status value={approval.status} />}>
      <dl className="meta">
        <div><dt>Operation</dt><dd><code>{approval.operation}</code> ({approval.kind})</dd></div>
        <div><dt>Platform / account</dt><dd><span className="cap">{approval.platform}</span> · {approval.account_id ?? "—"}</dd></div>
        <div><dt>Requested</dt><dd>{fmt(approval.created_at)} by {approval.requested_by}</dd></div>
        <div><dt>Scheduled</dt><dd>{fmt(approval.scheduled_for)}</dd></div>
        <div><dt>Expires</dt><dd>{fmt(approval.expires_at)}</dd></div>
        {approval.decided_by && <div><dt>Decided by</dt><dd>{approval.decided_by}</dd></div>}
      </dl>
      <details open={approval.status === "pending"}>
        <summary>Exact content to be sent</summary>
        <pre className="content">{JSON.stringify(approval.content, null, 2)}</pre>
      </details>
      {approval.result && <details><summary>Result</summary><pre className="content">{JSON.stringify(approval.result, null, 2)}</pre></details>}
      {approval.status === "pending" && (
        <div className="row">
          <button className="btn primary" disabled={action.busy} onClick={() => decide(`/api/approvals/${approval.approval_id}/approve`, { execute_now: true }, "Approved and executed.")}>Approve &amp; run now</button>
          <button className="btn" disabled={action.busy} onClick={() => decide(`/api/approvals/${approval.approval_id}/approve`, {}, "Approved. The agent may now run it.")}>Approve only</button>
          <label className="inline">Schedule <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></label>
          <button className="btn" disabled={!when || action.busy} onClick={() => decide(`/api/approvals/${approval.approval_id}/approve`, { scheduled_for: new Date(when).toISOString() }, "Approved and scheduled.")}>Approve for that time</button>
          <button className="btn danger" disabled={action.busy} onClick={() => decide(`/api/approvals/${approval.approval_id}/reject`, {}, "Rejected.")}>Reject</button>
        </div>
      )}
      {approval.status === "approved" && !approval.scheduled_for && (
        <button className="btn primary" disabled={action.busy} onClick={() => decide(`/api/approvals/${approval.approval_id}/execute`, {}, "Executed.")}>Run now</button>
      )}
      {action.view}
    </Card>
  );
}
