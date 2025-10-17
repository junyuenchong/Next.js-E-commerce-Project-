"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
// server.ts
var http_1 = require("http");
var socket_io_1 = require("socket.io");
var httpServer = (0, http_1.createServer)();
var io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "http://localhost:3000", // frontend origin
        methods: ["GET", "POST"],
    },
});
exports.io = io;
io.on("connection", function (socket) {
    console.log("🟢 Client connected");
    socket.on("disconnect", function () {
        console.log("🔴 Client disconnected");
    });
});
httpServer.listen(4000, function () {
    console.log("🚀 WebSocket server running on http://localhost:4000");
});
