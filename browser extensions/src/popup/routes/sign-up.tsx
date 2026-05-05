/**
 * Sign-up page using Clerk's pre-built SignUp component.
 */

import { SignUp } from "@clerk/chrome-extension";

export const SignUpPage = () => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        padding: "16px 0",
        minHeight: 300,
      }}
    >
      <SignUp
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
