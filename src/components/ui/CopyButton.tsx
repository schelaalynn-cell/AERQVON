import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
}

export function CopyButton({ value, label = 'Copy', className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); } catch { setCopied(true); }
  };

  return (
    <button onClick={handleCopy} className={`flex items-center gap-2 font-medium transition-all active:scale-95 ${className}`}>
      {copied ? <Check className="h-4 w-4 text-nova-success" /> : <Copy className="h-4 w-4" />}
      {copied ? 'Copied' : label}
    </button>
  );
}
