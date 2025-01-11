require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const issueRoutes = require('./routes/issueRoutes');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// Routes
app.use('/', (req, res) => res.send('Welcome to the Issue Tracker API'));
app.use('/auth', authRoutes);
app.use('/issues', issueRoutes);

// Connect to DB and Start Server
connectDB();
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
