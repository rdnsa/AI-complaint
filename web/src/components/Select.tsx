import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

interface Item {
  value: string;
  label: string;
  disabled: boolean;
}

const textOf = (node: ReactNode): string =>
  Children.toArray(node)
    .map((n) => (typeof n === 'string' || typeof n === 'number' ? String(n) : ''))
    .join('');

/** Reads `<option>` children (also from a `.map()` or a fragment) into plain items. */
function itemsFrom(children: ReactNode): Item[] {
  const out: Item[] = [];
  const walk = (nodes: ReactNode) =>
    Children.forEach(nodes, (c) => {
      if (!isValidElement(c)) return;
      const p = c.props as { value?: string | number; disabled?: boolean; children?: ReactNode };
      if (c.type === 'option') {
        out.push({ value: String(p.value ?? textOf(p.children)), label: textOf(p.children), disabled: !!p.disabled });
      } else if (p.children) {
        walk(p.children);
      }
    });
  walk(children);
  return out;
}

const GAP = 6;
const ROOM_WANTED = 300; // the list is made room for below the field, by scrolling the page if need be

interface Pos {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

/**
 * A dropdown that always opens straight DOWN from its field.
 *
 * The browser's own `<select>` picks its direction itself (up when it thinks it
 * has no room, in the middle of the screen on a phone) and CSS cannot change
 * that. This one is the same thing built by hand: a button, and a list placed
 * just under it. Write the choices as `<option>` children, as for a `<select>`;
 * `onChange` receives the chosen value.
 *
 * The list is drawn on <body>, so no card around the field can clip it or be
 * painted over it, and it follows the field while the page scrolls. If the
 * field sits near the bottom of the screen the page is scrolled to make room
 * rather than the list flipping upward. Keyboard: arrows, Home/End, Enter or
 * Space to choose, Escape to close, a letter to jump.
 */
export default function Select({
  id,
  value,
  onChange,
  disabled = false,
  className = '',
  children,
  'aria-label': ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
  'aria-label'?: string;
}) {
  const items = itemsFrom(children);
  const listId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<Pos | null>(null);
  const spacer = useRef<HTMLDivElement | null>(null);

  const selected = items.find((i) => i.value === value);

  function place() {
    const el = button.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.max(r.width, 180);
    const top = r.bottom + GAP;
    setPos({
      top,
      left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)),
      width,
      maxHeight: Math.max(140, Math.min(320, window.innerHeight - top - 12)),
    });
  }

  /**
   * Not enough room below the field: bring the field up the screen, never the list above
   * the field. A short page cannot scroll that far, so it is lengthened by an empty block
   * for as long as the list is open (removed again on close).
   */
  function makeRoom() {
    const need = ROOM_WANTED - (window.innerHeight - button.current!.getBoundingClientRect().bottom);
    if (need <= 0) return;
    const canScroll = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
    if (canScroll < need) {
      const block = document.createElement('div');
      block.setAttribute('aria-hidden', 'true');
      block.style.height = `${need - canScroll + 8}px`;
      document.body.appendChild(block);
      spacer.current = block;
    }
    window.scrollBy({ top: need, behavior: 'auto' });
  }

  function openMenu() {
    if (disabled) return;
    makeRoom();
    setActive(Math.max(0, items.findIndex((i) => i.value === value)));
    place();
    setOpen(true);
  }

  function choose(i: Item) {
    if (i.disabled) return;
    onChange(i.value);
    setOpen(false);
    button.current?.focus();
  }

  // The empty block that made room goes when the list does, and when the field leaves the page.
  useEffect(() => {
    if (open) return;
    spacer.current?.remove();
    spacer.current = null;
  }, [open]);
  useEffect(
    () => () => {
      spacer.current?.remove();
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!button.current?.contains(t) && !menu.current?.contains(t)) setOpen(false);
    };
    // Follow the field while the page (or a scrolling parent) moves. The list's own
    // scrolling is not that: reacting to it would fight the person scrolling it.
    const follow = (e: Event) => {
      if (!menu.current?.contains(e.target as Node)) place();
    };
    window.addEventListener('scroll', follow, true);
    window.addEventListener('resize', place);
    document.addEventListener('pointerdown', away);
    return () => {
      window.removeEventListener('scroll', follow, true);
      window.removeEventListener('resize', place);
      document.removeEventListener('pointerdown', away);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep the highlighted choice inside the list's own scroll window.
  useEffect(() => {
    const list = menu.current;
    const row = list?.children[active] as HTMLElement | undefined;
    if (!open || !list || !row) return;
    if (row.offsetTop < list.scrollTop) list.scrollTop = row.offsetTop - 6;
    else if (row.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = row.offsetTop + row.offsetHeight - list.clientHeight + 6;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, open]);

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const move = (to: number) => {
      const next = Math.min(items.length - 1, Math.max(0, to));
      setActive(next);
    };
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        return move(active + 1);
      case 'ArrowUp':
        e.preventDefault();
        return move(active - 1);
      case 'Home':
        e.preventDefault();
        return move(0);
      case 'End':
        e.preventDefault();
        return move(items.length - 1);
      case 'Enter':
      case ' ':
        e.preventDefault();
        return items[active] && choose(items[active]);
      case 'Escape':
        e.preventDefault();
        return setOpen(false);
      case 'Tab':
        return setOpen(false);
      default:
        if (e.key.length === 1) {
          const at = items.findIndex((i, n) => n > active && i.label.toLowerCase().startsWith(e.key.toLowerCase()));
          const first = items.findIndex((i) => i.label.toLowerCase().startsWith(e.key.toLowerCase()));
          if (at >= 0 || first >= 0) move(at >= 0 ? at : first);
        }
    }
  }

  return (
    <>
      <button
        ref={button}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        className={`input flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        <span className="truncate">{selected?.label ?? ''}</span>
        <svg
          viewBox="0 0 20 20"
          aria-hidden
          className={`h-4 w-4 shrink-0 text-ink-600 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 8l5 5 5-5" />
        </svg>
      </button>

      {open &&
        pos &&
        createPortal(
          <ul
            ref={menu}
            id={listId}
            role="listbox"
            aria-label={ariaLabel}
            className="fixed z-[70] m-0 list-none overflow-y-auto overscroll-contain rounded-nav bg-surface p-1.5 shadow-2xl ring-1 ring-mist-300"
            style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }}
          >
            {items.map((it, i) => (
              <li
                key={`${it.value}-${i}`}
                role="option"
                aria-selected={it.value === value}
                aria-disabled={it.disabled || undefined}
                // Keep focus on the field: the list is not a place to type.
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(it)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-body-sm ${
                  it.value === value ? 'font-semibold text-accent-600' : 'text-ink-900'
                } ${i === active ? 'bg-mist-100' : ''} ${it.disabled ? 'cursor-not-allowed opacity-40' : ''}`}
              >
                <span className="truncate">{it.label}</span>
                {it.value === value && (
                  <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4.5 10.5l3.5 3.5 7.5-8" />
                  </svg>
                )}
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </>
  );
}
