"use client";

import { QRCodeSVG } from "qrcode.react";

export function FakeQr({ value }: { value: string }) {
  return (
    <div className="fake-qr" role="img" aria-label="QR code for this Room invitation">
      <QRCodeSVG
        value={value}
        size={132}
        level="M"
        marginSize={2}
        bgColor="#ffffff"
        fgColor="#111111"
        aria-hidden="true"
      />
    </div>
  );
}
