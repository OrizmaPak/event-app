"use client";

import { Check, LoaderCircle, Mail, Plus, RefreshCw, Save, Settings2, ShieldCheck, Trash2, UserMinus, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface RoleRecord { id: string; key: string; name: string; description: string; permissions: string[] }
interface CatalogItem { key: string; group: string; label: string }
interface EventOption { id: string; slug: string; title: string; status: string; startAt: string }
interface MemberRecord { userKey: string; userId: string | null; email: string; name: string; roleId: string | null; roleName: string; memberRole: string; status: string; eventScope: string; overrides: Array<{ permissionKey: string; effect: "allow" | "deny" }> }
interface InvitationRecord { id: string; email: string; roleName: string; eventScope: string; expiresAt: string }

export function TeamManager() {
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [invitations, setInvitations] = useState<InvitationRecord[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null);
  const [editingMember, setEditingMember] = useState<MemberRecord | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState("");

  async function load() {
    const [teamResponse, rolesResponse] = await Promise.all([fetch("/api/v1/workspaces/current/team"), fetch("/api/v1/workspaces/current/roles")]);
    const teamPayload = await teamResponse.json() as { data?: { members: MemberRecord[]; invitations: InvitationRecord[]; events: EventOption[] }; error?: { message?: string } };
    const rolesPayload = await rolesResponse.json() as { data: { roles: RoleRecord[]; catalog: CatalogItem[] }; error?: { message?: string } };
    if (teamResponse.ok && teamPayload.data) { setMembers(teamPayload.data.members); setInvitations(teamPayload.data.invitations); setEvents(teamPayload.data.events ?? []); }
    if (rolesResponse.ok && rolesPayload.data) { setRoles(rolesPayload.data.roles); setCatalog(rolesPayload.data.catalog); }
    if (!teamResponse.ok || !rolesResponse.ok) setError(teamPayload.error?.message ?? rolesPayload.error?.message ?? "Unable to load team access.");
  }

  useEffect(() => { void load(); }, []);
  const grouped = useMemo(() => Map.groupBy(catalog, (item) => item.group), [catalog]);

  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyAction === "invite") return;
    setError("");
    setBusyAction("invite");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/v1/workspaces/current/team", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: data.get("email"), roleId: data.get("roleId"), eventScope: data.get("eventScope") }) });
      const payload = await response.json().catch(() => ({})) as { error?: { message?: string } };
      if (!response.ok) { setError(payload.error?.message ?? "Unable to send the invitation."); return; }
      setInviteOpen(false);
      setNotice("Team invitation sent");
      window.setTimeout(() => setNotice(""), 2200);
      await load();
    } catch {
      setError("The invitation could not be sent. Check your connection and try again.");
    } finally {
      setBusyAction("");
    }
  }

  async function saveRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyAction === "save-role") return;
    setError("");
    setBusyAction("save-role");
    const data = new FormData(event.currentTarget);
    const selected = catalog.filter((item) => data.get(item.key) === "on").map((item) => item.key);
    try {
      const response = await fetch("/api/v1/workspaces/current/roles", { method: editingRole ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: editingRole?.id, name: data.get("name"), description: data.get("description"), permissions: selected }) });
      const payload = await response.json().catch(() => ({})) as { error?: { message?: string } };
      if (!response.ok) { setError(payload.error?.message ?? "Unable to save the role."); return; }
      setRoleOpen(false);
      setNotice(editingRole ? "Role updated" : "Role created");
      setEditingRole(null);
      window.setTimeout(() => setNotice(""), 2200);
      await load();
    } catch {
      setError("The role could not be saved. Check your connection and try again.");
    } finally {
      setBusyAction("");
    }
  }

  function openRole(role?: RoleRecord) { setEditingRole(role ?? null); setError(""); setRoleOpen(true); }

  async function saveMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingMember?.userId || busyAction === "save-member") return;
    setError("");
    setBusyAction("save-member");
    const data = new FormData(event.currentTarget);
    const overrides = catalog.flatMap((item) => { const effect = data.get(`override:${item.key}`); return effect === "allow" || effect === "deny" ? [{ permissionKey: item.key, effect }] : []; });
    try {
      const response = await fetch(`/api/v1/workspaces/current/team/${editingMember.userId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ roleId: data.get("roleId"), eventScope: data.get("eventScope"), status: data.get("status"), overrides }) });
      const payload = await response.json().catch(() => ({})) as { error?: { message?: string } };
      if (!response.ok) { setError(payload.error?.message ?? "Unable to update member access."); return; }
      setEditingMember(null); setNotice("Member access updated"); window.setTimeout(() => setNotice(""), 2200); await load();
    } catch {
      setError("Member access could not be updated. Check your connection and try again.");
    } finally {
      setBusyAction("");
    }
  }

  async function cancelInvitation(invitationId: string) {
    if (!window.confirm("Cancel this invitation? The recipient will no longer be able to use its link.")) return;
    setBusyAction(`invitation:${invitationId}`); setError("");
    const response = await fetch(`/api/v1/workspaces/current/team/invitations/${invitationId}`, { method: "DELETE" });
    const payload = await response.json().catch(() => ({})) as { error?: { message?: string } };
    setBusyAction("");
    if (!response.ok) { setError(payload.error?.message ?? "Unable to cancel the invitation."); return; }
    setNotice("Invitation cancelled"); window.setTimeout(() => setNotice(""), 2200); await load();
  }

  async function resendInvitation(invitationId: string) {
    if (!window.confirm("Resend this invitation? The previous link will stop working and a fresh seven-day link will be sent.")) return;
    setBusyAction(`resend:${invitationId}`); setError("");
    try {
      const response = await fetch(`/api/v1/workspaces/current/team/invitations/${invitationId}`, { method: "POST" });
      const payload = await response.json().catch(() => ({})) as { error?: { message?: string } };
      if (!response.ok) { setError(payload.error?.message ?? "Unable to resend the invitation."); return; }
      setNotice("Invitation resent with a new seven-day link"); window.setTimeout(() => setNotice(""), 2600); await load();
    } catch { setError("The invitation could not be resent. Check your connection and try again."); }
    finally { setBusyAction(""); }
  }

  async function removeMember(member: MemberRecord) {
    if (!member.userId || !window.confirm(`Remove ${member.name} from this workspace? Their user account will remain, but they will lose team and event access immediately.`)) return;
    setBusyAction(`member:${member.userId}`); setError("");
    const response = await fetch(`/api/v1/workspaces/current/team/${member.userId}`, { method: "DELETE" });
    const payload = await response.json().catch(() => ({})) as { error?: { message?: string } };
    setBusyAction("");
    if (!response.ok) { setError(payload.error?.message ?? "Unable to remove the team member."); return; }
    setNotice("Team member removed"); window.setTimeout(() => setNotice(""), 2200); await load();
  }

  return <div className="team-access-manager">
    <div className="role-cards">{roles.slice(0, 4).map((role) => <button type="button" key={role.id} onClick={() => openRole(role)}><span className="metric-icon metric-icon--violet"><ShieldCheck size={19} /></span><h2>{role.name}</h2><p>{role.description || `${role.permissions.length} workspace permissions`}</p><b>{members.filter((member) => member.roleId === role.id).length} members</b></button>)}</div>
    <article className="dashboard-panel team-panel"><div className="panel-heading"><div><small>WORKSPACE ACCESS</small><h2>Team members</h2></div><div className="team-heading-actions"><button className="button button--quiet button--small" onClick={() => openRole()}><ShieldCheck size={14} /> New role</button><button className="button button--brand button--small" onClick={() => setInviteOpen(true)}><Plus size={14} /> Invite member</button></div></div>{error && <div className="form-error" role="alert">{error}</div>}<div className="team-list"><div className="team-list__header" aria-hidden="true"><span>Member</span><span>Role</span><span>Event access</span><span>Status</span><span>Actions</span></div>{members.map((member) => <div key={member.userKey}><span className="team-avatar">{member.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span><p><b>{member.name}</b><small>{member.email}</small></p><em className="pill pill--neutral">{member.roleName}</em><span className="team-access">{member.eventScope === "all" ? "All events" : member.eventScope}</span><i className={member.status === "active" ? "active" : "invited"}>{member.status}</i>{member.userId && member.memberRole !== "owner" ? <span className="team-row-actions"><button className="team-member-settings" type="button" title="Edit member access" aria-label={`Edit access for ${member.name}`} onClick={() => setEditingMember(member)}><Settings2 size={16} /></button><button className="team-member-settings team-member-settings--danger" type="button" title="Remove member" aria-label={`Remove ${member.name}`} onClick={() => void removeMember(member)} disabled={busyAction === `member:${member.userId}`}>{busyAction === `member:${member.userId}` ? <LoaderCircle className="spin" size={16} /> : <UserMinus size={16} />}</button></span> : <span />}</div>)}{invitations.map((invitation) => <div key={invitation.id}><span className="team-avatar team-avatar--pending"><Mail size={16} /></span><p><b>{invitation.email}</b><small>Invitation expires {new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short" }).format(new Date(invitation.expiresAt))}</small></p><em className="pill pill--neutral">{invitation.roleName}</em><span className="team-access">{invitation.eventScope === "all" ? "All events" : invitation.eventScope}</span><i className="invited">Invited</i><span className="team-row-actions"><button className="team-member-settings" type="button" title="Resend invitation" aria-label={`Resend invitation to ${invitation.email}`} onClick={() => void resendInvitation(invitation.id)} disabled={busyAction === `resend:${invitation.id}` || busyAction === `invitation:${invitation.id}`}>{busyAction === `resend:${invitation.id}` ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />}</button><button className="team-member-settings team-member-settings--danger" type="button" title="Cancel invitation" aria-label={`Cancel invitation to ${invitation.email}`} onClick={() => void cancelInvitation(invitation.id)} disabled={busyAction === `invitation:${invitation.id}` || busyAction === `resend:${invitation.id}`}>{busyAction === `invitation:${invitation.id}` ? <LoaderCircle className="spin" size={16} /> : <Trash2 size={16} />}</button></span></div>)}</div></article>
    {inviteOpen && <div className="dashboard-modal"><form onSubmit={invite}><header><div><span className="modal-icon"><UserPlus size={19} /></span><h2>Invite a team member</h2><p>Choose a role and limit access to the events this person needs.</p></div><button type="button" onClick={() => setInviteOpen(false)} disabled={busyAction === "invite"}><X size={19} /></button></header><div className="field-grid"><label className="field field--full"><span>Email address</span><input name="email" type="email" required placeholder="team@example.com" disabled={busyAction === "invite"} /></label><label className="field field--full"><span>Role</span><select name="roleId" required defaultValue="" disabled={busyAction === "invite"}><option value="" disabled>Select a role</option>{roles.filter((role) => role.key !== "owner").map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label><label className="field field--full"><span>Event access</span><select name="eventScope" defaultValue="all" disabled={busyAction === "invite"}><option value="all">All events</option>{events.map((event) => <option key={event.id} value={event.slug}>{event.title}{event.status === "draft" ? " · Draft" : ""}</option>)}</select>{events.length === 0 && <small>No events are available in this workspace yet.</small>}</label></div><div className="role-explainer"><ShieldCheck size={17} /><span><b>Role defaults can be overridden later</b><small>Explicit cannot permissions always take priority.</small></span></div><footer><button className="button button--quiet" type="button" onClick={() => setInviteOpen(false)} disabled={busyAction === "invite"}>Cancel</button><button className="button button--brand" type="submit" disabled={busyAction === "invite"}>{busyAction === "invite" ? <><LoaderCircle className="spin" size={14} /> Sending invitation…</> : <><Mail size={14} /> Send invitation</>}</button></footer></form></div>}
    {roleOpen && <div className="dashboard-modal role-editor-modal"><form onSubmit={saveRole}><header><div><span className="modal-icon"><ShieldCheck size={19} /></span><h2>{editingRole ? `Edit ${editingRole.name}` : "Create a role"}</h2><p>Permissions are enforced on both the interface and the server.</p></div><button type="button" onClick={() => setRoleOpen(false)} disabled={busyAction === "save-role"}><X size={19} /></button></header><div className="role-editor-body"><div className="field-grid"><label className="field"><span>Role name</span><input name="name" required defaultValue={editingRole?.name ?? ""} disabled={editingRole?.key === "owner" || busyAction === "save-role"} /></label><label className="field"><span>Description</span><input name="description" defaultValue={editingRole?.description ?? ""} disabled={editingRole?.key === "owner" || busyAction === "save-role"} /></label></div>{[...grouped.entries()].map(([group, items]) => <fieldset key={group} disabled={editingRole?.key === "owner" || busyAction === "save-role"}><legend>{group}</legend>{items.map((item) => <label key={item.key}><input name={item.key} type="checkbox" defaultChecked={editingRole?.permissions.includes(item.key)} /><span><b>{item.label}</b><small>{item.key}</small></span><Check size={15} /></label>)}</fieldset>)}</div>{error && <div className="form-error" role="alert">{error}</div>}<footer><button className="button button--quiet" type="button" onClick={() => setRoleOpen(false)} disabled={busyAction === "save-role"}>Cancel</button>{editingRole?.key !== "owner" && <button className="button button--brand" type="submit" disabled={busyAction === "save-role"}>{busyAction === "save-role" ? <><LoaderCircle className="spin" size={14} /> Saving role…</> : <><Save size={14} /> Save role</>}</button>}</footer></form></div>}
    {editingMember && <div className="dashboard-modal role-editor-modal"><form onSubmit={saveMember}><header><div><span className="modal-icon"><Settings2 size={19} /></span><h2>Edit {editingMember.name}</h2><p>Role permissions apply first. Explicit allow or deny overrides apply last.</p></div><button type="button" onClick={() => setEditingMember(null)} disabled={busyAction === "save-member"}><X size={19} /></button></header><div className="role-editor-body"><div className="field-grid"><label className="field"><span>Role</span><select name="roleId" defaultValue={editingMember.roleId ?? ""} disabled={busyAction === "save-member"}>{roles.filter((role) => role.key !== "owner").map((role) => <option value={role.id} key={role.id}>{role.name}</option>)}</select></label><label className="field"><span>Status</span><select name="status" defaultValue={editingMember.status} disabled={busyAction === "save-member"}><option value="active">Active</option><option value="suspended">Suspended</option></select></label><label className="field field--full"><span>Event access</span><select name="eventScope" defaultValue={editingMember.eventScope} disabled={busyAction === "save-member"}><option value="all">All events</option>{events.map((event) => <option value={event.slug} key={event.id}>{event.title}{event.status === "draft" ? " · Draft" : ""}</option>)}</select>{events.length === 0 && <small>No events are available in this workspace yet.</small>}</label></div>{[...grouped.entries()].map(([group, items]) => <fieldset className="member-overrides" key={group} disabled={busyAction === "save-member"}><legend>{group}</legend>{items.map((item) => <label key={item.key}><span><b>{item.label}</b><small>{item.key}</small></span><select name={`override:${item.key}`} defaultValue={editingMember.overrides.find((entry) => entry.permissionKey === item.key)?.effect ?? "inherit"}><option value="inherit">Use role default</option><option value="allow">Explicitly allow</option><option value="deny">Explicitly deny</option></select></label>)}</fieldset>)}</div>{error && <div className="form-error" role="alert">{error}</div>}<footer><button className="button button--quiet" type="button" onClick={() => setEditingMember(null)} disabled={busyAction === "save-member"}>Cancel</button><button className="button button--brand" type="submit" disabled={busyAction === "save-member"}>{busyAction === "save-member" ? <><LoaderCircle className="spin" size={14} /> Saving access…</> : <><Save size={14} /> Save member access</>}</button></footer></form></div>}
    {notice && <div className="toast-message">{notice}</div>}
  </div>;
}
