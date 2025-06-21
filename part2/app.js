const express = require('express');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '/public')));
app.use(session({
  secret: 'dogwalksecret',
  resave: false,
  saveUninitialized: false
}));

const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');

const mysql = require('mysql2/promise');
async function initializeSampleData() {
  try {
    const pool = require('./models/db');
    const connection = await pool.getConnection();

    await connection.execute(`
      INSERT IGNORE INTO Users (username, email, password_hash, role) VALUES
      ('alice123', 'alice@example.com', 'hashed_password_1', 'owner'),
      ('carol123', 'carol@example.com', 'hashed_password_2', 'owner'),
      ('bobwalker', 'bob@example.com', 'hashed_password_3', 'walker'),
      ('newwalker', 'newwalker@example.com', 'hashed_password_4', 'walker'),
      ('dave_owner', 'dave@example.com', 'hashed_password_5', 'owner')
    `);

    await connection.execute(`
      INSERT IGNORE INTO Dogs (dog_id, owner_id, name, size) VALUES
      (1, 1, 'Max', 'medium'),
      (2, 2, 'Bella', 'small'),
      (3, 5, 'Rocky', 'large'),
      (4, 1, 'Charlie', 'medium'),
      (5, 2, 'Lucy', 'small'),
      (6, 5, 'Buddy', 'large'),
      (7, 1, 'Daisy', 'medium'),
      (8, 2, 'Molly', 'small')
    `);

    await connection.execute(`
      INSERT IGNORE INTO WalkRequests (request_id, dog_id, requested_time, duration_minutes, location, status) VALUES
      (1, 1, '2025-06-10 08:00:00', 30, 'Parklands', 'open'),
      (2, 2, '2025-06-11 10:00:00', 45, 'City Park', 'completed'),
      (3, 3, '2025-06-12 14:00:00', 60, 'Beach Walk', 'open'),
      (4, 4, '2025-06-13 09:00:00', 30, 'Downtown', 'open'),
      (5, 5, '2025-06-14 11:00:00', 45, 'River Side', 'completed'),
      (6, 6, '2025-06-15 16:00:00', 60, 'Forest Trail', 'open'),
      (7, 7, '2025-06-16 07:30:00', 30, 'Hillside', 'open'),
      (8, 8, '2025-06-17 12:00:00', 45, 'Lakeside', 'completed')
    `);

    await connection.execute(`
      INSERT IGNORE INTO WalkApplications (application_id, request_id, walker_id, status) VALUES
      (1, 2, 3, 'accepted')
    `);

    await connection.execute(`
      INSERT IGNORE INTO WalkRatings (rating_id, request_id, walker_id, owner_id, rating, comments) VALUES
      (1, 2, 3, 2, 4, 'Great walk!'),
      (2, 2, 3, 2, 5, 'Excellent service!')
    `);

    connection.release();
    console.log('Sample data initialized successfully (part2/app.js)');
  } catch (error) {
    console.error('Error initializing sample data (part2/app.js):', error);
  }
}
initializeSampleData();

app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);

const pool = require('./models/db');

app.get('/api/dogs', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        d.dog_id,
        d.name,
        d.size,
        d.owner_id
      FROM Dogs d
      ORDER BY d.name
    `);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching dogs:', error);
    res.status(500).json({ error: 'Failed to fetch dogs' });
  }
});

app.get('/api/owner/dogs', async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'owner') {
      return res.status(401).json({ error: 'Not authorized' });
    }
    const ownerId = req.session.user.user_id;
    const [rows] = await pool.query(
      'SELECT dog_id, name FROM Dogs WHERE owner_id = ? ORDER BY name',
      [ownerId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dogs' });
  }
});

module.exports = app;
