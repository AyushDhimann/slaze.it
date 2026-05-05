/**
 * Popup Home page — shows auth status and extension info.
 */

import { SignedIn, SignedOut, UserButton } from "@clerk/chrome-extension";
import { useNavigate } from "react-router-dom";

export const Home = () => {
  const navigate = useNavigate();

  return (
    <>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          borderBottom: "1px solid #e5e7eb",
          marginBottom: 12,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#111827",
              margin: 0,
            }}
          >
            Slaze
          </h1>
          <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>
            Community-powered post quality ratings
          </p>
        </div>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </header>

      <div style={{ padding: "0 16px" }}>
        <SignedIn>
          <div
            style={{
              padding: 12,
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              background: "#fafafa",
            }}
          >
            <p style={{ fontSize: 13, color: "#111827", margin: "0 0 6px" }}>
              You are signed in. Browse Reddit or X to rate posts.
            </p>
            <p style={{ fontSize: 12, color: "#4b5563", margin: 0 }}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/settings");
                }}
                style={{ color: "#2563eb", textDecoration: "none" }}
              >
                Account Settings
              </a>
            </p>
          </div>
        </SignedIn>

        <SignedOut>
          <div
            style={{
              padding: 12,
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              background: "#fafafa",
            }}
          >
            <p style={{ fontSize: 13, color: "#111827", margin: "0 0 6px" }}>
              You are not signed in.
            </p>
            <p style={{ fontSize: 12, color: "#4b5563", margin: 0 }}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/sign-in");
                }}
                style={{ color: "#2563eb", textDecoration: "none" }}
              >
                Sign in to rate posts
              </a>
              {" · "}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/sign-up");
                }}
                style={{ color: "#2563eb", textDecoration: "none" }}
              >
                Sign up
              </a>
            </p>
          </div>
        </SignedOut>

        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.5 }}>
            On Reddit, use the <strong>Slaze.it</strong> button next to
            Share on post cards.
          </p>
          <p style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.5 }}>
            On X/Twitter, find it in the action bar below each tweet.
          </p>
        </div>
      </div>
    </>
  );
};
