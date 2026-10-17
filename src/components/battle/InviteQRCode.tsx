import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";

export function InviteQRCode({ battleId }: { battleId: string }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(`${window.location.origin}/battle/${battleId}`);
  }, [battleId]);

  return (
    <section className="frame flex items-center gap-3 p-3" aria-label="Invite">
      {url ? (
        <QRCodeSVG value={url} size={72} bgColor="#070910" fgColor="#F0E6D2" level="M" aria-label={`QR code for ${url}`} />
      ) : (
        <div className="h-[72px] w-[72px] bg-ink" />
      )}
      <div className="min-w-0 flex-1">
        <h2 className="kicker">Invite</h2>
        <p className="mt-1 text-[11px] leading-4 text-sand/60">Same browser only. State is not shared to a server.</p>
        <input readOnly value={url} className="field mt-2 py-1.5 text-[11px]" aria-label="Battle share link" />
      </div>
    </section>
  );
}
