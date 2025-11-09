import React from 'react';
import { t } from '../../translations';

interface CurrencyDisplayProps {
  value: number;
  className?: string;
}

const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({ value, className = '' }) => {
  const tomanValue = (value / 10).toLocaleString('fa-IR');

  return (
    <span className={`relative group inline-block ${className}`}>
      <span>
        {value.toLocaleString('fa-IR')} {t.currency}
      </span>
      <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-max px-2 py-1 bg-surface text-primary text-xs font-normal rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none border border-border z-10">
        {t.tomanEquivalent(tomanValue)}
      </span>
    </span>
  );
};

export default CurrencyDisplay;
