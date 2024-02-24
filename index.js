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
    _id: mongoose.Schema.Types.ObjectId,
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
            // Check if the board already exists with the given title
            const existingBoard = await Board.findOne({ title });
            if (existingBoard) {
                console.log(`Board with title "${title}" already exists.`);
                return;
            }

            // If the board doesn't exist, create a new one
            const newBoard = new Board({ title, content: canvasData });
            await newBoard.save();
            console.log(`New board "${title}" created successfully.`);
        } catch (error) {
            console.error('Error saving canvas to MongoDB:', error);
        }

        socket.broadcast.emit('createCanvas', { title, canvasData });
    });

    socket.on('canvasImage', async ({ boardId, data }) => {
        console.log('canvasImage');

        try {
            // Find the board with the specified ID
            const board = await Board.findById(boardId);

            if (!board) {
                console.log(`Board with ID "${boardId}" not found.`);
                return;
            }

            // Update the content of the found board with the new canvas data
            board.content = data;
            await board.save();
            console.log(`Board with ID "${boardId}" updated with new canvas data.`);
        } catch (error) {
            console.error('Error updating canvas image in MongoDB:', error);
        }

        socket.broadcast.emit('canvasImage', { boardId, data });
    });

    socket.on('clearCanvas', async (boardId) => {
        console.log(`clearCanvas for board with ID "${boardId}"`);

        try {
            // Find the board with the specified ID
            const board = await Board.findById(boardId);

            if (!board) {
                console.log(`Board with ID "${boardId}" not found.`);
                return;
            }

            // Clear the content of the found board
            board.content = '';
            await board.save();
            console.log(`Board with ID "${boardId}" canvas cleared.`);
        } catch (error) {
            console.error('Error clearing canvas in MongoDB:', error);
        }

        socket.broadcast.emit('clearCanvas', boardId);
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

app.delete('/delete-canvas/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const deletedCanvas = await Board.findByIdAndDelete(id);
        if (!deletedCanvas) {
            return res.status(404).json({ message: 'Canvas not found' });
        }
        console.log(`Canvas with ID "${id}" deleted successfully`);
        res.sendStatus(204); // No content response
    } catch (error) {
        console.error('Error deleting canvas:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
