import { io, Socket } from 'socket.io-client';

export const socket: Socket = io('http://localhost:3000', {
    reconnectionAttempts: 5,
    reconnectionDelay: 5000
});

export default socket;
