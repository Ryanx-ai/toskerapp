export const APP_VERSION = "MS7.4 FP2A";
export const BUILD_LABEL = "Development";
// Explicit product-stage policy; canonical review is a production build of Dev.
// Revisit visibility and remove engineering milestone copy before Beta.
export const DEVELOPMENT_REVIEW = BUILD_LABEL === "Development";

export const APP_VERSION_LABEL = `Version ${APP_VERSION} - ${BUILD_LABEL}`;

export const AUTH_REDIRECT_ORIGINS = [
  "http://localhost:3000",
  "https://toskerapp.vercel.app",
];
