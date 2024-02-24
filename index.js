const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { error } = require('console');
const app = express();

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
app.use(cors());


mongoose.set('strictQuery', false);
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('Connected to MongoDB...');
    })
    .catch((error) => {
        console.error('could not connect to MongoDB...', error);
    });

const boardsSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Board = mongoose.model('Boards', boardsSchema);

const io = socketIo(server, {
    cors: {
        origin: "*"
    }
});

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('canvasImage', async (data) => {
        console.log('canvasImage');

        try {
            const board = new Board({ title: 'Canvas Image', content: data });
            await board.save();
        } catch (error) {
            console.error('Error saving canvas image to MongoDB:', error);
        }

        socket.broadcast.emit('canvasImage', data);
    });

    socket.on('clearCanvas', () => {
        console.log('clearCanvas');
        socket.broadcast.emit('clearCanvas');
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

app.get('/page/:title', async (req, res) => {
    const { title } = req.params;
    try {
        const board = await Board.findOne({ title });
        if (!board) {
            return res.status(404).json({ message: 'Page not found' });
        }
        res.json({ title: board.title, content: board.content });
    } catch (error) {
        console.error('Error fetching page from MongoDB:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/boards', async (req, res) => {
    try {
        const boards = await Board.find();
        res.json(boards);
    } catch (error) {
        console.error('Error fetching boards from MongoDB:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

createBoard();
