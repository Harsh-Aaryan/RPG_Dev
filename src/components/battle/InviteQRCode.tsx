import { Check, Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';

export function InviteQRCode({ battleId }: { battleId: string }) {
  const url = `${window.location.origin}/battle/${battleId}`;
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-4">
      <div className="rounded-xl bg-sand p-2">
        <QRCodeSVG value={url} size={92} bgColor="#f0e6d2" fgColor="#10131f" level="M" aria-label={`QR code for ${url}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm">Scan to join the raid</p>
        <p className="mt-1 truncate font-mono text-xs text-mist">{url}</p>
        <button
          className="btn-ghost mt-2 px-3 py-1.5 text-xs"
          onClick={async () => {
            await navigator.clipboard?.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
    </div>
  );
}
