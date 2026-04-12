// Peer connected in a room
export interface Peer {
  id: string; // socket id
  pseudo: string;
  roomId: string;
}

// Minimal room descriptor
export interface Room {
  id: string;
  name: string;
}

// Payload sent by client to join
export interface JoinRoomPayload {
  pseudo: string;
  roomName: string;
}

// Bookmark result broadcast to all room peers
export interface BookmarkResult {
  id: string;
  triggeredBy: string; // pseudo of who clicked
  transcript: string;
  summary: string;
  createdAt: string;
}

// Socket event names (shared contract)
export const SOCKET_EVENTS = {
  JOIN_ROOM: 'join-room',
  LEAVE_ROOM: 'leave-room',
  PEER_JOINED: 'peer-joined',
  PEER_LEFT: 'peer-left',
  BOOKMARK: 'bookmark',
  BOOKMARK_RESULT: 'bookmark-result',
} as const;
