const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();

// FIXED: Configured dynamic CORS origins for express middleware
app.use(cors({
    origin: ["http://localhost:3000", "https://codeshift-iota.vercel.app"],
    methods: ["GET", "POST"]
}));

const server = http.createServer(app);

// FIXED: Added your production Vercel URL to Socket.io CORS rules
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:3000", "https://codeshift-iota.vercel.app"], 
        methods: ["GET", "POST"]
    }
});

const roomUsers = {};
// In-memory cache store to hold the latest text document state per room
const roomCodeCache = {}; 

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('join-room', ({ roomId, username }) => {
        socket.join(roomId);
        
        if (!roomUsers[roomId]) {
            roomUsers[roomId] = [];
        }
        
        // UPGRADE CHECK: Only add the user to the display array if their username isn't already inside
        const userExists = roomUsers[roomId].some(user => user.username === username);
        if (!userExists) {
            roomUsers[roomId].push({ id: socket.id, username });
        } else {
            // If they already exist (like a refresh), update their active socket ID reference link
            const existingUser = roomUsers[roomId].find(user => user.username === username);
            if (existingUser) existingUser.id = socket.id;
        }
        
        io.to(roomId).emit('user-list-update', roomUsers[roomId]);
        console.log(`${username} joined room: ${roomId}`);
    });

    socket.on('code-change', ({ roomId, code }) => {
        // Intercept the change and save it to our server cache
        roomCodeCache[roomId] = code; 
        
        socket.broadcast.to(roomId).emit('code-update', code);
    });

    socket.on('drawing-data', ({ roomId, drawData }) => {
        socket.broadcast.to(roomId).emit('drawing-update', drawData);
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        for (const roomId in roomUsers) {
            roomUsers[roomId] = roomUsers[roomId].filter(user => user.id !== socket.id);
            io.to(roomId).emit('user-list-update', roomUsers[roomId]);
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Real-time server running on port ${PORT}`);
});