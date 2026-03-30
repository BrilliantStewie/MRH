const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

const normalizeOrigins = (origins = []) =>
  [
    ...new Set(
      (origins || [])
        .map((origin) => String(origin || "").trim())
        .filter(Boolean)
    ),
  ];

export const isLoopbackOrigin = (origin = "") => {
  try {
    const parsedOrigin = new URL(String(origin || "").trim());
    return (
      ["http:", "https:"].includes(parsedOrigin.protocol) &&
      LOOPBACK_HOSTNAMES.has(parsedOrigin.hostname)
    );
  } catch {
    return false;
  }
};

export const resolveCorsConfig = () => {
  const configuredOrigins = normalizeOrigins(
    String(process.env.CORS_ORIGINS || "").split(",")
  );
  const environmentOrigins = normalizeOrigins([
    process.env.FRONTEND_URL,
    process.env.ADMIN_URL,
  ]);
  const localDevOrigins =
    process.env.NODE_ENV === "production"
      ? []
      : normalizeOrigins([
          "http://localhost:5173",
          "http://localhost:5174",
          "http://127.0.0.1:5173",
          "http://127.0.0.1:5174",
        ]);

  const allowedOrigins = normalizeOrigins(
    configuredOrigins.length
      ? configuredOrigins
      : [...environmentOrigins, ...localDevOrigins]
  );

  return {
    allowedOrigins,
    // Let local tools like Vite auto-hop ports without breaking CORS.
    allowDynamicLoopbackOrigins:
      !configuredOrigins.length && allowedOrigins.some(isLoopbackOrigin),
  };
};

export const isOriginAllowed = (origin, corsConfig = {}) => {
  const normalizedOrigin = String(origin || "").trim();
  if (!normalizedOrigin) {
    return true;
  }

  if ((corsConfig.allowedOrigins || []).includes(normalizedOrigin)) {
    return true;
  }

  return Boolean(corsConfig.allowDynamicLoopbackOrigins) && isLoopbackOrigin(normalizedOrigin);
};

export const createCorsOriginHandler =
  (corsConfig = {}, label = "CORS") =>
  (origin, callback) => {
    if (isOriginAllowed(origin, corsConfig)) {
      return callback(null, true);
    }

    return callback(new Error(`${label} origin not allowed: ${origin}`));
  };
