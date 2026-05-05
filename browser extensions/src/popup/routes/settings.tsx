/**
 * Settings page — Clerk UserProfile for account management.
 */

import { UserProfile } from "@clerk/chrome-extension";

export const Settings = () => {
  return (
    <div style={{ padding: "0 16px" }}>
      <UserProfile />
    </div>
  );
};
