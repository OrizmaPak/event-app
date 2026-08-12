"use client";

import { Check, Grid3X3, Plus, Search, Sparkles, UserPlus, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import type { Guest, TableRecord } from "@/lib/data/types";

export function SeatingManager({ initialTables, initialGuests }: { initialTables: TableRecord[]; initialGuests: Guest[] }) {
  const [tables, setTables] = useState(initialTables);
  const [guests, setGuests] = useState(initialGuests);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const unassigned = useMemo(
    () => guests.filter((guest) => guest.rsvp === "confirmed" && !guest.table && guest.name.toLowerCase().includes(query.toLowerCase())),
    [guests, query],
  );
  const selectedGuest = useMemo(() => guests.find((guest) => guest.id === selected) ?? null, [guests, selected]);
  const zones = useMemo(() => Array.from(new Set(tables.map((table) => table.zone))), [tables]);
  const assignedSeats = tables.reduce((sum, table) => sum + table.assigned, 0);
  const totalSeats = tables.reduce((sum, table) => sum + table.seats, 0);

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2000);
  }

  function assign(table: TableRecord) {
    if (!selected || table.assigned >= table.seats) return;

    setGuests((items) => items.map((guest) => guest.id === selected ? { ...guest, table: table.name, seat: String(table.assigned + 1).padStart(2, "0") } : guest));
    setTables((items) => items.map((item) => item.id === table.id ? { ...item, assigned: item.assigned + 1 } : item));
    setSelected(null);
    showNotice(`Guest assigned to ${table.name}`);
  }

  function addTable() {
    const number = tables.length + 19;
    setTables((items) => [...items, { id: `tbl_${number}`, name: `Table ${number}`, seats: 10, assigned: 0, zone: "Garden zone" }]);
    showNotice("New table added");
  }

  function autoArrange() {
    const waiting = guests.filter((guest) => guest.rsvp === "confirmed" && !guest.table);
    const updatedTables = tables.map((table) => ({ ...table }));
    const assignments = new Map<string, { table: string; seat: string }>();

    waiting.forEach((guest) => {
      const target = updatedTables.find((table) => table.assigned < table.seats);
      if (!target) return;
      target.assigned += 1;
      assignments.set(guest.id, { table: target.name, seat: String(target.assigned).padStart(2, "0") });
    });

    setTables(updatedTables);
    setGuests((items) => items.map((guest) => assignments.has(guest.id) ? { ...guest, ...assignments.get(guest.id)! } : guest));
    setSelected(null);
    showNotice(assignments.size ? `${assignments.size} guests auto-assigned` : "No available seats to assign");
  }

  return (
    <div className="seating-layout">
      <section className="seating-command-center">
        <div className="seating-toolbar">
          <div>
            <span className="dashboard-eyebrow">Smart seating</span>
            <h2>{tables.length} tables · {assignedSeats}/{totalSeats} seats assigned</h2>
          </div>
          <div>
            <button className="button button--outline button--small" type="button" onClick={autoArrange}><Grid3X3 size={14} /> Auto arrange</button>
            <button className="button button--brand button--small" type="button" onClick={addTable}><Plus size={14} /> Add table</button>
          </div>
        </div>

        <div className="seating-insights">
          <article><small>Open seats</small><b>{totalSeats - assignedSeats}</b><span>Across {zones.length} zones</span></article>
          <article><small>Need seats</small><b>{guests.filter((guest) => guest.rsvp === "confirmed" && !guest.table).length}</b><span>Confirmed guests</span></article>
          <article><small>Capacity used</small><b>{Math.round((assignedSeats / totalSeats) * 100)}%</b><span>Current room plan</span></article>
        </div>

        {selectedGuest && (
          <div className="selected-seat-banner">
            <span>{selectedGuest.name.split(" ").map((item) => item[0]).join("")}</span>
            <p><small>ASSIGNING NOW</small><b>{selectedGuest.name}</b><em>{selectedGuest.partySize} guest{selectedGuest.partySize > 1 ? "s" : ""} · {selectedGuest.dietaryNote ?? "No note"}</em></p>
          </div>
        )}

        <div className="zone-board">
          {zones.map((zone) => {
            const zoneTables = tables.filter((table) => table.zone === zone);
            const zoneAssigned = zoneTables.reduce((sum, table) => sum + table.assigned, 0);
            const zoneSeats = zoneTables.reduce((sum, table) => sum + table.seats, 0);

            return (
              <section className="zone-lane" key={zone}>
                <header><span className={`zone-dot zone-dot--${zone.toLowerCase().split(" ")[0]}`} /><div><b>{zone}</b><small>{zoneAssigned}/{zoneSeats} seats assigned</small></div></header>
                <div>
                  {zoneTables.map((table) => {
                    const full = table.assigned >= table.seats;
                    const percentage = Math.round((table.assigned / table.seats) * 100);

                    return (
                      <button key={table.id} type="button" className={`smart-table-card ${selected ? "can-assign" : ""} ${full ? "full" : ""}`} onClick={() => assign(table)} disabled={full && !!selected}>
                        <span><UsersRound size={18} /></span>
                        <p><b>{table.name}</b><small>{table.seats - table.assigned} open · {percentage}% full</small></p>
                        <i><em style={{ width: `${percentage}%` }} /></i>
                        {selected && !full && <strong>Assign</strong>}
                        {full && <strong>Full</strong>}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      <aside className="unassigned-panel">
        <div className="panel-heading"><div><small>NEEDS ATTENTION</small><h2>Unassigned guests</h2></div><span className="pill pill--warning">{unassigned.length}</span></div>
        <p>Select a guest, then choose a table with open capacity.</p>
        <label className="dashboard-input"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search guests" /></label>
        <div className="unassigned-list">
          {unassigned.map((guest) => (
            <button type="button" key={guest.id} className={selected === guest.id ? "active" : ""} onClick={() => setSelected(guest.id)}>
              <span>{guest.name.split(" ").map((item) => item[0]).join("")}</span>
              <p><b>{guest.name}</b><small>{guest.partySize} guest{guest.partySize > 1 ? "s" : ""}{guest.dietaryNote ? ` · ${guest.dietaryNote}` : ""}</small></p>
              {selected === guest.id ? <Check size={16} /> : <UserPlus size={16} />}
            </button>
          ))}
          {unassigned.length === 0 && <div className="seating-empty"><Sparkles size={21} /><b>Everyone has a seat</b></div>}
        </div>
        <div className="seating-tip"><Sparkles size={16} /><span><b>Suggested workflow</b><small>Select guests with notes first, then use auto arrange for everyone else.</small></span></div>
      </aside>

      {notice && <div className="toast-message">{notice}</div>}
    </div>
  );
}
