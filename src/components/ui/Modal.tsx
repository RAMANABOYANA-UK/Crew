import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: 'md' | 'lg';
  closeOnBackdrop?: boolean;
}

export function Modal({ open, title, onClose, children, footer, width = 'md', closeOnBackdrop = true }: ModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="crew-overlay"
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`crew-modal ${width === 'lg' ? 'crew-modal--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="crew-modal__head">
          <h2 className="crew-modal__title">{title}</h2>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-muted transition hover:bg-[var(--color-section)] hover:text-ink crew-focusable"
          >
            <X size={17} />
          </button>
        </div>
        <div className="crew-modal__body">{children}</div>
        {footer && <div className="crew-modal__foot">{footer}</div>}
      </div>
    </div>
  );
}