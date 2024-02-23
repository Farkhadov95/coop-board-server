const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const app = express();

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

app.use(cors());

const io = socketIo(server, {
    cors: {
        origin: "*"
    }
});

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('canvasImage', (data) => {
        socket.broadcast.emit('canvasImage', data);
    });

    socket.on('clearCanvas', () => {
        io.emit('clearCanvas');
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

app.get('/test', (req, res) => { res.send('Hello from server!'); });


server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
