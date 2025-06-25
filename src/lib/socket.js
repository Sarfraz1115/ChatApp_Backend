import { Server } from 'socket.io';
import http from 'http';
import express from 'express';



const app = express()
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173"],
    },
});

export function getRecieverSocketId(userId) {
    return userSocketMap[userId];
}

// used to store online users
// This map will hold user IDs as keys and their corresponding socket IDs as values
const userSocketMap = {};

io.on("connection", (socket) => {
    console.log(" A user connected", socket.id);
    const userId = socket.handshake.query.userId;

    if (userId) userSocketMap[userId] = socket.id;

    // io.emit is used to send events to all connected clients
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // typing indicator
    socket.on("typing", ({ to }) => {
        const recieverSocketId = userSocketMap[to];
        if (recieverSocketId) {
            io.to(recieverSocketId).emit("typing", { from: userId });
        }
    });

    socket.on("stopTyping", ({ to }) => {
        // Send "stopTyping" event to the recipient
        const recieverSocketId = userSocketMap[to];
        if (recieverSocketId) {
            io.to(recieverSocketId).emit("stopTyping", { from: userId });
        }
    });


    socket.on("disconnect", () => {
        console.log(" A user disconnected", socket.id);
        delete userSocketMap[userId];
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
});


export { io, app, server };