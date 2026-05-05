/**
 * Type declarations for Plasmo build-time environment variables.
 * Plasmo substitutes process.env.* at build time via the bundler.
 */

declare namespace NodeJS {
  interface ProcessEnv {
    PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
    PLASMO_PUBLIC_CLERK_SYNC_HOST?: string;
  }
}

declare var process: {
  env: NodeJS.ProcessEnv;
};
