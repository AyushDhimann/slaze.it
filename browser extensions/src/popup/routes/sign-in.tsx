/**
 * Sign-in page using Clerk's pre-built SignIn component.
 */

import { SignIn } from "@clerk/chrome-extension";

export const SignInPage = () => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        padding: "16px 0",
        minHeight: 300,
      }}
    >
      <SignIn
        appearance={{
          elements: {
            socialButtons: "display: none",
            dividerRow: "display: none",
          },
        }}
      />
    </div>
  );
};
