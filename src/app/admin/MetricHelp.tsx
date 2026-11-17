"use client";

import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { CircleHelp } from 'lucide-react';

export default function MetricHelp({ label, explanation, className = "" }: { label: string; explanation: string; className?: string }) {
  const id = useId();
  const [position, setPosition] = useState<{ top: number; left: number; above: boolean } | null>(null);
  const isOpen = position !== null;

  useEffect(() => {
    if (!isOpen) return;
    const close = () => setPosition(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [isOpen]);

  const show = (target: HTMLButtonElement) => {
    const rect = target.getBoundingClientRect();
    const above = rect.top > 160;
    setPosition({
      top: above ? rect.top - 8 : rect.bottom + 8,
      left: Math.max(16, Math.min(rect.left + rect.width / 2 - 144, window.innerWidth - 304)),
      above,
    });
  };

  return (
    <>
      <button
        type="button"
        aria-label={`Entenda ${label}`}
        aria-describedby={isOpen ? id : undefined}
        className={`inline-flex items-center justify-center shrink-0 rounded-full p-0.5 text-brand-muted hover:text-brand-chocolate focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-chocolate cursor-help ${className}`}
        onMouseEnter={e => show(e.currentTarget)}
        onMouseLeave={e => { if (document.activeElement !== e.currentTarget) setPosition(null); }}
        onFocus={e => show(e.currentTarget)}
        onBlur={() => setPosition(null)}
        onClick={e => { e.stopPropagation(); show(e.currentTarget); }}
        onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setPosition(null); } }}
      >
        <CircleHelp size={13} aria-hidden="true" />
      </button>
      {position && createPortal(
        <div
          id={id}
          role="tooltip"
          className="fixed z-[100] w-72 max-w-[calc(100vw-2rem)] rounded-xl bg-brand-deep px-3 py-2.5 text-xs font-normal normal-case tracking-normal leading-relaxed text-brand-cream shadow-lg pointer-events-none"
          style={{ top: position.top, left: position.left, transform: position.above ? 'translateY(-100%)' : undefined }}
        >
          {explanation}
        </div>,
        document.body,
      )}
    </>
  );
}
