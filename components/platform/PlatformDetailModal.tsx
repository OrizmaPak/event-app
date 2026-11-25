"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Pencil, X } from "lucide-react";
import { useState } from "react";

type DetailField = { label: string; value: string; key: string; editable?: boolean; kind?: "text" | "toggle" };

export function PlatformDetailModal({ title, subtitle, initials, image, fields, onClose, onSave, saving = false }: { title: string; subtitle: string; initials: string; image?: string; fields: DetailField[]; onClose: () => void; onSave?: (values: Record<string, string | boolean>) => Promise<void>; saving?: boolean }) {
  const status = fields.find((field) => field.label.toLowerCase().includes("status"))?.value;
  const [draft, setDraft] = useState<Record<string, string | boolean>>(() => Object.fromEntries(fields.map((field) => [field.key, field.kind === "toggle" ? field.value.toLowerCase() === "enabled" : field.value])));
  const editable = fields.filter((field) => field.editable);
  const changed = editable.some((field) => draft[field.key] !== (field.kind === "toggle" ? field.value.toLowerCase() === "enabled" : field.value));

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="platform-dialog-overlay" />
        <Dialog.Content className="platform-dialog-content" aria-describedby="platform-detail-subtitle">
          <div className="platform-dialog-content__edge" />
          <header className="platform-dialog-header">
            <div className="platform-dialog-identity">
              <span className="platform-dialog-avatar">{image ? <img src={image} alt="" /> : initials}</span>
              <div>
                <span className="platform-dialog-eyebrow">Account profile</span>
                <Dialog.Title className="platform-dialog-title">{title}</Dialog.Title>
                <Dialog.Description id="platform-detail-subtitle" className="platform-dialog-subtitle">{subtitle}</Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="platform-dialog-close" type="button" aria-label="Close details"><X size={19} /></button>
            </Dialog.Close>
          </header>
          {status && <div className="platform-dialog-status"><span><i />{status}</span><small>Account status</small></div>}
          <section className="platform-dialog-details" aria-label="Account information">
            {fields.map((field) => <div className={field.editable ? "is-editable" : ""} key={field.label}><small>{field.label}{field.editable && <span className="platform-dialog-edit-icon" title={`Edit ${field.label}`} aria-label={`Edit ${field.label}`}><Pencil size={12} /></span>}</small>{field.editable && field.kind === "toggle" ? <button className={`platform-dialog-toggle${draft[field.key] ? " active" : ""}`} type="button" role="switch" aria-checked={Boolean(draft[field.key])} onClick={() => setDraft((current) => ({ ...current, [field.key]: !current[field.key] }))}><span />{draft[field.key] ? "Enabled" : "Off"}</button> : field.editable ? <input value={String(draft[field.key] ?? "")} onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))} placeholder="Not provided" /> : <strong>{field.value || "Not provided"}</strong>}</div>)}
          </section>
          <footer className="platform-dialog-footer">
            <span>{onSave ? "Changes are saved to the platform" : "Record details"}</span>
            <div className="platform-dialog-footer__actions"><Dialog.Close asChild><button className="button button--quiet" type="button">Close</button></Dialog.Close>{onSave && <button className="button" type="button" disabled={!changed || saving} onClick={() => void onSave(draft)}>{saving ? "Saving…" : "Save changes"}</button>}</div>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
