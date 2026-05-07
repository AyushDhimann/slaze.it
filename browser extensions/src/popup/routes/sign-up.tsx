/**
 * Sign-up page — redirects to the Slaze website for account creation.
 */

import { useEffect } from "react";
import { neutral, brand, space, font, radius } from "../styles/tokens";

const SYNC_HOST = process.env.PLASMO_PUBLIC_CLERK_SYNC_HOST || "https://slaze.it.com";

export const SignUpPage = () => {
  useEffect(() => {
    chrome.tabs.create({ url: `${SYNC_HOST}/sign-up` });
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 440,
        padding: space[8],
        textAlign: "center",
        background: "linear-gradient(180deg, #FAFBFF 0%, #FFFFFF 100%)",
      }}
    >
      {/* Spinner */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: radius.full,
          border: `2px solid ${neutral[200]}`,
          borderTopColor: brand.primary,
          animation: `spin 0.8s linear infinite`,
          marginBottom: space[4],
        }}
      />

      <div
        style={{
          fontSize: font.size.xl,
          fontWeight: font.weight.semibold,
          color: neutral[900],
          marginBottom: space[2],
        }}
      >
        Sign up opened in your browser
      </div>
      <p
        style={{
          fontSize: font.size.md,
          color: neutral[500],
          lineHeight: font.leading.snug,
          maxWidth: 260,
        }}
      >
        Create your account on the Slaze website. Your session will sync back automatically.
      </p>
    </div>
  );
};
