import { FormEvent, useState } from "react";
import { api, Account, ContentItem, patch, post, Variant } from "../api";
import { Card, Loading, Status, useAction, useLoad } from "../ui";
import type { PageProps } from "./types";

const PUBLISHABLE = ["youtube", "tiktok", "instagram", "facebook"];

export function Studio(_: PageProps) {
  const items = useLoad(() => api<{ items: ContentItem[] }>("/api/content"));
  const accounts = useLoad(() => api<{ accounts: Account[] }>("/api/accounts"));
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <>
      <h1>Content studio</h1>
      <p className="muted">Create one original item, adapt it into independent platform versions, edit each one, then submit for approval.</p>
      <div className="grid two">
        <NewItem onCreated={(id) => { void items.reload(); setSelected(id); }} />
        <Card title="Content library">
          <Loading loading={items.loading} error={items.error} />
          <ul className="list">
            {items.data?.items.map((i) => (
              <li key={i.item_id}>
                <button className="link" onClick={() => setSelected(i.item_id)} aria-pressed={selected === i.item_id}>{i.title}</button> <Status value={i.status} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
      {selected && <ItemEditor key={selected} itemId={selected} accounts={accounts.data?.accounts ?? []} onChange={items.reload} />}
    </>
  );
}

function NewItem({ onCreated }: { onCreated: (id: string) => void }) {
  const [form, setForm] = useState({ title: "", body: "", content_type: "video", tags: "", file_path: "", media_url: "" });
  const action = useAction();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const media = [{ ...(form.file_path && { file_path: form.file_path }), ...(form.media_url && { url: form.media_url }) }].filter((m) => Object.keys(m).length);
    void action.run(async () => {
      const r = await post("/api/content", { title: form.title, body: form.body, content_type: form.content_type,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean), media });
      onCreated(r.item.item_id);
    }, "Content created.");
  };
  const set = (k: keyof typeof form) => (e: any) => setForm({ ...form, [k]: e.target.value });
  return (
    <Card title="New content">
      <form onSubmit={submit} className="form">
        <label htmlFor="c-title">Title</label><input id="c-title" required maxLength={300} value={form.title} onChange={set("title")} />
        <label htmlFor="c-body">Core message</label><textarea id="c-body" rows={4} value={form.body} onChange={set("body")} />
        <label htmlFor="c-type">Type</label>
        <select id="c-type" value={form.content_type} onChange={set("content_type")}>{["video", "image", "carousel", "text", "document"].map((t) => <option key={t}>{t}</option>)}</select>
        <label htmlFor="c-tags">Tags (comma-separated)</label><input id="c-tags" value={form.tags} onChange={set("tags")} />
        <label htmlFor="c-file">Local media file (inside media roots, for YouTube/TikTok)</label><input id="c-file" value={form.file_path} onChange={set("file_path")} />
        <label htmlFor="c-url">Public media URL (for Instagram/Facebook)</label><input id="c-url" type="url" value={form.media_url} onChange={set("media_url")} />
        <button className="btn primary" disabled={action.busy}>Create</button>
        {action.view}
      </form>
    </Card>
  );
}

function ItemEditor({ itemId, accounts, onChange }: { itemId: string; accounts: Account[]; onChange: () => void }) {
  const { data, error, loading, reload } = useLoad(() => api<{ item: ContentItem }>(`/api/content/${itemId}`), [itemId]);
  const [platforms, setPlatforms] = useState<string[]>(PUBLISHABLE);
  const [duration, setDuration] = useState("45");
  const action = useAction();
  if (!data) return <Loading loading={loading} error={error} />;
  const item = data.item;
  const adapt = () => {
    const targets = Object.fromEntries(platforms.map((p) => [p, accounts.find((a) => a.platform === p && a.status === "connected")?.account_id]).filter(([, v]) => v));
    void action.run(() => post(`/api/content/${itemId}/adapt`, { platforms, accounts: targets, duration_seconds: Number(duration) || null, vertical: true }), "Platform versions created.").then(() => { void reload(); onChange(); });
  };
  return (
    <Card title={`Adapt: ${item.title}`} actions={<Status value={item.status} />}>
      <p>{item.body}</p>
      <fieldset className="row">
        <legend>Platforms</legend>
        {PUBLISHABLE.map((p) => (
          <label key={p}><input type="checkbox" checked={platforms.includes(p)} onChange={(e) => setPlatforms(e.target.checked ? [...platforms, p] : platforms.filter((x) => x !== p))} /> {p}</label>
        ))}
        <label className="inline">Video length (s) <input type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} style={{ width: "6em" }} /></label>
        <button className="btn" onClick={adapt} disabled={action.busy || platforms.length === 0}>Generate versions</button>
      </fieldset>
      {action.view}
      <div className="grid two">
        {item.variants?.map((v) => <VariantEditor key={v.variant_id} variant={v} accounts={accounts} reload={() => { void reload(); onChange(); }} />)}
      </div>
    </Card>
  );
}

function VariantEditor({ variant, accounts, reload }: { variant: Variant; accounts: Account[]; reload: () => void }) {
  const [title, setTitle] = useState(variant.title);
  const [caption, setCaption] = useState(variant.caption);
  const [account, setAccount] = useState(variant.account_id ?? "");
  const action = useAction();
  const editable = variant.status === "DRAFT" || variant.status === "FAILED";
  const save = () => void action.run(() => patch(`/api/variants/${variant.variant_id}`, { title, caption, account_id: account || null }), "Saved and re-validated.").then(reload);
  const submit = () => void action.run(() => post(`/api/variants/${variant.variant_id}/submit`, {}), "Submitted: awaiting your approval in the Approvals queue.").then(reload);
  const id = variant.variant_id;
  return (
    <section className="variant" aria-label={`${variant.platform} version`}>
      <h3><span className="cap">{variant.platform}</span> · {variant.format} <Status value={variant.status} /></h3>
      <label htmlFor={`acc-${id}`}>Target account</label>
      <select id={`acc-${id}`} value={account} onChange={(e) => setAccount(e.target.value)} disabled={!editable}>
        <option value="">— choose —</option>
        {accounts.filter((a) => a.platform === variant.platform).map((a) => <option key={a.account_id} value={a.account_id}>{a.display_name}</option>)}
      </select>
      {variant.platform === "youtube" && (<><label htmlFor={`t-${id}`}>Title ({title.length}/100)</label><input id={`t-${id}`} value={title} onChange={(e) => setTitle(e.target.value)} disabled={!editable} /></>)}
      <label htmlFor={`cap-${id}`}>Caption ({caption.length} chars)</label>
      <textarea id={`cap-${id}`} rows={6} value={caption} onChange={(e) => setCaption(e.target.value)} disabled={!editable} />
      <p className="muted small">{variant.instructions}</p>
      {!variant.validation.valid && <ul className="errors">{variant.validation.errors.map((e) => <li key={e}>{e}</li>)}</ul>}
      {variant.validation.warnings?.map((w) => <p key={w} className="muted small">⚠ {w}</p>)}
      <div className="row">
        <button className="btn" onClick={save} disabled={!editable || action.busy}>Save</button>
        <button className="btn primary" onClick={submit} disabled={!editable || action.busy || !variant.validation.valid || !variant.account_id}>Submit for approval</button>
      </div>
      {action.view}
    </section>
  );
}
