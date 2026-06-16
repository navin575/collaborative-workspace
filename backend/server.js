const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, get, remove } = require('firebase/database'); // Added remove for cleanup

const app = express();

// Configured CORS origins for your clean new domain
app.use(cors({
    origin: [
        "http://localhost:3000", 
        "https://codshift.vercel.app",       // Your new short domain
        "https://codeshift-iota.vercel.app" // Keep for redirect backup safety
    ],
    methods: ["GET", "POST"]
}));

const server = http.createServer(app);

// Added your crisp new URL string to Socket.io security rules
const io = new Server(server, {
    cors: {
        origin: [
            "http://localhost:3000", 
            "https://codshift.vercel.app",
            "https://codeshift-iota.vercel.app"
        ], 
        methods: ["GET", "POST"]
    }
});

// Authentic Firebase Configuration linking backend pipeline directly to your cloud instance
const firebaseConfig = {
  apiKey: "AIzaSyBJbKb1-aHVRRTsS1U_h5jZ9wcfJ_Quh-E",
  authDomain: "collaborative-notepad-c6d84.firebaseapp.com",
  databaseURL: "https://collaborative-notepad-c6d84-default-rtdb.asia-southeast1.firebasedatabase.app", 
  projectId: "collaborative-notepad-c6d84",
  storageBucket: "collaborative-notepad-c6d84.firebasestorage.app",
  messagingSenderId: "446578856728",
  appId: "1:446578856728:web:44eec04f4ef94b72eb846d"
};

// Initialize Firebase App instance
const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

const roomUsers = {};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('join-room', async ({ roomId, username }) => {
        socket.join(roomId);
        
        if (!roomUsers[roomId]) {
            roomUsers[roomId] = [];
        }
        
        const userExists = roomUsers[roomId].some(user => user.username === username);
        if (!userExists) {
            roomUsers[roomId].push({ id: socket.id, username });
        } else {
            const existingUser = roomUsers[roomId].find(user => user.username === username);
            if (existingUser) existingUser.id = socket.id;
        }
        
        // PERSISTENCE FETCH: Reading the code object node safely from your Firebase room path
        try {
            const codeRef = ref(db, `rooms/${roomId}/code`);
            const snapshot = await get(codeRef);
            if (snapshot.exists()) {
                socket.emit('code-update', snapshot.val());
            }
        } catch (err) {
            console.error("Failed to query records from Firebase:", err.message);
        }
        
        io.to(roomId).emit('user-list-update', roomUsers[roomId]);
    });

    socket.on('code-change', ({ roomId, code }) => {
        // Broadcast active changes immediately to other clients in the room
        socket.broadcast.to(roomId).emit('code-update', code);
        
        // 🟢 UPDATED PERSISTENCE: Save both the current text and a live timestamp heartbeat
        set(ref(db, `rooms/${roomId}`), {
            code: code,
            lastUpdatedAt: Date.now() 
        }).catch(err => {
            console.error("Firebase cloud sync failed:", err.message);
        });
    });

    socket.on('disconnect', () => {
        for (const roomId in roomUsers) {
            roomUsers[roomId] = roomUsers[roomId].filter(user => user.id !== socket.id);
            io.to(roomId).emit('user-list-update', roomUsers[roomId]);
        }
    });
});

// 🟢 AUTOMATED LIFECYCLE ENGINE: Scans and removes rooms inactive for over 24 hours
setInterval(async () => {
    console.log("⏰ Running database lifecycle assessment...");
    try {
        const roomsRef = ref(db, 'rooms');
        const snapshot = await get(roomsRef);
        
        if (snapshot.exists()) {
            const allRooms = snapshot.val();
            const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
            const now = Date.now();
            
            for (const roomId in allRooms) {
                const roomData = allRooms[roomId];
                
                // If a room has a timestamp and its age exceeds 24 hours, prune it permanently
                if (roomData.lastUpdatedAt && (now - roomData.lastUpdatedAt > twentyFourHours)) {
                    console.log(`🗑️ Room "${roomId}" has expired. Performing cloud cleanup.`);
                    await remove(ref(db, `rooms/${roomId}`));
                    if (roomUsers[roomId]) delete roomUsers[roomId];
                }
            }
        }
    } catch (err) {
        console.error("Lifecycle assessment error:", err.message);
    }
}, 60 * 60 * 1000); // Runs once every single hour

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Real-time Firebase-linked server operational on port ${PORT}`);
});