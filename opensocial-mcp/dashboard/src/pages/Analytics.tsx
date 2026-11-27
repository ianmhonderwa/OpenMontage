import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api";
import { Card, fmt, Loading, useLoad } from "../ui";
import type { PageProps } from "./types";

export function Analytics(_: PageProps) {
  const [period, setPeriod] = useState("weekly");
  const summary = useLoad(() => api("/api/analytics/summary"));
  const report = useLoad(() => api(`/api/reports/${period}`), [period]);
  const exportReport = (format: "json" | "csv") => {
    if (!report.data) return;
    let body: string;
    if (format === "json") body = JSON.stringify(report.data, null, 2);
    else {
      const rows = [["platform", "metric", "value", "objects", "missing", "last_collected"]];
      for (const [p, data] of Object.entries<any>(report.data.performance.platforms))
        for (const [m, v] of Object.entries<any>(data.metrics)) rows.push([p, m, String(v.value), String(v.objects), String(v.missing), data.last_collected ?? ""]);
      body = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    }
    const url = URL.createObjectURL(new Blob([body], { type: format === "json" ? "application/json" : "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `opensocial-${period}-report.${format}` });
    a.click();
    URL.revokeObjectURL(url);
  };
  const platforms = summary.data ? Object.entries<any>(summary.data.platforms) : [];
  return (
    <>
      <h1>Analytics</h1>
      <p className="muted">Each platform's metrics are shown under the platform's own names and definitions. Values are never summed across platforms, and missing values are shown as missing.</p>
      <Loading loading={summary.loading} error={summary.error} />
      {platforms.length === 0 && !summary.loading && <p className="muted">No metrics collected yet. Metrics are stored whenever an analytics tool reads a connected account.</p>}
      <div className="grid two">
        {platforms.map(([platform, data]) => {
          const rows = Object.entries<any>(data.metrics).map(([metric, v]) => ({ metric, value: v.value, missing: v.missing }));
          return (
            <Card key={platform} title={`${platform} metrics`}>
              <p className="muted small">Sources: {data.sources.join(", ")} · collected {fmt(data.last_collected)}</p>
              <div style={{ width: "100%", height: 220 }} aria-hidden="true">
                <ResponsiveContainer>
                  <BarChart data={rows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="metric" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Bar dataKey="value" fill="var(--accent)" /></BarChart>
                </ResponsiveContainer>
              </div>
              <table><caption className="sr-only">{platform} metrics</caption>
                <thead><tr><th scope="col">Metric</th><th scope="col">Value</th><th scope="col">Missing</th></tr></thead>
                <tbody>{rows.map((r) => <tr key={r.metric}><th scope="row"><code>{r.metric}</code></th><td>{r.value.toLocaleString("en-GB")}</td><td>{r.missing || "—"}</td></tr>)}</tbody>
              </table>
            </Card>
          );
        })}
      </div>
      <Card title="Reports" actions={<div className="row">
        <label htmlFor="period" className="sr-only">Period</label>
        <select id="period" value={period} onChange={(e) => setPeriod(e.target.value)}>{["daily", "weekly", "monthly"].map((p) => <option key={p}>{p}</option>)}</select>
        <button className="btn" onClick={() => exportReport("json")} disabled={!report.data}>Export JSON</button>
        <button className="btn" onClick={() => exportReport("csv")} disabled={!report.data}>Export CSV</button>
      </div>}>
        <Loading loading={report.loading} error={report.error} />
        {report.data && (<>
          <p>{fmt(report.data.period_start)} – {fmt(report.data.period_end)}: <strong>{report.data.publishing_activity.successful_external_actions}</strong> successful external actions.</p>
          <ul className="list">{Object.entries<number>(report.data.publishing_activity.by_platform).map(([p, n]) => <li key={p}><span className="cap">{p}</span>: {n}</li>)}</ul>
          {report.data.top_content_by_metric.length > 0 && (
            <table><caption>Top content (ranked within each platform metric)</caption>
              <thead><tr><th scope="col">Platform</th><th scope="col">Object</th><th scope="col">Metric</th><th scope="col">Value</th></tr></thead>
              <tbody>{report.data.top_content_by_metric.map((t: any) => <tr key={`${t.platform}${t.object_id}${t.metric}`}><td>{t.platform}</td><td><code>{t.object_id}</code></td><td>{t.metric}</td><td>{t.value}</td></tr>)}</tbody>
            </table>
          )}
          {report.data.notes.map((n: string) => <p key={n} className="muted small">{n}</p>)}
        </>)}
      </Card>
    </>
  );
}
