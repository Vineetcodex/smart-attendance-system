import React from 'react';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

interface Props {
  status: 'PRESENT' | 'LATE' | 'REJECTED';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<Props> = ({ status, size = 'sm' }) => {
  const isSm = size === 'sm';
  const sizeClass = isSm ? 'text-xs px-2.5 py-1' : 'text-sm px-3.5 py-1.5';

  if (status === 'PRESENT') {
    return (
      <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${sizeClass}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <CheckCircle2 className={isSm ? "w-3 h-3" : "w-4 h-4"} />
        Present
      </span>
    );
  }

  if (status === 'LATE') {
    return (
      <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 ${sizeClass}`}>
        <Clock className={isSm ? "w-3 h-3" : "w-4 h-4"} />
        Late Arrival
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 ${sizeClass}`}>
      <XCircle className={isSm ? "w-3 h-3" : "w-4 h-4"} />
      Rejected
    </span>
  );
};
