/**
 * Popup Home page — modern minimal UI with Apple/Adobe design principles.
 */

import { useAuth, UserButton } from "@clerk/chrome-extension";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { PLAN_DISPLAY, UPGRADE_URL } from "../../shared/config";
import type { PlanInfo } from "../../shared/types";
import {
  brand,
  neutral,
  semantic,
  space,
  font,
  radius,
  shadow,
  glass,
  ease,
  duration,
} from "../styles/tokens";

// ── Shared styles ───────────────────────────────────────────────

const s = {
  // Glass header
  header: {
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    padding: `${space[4]}px ${space[5]}px`,
    background: glass.bg,
    backdropFilter: glass.blur,
    WebkitBackdropFilter: glass.blur,
    borderBottom: `1px solid ${glass.border}`,
    position: "sticky" as const,
    top: 0,
    zIndex: 10,
  },
  logo: {
    fontSize: font.size.xl,
    fontWeight: font.weight.bold as 700,
    color: brand.primary,
    letterSpacing: "-0.3px",
    lineHeight: 1,
  },
  tagline: {
    fontSize: font.size.xs,
    color: neutral[500],
    marginTop: 2,
    lineHeight: 1,
  },

  // Sections
  body: {
    padding: `${space[4]}px ${space[5]}px`,
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: space[4],
  },

  // Card
  card: {
    padding: space[4],
    borderRadius: radius.md,
    background: "#FFFFFF",
    border: `1px solid ${neutral[200]}`,
    boxShadow: shadow.sm,
  },
  cardHighlight: {
    padding: space[4],
    borderRadius: radius.md,
    background: brand.primaryBg,
    border: `1px solid rgba(79, 70, 229, 0.08)`,
    boxShadow: shadow.sm,
  },

  // Status dot
  statusRow: {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: space[2],
    padding: `${space[3]}px ${space[5]}px`,
    borderBottom: `1px solid ${neutral[100]}`,
  },
  dot: (color: string) => ({
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: color,
    flexShrink: 0,
    animation: color === semantic.success
      ? "slaze-dot-breathe 3s ease-in-out infinite"
      : undefined,
  }),

  // Progress bar
  barTrack: {
    height: 4,
    borderRadius: radius.full,
    background: neutral[200],
    overflow: "hidden" as const,
    flex: 1,
    minWidth: 80,
  },
  barFill: (pct: number) => ({
    height: "100%" as const,
    width: `${Math.min(100, pct)}%`,
    borderRadius: radius.full,
    background:
      pct >= 85
        ? `linear-gradient(90deg, ${semantic.danger}, #F87171)`
        : pct >= 50
          ? `linear-gradient(90deg, ${brand.primary}, ${brand.primaryLight})`
          : `linear-gradient(90deg, ${semantic.success}, #34D399)`,
    transition: `width ${duration.slow} ${ease.smooth}`,
  }),

  // Buttons
  btnPrimary: {
    display: "inline-flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: space[1],
    padding: `${space[2]}px ${space[4]}px`,
    borderRadius: radius.md,
    fontSize: font.size.md,
    fontWeight: font.weight.semibold as 600,
    color: "#FFFFFF",
    background: `linear-gradient(135deg, ${brand.primary}, ${brand.primaryLight})`,
    border: "none",
    cursor: "pointer",
    textDecoration: "none",
    transition: `all ${duration.normal} ${ease.default}`,
    boxShadow: `0 2px 8px rgba(79, 70, 229, 0.25)`,
  },
  btnGhost: {
    display: "inline-flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: `${space[2]}px ${space[3]}px`,
    borderRadius: radius.sm,
    fontSize: font.size.md,
    fontWeight: font.weight.medium as 500,
    color: neutral[600],
    background: "transparent",
    border: "none",
    cursor: "pointer",
    textDecoration: "none",
    transition: `all ${duration.fast} ${ease.default}`,
  },
  btnSm: {
    display: "inline-flex" as const,
    alignItems: "center" as const,
    gap: space[1],
    padding: `${space[1]}px ${space[2]}px`,
    borderRadius: radius.sm,
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold as 600,
    color: brand.primary,
    background: brand.primaryBg,
    border: "none",
    cursor: "pointer",
    textDecoration: "none",
    transition: `all ${duration.fast} ${ease.default}`,
  },

  // Text
  muted: {
    fontSize: font.size.sm,
    color: neutral[500],
    lineHeight: font.leading.snug,
  },
  label: {
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold as 600,
    color: neutral[700],
  },
  value: {
    fontSize: font.size.md,
    fontWeight: font.weight.semibold as 600,
    color: neutral[900],
  },

  // Platform tip
  tipRow: {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: space[2],
    fontSize: font.size.sm,
    color: neutral[600],
    lineHeight: font.leading.snug,
  },
  tipBadge: {
    fontSize: font.size.xs,
    fontWeight: font.weight.semibold as 600,
    color: neutral[600],
    background: neutral[100],
    padding: `1px ${space[1]}px`,
    borderRadius: radius.sm,
  },

  // Divider
  divider: {
    height: 1,
    background: neutral[100],
    margin: `0 -${space[5]}px`,
  },

  // Footer
  footer: {
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    padding: `${space[3]}px ${space[5]}px`,
    borderTop: `1px solid ${neutral[100]}`,
    background: neutral[50],
  },
};

