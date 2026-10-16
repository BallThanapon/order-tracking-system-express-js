const express = require('express');
const orderRoutes = require('./orders/order.routes');
const { errorHandler } = require('./errors');
const slipcheckRoutes = require('./slipcheck/slip.routes')
const app = express();

app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Idempotency-Key');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

// app.use(orderRoutes);
app.use(orderRoutes);   
app.use('/slip',slipcheckRoutes);

app.use((req, res) => {
  res.status(404).json({
    code: 'ROUTE_NOT_FOUND',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

app.use(errorHandler);

module.exports = app;
