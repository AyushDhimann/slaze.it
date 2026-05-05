/**
 * Root layout wrapping all popup routes in ClerkProvider.
 */

import { Outlet, useNavigate } from "react-router-dom";
import { ClerkProvider } from "@clerk/chrome-extension";

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
      afterSignOutUrl="/"
      syncHost={SYNC_HOST}
    >
      <div
        style={{
          width: 340,
          minHeight: 320,
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#fff",
        }}
      >
        <main>
          <Outlet />
        </main>
      </div>
    </ClerkProvider>
  );
};
