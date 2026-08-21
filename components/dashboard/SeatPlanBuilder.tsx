"use client";

import {
  Armchair,
  Ban,
  CircleDot,
  Columns3,
  Copy,
  Grid3X3,
  Maximize2,
  Minus,
  Minimize2,
  Pencil,
  Plus,
  RectangleHorizontal,
  Redo2,
  RotateCw,
  Rows3,
  Tag,
  Trash2,
  Type,
  Undo2,
  UserRoundCheck,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { compactMoney, demoPriceBands } from "@/lib/data/seating-data";
import type { LayoutObject, LayoutObjectType, PriceBand, SeatStatus } from "@/lib/data/types";

type SeatEdit = { priceBandId?: string; status?: SeatStatus; note?: string };
type DragState = { id: string; startX: number; startY: number; objectX: number; objectY: number } | null;
type BandDraft = { name: string; price: string; color: string };

const tools: { type: LayoutObjectType; label: string; icon: typeof CircleDot }[] = [
  { type: "round-table", label: "Round table", icon: CircleDot },
  { type: "rectangle-table", label: "Long table", icon: RectangleHorizontal },
  { type: "row", label: "Seat row", icon: Rows3 },
  { type: "seat", label: "Single seat", icon: Armchair },
  { type: "stage", label: "Stage", icon: Columns3 },
  { type: "aisle", label: "Aisle", icon: Grid3X3 },
  { type: "label", label: "Label", icon: Type },
];

function defaults(type: LayoutObjectType, count: number): LayoutObject {
  const seatBearing = ["round-table", "rectangle-table", "row", "seat"].includes(type);
  const names: Record<LayoutObjectType, string> = {
    "round-table": `Table ${String(count).padStart(2, "0")}`,
    "rectangle-table": `Table ${String(count).padStart(2, "0")}`,
    row: `Row ${String.fromCharCode(64 + Math.min(count, 26))}`,
    seat: `Seat ${String(count).padStart(2, "0")}`,
    stage: "Stage",
    aisle: "Aisle",
    label: "Section label",
  };
  return {
    id: `${type}-${Date.now()}`,
    type,
    label: names[type],
    x: 36,
    y: 38,
    width: type === "row" ? 42 : type === "stage" ? 34 : type === "aisle" ? 6 : type === "label" ? 20 : 20,
    height: type === "row" ? 11 : type === "stage" ? 10 : type === "aisle" ? 40 : type === "label" ? 7 : 22,
    rotation: 0,
    seatCount: type === "seat" ? 1 : seatBearing ? 10 : 0,
    priceBandId: seatBearing ? "band-standard" : undefined,
  };
}

function seatPosition(type: LayoutObjectType, index: number, total: number) {
  if (type === "row") return { left: `${((index + 0.5) / total) * 100}%`, top: "50%" };
  if (type === "seat") return { left: "50%", top: "50%" };
  const angle = ((Math.PI * 2) / total) * index - Math.PI / 2;
  return { left: `${50 + Math.cos(angle) * 45}%`, top: `${50 + Math.sin(angle) * 45}%` };
}

export function SeatPlanBuilder({ initialObjects = [], heading = "Design the guest view", eyebrow = "Freeform room planner" }: { initialObjects?: LayoutObject[]; heading?: string; eyebrow?: string }) {
  const [objects, setObjects] = useState<LayoutObject[]>(() => initialObjects.map((object) => ({ ...object })));
  const [history, setHistory] = useState<LayoutObject[][]>([]);
  const [future, setFuture] = useState<LayoutObject[][]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [seatEdits, setSeatEdits] = useState<Record<string, SeatEdit>>({});
  const [bands, setBands] = useState<PriceBand[]>(demoPriceBands);
  const [editingBandId, setEditingBandId] = useState<string | null>(null);
  const [bandDraft, setBandDraft] = useState<BandDraft>({ name: "", price: "", color: "#7557ff" });
  const [zoom, setZoom] = useState(100);
  const [canvasWidth, setCanvasWidth] = useState(initialObjects.length ? 1180 : 980);
  const [canvasHeight, setCanvasHeight] = useState(initialObjects.length ? 820 : 700);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [fullscreenSupported, setFullscreenSupported] = useState(false);
  const [snap, setSnap] = useState(true);
  const [drag, setDrag] = useState<DragState>(null);
  const builderRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const selected = objects.find((object) => object.id === selectedIds[0]) ?? null;
  const totalSeats = objects.reduce((sum, object) => sum + object.seatCount, 0);
  const editedStatuses = Object.values(seatEdits);
  const reserved = editedStatuses.filter((edit) => edit.status === "reserved").length;
  const blocked = editedStatuses.filter((edit) => edit.status === "blocked" || edit.status === "unavailable").length;
  const projectedRevenue = objects.reduce((sum, object) => {
    const band = bands.find((item) => item.id === object.priceBandId);
    return sum + object.seatCount * (band?.price ?? 0);
  }, 0);

  const collisions = useMemo(() => objects.filter((object, index) => objects.slice(index + 1).some((other) => {
    if (object.type === "aisle" || other.type === "aisle") return false;
    return object.x < other.x + other.width && object.x + object.width > other.x && object.y < other.y + other.height && object.y + object.height > other.y;
  })).map((item) => item.id), [objects]);

  useEffect(() => {
    setFullscreenSupported(document.fullscreenEnabled);

    function syncNativeFullscreen() {
      setIsNativeFullscreen(document.fullscreenElement === builderRef.current);
    }

    document.addEventListener("fullscreenchange", syncNativeFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncNativeFullscreen);
  }, []);

  function commit(next: LayoutObject[]) {
    setHistory((items) => [...items.slice(-19), objects]);
    setFuture([]);
    setObjects(next);
  }

  function updateSelected(patch: Partial<LayoutObject>) {
    if (!selectedIds.length) return;
    commit(objects.map((item) => selectedIds.includes(item.id) ? { ...item, ...patch } : item));
  }

  function addObject(type: LayoutObjectType) {
    const object = defaults(type, objects.filter((item) => item.type === type).length + 1);
    commit([...objects, object]);
    setSelectedIds([object.id]);
    setSelectedSeat(null);
  }

  function duplicate() {
    if (!selected) return;
    const copy = { ...selected, id: `${selected.type}-${Date.now()}`, label: `${selected.label} copy`, x: Math.min(88, selected.x + 4), y: Math.min(88, selected.y + 4) };
    commit([...objects, copy]);
    setSelectedIds([copy.id]);
  }

  function remove() {
    if (!selectedIds.length) return;
    commit(objects.filter((item) => !selectedIds.includes(item.id)));
    setSelectedIds([]);
    setSelectedSeat(null);
  }

  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setFuture((items) => [objects, ...items]);
    setObjects(previous);
    setHistory((items) => items.slice(0, -1));
  }

  function redo() {
    const next = future[0];
    if (!next) return;
    setHistory((items) => [...items, objects]);
    setObjects(next);
    setFuture((items) => items.slice(1));
  }

  function startDrag(event: React.PointerEvent, object: LayoutObject) {
    if ((event.target as HTMLElement).closest("button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ id: object.id, startX: event.clientX, startY: event.clientY, objectX: object.x, objectY: object.y });
    if (!event.shiftKey) setSelectedIds([object.id]);
    else setSelectedIds((ids) => ids.includes(object.id) ? ids.filter((id) => id !== object.id) : [...ids, object.id]);
    setSelectedSeat(null);
  }

  function moveDrag(event: React.PointerEvent) {
    if (!drag || !canvasRef.current) return;
    const bounds = canvasRef.current.getBoundingClientRect();
    const dx = ((event.clientX - drag.startX) / bounds.width) * 100;
    const dy = ((event.clientY - drag.startY) / bounds.height) * 100;
    const unit = snap ? 2 : 0.25;
    setObjects((items) => items.map((item) => item.id === drag.id ? {
      ...item,
      x: Math.max(0, Math.min(100 - item.width, Math.round((drag.objectX + dx) / unit) * unit)),
      y: Math.max(0, Math.min(100 - item.height, Math.round((drag.objectY + dy) / unit) * unit)),
    } : item));
  }

  function endDrag() {
    if (!drag) return;
    setHistory((items) => [...items.slice(-19), objects.map((item) => item.id === drag.id ? { ...item, x: drag.objectX, y: drag.objectY } : item)]);
    setFuture([]);
    setDrag(null);
  }

  function seatKey(objectId: string, index: number) { return `${objectId}:${index}`; }
  const currentSeatEdit = selectedSeat ? seatEdits[selectedSeat] ?? {} : null;

  function updateSeat(patch: SeatEdit) {
    if (!selectedSeat) return;
    setSeatEdits((items) => ({ ...items, [selectedSeat]: { ...items[selectedSeat], ...patch } }));
  }

  function openNewBand() {
    setEditingBandId("new");
    setBandDraft({ name: "", price: "", color: "#7557ff" });
  }

  function editBand(band: PriceBand) {
    setEditingBandId(band.id);
    setBandDraft({ name: band.name, price: String(band.price), color: band.color });
  }

  function saveBand(event: React.FormEvent) {
    event.preventDefault();
    const name = bandDraft.name.trim();
    const price = Math.max(0, Number(bandDraft.price) || 0);
    if (!name) return;
    if (editingBandId === "new") {
      const band = { id: `band-${Date.now()}`, name, price, color: bandDraft.color };
      setBands((items) => [...items, band]);
      if (selected) updateSelected({ priceBandId: band.id });
    } else {
      setBands((items) => items.map((band) => band.id === editingBandId ? { ...band, name, price, color: bandDraft.color } : band));
    }
    setEditingBandId(null);
  }

  function deleteBand(id: string) {
    if (bands.length <= 1) return;
    const fallback = bands.find((band) => band.id !== id)!;
    setBands((items) => items.filter((band) => band.id !== id));
    setObjects((items) => items.map((object) => object.priceBandId === id ? { ...object, priceBandId: fallback.id } : object));
    setSeatEdits((items) => Object.fromEntries(Object.entries(items).map(([key, edit]) => [key, edit.priceBandId === id ? { ...edit, priceBandId: fallback.id } : edit])));
    setEditingBandId(null);
  }

  async function toggleNativeFullscreen() {
    const node = builderRef.current;
    if (!node || !fullscreenSupported) return;

    if (document.fullscreenElement === node) {
      await document.exitFullscreen();
      return;
    }

    if (document.fullscreenElement) await document.exitFullscreen();
    await node.requestFullscreen();
  }

  return (
    <div ref={builderRef} className={`seat-builder ${isFullscreen ? "seat-builder--fullscreen" : ""} ${isNativeFullscreen ? "seat-builder--native-fullscreen" : ""}`}>
      <header className="seat-builder__top">
        <div><span className="dashboard-eyebrow">{eyebrow}</span><h2>{heading}</h2></div>
        <div className="seat-builder__history">
          <button type="button" onClick={undo} disabled={!history.length} title="Undo"><Undo2 size={16} /></button>
          <button type="button" onClick={redo} disabled={!future.length} title="Redo"><Redo2 size={16} /></button>
          <button type="button" className={snap ? "active" : ""} onClick={() => setSnap(!snap)}><Grid3X3 size={15} /> Snap</button>
          <button type="button" className={isFullscreen ? "active" : ""} onClick={() => setIsFullscreen((value) => !value)} title={isFullscreen ? "Exit fullscreen planner" : "Expand planner fullscreen"} aria-pressed={isFullscreen}>
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            {isFullscreen ? "Exit" : "Expand"}
          </button>
          <button type="button" className={isNativeFullscreen ? "active" : ""} onClick={toggleNativeFullscreen} title={isNativeFullscreen ? "Exit browser fullscreen" : "Open focused browser fullscreen"} aria-pressed={isNativeFullscreen} disabled={!fullscreenSupported}>
            {isNativeFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            {isNativeFullscreen ? "Close full" : "Full screen"}
          </button>
        </div>
      </header>

      <div className="seat-builder__metrics">
        <div><small>Capacity</small><b>{totalSeats}</b></div>
        <div><small>Available</small><b>{totalSeats - reserved - blocked}</b></div>
        <div><small>Reserved</small><b>{reserved}</b></div>
        <div><small>Blocked</small><b>{blocked}</b></div>
        <div><small>Projected</small><b>{compactMoney(projectedRevenue)}</b></div>
        <div className={collisions.length ? "warning" : "ready"}><small>Plan check</small><b>{collisions.length ? `${collisions.length} overlap` : "Ready"}</b></div>
      </div>

      <div className="seat-builder__workspace">
        <aside className="seat-toolbox">
          <small>ADD TO ROOM</small>
          {tools.map((tool) => <button type="button" key={tool.type} onClick={() => addObject(tool.type)}><tool.icon size={16} /><span>{tool.label}</span><Plus size={13} /></button>)}
          <div className="seat-band-list"><small>PRICE BANDS</small>{bands.map((band) => <div key={band.id}><i style={{ background: band.color }} /><span><b>{band.name}</b><em>{compactMoney(band.price)}</em></span><button type="button" onClick={() => editBand(band)} title={`Edit ${band.name}`}><Pencil size={12} /></button></div>)}<button type="button" onClick={openNewBand}><Tag size={15} /> Create price band</button>{editingBandId && <form className="price-band-form" onSubmit={saveBand}><header><b>{editingBandId === "new" ? "New price band" : "Edit price band"}</b><button type="button" onClick={() => setEditingBandId(null)} title="Close form"><X size={13} /></button></header><label><span>Name</span><input autoFocus value={bandDraft.name} onChange={(event) => setBandDraft((draft) => ({ ...draft, name: event.target.value }))} placeholder="e.g. Balcony" /></label><label><span>Price (NGN)</span><input type="number" min="0" step="500" value={bandDraft.price} onChange={(event) => setBandDraft((draft) => ({ ...draft, price: event.target.value }))} placeholder="0 for free" /></label><label><span>Colour</span><div><input type="color" value={bandDraft.color} onChange={(event) => setBandDraft((draft) => ({ ...draft, color: event.target.value }))} /><code>{bandDraft.color}</code></div></label><footer>{editingBandId !== "new" && <button type="button" className="danger" onClick={() => deleteBand(editingBandId)} disabled={bands.length <= 1}>Delete</button>}<button type="submit" disabled={!bandDraft.name.trim()}>Save band</button></footer></form>}</div>
        </aside>

        <section className="seat-canvas-shell">
          <div className="seat-canvas__toolbar">
            <span>{selectedIds.length ? `${selectedIds.length} selected` : "Select an object"}</span>
            <div className="seat-canvas__controls">
              <span className="seat-canvas__size-controls">
                <em>W</em>
                <button type="button" onClick={() => setCanvasWidth((value) => Math.max(760, value - 120))} title="Narrow workspace"><Minus size={15} /></button>
                <b>{canvasWidth}px</b>
                <button type="button" onClick={() => setCanvasWidth((value) => Math.min(1800, value + 120))} title="Widen workspace"><Plus size={15} /></button>
              </span>
              <span className="seat-canvas__size-controls">
                <em>H</em>
                <button type="button" onClick={() => setCanvasHeight((value) => Math.max(560, value - 120))} title="Shorten workspace"><Minus size={15} /></button>
                <b>{canvasHeight}px</b>
                <button type="button" onClick={() => setCanvasHeight((value) => Math.min(1500, value + 120))} title="Extend workspace"><Plus size={15} /></button>
              </span>
              <span className="seat-canvas__zoom-controls">
                <button type="button" onClick={() => setZoom((value) => Math.max(60, value - 10))} title="Zoom out"><ZoomOut size={15} /></button>
                <b>{zoom}%</b>
                <button type="button" onClick={() => setZoom((value) => Math.min(140, value + 10))} title="Zoom in"><ZoomIn size={15} /></button>
              </span>
            </div>
          </div>
          <div className="seat-canvas-viewport">
            <div ref={canvasRef} className="seat-canvas" style={{ width: `max(100%, ${canvasWidth}px)`, height: canvasHeight, transform: `scale(${zoom / 100})` }} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
              {!objects.length && <div className="seat-canvas-empty"><Armchair size={28} /><b>Your room is empty</b><span>Add a table, row, stage, aisle, or label from the toolbox.</span></div>}
              {objects.map((object) => {
                const band = bands.find((item) => item.id === object.priceBandId);
                const isSelected = selectedIds.includes(object.id);
                return <div
                  key={object.id}
                  className={`layout-object layout-object--${object.type} ${isSelected ? "selected" : ""} ${collisions.includes(object.id) ? "collision" : ""}`}
                  style={{ left: `${object.x}%`, top: `${object.y}%`, width: `${object.width}%`, height: `${object.height}%`, transform: `rotate(${object.rotation}deg)`, "--seat-band": band?.color ?? "#7557ff" } as React.CSSProperties}
                  onPointerDown={(event) => startDrag(event, object)}
                >
                  <span className="layout-object__label">{object.label}</span>
                  {Array.from({ length: object.seatCount }, (_, index) => {
                    const key = seatKey(object.id, index);
                    const edit = seatEdits[key];
                    const seatBand = bands.find((item) => item.id === (edit?.priceBandId ?? object.priceBandId));
                    return <button
                      key={key}
                      type="button"
                      className={`builder-seat builder-seat--${edit?.status ?? "available"} ${selectedSeat === key ? "active" : ""}`}
                      style={{ ...seatPosition(object.type, index, object.seatCount), "--seat-band": seatBand?.color ?? "#7557ff" } as React.CSSProperties}
                      title={`${object.label} · Seat ${String(index + 1).padStart(2, "0")} · ${seatBand?.name ?? "Unpriced"} · ${compactMoney(seatBand?.price ?? 0)}`}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => { setSelectedIds([object.id]); setSelectedSeat(key); }}
                    ><span>{index + 1}</span><em>{compactMoney(seatBand?.price ?? 0)}</em></button>;
                  })}
                </div>;
              })}
            </div>
          </div>
        </section>

        <aside className="seat-inspector">
          {selected ? <>
            <div className="seat-inspector__head"><div><small>{selectedSeat ? "SEAT SETTINGS" : "OBJECT SETTINGS"}</small><h3>{selectedSeat ? `${selected.label} · Seat ${Number(selectedSeat.split(":")[1]) + 1}` : selected.label}</h3></div><button type="button" onClick={remove} title="Delete selected"><Trash2 size={16} /></button></div>
            {selectedSeat ? <>
              <label><span>Price band</span><select value={currentSeatEdit?.priceBandId ?? selected.priceBandId} onChange={(event) => updateSeat({ priceBandId: event.target.value })}>{bands.map((band) => <option value={band.id} key={band.id}>{band.name} · {compactMoney(band.price)}</option>)}</select></label>
              <label><span>Seat status</span><select value={currentSeatEdit?.status ?? "available"} onChange={(event) => updateSeat({ status: event.target.value as SeatStatus, note: "" })}><option value="available">Available</option><option value="reserved">Named reservation</option><option value="blocked">Blocked</option><option value="unavailable">Unavailable</option></select></label>
              {(currentSeatEdit?.status === "reserved" || currentSeatEdit?.status === "blocked") && <label><span>{currentSeatEdit.status === "reserved" ? "Reserved for" : "Internal reason"}</span><input value={currentSeatEdit.note ?? ""} onChange={(event) => updateSeat({ note: event.target.value })} placeholder={currentSeatEdit.status === "reserved" ? "Attendee name" : "e.g. Equipment"} /></label>}
              <div className="seat-state-note">{currentSeatEdit?.status === "reserved" ? <UserRoundCheck size={16} /> : currentSeatEdit?.status === "blocked" ? <Ban size={16} /> : <Tag size={16} />}<span>{currentSeatEdit?.note || "This seat is publicly selectable."}</span></div>
            </> : <>
              <label><span>Label</span><input value={selected.label} onChange={(event) => updateSelected({ label: event.target.value })} /></label>
              {selected.seatCount > 0 && <><label><span>Number of seats</span><input type="number" min="1" max="30" value={selected.seatCount} onChange={(event) => updateSelected({ seatCount: Math.max(1, Number(event.target.value)) })} /></label><label><span>Price band</span><select value={selected.priceBandId} onChange={(event) => updateSelected({ priceBandId: event.target.value })}>{bands.map((band) => <option value={band.id} key={band.id}>{band.name} · {compactMoney(band.price)}</option>)}</select></label></>}
              <div className="seat-inspector__actions"><button type="button" onClick={() => updateSelected({ rotation: (selected.rotation + 45) % 360 })}><RotateCw size={15} /> Rotate</button><button type="button" onClick={duplicate}><Copy size={15} /> Duplicate</button></div>
              <div className="dimension-controls"><label><span>Width</span><div className="stepper"><button type="button" onClick={() => updateSelected({ width: Math.max(4, selected.width - 2) })}><Minus size={13} /></button><b>{selected.width}%</b><button type="button" onClick={() => updateSelected({ width: Math.min(90, selected.width + 2) })}><Plus size={13} /></button></div></label><label><span>Height</span><div className="stepper"><button type="button" onClick={() => updateSelected({ height: Math.max(4, selected.height - 2) })}><Minus size={13} /></button><b>{selected.height}%</b><button type="button" onClick={() => updateSelected({ height: Math.min(90, selected.height + 2) })}><Plus size={13} /></button></div></label></div>
            </>}
          </> : <div className="seat-inspector__empty"><Armchair size={25} /><b>Select an object</b><span>Choose a table, row, seat, stage, aisle, or label to edit it.</span></div>}
        </aside>
      </div>
    </div>
  );
}
