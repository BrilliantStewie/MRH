export const SOCKET_REALTIME_EVENT_NAME = "mrh:update";
export const FRONTEND_REALTIME_EVENT_NAME = "mrh:frontend-realtime-update";

export const matchesRealtimeEntity = (payload, entities = []) =>
  entities.includes(String(payload?.entity || "").toLowerCase());
