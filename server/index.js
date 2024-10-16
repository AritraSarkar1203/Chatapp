import express from 'express';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3500;
const app = express();

app.use(express.static(path.join(__dirname, 'public')));

const expressServer = app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});

const io = new Server(expressServer, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:5500', 'http://127.0.0.1:5500'],
    },
});

// State for users and rooms
const UsersState = {
    users: [],
    setUsers(newUsersArray) {
        this.users = newUsersArray;
    },
};

const RoomMessages = {
    rooms: {},
    addMessage(room, message) {
        if (!this.rooms[room]) {
            this.rooms[room] = [];
        }
        this.rooms[room].push(message);
    },
    getMessages(room) {
        return this.rooms[room] || [];
    }
};

// Handle user connections
io.on('connection', (socket) => {
    console.log(`User ${socket.id} connected`);

    // Send a welcome message to the connected user
    socket.emit('message', buildMsg('Admin', 'Welcome to the Chat App!'));

    socket.on('enterRoom', ({ name, room }) => {
        const prevRoom = getUser(socket.id)?.room;

        // Handle user leaving the previous room
        if (prevRoom) {
            socket.leave(prevRoom);
            io.to(prevRoom).emit('message', buildMsg('Admin', `${name} has left the room`));
            io.to(prevRoom).emit('userList', { users: getUsersInRoom(prevRoom) });
        }

        const user = activateUser(socket.id, name, room);
        socket.join(user.room);

        // Notify user and room of the new connection
        socket.emit('message', buildMsg('Admin', `You have joined the ${user.room} chat room`));
        socket.broadcast.to(user.room).emit('message', buildMsg('Admin', `${user.name} has joined the room`));

        // Broadcast updated user list to the room
        io.to(user.room).emit('userList', { users: getUsersInRoom(user.room) });

        // Broadcast room list to all users
        io.emit('roomList', { rooms: getAllActiveRooms() });

        // Send previous messages in the room to the newly joined user
        socket.emit('previousMessages', RoomMessages.getMessages(user.room));

        // Broadcast all user IDs to everyone (for user ID tracking)
        io.emit('allUserIds', { users: getAllUserIds() });
    });

    socket.on('message', ({ name, text }) => {
        const room = getUser(socket.id)?.room;
        if (room) {
            const newMessage = buildMsg(name, text);
            
            // Store the message in the room's history
            RoomMessages.addMessage(room, newMessage);

            // Broadcast the message to all users in the room
            io.to(room).emit('message', newMessage);
        }
    });

    socket.on('activity', (name) => {
        const room = getUser(socket.id)?.room;
        if (room) {
            socket.broadcast.to(room).emit('activity', name);
        }
    });

    socket.on('disconnect', () => {
        const user = getUser(socket.id);
        userLeavesApp(socket.id);

        if (user) {
            io.to(user.room).emit('message', buildMsg('Admin', `${user.name} has left the room`));
            io.to(user.room).emit('userList', { users: getUsersInRoom(user.room) });
            io.emit('roomList', { rooms: getAllActiveRooms() });

            // Broadcast updated user ID list to everyone
            io.emit('allUserIds', { users: getAllUserIds() });
        }

        console.log(`User ${socket.id} disconnected`);
    });
});

// Utility function to build a message object
function buildMsg(name, text) {
    return {
        name,
        text,
        time: new Intl.DateTimeFormat('default', {
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
        }).format(new Date()),
    };
}

// User management functions
function activateUser(id, name, room) {
    const user = { id, name, room };
    UsersState.setUsers([...UsersState.users.filter((user) => user.id !== id), user]);
    return user;
}

function userLeavesApp(id) {
    UsersState.setUsers(UsersState.users.filter((user) => user.id !== id));
}

function getUser(id) {
    return UsersState.users.find((user) => user.id === id);
}

function getUsersInRoom(room) {
    return UsersState.users.filter((user) => user.room === room);
}

function getAllActiveRooms() {
    return Array.from(new Set(UsersState.users.map((user) => user.room)));
}

// Function to get all active user IDs
function getAllUserIds() {
    return UsersState.users.map((user) => user.id); // Broadcast only the user IDs
}
