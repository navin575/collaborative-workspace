const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, get } = require('firebase/database');

const app = express();

// Enable clean cross-origin requests
app.use(cors({
    origin: ["http://localhost:3000", "https://codeshift-iota.vercel.app", "https://navin575.github.io"],
    methods: ["GET", "POST"]
}));

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: ["http://localhost:3000", "https://codeshift-iota.vercel.app", "https://navin575.github.io"], 
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
        
        // 🟢 PROFESSIONAL PERSISTENCE FETCH: Fetch directly from Firebase Realtime Cloud Vault!
        try {
            const codeRef = ref(db, `rooms/${roomId}/code`);
            const snapshot = await get(codeRef);
            if (snapshot.exists()) {
                // Send the cloud-saved document straight back to the user
                socket.emit('code-update', snapshot.val());
            }
        } catch (err) {
            console.error("Failed to query records from Firebase:", err.message);
        }
        
        io.to(roomId).emit('user-list-update', roomUsers[roomId]);
    });

    socket.on('code-change', ({ roomId, code }) => {
        // Broadcast the active changes out immediately for smooth real-time performance
        socket.broadcast.to(roomId).emit('code-update', code);
        
        // 🟢 PERMANENT STORAGE COMMITTAL: Async background save straight into Firebase
        set(ref(db, `rooms/${roomId}/code`), code).catch(err => {
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

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Real-time Firebase-linked server operational on port ${PORT}`);
});