require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const app = express();

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
app.use(cors());


mongoose.set('strictQuery', false);
// mongoose.connect('mongodb://localhost/playground')
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

    socket.on('createCanvas', async ({ title, canvasData }) => {
        console.log('createCanvas');

        try {
            const board = new Board({ title, content: canvasData });
            await board.save();
        } catch (error) {
            console.error('Error saving canvas to MongoDB:', error);
        }

        socket.broadcast.emit('createCanvas', { title, canvasData });
    });

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

app.get('/', async (req, res) => {
    try {
        const boards = await Board.find();
        res.json(boards);
    } catch (error) {
        console.error('Error fetching boards from MongoDB:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.delete('/delete-canvas/:title', async (req, res) => {
    const { title } = req.params;
    try {
        const deletedCanvas = await Board.findOneAndDelete({ title });
        if (!deletedCanvas) {
            return res.status(404).json({ message: 'Canvas not found' });
        }
        console.log(`Canvas "${title}" deleted successfully`);
        res.sendStatus(204); // No content response
    } catch (error) {
        console.error('Error deleting canvas:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
