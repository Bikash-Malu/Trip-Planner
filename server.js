/**
 * Trip Planner - Node.js Express Backend Server
 * 
 * Features:
 * - Serves static frontend files from /public directory
 * - Dynamic REST API endpoints for Trips & Payment Management
 * - Persists all data directly to data/data.json on disk
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Dynamic Data File Path (Local vs Vercel Serverless /tmp)
function getDataFilePath() {
  const localPath = path.join(__dirname, 'data', 'data.json');
  if (process.env.VERCEL) {
    const tmpPath = path.join('/tmp', 'data.json');
    if (!fs.existsSync(tmpPath) && fs.existsSync(localPath)) {
      try {
        fs.copyFileSync(localPath, tmpPath);
      } catch (err) {
        console.error('Failed to seed /tmp/data.json:', err);
      }
    }
    return fs.existsSync(tmpPath) ? tmpPath : localPath;
  }
  return localPath;
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Helper: Read JSON Data File
function readDataFile() {
  const filePath = getDataFilePath();
  try {
    if (!fs.existsSync(filePath)) {
      const defaultData = {
        users: [
          { id: 1, name: "Bikash (Admin)", username: "bikash", password: "Bikash@123", role: "admin" },
          { id: 2, name: "Viewer User", username: "viewer", password: "", role: "viewer" }
        ],
        trips: []
      };
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf8');
      return defaultData;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading data.json:', err);
    return { users: [], trips: [] };
  }
}

// Helper: Write JSON Data File
function writeDataFile(data) {
  const filePath = getDataFilePath();
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`[${new Date().toLocaleTimeString()}] Updated data.json at ${filePath}`);
    return true;
  } catch (err) {
    console.error('Error writing to data.json:', err);
    return false;
  }
}

// --- REST API ROUTES ---

// GET /api/data - Full data payload
app.get('/api/data', (req, res) => {
  const data = readDataFile();
  res.json(data);
});

// POST /api/login - Admin Login Authentication
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const data = readDataFile();
  
  const user = data.users.find(
    u => u.username.toLowerCase() === (username || '').trim().toLowerCase() && u.password === password && u.role === 'admin'
  );

  if (user) {
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role
      }
    });
  } else {
    res.status(401).json({ success: false, message: 'Invalid admin username or password.' });
  }
});

// GET /api/trips - List all trips
app.get('/api/trips', (req, res) => {
  const data = readDataFile();
  res.json(data.trips || []);
});

// GET /api/trips/:id - Get single trip details
app.get('/api/trips/:id', (req, res) => {
  const data = readDataFile();
  const tripId = parseInt(req.params.id, 10);
  const trip = (data.trips || []).find(t => t.id === tripId || t.id === req.params.id);

  if (trip) {
    res.json(trip);
  } else {
    res.status(404).json({ error: 'Trip not found' });
  }
});

// POST /api/trips - Create a new trip
app.post('/api/trips', (req, res) => {
  const newTrip = req.body;
  const data = readDataFile();
  data.trips = data.trips || [];

  const maxId = data.trips.reduce((max, t) => Math.max(max, parseInt(t.id, 10) || 0), 0);
  newTrip.id = maxId + 1;

  data.trips.push(newTrip);
  if (writeDataFile(data)) {
    res.status(201).json({ success: true, trip: newTrip });
  } else {
    res.status(500).json({ success: false, error: 'Failed to write to data.json' });
  }
});

// PUT /api/trips/:id - Update an existing trip
app.put('/api/trips/:id', (req, res) => {
  const tripId = parseInt(req.params.id, 10);
  const updatedFields = req.body;
  const data = readDataFile();
  data.trips = data.trips || [];

  const index = data.trips.findIndex(t => t.id === tripId || t.id === req.params.id);
  if (index !== -1) {
    data.trips[index] = { ...data.trips[index], ...updatedFields, id: tripId };
    if (writeDataFile(data)) {
      res.json({ success: true, trip: data.trips[index] });
    } else {
      res.status(500).json({ success: false, error: 'Failed to write to data.json' });
    }
  } else {
    res.status(404).json({ error: 'Trip not found' });
  }
});

// DELETE /api/trips/:id - Delete a trip
app.delete('/api/trips/:id', (req, res) => {
  const tripId = parseInt(req.params.id, 10);
  const data = readDataFile();

  data.trips = (data.trips || []).filter(t => t.id !== tripId && t.id !== req.params.id);
  if (writeDataFile(data)) {
    res.json({ success: true, message: 'Trip deleted successfully' });
  } else {
    res.status(500).json({ success: false, error: 'Failed to update data.json' });
  }
});

// POST /api/trips/:id/payments - Update payment for a specific participant
app.post('/api/trips/:id/payments', (req, res) => {
  const tripId = parseInt(req.params.id, 10);
  const { personId, paid } = req.body;
  const data = readDataFile();

  const trip = (data.trips || []).find(t => t.id === tripId || t.id === req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  const person = (trip.people || []).find(p => p.id === parseInt(personId, 10) || p.id === String(personId));
  if (!person) return res.status(404).json({ error: 'Person not found' });

  person.paid = Math.max(0, parseFloat(paid) || 0);

  if (writeDataFile(data)) {
    res.json({ success: true, trip });
  } else {
    res.status(500).json({ success: false, error: 'Failed to write to data.json' });
  }
});

// POST /api/trips/:id/reset-payments - Reset all payments for a trip to 0
app.post('/api/trips/:id/reset-payments', (req, res) => {
  const tripId = parseInt(req.params.id, 10);
  const data = readDataFile();

  const trip = (data.trips || []).find(t => t.id === tripId || t.id === req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  (trip.people || []).forEach(p => p.paid = 0);

  if (writeDataFile(data)) {
    res.json({ success: true, trip });
  } else {
    res.status(500).json({ success: false, error: 'Failed to write to data.json' });
  }
});

// Catch-all route to serve public/index.html for client side routing if needed
app.get('*', (req, res) => {
  const requestedPath = path.join(__dirname, 'public', req.path);
  if (fs.existsSync(requestedPath) && fs.statSync(requestedPath).isFile()) {
    return res.sendFile(requestedPath);
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(` ✈️  Trip Planner Node.js Server running on http://localhost:${PORT}`);
    console.log(`==================================================`);
  });
}

module.exports = app;
