require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');

const { testConnection } = require('./db');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const staffRoutes = require('./routes/staff.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Security and basic middleware
app.use(helmet({
    contentSecurityPolicy: false
}));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Limit repeated requests
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: {
        success: false,
        message: 'Too many requests. Please try again later.'
    }
});

app.use('/api', limiter);

// Serve frontend files
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Brightloop Software API is running!'
    });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
async function startServer() {
    const connected = await testConnection();

    if (!connected) {
        console.error('Server startup stopped: Database connection failed.');
        process.exit(1);
    }

    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}

startServer();