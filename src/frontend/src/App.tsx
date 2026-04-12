import { RoomProvider, useRoom } from './context/RoomContext';
import { JoinPage } from './pages/JoinPage';
import { RoomPage } from './pages/RoomPage';
import { getSocket, useSocket } from './hooks/useSocket';
import { SOCKET_EVENTS } from '@shared/types/index';
import type { JoinRoomPayload, Peer, Room } from '@shared/types/index';

function AppInner() {
  const { state, dispatch } = useRoom();

  // Must live here — RoomPage isn't mounted yet when this event arrives
  useSocket('room-joined', (data: unknown) => {
    const { room, peers } = data as { room: Room; peers: Peer[] };
    dispatch({ type: 'JOINED', room, peers });
  });

  useSocket(SOCKET_EVENTS.PEER_JOINED, (peer: unknown) => {
    dispatch({ type: 'PEER_JOINED', peer: peer as Peer });
  });

  useSocket(SOCKET_EVENTS.PEER_LEFT, (data: unknown) => {
    dispatch({ type: 'PEER_LEFT', id: (data as { id: string }).id });
  });

  function handleJoin(payload: JoinRoomPayload) {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit(SOCKET_EVENTS.JOIN_ROOM, payload);
    } else {
      socket.once('connect', () => socket.emit(SOCKET_EVENTS.JOIN_ROOM, payload));
    }
  }

  if (state.room) return <RoomPage />;
  return <JoinPage onJoin={handleJoin} />;
}

export default function App() {
  return (
    <RoomProvider>
      <AppInner />
    </RoomProvider>
  );
}
