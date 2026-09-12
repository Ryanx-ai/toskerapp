export const APP_VERSION = "MS7.1";
export const BUILD_LABEL = "Development";
// Explicit product-stage policy; canonical review is a production build of Dev.
// Revisit visibility and remove engineering milestone copy before Beta.
export const DEVELOPMENT_REVIEW = BUILD_LABEL === "Development";

export const APP_VERSION_LABEL = `Version ${APP_VERSION} - ${BUILD_LABEL}`;

export const AUTH_REDIRECT_ORIGINS = [
  "http://localhost:3000",
  "https://toskerapp.vercel.app",
];
