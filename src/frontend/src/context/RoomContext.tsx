import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
} from 'react';
import type { Peer, Room } from '@shared/types/index';

interface RoomState {
  room: Room | null;
  peers: Peer[];
}

type Action =
  | { type: 'JOINED'; room: Room; peers: Peer[] }
  | { type: 'PEER_JOINED'; peer: Peer }
  | { type: 'PEER_LEFT'; id: string }
  | { type: 'LEFT' };

function reducer(state: RoomState, action: Action): RoomState {
  switch (action.type) {
    case 'JOINED':
      return { room: action.room, peers: action.peers };
    case 'PEER_JOINED':
      return { ...state, peers: [...state.peers, action.peer] };
    case 'PEER_LEFT':
      return { ...state, peers: state.peers.filter((p) => p.id !== action.id) };
    case 'LEFT':
      return { room: null, peers: [] };
  }
}

const RoomContext = createContext<{
  state: RoomState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function RoomProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { room: null, peers: [] });
  return (
    <RoomContext.Provider value={{ state, dispatch }}>
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error('useRoom must be used inside RoomProvider');
  return ctx;
}
