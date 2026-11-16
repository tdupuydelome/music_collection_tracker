require('dotenv').config();
const express = require('express');
const cors = require('cors');
const inventoryRoutes = require('./routes/inventory');
const profileRoutes = require('./routes/profile');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/inventory', inventoryRoutes);
app.use('/api/profile', profileRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Vinyl API server running on port ${PORT}`);
});