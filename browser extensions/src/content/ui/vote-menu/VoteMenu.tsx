/**
 * VoteMenu.tsx: Slaze inline vote menu component.
 *
 * Platform-agnostic React component. Renders a pill-shaped "Slaze.it" button
 * + a dropdown with category rows. Accepts platform-specific details as props.
 *
 * Interaction contract:
 *   - Click button       → toggle dropdown open/closed
 *   - Click category     → toggle selection (max 3); menu stays open
 *   - Click outside      → close dropdown
 *   - Press Escape       → close dropdown
 *
 * Shadow DOM aware: uses e.composedPath() for outside-click detection.
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  memo,
  type JSX,
} from "react";
import { createPortal } from 'react-dom';
import { CATEGORY_ICONS, IconSelectionCheck, IconSlaze } from './icons';
import { CATEGORY_IDS, platformVoteBucket } from '../../config';
import { cache, fetchBatchRatings, submitVote } from '../../core/api';
import type { CategoryDef, Rating } from '../../../shared/types';

const MAX = 3;
const LOCAL_SELECTION_KEY_PREFIX = "slaze_vote_sel_v1";

/* ── Helpers ─────────────────────────────────────────────────────── */

function makeSelectionStorageKey(platform: string, postId: string): string {
  return `${LOCAL_SELECTION_KEY_PREFIX}:${platform}:${postId}`;
}

function sanitizeSelectedIds(
  ids: unknown,
  categories: CategoryDef[]
): string[] {
  if (!Array.isArray(ids) || !Array.isArray(categories) || !categories.length) {
    return [];
  }
  const allowed = new Set(categories.map((c) => c.id));
  const out: string[] = [];
  for (const raw of ids) {
    const id = String(raw);
    if (!allowed.has(id) || out.includes(id)) continue;
    out.push(id);
    if (out.length >= MAX) break;
  }
  return out;
}

function hexToRgba(hex: string, a: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return `rgba(0,0,0,${a})`;
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function clampPercent(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n);
}

function buildPercentMap(
  values: number[]
): Record<string, number> {
  const out: Record<string, number> = {};
  if (!Array.isArray(values) || !CATEGORY_IDS.length) return out;
  for (let i = 0; i < CATEGORY_IDS.length; i++) {
    out[CATEGORY_IDS[i]] = clampPercent(values[i]);
  }
  return out;
}

function isExtensionContextInvalidatedError(err: unknown): boolean {
  if (!err) return false;
  const msg = String((err as { message?: string })?.message || err);
  return msg.includes("Extension context invalidated");
}

/* ── Category row ────────────────────────────────────────────────── */

interface CategoryRowProps {
  cat: CategoryDef;
  isSelected: boolean;
  onToggle: (id: string) => void;
  percent: number;
}

const CategoryRow = memo(function CategoryRow({
  cat,
  isSelected,
  onToggle,
  percent,
}: CategoryRowProps): JSX.Element {
  const Icon = CATEGORY_ICONS[cat.icon] || CATEGORY_ICONS.empty;
  const pct = clampPercent(percent);

  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={isSelected}
      className={`slaze-cat${isSelected ? " slaze-cat--on" : ""}`}
      style={{
        "--slaze-accent": cat.color,
        "--slaze-cat-bg": cat.bg,
        "--slaze-fill-pct": `${pct}%`,
        "--slaze-fill-color": hexToRgba(
          cat.color,
          isSelected ? 0.55 : 0.28
        ),
      } as React.CSSProperties}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(cat.id);
      }}
    >
      <span className="slaze-cat-icon">
        <Icon size={20} />
      </span>
      <span className="slaze-cat-label">{cat.label}</span>
      <span className="slaze-cat-meta">
        {isSelected && (
          <span
            className="slaze-cat-picked"
            aria-label="Your selection"
            title="Your selection"
          >
            <IconSelectionCheck size={16} />
          </span>
        )}
      </span>
    </button>
  );
});

/* ── Main component ──────────────────────────────────────────────── */

export interface VoteMenuProps {
  categories: CategoryDef[];
  platform: string;
  postId: string;
  nativeButton: Element | null;
  platformVotes?: number;
  timeBucket?: number;
  contextCode?: number;
  onVoteCommitted?: (rating: Rating | null) => void;
  usePortal?: boolean;
}

