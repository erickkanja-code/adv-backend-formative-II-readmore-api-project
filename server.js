require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');

const openapi = require('./docs/openapi');
const errorHandler = require('./middleware/errorHandler');
const authorRoutes = require('./routes/authorRoutes');
const bookRoutes = require('./routes/bookRoutes');

const app = express();
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the ReadMore API', status: 'ok', docs: '/api-docs' });
});

// API docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapi));

// Resources
app.use('/authors', authorRoutes);
app.use('/books', bookRoutes);

// Unknown routes
app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Central error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

async function start() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is missing. Add it to your .env file.');
    process.exit(1);
  }
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    console.log('Connected to MongoDB');
    // Only start listening once the DB connection succeeds
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
      console.log(`Swagger docs at  http://localhost:${PORT}/api-docs`);
    });
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }
}

start();