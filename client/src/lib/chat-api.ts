// This file is kept for backward compatibility, but the functionality has been moved
// to session-utils.ts. We've moved from WebSockets to REST API for communication.

// The file is kept to avoid breaking imports in other components that may still reference it
// but is essentially a no-op now.

export const CHAT_API_STATUS = {
  USING_REST_API: true,
  WEB_SOCKETS_DISABLED: true
};