export default function VoteMenu({
  categories,
  platform,
  postId,
  nativeButton,
  platformVotes = 0,
  timeBucket = 0,
  contextCode = 0,
  onVoteCommitted,
  usePortal = false,
}: VoteMenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [limitNotice, setLimitNotice] = useState("");
  const [percentByCategory, setPercentByCategory] = useState<
    Record<string, number>
  >({});
  const [verdictLabel, setVerdictLabel] = useState({
    phrase: "",
    subtext: "",
  });
  const [dropdownStyle, setDropdownStyle] = useState<
    React.CSSProperties | undefined
  >(undefined);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const skipSubmitRef = useRef(true);
  const openedAtRef = useRef(0);

  const readPercentsFromCache = useCallback(() => {
    const cacheKey = `${platform}::${postId}`;
    const cached = cache.get(cacheKey);
    if (cached && Array.isArray(cached.categoryPercents)) {
      setPercentByCategory(buildPercentMap(cached.categoryPercents));
    }
    if (
      cached &&
      (cached.labelPhrase || cached.labelSubtext)
    ) {
      setVerdictLabel({
        phrase: cached.labelPhrase || "",
        subtext: cached.labelSubtext || "",
      });
    }
    return !!cached;
  }, [platform, postId]);

  useEffect(() => {
    readPercentsFromCache();
  }, [readPercentsFromCache]);

  const readSelectionFromStorage = useCallback(() => {
    let storage: chrome.storage.LocalStorageArea | null = null;
    try {
      storage = chrome?.storage?.local;
    } catch (err) {
      if (!isExtensionContextInvalidatedError(err)) {
        console.debug(
          "[Slaze] storage unavailable while reading selection",
          err
        );
      }
      return;
    }
    if (!storage?.get) return;

    const key = makeSelectionStorageKey(platform, postId);
    try {
      storage.get(key, (result) => {
        try {
          if (chrome?.runtime?.lastError) return;
          const ids = sanitizeSelectedIds(result?.[key], categories);
          if (!ids.length) return;
          setSelected(new Set(ids));
        } catch (err) {
          if (!isExtensionContextInvalidatedError(err)) {
            console.debug("[Slaze] storage read callback failed", err);
          }
        }
      });
    } catch (err) {
      if (!isExtensionContextInvalidatedError(err)) {
        console.debug("[Slaze] storage read failed", err);
      }
    }
  }, [platform, postId, categories]);

  const writeSelectionToStorage = useCallback(
    (ids: string[]) => {
      let storage: chrome.storage.LocalStorageArea | null = null;
      try {
        storage = chrome?.storage?.local;
      } catch (err) {
        if (!isExtensionContextInvalidatedError(err)) {
          console.debug(
            "[Slaze] storage unavailable while writing selection",
            err
          );
        }
        return;
      }
      if (!storage?.set) return;

      const key = makeSelectionStorageKey(platform, postId);
      try {
        storage.set({ [key]: ids }, () => {
          // Ignore storage errors in UI path; vote commit already succeeded.
        });
      } catch (err) {
        if (!isExtensionContextInvalidatedError(err)) {
          console.debug("[Slaze] storage write failed", err);
        }
      }
    },
    [platform, postId]
  );

  useEffect(() => {
    readSelectionFromStorage();
  }, [readSelectionFromStorage]);

  // Fetch fresh percents when the dropdown opens (if not in cache)
  useEffect(() => {
    if (!open) return;

    if (readPercentsFromCache()) return;

    let cancelled = false;
    const pvBucket = platformVoteBucket(platformVotes);
    const cacheKey = `${platform}::${postId}`;

    (async () => {
      const res = await fetchBatchRatings([
        { platform, postId, cacheKey, pvBucket, timeBucket },
      ]);
      if (cancelled || !res?.has(cacheKey)) return;
      const rating = res.get(cacheKey);
      if (rating && Array.isArray(rating.categoryPercents)) {
        setPercentByCategory(buildPercentMap(rating.categoryPercents));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    platform,
    postId,
    platformVotes,
    timeBucket,
    readPercentsFromCache,
  ]);

  /* ── Clone native button appearance ────────────────────────── */
  useEffect(() => {
    const btn = btnRef.current;
    if (!btn || !nativeButton) return;

    const cs = window.getComputedStyle(nativeButton);
    if (!cs) return;

    const props = [
      "minHeight",
      "paddingTop",
      "paddingRight",
      "paddingBottom",
      "paddingLeft",
      "borderRadius",
      "font",
      "letterSpacing",
      "lineHeight",
    ] as const;
    for (const p of props) {
      const v = cs[p];
      if (v && v !== "auto" && v !== "normal" && v !== "none" && v !== "hidden" && v !== "") {
        btn.style.setProperty(p, v);
      }
    }

    if (cs.backgroundColor) {
      btn.style.setProperty("--slaze-btn-bg", cs.backgroundColor);
    }
  }, [nativeButton]);

  /* ── Close on outside click ────────────────────────────────── */
  useEffect(() => {
    if (!open) return;

    function onMouseDown(e: MouseEvent) {
      const path = e.composedPath ? e.composedPath() : [];
      if (wrapRef.current && path.includes(wrapRef.current)) return;
      if (dropdownRef.current && path.includes(dropdownRef.current))
        return;
      setOpen(false);
    }

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  /* ── Close on Escape ───────────────────────────────────────── */
  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  /* ── Portal positioning (X/Twitter escape card overflow) ───── */
  const reposition = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 6,
      right: window.innerWidth - rect.right,
    });
  }, []);

  useEffect(() => {
    if (!open || !usePortal) {
      setDropdownStyle(undefined);
      return;
    }
    reposition();
    window.addEventListener("scroll", reposition, {
      passive: true,
      capture: true,
    });
    window.addEventListener("resize", reposition, { passive: true });
    return () => {
      window.removeEventListener("scroll", reposition, {
        capture: true,
      });
      window.removeEventListener("resize", reposition);
    };
  }, [open, usePortal, reposition]);

  /* ── Toggle a category selection ───────────────────────────── */
  const toggle = useCallback(
    (id: string) => {
      skipSubmitRef.current = false;

      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          if (next.size >= MAX) {
            setLimitNotice(
              `Max ${MAX} categories. Deselect one to choose another.`
            );
            console.info("[Slaze] Max 3 selections reached", { postId });
            return prev;
          }
          next.add(id);
        }

        console.log("[Slaze] Vote changed", {
          postId,
          selected: Array.from(next),
          count: next.size,
          ts: new Date().toISOString(),
        });

        return next;
      });
    },
    [postId]
  );

  useEffect(() => {
    if (!limitNotice) return;
    const t = setTimeout(() => setLimitNotice(""), 1800);
    return () => clearTimeout(t);
  }, [limitNotice]);

  // Debounced vote submission (450 ms after last selection change)
  useEffect(() => {
    if (skipSubmitRef.current) return;
    if (selected.size === 0) return;

    const timer = setTimeout(async () => {
      const ids = Array.from(selected);

      const dwellMs = openedAtRef.current
        ? Math.max(0, Date.now() - openedAtRef.current)
        : 0;

      setSaving(true);
      try {
        const res = await submitVote(
          platform,
          postId,
          ids,
          contextCode,
          platformVotes,
          timeBucket,
          dwellMs
        );

        if (res?.ok && res.rating) {
          writeSelectionToStorage(ids);
          if (Array.isArray(res.rating.categoryPercents)) {
            setPercentByCategory(
              buildPercentMap(res.rating.categoryPercents)
            );
          }
          if (res.rating.labelPhrase || res.rating.labelSubtext) {
            setVerdictLabel({
              phrase: res.rating.labelPhrase || "",
              subtext: res.rating.labelSubtext || "",
            });
          }
          if (typeof onVoteCommitted === "function") {
            onVoteCommitted(res.rating);
          }
          return;
        }

        console.warn("[Slaze] vote submit failed", {
          platform,
          postId,
          status: res?.status,
        });
      } finally {
        setSaving(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [
    selected,
    platform,
    postId,
    contextCode,
    platformVotes,
    timeBucket,
    onVoteCommitted,
    writeSelectionToStorage,
  ]);

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div ref={wrapRef} className="slaze-wrap">
      <button
        ref={btnRef}
        type="button"
        className="slaze-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => {
            const next = !v;
            if (next) openedAtRef.current = Date.now();
            return next;
          });
        }}
      >
        <IconSlaze size={16} />
        <span>{saving ? "Saving..." : "Slaze.it"}</span>
      </button>

      {open &&
        (() => {
          const renderRow = (cat: CategoryDef) => (
            <CategoryRow
              key={cat.id}
              cat={cat}
              isSelected={selected.has(cat.id)}
              onToggle={toggle}
              percent={percentByCategory[cat.id] || 0}
            />
          );
          const positive = categories.filter(
            (c) => c.group === "positive"
          );
          const negative = categories.filter(
            (c) => c.group === "negative"
          );

          const dropdown = (
            <div
              ref={dropdownRef}
              className="slaze-dropdown"
              role="menu"
              aria-label="Classify this post"
              data-slaze-platform={platform}
              style={usePortal ? dropdownStyle : undefined}
            >
              {verdictLabel.phrase && (
                <div className="slaze-verdict" role="status">
                  <div className="slaze-verdict-phrase">
                    {verdictLabel.phrase}
                  </div>
                  {verdictLabel.subtext && (
                    <div className="slaze-verdict-subtext">
                      {verdictLabel.subtext}
                    </div>
                  )}
                </div>
              )}
              {positive.length === 0 && negative.length === 0 ? (
                categories.map(renderRow)
              ) : (
                <>
                  {positive.length > 0 && (
                    <>
                      <div className="slaze-section-header slaze-section-header--positive">
                        Positive
                      </div>
                      {positive.map(renderRow)}
                    </>
                  )}
                  {negative.length > 0 && (
                    <>
                      <div className="slaze-section-header slaze-section-header--negative">
                        Negative
                      </div>
                      {negative.map(renderRow)}
                    </>
                  )}
                </>
              )}
              {limitNotice && (
                <p className="slaze-menu-hint">{limitNotice}</p>
              )}
            </div>
          );
          return usePortal
            ? createPortal(dropdown, document.body)
            : dropdown;
        })()}
    </div>
  );
}
