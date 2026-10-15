const express = require('express');
const postRoutes = require('./routes/postRoutes');
const { resetData } = require('./data/postStore');
const controller = require('./controllers/postController');

function createApp() {
  const app = express();

  app.use(express.json());

  // Resource-oriented public API
  app.use('/posts', postRoutes);

  app.get('/test-error', controller.explode);

  // Standardized response for unknown routes
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        message: 'Route not found'
      }
    });
  });

  // Centralized error handling
  app.use((err, req, res, next) => {
    if (res.headersSent) {
      return next(err);
    }

    const errorStatus = err.statusCode || err.status;
    const statusCode =
      Number.isInteger(errorStatus) &&
      errorStatus >= 400 &&
      errorStatus <= 599
        ? errorStatus
        : 500;

    res.status(statusCode).json({
      success: false,
      error: {
        message: statusCode >= 500 ? 'Internal server error' : err.message || 'Request failed'
      }
    });
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  const port = 3000;

  app.listen(port, () => {
    console.log(`Starter API listening on port ${port}`);
  });
}

module.exports = {
  createApp,
  resetData
};