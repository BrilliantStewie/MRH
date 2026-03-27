export const SOCKET_REALTIME_EVENT_NAME = "mrh:update";
export const ADMIN_REALTIME_EVENT_NAME = "mrh:admin-realtime-update";
export const STAFF_REALTIME_EVENT_NAME = "mrh:staff-realtime-update";

export const matchesRealtimeEntity = (payload, entities = []) =>
  entities.includes(String(payload?.entity || "").toLowerCase());
