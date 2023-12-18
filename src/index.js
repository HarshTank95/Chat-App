const express = require("express");
const http = require("http");
const path = require("path");
const { emit } = require("process");
const socketio = require("socket.io");
const Filter = require("bad-words");
const { generateMsg, generateLocationMsg } = require("./utils/messages");
const { addUser, removeUser, getUser, getUsersInRoom } = require("./utils/users");

const app = express();
const server = http.createServer(app);

const io = socketio(server);

const publicDirPath = path.join(__dirname, "./../public");

app.use(express.static(publicDirPath));

io.on("connection", (socket) => {
  // socket.emit("message", generateMsg("Welcome...!"));
  // socket.broadcast.emit("message", generateMsg("A new user has joined"));

  socket.on("join", (options, callback) => {
    const { error, user } = addUser({ id: socket.id, ...options });

    if (error) {
      return callback(error);
    }

    socket.join(user.room);

    socket.emit("message", generateMsg("Admin", "Welcome...!"));
    socket.broadcast.to(user.room).emit("message", generateMsg("Admin", `${user.username} has joined !`));

    io.to(user.room).emit("roomdata", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });
    callback();
  });

  socket.on("receive", (msg, callback) => {
    const filter = new Filter();
    if (filter.isProfane(msg)) {
      return callback("Please dont");
    }

    const user = getUser(socket.id);
    io.to(user.room).emit("message", generateMsg(user.username, msg));
    callback();
  });

  socket.on("sendLocation", (location, callbk) => {
    const user = getUser(socket.id);
    io.to(user.room).emit("livelocation", generateLocationMsg(user.username, `https://google.com/maps?q=${location.lat},${location.long}`));
    callbk();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);
    if (user) {
      io.to(user.room).emit("message", generateMsg("Admin", `${user.username} has left the chat`));
      io.to(user.room).emit("message", generateMsg("Admin", `${user.username} has left the chat`));
      io.to(user.room).emit("roomdata", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

server.listen(3000, () => {
  console.log("server is runing running on 3000");
});

// socket.emit (specific client), io.emit (to all), socket.broadcast.emit (to all except sender)
// io.to(room).emit (to all inside room),io.broadcast.to(room).emit (to all inside room except sender)
