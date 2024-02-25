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

    socket.on('getAllBoards', async () => {
        console.log('getAllBoards');
        try {
            const boards = await Board.find();
            socket.emit('allBoards', boards);
        } catch (error) {
            console.error('Error fetching boards from MongoDB:', error);
            socket.emit('error', 'Internal server error');
        }
    });

    socket.on('getCanvasById', async ({ boardId }) => {
        console.log(`getCanvasById for board with ID "${boardId}"`);
        try {
            const board = await Board.findById(boardId);
            if (!board) {
                console.log(`Board with ID "${boardId}" not found.`);
                socket.emit('canvasNotFound');
                return;
            }
            socket.emit('canvasData', board);
        } catch (error) {
            console.error('Error fetching canvas from MongoDB:', error);
            socket.emit('error', 'Internal server error');
        }
    });

    socket.on('createCanvas', async ({ title }) => {
        console.log('createCanvas');
        try {
            const existingBoard = await Board.findOne({ title });
            if (existingBoard) {
                console.log(`Board with title "${title}" already exists.`);
                return;
            }

            const newBoard = new Board({ _id: new mongoose.Types.ObjectId(), title });
            await newBoard.save();

            console.log(`New board "${title}" created successfully.`);
            const createdBoard = await Board.findOne({ title });
            console.log(createdBoard);

            socket.broadcast.emit('newCanvas', createdBoard);
        } catch (error) {
            console.error('Error saving canvas to MongoDB:', error);
        }

        socket.broadcast.emit('createCanvas', { title });
    });

    socket.on('canvasImage', async ({ boardId, data }) => {
        console.log('canvasImage');

        try {
            const board = await Board.findById(boardId);
            if (!board) {
                console.log(`Board with ID "${boardId}" not found.`);
                return;
            }
            board.content = data;
            await board.save();
            console.log(`Board with ID "${boardId}" updated with new canvas data.`);
        } catch (error) {
            console.error('Error updating canvas image in MongoDB:', error);
        }

        socket.broadcast.emit('canvasImage', { boardId, data });
    });

    socket.on('clearCanvas', async ({ boardId }) => {
        console.log(`clearCanvas for board with ID "${boardId}"`);
        try {
            const board = await Board.findById(boardId);
            if (!board) {
                console.log(`Board with ID "${boardId}" not found.`);
                return;
            }
            board.content = '';
            await board.save();
            console.log(`Board with ID "${boardId}" canvas cleared.`);
        } catch (error) {
            console.error('Error clearing canvas in MongoDB:', error);
        }

        socket.broadcast.emit('clearCanvas', boardId);
    });

    socket.on('deleteCanvas', async ({ boardId }) => {
        try {
            const deletedCanvas = await Board.findByIdAndDelete(boardId);
            if (!deletedCanvas) {
                console.log(`Canvas with ID "${boardId}" not found.`);
                return;
            }
            console.log(`Canvas with ID "${boardId}" deleted successfully`);
            socket.emit('canvasDeleted', boardId);
        } catch (error) {
            console.error('Error deleting canvas:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
