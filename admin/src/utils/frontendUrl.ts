export const frontendUrl = (path: string) => {
  const configuredOrigin = import.meta.env.VITE_FRONTEND_URL;
  const origin = new URL(configuredOrigin || window.location.origin);

  // The local admin Vite server runs on 5174 and the frontend runs on 5173.
  if (!configuredOrigin && import.meta.env.DEV && origin.port === "5174") {
    origin.port = "5173";
  }

  return new URL(path, origin);
};
