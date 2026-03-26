const toFiniteSessionVersion = (value) => {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
};

const getSessionVersion = (value) =>
  toFiniteSessionVersion(value?.sessionVersion ?? value?.tokenVersion ?? 0);

const getDecodedSessionVersion = (decoded) =>
  toFiniteSessionVersion(decoded?.sessionVersion ?? decoded?.tokenVersion ?? 0);

const setSessionVersion = (value, sessionVersion) => {
  const normalized = toFiniteSessionVersion(sessionVersion);
  value.sessionVersion = normalized;
  value.tokenVersion = normalized;
  return normalized;
};

const bumpSessionVersion = (value) =>
  setSessionVersion(value, getSessionVersion(value) + 1);

const buildSessionTokenPayload = ({
  id,
  name,
  role,
  sessionVersion = 0,
}) => {
  const normalized = toFiniteSessionVersion(sessionVersion);

  return {
    id,
    name,
    role,
    sessionVersion: normalized,
    tokenVersion: normalized,
  };
};

export {
  buildSessionTokenPayload,
  bumpSessionVersion,
  getDecodedSessionVersion,
  getSessionVersion,
  setSessionVersion,
  toFiniteSessionVersion,
};
