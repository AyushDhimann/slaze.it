/**
 * Root layout wrapping all popup routes in ClerkProvider.
 */

import { Outlet, useNavigate } from "react-router-dom";
import { ClerkProvider } from "@clerk/chrome-extension";
import globalCss from "data-text:../styles/global.css";

const PUBLISHABLE_KEY = process.env.PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const SYNC_HOST = process.env.PLASMO_PUBLIC_CLERK_SYNC_HOST;

if (!PUBLISHABLE_KEY || !SYNC_HOST) {
  throw new Error(
    "Missing PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY or PLASMO_PUBLIC_CLERK_SYNC_HOST in .env or .env.dev"
  );
}

export const RootLayout = () => {
  const navigate = useNavigate();

  return (
    <ClerkProvider
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      publishableKey={PUBLISHABLE_KEY}
      syncHost={SYNC_HOST}
      afterSignOutUrl="/"
    >
      <style>{globalCss}</style>
      <div
        style={{
          width: 400,
          minHeight: 440,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          color: "#1E293B",
          background: "linear-gradient(180deg, #FAFBFF 0%, #FFFFFF 100%)",
        }}
      >
        <main>
          <Outlet />
        </main>
      </div>
    </ClerkProvider>
  );
};
