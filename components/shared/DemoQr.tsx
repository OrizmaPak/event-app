"use client";

import { QRCodeSVG } from "qrcode.react";

export function DemoQr({ size = 132, value = "nasa-event-demo-pass" }: { size?: number; value?: string }) {
  return <QRCodeSVG className="demo-qr demo-qr--svg" value={value} size={size} level="M" marginSize={0} bgColor="#ffffff" fgColor="#17131f" role="img" aria-label="Scannable event pass QR code" />;
}
