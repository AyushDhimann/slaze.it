/// <reference types="vite/client" />

/** Allow importing CSS files as raw strings (used by shadow DOM injection). */
declare module "*.css?raw" {
  const content: string;
  export default content;
}

/** Declare image/binary file imports for Vite. */
declare module "*.png" {
  const src: string;
  export default src;
}
declare module "*.svg" {
  const src: string;
  export default src;
}
