import { useState } from "react";
import { api, Account, patch, post } from "../api";
import { Card, fmt, Loading, Status, useAction, useLoad } from "../ui";
import type { PageProps } from "./types";

const PLATFORMS: { key: string; label: string; provider?: string; tiers: string[] }[] = [
  { key: "youtube", label: "YouTube", provider: "youtube", tiers: ["read", "upload", "manage", "comments"] },
  { key: "tiktok", label: "TikTok", provider: "tiktok", tiers: ["read", "draft", "publish"] },
  { key: "facebook", label: "Facebook Pages", provider: "facebook", tiers: ["read", "insights", "publish", "engage"] },
  { key: "instagram", label: "Instagram", provider: "instagram", tiers: ["read", "publish", "comments", "insights"] },
  { key: "whatsapp", label: "WhatsApp Business", tiers: [] },
  { key: "kindle", label: "Kindle (KDP assistant)", tiers: [] },
];

export function Accounts(_: PageProps) {
  const { data, error, loading, reload } = useLoad(() => api<{ accounts: Account[] }>("/api/accounts"));
  if (!data) return <Loading loading={loading} error={error} />;
  return (
    <>
      <h1>Platforms</h1>
      {PLATFORMS.map((p) => (
        <PlatformSection key={p.key} platform={p} accounts={data.accounts.filter((a) => a.platform === p.key)} reload={reload} />
      ))}
    </>
  );
}

function PlatformSection({ platform, accounts, reload }: { platform: (typeof PLATFORMS)[number]; accounts: Account[]; reload: () => void }) {
  const [tiers, setTiers] = useState<string[]>(["read"]);
  const action = useAction();
  const connect = async () => {
    const r = await api(`/api/oauth/${platform.provider}/start?tiers=${tiers.join(",")}`);
    window.open(r.authorize_url, "_blank", "noopener,noreferrer");
  };
  return (
    <Card title={platform.label} actions={platform.provider && (
      <div className="row">
        <fieldset className="tiers">
          <legend className="sr-only">Permissions to request</legend>
          {platform.tiers.map((t) => (
            <label key={t}><input type="checkbox" checked={tiers.includes(t)} disabled={t === "read"}
              onChange={(e) => setTiers(e.target.checked ? [...tiers, t] : tiers.filter((x) => x !== t))} /> {t}</label>
          ))}
        </fieldset>
        <button className="btn" onClick={() => action.run(connect, "Authorisation opened in a new tab.")}>Connect account</button>
      </div>
    )}>
      {platform.key === "whatsapp" && <p className="muted small">Register numbers with <code>POST /api/accounts/whatsapp</code> (system-user token) — see docs/installation.md.</p>}
      {platform.key === "kindle" && <p className="muted small">KDP has no public publishing API: the assistant prepares and validates; you upload at kdp.amazon.com.</p>}
      {action.view}
      {accounts.length === 0 ? <p className="muted">No accounts connected.</p> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th scope="col">Account</th><th scope="col">Status</th><th scope="col">Permissions</th><th scope="col">Token expiry</th><th scope="col">Last sync</th><th scope="col">Autonomy</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{accounts.map((a) => <AccountRow key={a.account_id} account={a} reload={reload} />)}</tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function AccountRow({ account, reload }: { account: Account; reload: () => void }) {
  const action = useAction();
  const confirmRun = (label: string, path: string) => {
    if (!window.confirm(`${label} "${account.display_name}"? Stored tokens will be deleted.`)) return;
    void action.run(() => post(path), `${label} done.`).then(reload);
  };
  const toggleAutonomy = () => {
    const enabled = !account.autonomy_enabled;
    const body = enabled ? { enabled, kinds: ["publish"], daily_limit: 3 } : { enabled: false, kinds: [], daily_limit: 0 };
    if (enabled && !window.confirm("Allow the agent to publish up to 3 items per day on this account without approval (only in AUTHORISED MANAGER mode)?")) return;
    void action.run(() => patch(`/api/accounts/${account.account_id}/autonomy`, body), "Autonomy updated.").then(reload);
  };
  return (
    <tr>
      <th scope="row">{account.display_name}<div className="muted small">{account.account_id}</div></th>
      <td><Status value={account.status} /></td>
      <td><details><summary>{account.granted_scopes.length} granted</summary><ul className="small">{account.granted_scopes.map((s) => <li key={s}><code>{s}</code></li>)}</ul></details></td>
      <td>{fmt(account.token_expires_at)}</td>
      <td>{fmt(account.last_sync_at)}</td>
      <td>{account.autonomy_enabled ? `${account.autonomous_kinds.join(", ")} ≤${account.daily_action_limit}/day` : "Off"}</td>
      <td className="actions">
        <button className="btn small" onClick={toggleAutonomy} disabled={action.busy || account.status !== "connected"}>{account.autonomy_enabled ? "Disable autonomy" : "Enable autonomy"}</button>
        <button className="btn small" onClick={() => confirmRun("Disconnect", `/api/accounts/${account.account_id}/disconnect`)} disabled={action.busy}>Disconnect</button>
        <button className="btn small danger" onClick={() => confirmRun("Revoke", `/api/accounts/${account.account_id}/revoke`)} disabled={action.busy}>Revoke</button>
        {action.view}
      </td>
    </tr>
  );
}
