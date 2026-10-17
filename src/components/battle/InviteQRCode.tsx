import { Check, Copy, Link2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard?.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
    } catch {
      setCopied(null);
    }
  };
  return { copied, copy };
}

/** Invite plate: a readable QR on parchment, the battle code, and copy actions. */
export function InviteQRCode({ battleId }: { battleId: string }) {
  const url = `${window.location.origin}/battle/${battleId}`;
  const { copied, copy } = useCopy();

  return (
    <div className="flex gap-4">
      <div className="relative shrink-0 bg-parchment p-2.5 shadow-[inset_0_0_0_1px_rgb(138_95_56/0.35),0_4px_10px_-4px_rgb(0_0_0/0.7)]">
        <QRCodeSVG value={url} size={96} bgColor="#e7ddc8" fgColor="#121714" level="M" title={`QR code to join battle ${battleId}`} />
        {/* bracket corners */}
        <span className="absolute left-1 top-1 h-2 w-2 border-l border-t border-copper-lo" aria-hidden />
        <span className="absolute bottom-1 right-1 h-2 w-2 border-b border-r border-copper-lo" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-ink-3">Battle code</p>
        <button
          className="group mt-0.5 inline-flex items-center gap-2 rounded-xs font-mono text-2xl font-medium tracking-[0.18em] text-ink hover:text-copper-hi"
          onClick={() => copy('code', battleId)}
          aria-label={`Battle code ${battleId}. Copy code`}
        >
          {battleId}
          {copied === 'code' ? (
            <Check size={14} className="text-sage" aria-hidden />
          ) : (
            <Copy size={14} className="text-ink-3 group-hover:text-copper-hi" aria-hidden />
          )}
        </button>
        <p className="mt-1 truncate font-mono text-[0.7rem] text-ink-3" title={url}>
          {url.replace(/^https?:\/\//, '')}
        </p>
        <button className="btn-secondary mt-2.5 min-h-8 px-3 py-1.5 text-xs" onClick={() => copy('link', url)}>
          {copied === 'link' ? <Check size={13} className="text-sage" aria-hidden /> : <Link2 size={13} aria-hidden />}
          {copied === 'link' ? 'Link copied' : 'Copy invite link'}
        </button>
        <span className="sr-only" aria-live="polite">
          {copied === 'link' ? 'Invite link copied' : copied === 'code' ? 'Battle code copied' : ''}
        </span>
      </div>
    </div>
  );
}
