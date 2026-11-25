"use client";

import { useParams } from "next/navigation";
import {
  ArrowRight,
  Bluetooth,
  Camera,
  Check,
  CheckCircle2,
  Flashlight,
  ImagePlus,
  Keyboard,
  QrCode,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  UserCheck,
  UsersRound,
  Wifi,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CameraDevice, Html5Qrcode } from "html5-qrcode";
import { fallbackBooking } from "@/lib/data/seating-data";
import type { Booking } from "@/lib/data/types";
import { CheckInHeader } from "./CheckInHeader";
import { ScannerNav } from "./ScannerNav";

type Result = "idle" | "scanning" | "valid" | "invalid";
type CheckInMap = Record<string, string>;
type VerifyPayload = {
  data?: {
    booking: { id: string; code: string; buyerName: string; eventTitle?: string };
    attendees: Array<{ id: string; name: string; email?: string; phone?: string; seatId?: string; seatLabel?: string; priceBandName: string; priceMinor: number; checkIn: { checkedInAt: string } | null }>;
  };
  error?: { message?: string };
};

export function ScannerConsole() {
  const { slug } = useParams<{ slug: string }>();
  const [result, setResult] = useState<Result>("idle");
  const [booking, setBooking] = useState<Booking>(fallbackBooking);
  const [checkIns, setCheckIns] = useState<CheckInMap>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [count, setCount] = useState(0);
  const [flash, setFlash] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [cameraDevices, setCameraDevices] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [cameraMessage, setCameraMessage] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [notice, setNotice] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanImageRef = useRef<Html5Qrcode | null>(null);
  const scanLockedRef = useRef(false);

  const remaining = useMemo(() => booking.attendees.filter((attendee) => !checkIns[attendee.id]), [booking, checkIns]);

  useEffect(() => () => {
    const scanner = scannerRef.current;
    if (scanner?.isScanning) void scanner.stop().catch(() => undefined);
    scannerRef.current = null;
    scanImageRef.current?.clear();
    scanImageRef.current = null;
  }, []);

  async function stopCamera() {
    const scanner = scannerRef.current;
    if (scanner?.isScanning) await scanner.stop().catch(() => undefined);
    scannerRef.current = null;
    setCameraActive(false);
    setTorchAvailable(false);
    setFlash(false);
  }

  async function verifyPass(qrToken: string) {
    setResult("scanning");
    setSelected([]);
    setNotice("");
    let response: Response;
    try {
      response = await fetch("/api/v1/check-in/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ qrToken, eventSlug: slug }),
      });
    } catch {
      setResult("invalid");
      setNotice("Could not reach the check-in service. Check your connection and retry.");
      return false;
    }
    const body = await response.json().catch(() => null) as VerifyPayload | null;
    if (!response.ok || !body?.data) {
      setResult("invalid");
      setNotice(body?.error?.message ?? "This pass is invalid, unpaid, cancelled, or belongs to another event.");
      return false;
    }
    const nextCheckIns: CheckInMap = {};
    for (const attendee of body.data.attendees) {
      if (attendee.checkIn) nextCheckIns[attendee.id] = new Date(attendee.checkIn.checkedInAt).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });
    }
    setBooking((current) => ({
      ...current,
      id: body.data!.booking.id,
      code: body.data!.booking.code,
      buyerName: body.data!.booking.buyerName,
      qrToken,
      attendees: body.data!.attendees.map((attendee) => ({
        id: attendee.id,
        name: attendee.name,
        email: attendee.email,
        phone: attendee.phone,
        seatId: attendee.seatId,
        seatLabel: attendee.seatLabel,
        priceBandName: attendee.priceBandName,
        price: attendee.priceMinor / 100,
      })),
    }));
    setCheckIns(nextCheckIns);
    setResult("valid");
    return true;
  }

  async function startCamera(cameraId?: string) {
    setNotice("");
    setCameraMessage("");
    if (!window.isSecureContext) {
      setCameraMessage("Camera access requires HTTPS. Localhost is supported for development.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraMessage("This browser does not provide camera access. Try a current version of Chrome, Edge, or Safari.");
      return;
    }
    setCameraStarting(true);
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras.length) throw new Error("No camera was found on this device. Use a handheld scanner or pass token instead.");
      setCameraDevices(cameras);
      const preferred = cameraId || selectedCameraId || cameras.find((camera) => /back|rear|environment/i.test(camera.label))?.id || cameras[0].id;
      setSelectedCameraId(preferred);
      const scanner = new Html5Qrcode("live-qr-reader", { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false });
      scannerRef.current = scanner;
      await scanner.start(preferred, {
        fps: 12,
        qrbox: (width, height) => {
          const size = Math.floor(Math.min(width, height) * 0.72);
          return { width: Math.min(320, Math.max(180, size)), height: Math.min(320, Math.max(180, size)) };
        },
        aspectRatio: 1,
      }, (decodedText) => {
        if (scanLockedRef.current) return;
        scanLockedRef.current = true;
        void stopCamera().then(() => verifyPass(decodedText)).finally(() => { scanLockedRef.current = false; });
      }, () => undefined);
      setTorchAvailable(scanner.getRunningTrackCameraCapabilities().torchFeature().isSupported());
      setCameraActive(true);
    } catch (cause) {
      await stopCamera();
      const message = cause instanceof Error ? cause.message : String(cause ?? "");
      const normalized = message.toLowerCase();
      setCameraMessage(normalized.includes("notallowed") || normalized.includes("permission denied")
        ? "Camera permission is blocked. Allow camera access for this site in browser settings, then try again."
        : normalized.includes("notfound") || normalized.includes("no camera")
          ? "No camera was found. Connect a camera or use the pass-token field below."
          : normalized.includes("notreadable") || normalized.includes("could not start video")
            ? "The camera is busy in another app or browser tab. Close it there and retry."
            : message || "Camera could not start. Check browser permissions and try again.");
    } finally {
      setCameraStarting(false);
    }
  }

  async function switchCamera(cameraId: string) {
    setSelectedCameraId(cameraId);
    await stopCamera();
    await startCamera(cameraId);
  }

  async function toggleTorch() {
    const scanner = scannerRef.current;
    if (!scanner || !torchAvailable) return;
    try {
      await scanner.applyVideoConstraints({ advanced: [{ torch: !flash } as MediaTrackConstraintSet] });
      setFlash(!flash);
      setCameraMessage("");
    } catch {
      setCameraMessage("This camera could not change its light setting.");
    }
  }

  async function scanImage(file?: File) {
    if (!file) return;
    setNotice("");
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("pass-image-reader", { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false });
      scanImageRef.current = scanner;
      const token = await scanner.scanFile(file, false);
      await verifyPass(token);
    } catch {
      setResult("invalid");
      setNotice("No readable QR code was found in that image. Try a clearer photo or scan it live.");
    } finally {
      scanImageRef.current?.clear();
      scanImageRef.current = null;
    }
  }

  async function submitBackupCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (backupCode.trim()) await verifyPass(backupCode.trim());
  }

  function toggleAttendee(id: string) {
    if (checkIns[id]) return;
    setSelected((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
  }

  async function admitSelected() {
    const newIds = selected.filter((id) => !checkIns[id]);
    if (!newIds.length) return;
    setNotice("");
    try {
      const response = await fetch("/api/v1/check-in/entries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id, attendeeIds: newIds, entrance: "Entrance A", operationId: crypto.randomUUID() }),
      });
      const payload = await response.json() as { data?: { admitted: string[]; alreadyAdmitted: string[] }; error?: { message?: string } };
      if (!response.ok || !payload.data) {
        setNotice(payload.error?.message ?? "Admission could not be saved. Please retry.");
        return;
      }
      const admittedCount = payload.data.admitted.length;
      setCount((value) => value + admittedCount);
      setSelected([]);
      setNotice(`${admittedCount} ${admittedCount === 1 ? "attendee" : "attendees"} admitted`);
      await verifyPass(booking.qrToken);
      window.setTimeout(() => setNotice(""), 2500);
    } catch {
      setNotice("Admission could not be saved. Check the connection and retry.");
    }
  }

  return (
    <main className="scanner-app">
      <CheckInHeader />
      <ScannerNav active="scan" />
      <section className="scanner-console">
        <div className="scanner-camera">
          <div className="camera-surface">
            <div className="camera-glow" />
            <div id="live-qr-reader" className={cameraActive || cameraStarting ? "live-qr-reader active" : "live-qr-reader"} />
            <div id="pass-image-reader" hidden />
            {!cameraActive && !cameraStarting && <div className={`scan-target ${result === "scanning" ? "processing" : ""}`} aria-hidden="true"><i /><i /><i /><i /><span className="scan-line" /><QrCode size={72} strokeWidth={1.2} /></div>}
            <p>{cameraStarting ? "Requesting camera access…" : cameraActive ? "Camera active · position the QR inside the frame" : result === "scanning" ? "Verifying pass…" : "Start the camera or use another scan method"}</p>
            <div className="scanner-camera-actions">
              <button type="button" className={cameraActive ? "active" : ""} disabled={cameraStarting} onClick={() => cameraActive ? void stopCamera() : void startCamera()}><Camera size={16} />{cameraStarting ? "Starting camera…" : cameraActive ? "Stop camera" : "Start camera"}</button>
              <button type="button" className={flash ? "active" : ""} disabled={!cameraActive || !torchAvailable} title={torchAvailable ? "Toggle camera light" : "This camera has no controllable light"} onClick={() => void toggleTorch()}><Flashlight size={16} />{flash ? "Light on" : "Light"}</button>
              <label className="scanner-image-upload"><ImagePlus size={16} /> Upload QR image<input type="file" accept="image/*" capture="environment" onChange={(event) => { void scanImage(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>
            </div>
            {cameraActive && cameraDevices.length > 1 && <label className="camera-selector"><span>Camera</span><select aria-label="Select camera" value={selectedCameraId} onChange={(event) => void switchCamera(event.target.value)}>{cameraDevices.map((camera, index) => <option key={camera.id} value={camera.id}>{camera.label || `Camera ${index + 1}`}</option>)}</select></label>}
            {cameraMessage && <p className="camera-message" role="status">{cameraMessage}</p>}
          </div>
        </div>
        <aside className={`scan-result group-scan-result scan-result--${result}`}>
          {result === "idle" && <div className="scan-idle"><span><QrCode size={33} /></span><h2>Ready to scan</h2><p>Scan a guest pass to see every attendee and their entry status. Select only the people who have arrived.</p><a href={`/check-in/${slug}/manual`}><Search size={15} /> Search guest manually</a></div>}
          {result === "scanning" && <div className="scan-idle"><span className="spinner"><RefreshCw size={31} /></span><h2>Verifying pass…</h2><p>Checking this event, booking, payment, and attendee entry status.</p></div>}
          {result === "valid" && <div className="group-scan"><header><span className="result-orb"><Check size={28} /></span><div><small>GROUP PASS VERIFIED</small><h2>{booking.buyerName}&apos;s group</h2><p>{booking.code} · {remaining.length} still expected</p></div></header><div className="group-scan-summary"><span><UsersRound size={16} /><b>{booking.attendees.length} attendees</b></span><span><CheckCircle2 size={16} /><b>{booking.attendees.length - remaining.length} admitted</b></span></div><div className="group-scan-list">{booking.attendees.map((attendee) => { const checkedAt = checkIns[attendee.id]; const isSelected = selected.includes(attendee.id); return <button type="button" key={attendee.id} className={`${checkedAt ? "admitted" : ""} ${isSelected ? "selected" : ""}`} onClick={() => toggleAttendee(attendee.id)} disabled={!!checkedAt}><i>{checkedAt ? <Check size={15} /> : <span />}</i><span><b>{attendee.name}</b><small>{attendee.seatLabel ?? `${attendee.priceBandName} · Seat assigned later`}</small></span>{checkedAt ? <em>Entered {checkedAt}</em> : <em>{isSelected ? "Arriving now" : "Not selected"}</em>}</button>})}</div>{remaining.length ? <><p className="group-scan-instruction">Select only attendees physically present. No one is selected automatically.</p><button className="scanner-success-button" onClick={admitSelected} disabled={!selected.length}>Confirm {selected.length || "selected"} & keep pass open <ArrowRight size={17} /></button></> : <div className="group-complete"><CheckCircle2 size={19} /><span><b>Entire group admitted</b><small>Scanning again cannot create duplicate entries.</small></span></div>}<button className="scanner-text-button" type="button" onClick={() => setResult("idle")}><RotateCcw size={15} /> Scan next pass</button></div>}
          {result === "invalid" && <div className="scan-error"><span className="result-orb"><ShieldAlert size={34} /></span><small>PASS NOT VERIFIED</small><h2>We couldn&apos;t verify this pass.</h2><p>{notice || "It may be unpaid, revoked, unreadable, or assigned to another event."}</p><button className="scanner-error-button" type="button" onClick={() => { setResult("idle"); setNotice(""); }}>Try again</button><a href={`/check-in/${slug}/manual`}>Search guest manually</a></div>}
        </aside>
      </section>
      <section className="backup-scanner-panel" id="backup"><div><span className="backup-icon"><Bluetooth size={22} /></span><div><small>BACKUP METHOD</small><h2>Handheld scanner or pass token</h2><p>USB and Bluetooth scanners that type into the field work here. Scanning verifies the pass against this event.</p></div></div><div className="backup-connection"><Wifi size={15} /><span><b>Scanner input ready</b><small>Waiting for pass</small></span></div><form onSubmit={submitBackupCode}><label><Keyboard size={18} /><input aria-label="Scan or paste pass token" autoComplete="off" value={backupCode} onChange={(event) => setBackupCode(event.target.value)} placeholder="Scan or paste pass token" /><button type="submit" disabled={!backupCode.trim() || result === "scanning"}>Verify pass <ArrowRight size={15} /></button></label></form></section>
      <footer className="scanner-statusbar"><span><i className="online" /><b>Connected to event</b></span><span>Last action <b>{notice || "Ready for arrivals"}</b></span><span>Entrance A · <b>Staff access verified</b></span><span className="live-total"><small>THIS SESSION</small><b>{count}</b></span></footer>
      {notice && <div className="scanner-toast" role="status"><UserCheck size={16} />{notice}</div>}
    </main>
  );
}
