/**
 * Slaze Popup — React entry point with Clerk authentication.
 *
 * Uses React Router memory router for popup navigation.
 * Routes: / (home), /sign-in, /sign-up, /settings.
 */

import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { RootLayout } from "./layouts/root-layout";
import { Home } from "./routes/home";
import { SignInPage } from "./routes/sign-in";
import { SignUpPage } from "./routes/sign-up";
import { Settings } from "./routes/settings";

const router = createMemoryRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/sign-in", element: <SignInPage /> },
      { path: "/sign-up", element: <SignUpPage /> },
      { path: "/settings", element: <Settings /> },
    ],
  },
]);

export default function PopupIndex() {
  return <RouterProvider router={router} />;
}
