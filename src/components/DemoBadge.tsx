import { Shield } from 'lucide-react';

export function DemoBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-aerqvon-warning/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-aerqvon-warning ${className}`}
    >
      <Shield className="h-3 w-3" />
      Demo Mode
    </span>
  );
}
