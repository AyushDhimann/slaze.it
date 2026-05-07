/**
 * Settings page — Clerk UserProfile with styled container and back button.
 */

import { UserProfile } from "@clerk/chrome-extension";
import { useNavigate } from "react-router-dom";
import { neutral, brand, space, font, radius, glass } from "../styles/tokens";

export const Settings = () => {
  const navigate = useNavigate();

  return (
    <div style={{ background: "linear-gradient(180deg, #FAFBFF 0%, #FFFFFF 100%)", minHeight: 440 }}>
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: space[3],
          padding: `${space[3]}px ${space[4]}px`,
          background: glass.bg,
          backdropFilter: glass.blur,
          WebkitBackdropFilter: glass.blur,
          borderBottom: `1px solid ${glass.border}`,
        }}
      >
        <button
          onClick={() => navigate("/")}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: radius.sm,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: neutral[600],
            fontSize: font.size.lg,
            transition: "background 120ms ease",
          }}
        >
          ←
        </button>
        <span
          style={{
            fontSize: font.size.lg,
            fontWeight: font.weight.semibold,
            color: neutral[900],
          }}
        >
          Account Settings
        </span>
      </header>

      {/* Clerk UserProfile */}
      <div style={{ padding: space[4] }}>
        <UserProfile />
      </div>
    </div>
  );
};
