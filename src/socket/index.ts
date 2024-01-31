import { io, Socket } from "socket.io-client";

const socket: Socket = io("http://localhost:3000", {
    reconnectionAttempts: 5,
    reconnectionDelay: 5000,
});

socket.on("connect", () => {
    console.log("连接成功");
});
socket.on("disconnect", () => {
    console.log("连接断开");
});

export default socket;