// ── Component ────────────────────────────────────────────────────

export const Home = () => {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const [plan, setPlan] = useState<PlanInfo | null>(null);

  useEffect(() => {
    chrome.storage.local.get("slaze_plan_info").then((result) => {
      if (result.slaze_plan_info) {
        try {
          setPlan(JSON.parse(result.slaze_plan_info as string));
          return;
        } catch {
          /* malformed — fall through to background fetch */
        }
      }
      // Not in storage — fetch from background service worker
      chrome.runtime.sendMessage({ type: "SLAZE_GET_PLAN" }).then((resp) => {
        if (resp?.plan) setPlan(resp.plan as PlanInfo);
      }).catch(() => {
        /* background may not be ready */
      });
    });
  }, []);

  // Trigger token linking when the user signs in. The storage listener in
  // the background SW is best-effort — this gives a second chance from the
  // popup context where Clerk is fully initialised.
  useEffect(() => {
    if (isSignedIn) {
      chrome.runtime.sendMessage({ type: "SLAZE_LINK_TOKEN" }).catch(() => {
        /* background may not be ready */
      });
    }
  }, [isSignedIn]);

  const planName = PLAN_DISPLAY[plan?.plan || "free"] || "Free";
  const checksUsed = plan ? plan.usage.dailyChecks : 0;
  const checksTotal = plan ? plan.quota.dailyChecks : 0;
  const votesUsed = plan ? plan.usage.dailyVotes : 0;
  const votesTotal = plan ? plan.quota.dailyVotes : 0;
  const checksPct = checksTotal > 0 ? (checksUsed / checksTotal) * 100 : 0;
  const votesPct = votesTotal > 0 ? (votesUsed / votesTotal) * 100 : 0;

  return (
    <>
      {/* ── Glass Header ──────────────────────────── */}
      <header style={s.header}>
        <div>
          <div style={s.logo}>Slaze</div>
          <div style={s.tagline}>Community-powered post quality ratings</div>
        </div>
        {isSignedIn && <UserButton />}
      </header>

      {/* ── Status Row ────────────────────────────── */}
      <div style={s.statusRow}>
        <span style={s.dot(isSignedIn ? semantic.success : neutral[300])} />
        <span
          style={{
            fontSize: font.size.md,
            fontWeight: font.weight.medium,
            color: isSignedIn ? semantic.success : neutral[500],
          }}
        >
          {isSignedIn ? "Signed in" : "Not signed in"}
        </span>
        <span style={{ flex: 1 }} />
        {!isSignedIn && (
          <button
            style={s.btnSm}
            onClick={() => navigate("/sign-in")}
          >
            Sign in
          </button>
        )}
      </div>

      {/* ── Body ──────────────────────────────────── */}
      <div style={s.body}>
        {!isSignedIn ? (
          /* ── Signed-out Card ──────────────────────── */
          <div
            style={{
              textAlign: "center" as const,
              padding: `${space[8]}px ${space[4]}px`,
              display: "flex",
              flexDirection: "column" as const,
              alignItems: "center",
              gap: space[4],
            }}
            className="slaze-animate-in"
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.lg,
                background: brand.primaryBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: font.size["2xl"],
                color: brand.primary,
                fontWeight: font.weight.bold,
              }}
            >
              S
            </div>
            <div>
              <div
                style={{
                  fontSize: font.size.xl,
                  fontWeight: font.weight.semibold,
                  color: neutral[900],
                  marginBottom: space[1],
                }}
              >
                Sign in to rate posts
              </div>
              <p style={s.muted}>
                Join the community in rating post quality on Reddit and X.
              </p>
            </div>
            <div style={{ display: "flex", gap: space[2] }}>
              <button
                style={s.btnPrimary}
                onClick={() => navigate("/sign-in")}
              >
                Sign in
              </button>
              <button
                style={{
                  ...s.btnGhost,
                  color: brand.primary,
                  background: brand.primaryBg,
                  borderRadius: radius.md,
                }}
                onClick={() => navigate("/sign-up")}
              >
                Create account
              </button>
            </div>
          </div>
        ) : (
          /* ── Signed-in Content ───────────────────── */
          <>
            <div
              style={{
                ...s.card,
                padding: `${space[3]}px ${space[4]}px`,
                fontSize: font.size.base,
                color: neutral[600],
                lineHeight: font.leading.snug,
              }}
              className="slaze-animate-in"
            >
              Browse Reddit or X to see post quality ratings.
            </div>

            {/* ── Plan Card ─────────────────────────── */}
            {plan && (
              <div style={s.cardHighlight} className="slaze-animate-in">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: space[3],
                  }}
                >
                  <span
                    style={{
                      fontSize: font.size.md,
                      fontWeight: font.weight.semibold,
                      color: neutral[900],
                    }}
                  >
                    {planName}
                  </span>
                  {plan.plan === "free" && (
                    <a href={UPGRADE_URL} target="_blank" rel="noopener noreferrer" style={s.btnSm}>
                      Upgrade
                    </a>
                  )}
                </div>

                {/* Flares */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: space[3],
                    marginBottom: space[2],
                  }}
                >
                  <span style={{ ...s.label, width: 40, flexShrink: 0 }}>
                    Flares
                  </span>
                  <div style={s.barTrack}>
                    <div style={s.barFill(checksPct)} />
                  </div>
                  <span
                    style={{
                      ...s.value,
                      width: 52,
                      textAlign: "right" as const,
                      flexShrink: 0,
                    }}
                  >
                    {checksUsed}/{checksTotal}
                  </span>
                </div>

                {/* Votes */}
                <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
                  <span style={{ ...s.label, width: 40, flexShrink: 0 }}>
                    Votes
                  </span>
                  <div style={s.barTrack}>
                    <div style={s.barFill(votesPct)} />
                  </div>
                  <span
                    style={{
                      ...s.value,
                      width: 52,
                      textAlign: "right" as const,
                      flexShrink: 0,
                    }}
                  >
                    {votesUsed}/{votesTotal}
                  </span>
                </div>
              </div>
            )}

            {/* ── Platform Tips ─────────────────────── */}
            <div style={{ display: "flex", flexDirection: "column", gap: space[1] }} className="slaze-animate-in">
              <div style={s.tipRow}>
                <span style={s.tipBadge}>Reddit</span>
                <span>Share button → <strong style={{ color: brand.primary, fontWeight: font.weight.semibold }}>Slaze.it</strong></span>
              </div>
              <div style={s.tipRow}>
                <span style={s.tipBadge}>X</span>
                <span>Action bar → <strong style={{ color: brand.primary, fontWeight: font.weight.semibold }}>Slaze.it</strong></span>
              </div>
            </div>
          </>
        )}

        <div style={s.divider} />
      </div>

      {/* ── Footer ────────────────────────────────── */}
      <div style={s.footer}>
        <button
          style={s.btnGhost}
          onClick={() => navigate("/settings")}
        >
          Settings
        </button>
      </div>
    </>
  );
};
