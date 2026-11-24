import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function Accordion({ title, subtitle, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`accordion ${open ? 'expanded' : ''}`}>
      <button
        type="button"
        className="accordion-trigger"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
      >
        <span>
          <strong>{title}</strong>
          {subtitle && <small>{subtitle}</small>}
        </span>

        <ChevronDown
          className={open ? 'rotated' : ''}
          size={18}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="accordion-content">
          {children}
        </div>
      )}
    </section>
  );
}
