const socket = io('ws://localhost:3500');

const msgInput = document.querySelector('#message');
const nameInput = document.querySelector('#name');
const chatRoom = document.querySelector('#room');
const activity = document.querySelector('.activity');
const usersList = document.querySelector('.user-list');
const roomList = document.querySelector('.room-list');
const chatDisplay = document.querySelector('.chat-display');

// Send message when the form is submitted
function sendMessage(e) {
  e.preventDefault();
  if (nameInput.value && msgInput.value && chatRoom.value) {
    socket.emit('message', {
      name: nameInput.value,
      text: msgInput.value,
    });
    msgInput.value = '';  // Clear the input field after sending
  }
  msgInput.focus();
}

// Join a room when the user submits their name and room
function enterRoom(e) {
  e.preventDefault();
  if (nameInput.value && chatRoom.value) {
    socket.emit('enterRoom', {
      name: nameInput.value,
      room: chatRoom.value,
    });
  }
}

document.querySelector('.form-msg').addEventListener('submit', sendMessage);
document.querySelector('.form-join').addEventListener('submit', enterRoom);

// Listen for incoming messages
socket.on('message', (data) => {
  activity.textContent = '';  // Clear typing activity
  const { name, text, time } = data;
  const li = document.createElement('li');
  
  // Differentiate between user messages
  if (name === nameInput.value) {
    li.className = 'post post--left';  // User's own message
  } else {
    li.className = 'post post--right';  // Other users' messages
  }

  // Create the message structure
  li.innerHTML = `<div class="post__header ${name === nameInput.value ? 'post__header--user' : 'post__header--reply'}">
                    <span class="post__header--name">${name}</span> 
                    <span class="post__header--time">${time}</span> 
                  </div>
                  <div class="post__text">${text}</div>`;

  chatDisplay.appendChild(li);  // Add message to chat
  chatDisplay.scrollTop = chatDisplay.scrollHeight;  // Auto-scroll to the newest message
});

// Handle typing activity
let activityTimer;
socket.on('activity', (name) => {
  activity.textContent = `${name} is typing...`;  // Show who is typing

  // Clear the typing indicator after 3 seconds
  clearTimeout(activityTimer);
  activityTimer = setTimeout(() => {
    activity.textContent = '';
  }, 3000);
});

// Update the user list when room changes
socket.on('userList', ({ users }) => {
  showUsers(users);
});

// Update the list of rooms
socket.on('roomList', ({ rooms }) => {
  showRooms(rooms);
});

function showUsers(users) {
  usersList.textContent = '';  // Clear the list
  if (users) {
    usersList.innerHTML = `<em>Users in ${chatRoom.value}:</em>`;
    users.forEach((user, i) => {
      usersList.textContent += ` ${user.name}`;
      if (users.length > 1 && i !== users.length - 1) {
        usersList.textContent += ',';  // Add a comma between names
      }
    });
  }
}

function showRooms(rooms) {
  roomList.textContent = '';  // Clear the list
  if (rooms) {
    roomList.innerHTML = '<em>Active Rooms:</em>';
    rooms.forEach((room, i) => {
      roomList.textContent += ` ${room}`;
      if (rooms.length > 1 && i !== rooms.length - 1) {
        roomList.textContent += ',';  // Add a comma between room names
      }
    });
  }
}
