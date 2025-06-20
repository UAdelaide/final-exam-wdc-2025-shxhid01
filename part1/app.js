const express = require('express');
const mysql = require('mysql2/promise');
const app = express();
const PORT = process.env.PORT || 3000;

const dbConfig = {
  user: 'root',
  password: 'password', 
  database: 'DogWalkService'
};

const pool = mysql.createPool(dbConfig);

app.use(express.json());

async function initializeSampleData() {
  try {
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
      (3, 5, 'Rocky', 'large')
    `);
    
    await connection.execute(`
      INSERT IGNORE INTO WalkRequests (request_id, dog_id, requested_time, duration_minutes, location, status) VALUES
      (1, 1, '2025-06-10 08:00:00', 30, 'Parklands', 'open'),
      (2, 2, '2025-06-11 10:00:00', 45, 'City Park', 'completed'),
      (3, 3, '2025-06-12 14:00:00', 60, 'Beach Walk', 'open')
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
    console.log('Sample data initialized successfully');
  } catch (error) {
    console.error('Error initializing sample data:', error);
  }
}

app.get('/', (req, res) => {
  res.send('Dog Walk Service API is running.');
});

app.get('/api/dogs', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        d.name as dog_name,
        d.size,
        u.username as owner_username
      FROM Dogs d
      JOIN Users u ON d.owner_id = u.user_id
      ORDER BY d.name
    `);
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching dogs:', error);
    res.status(500).json({ error: 'Failed to fetch dogs' });
  }
});

app.get('/api/walkrequests/open', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        wr.request_id,
        d.name as dog_name,
        wr.requested_time,
        wr.duration_minutes,
        wr.location,
        u.username as owner_username
      FROM WalkRequests wr
      JOIN Dogs d ON wr.dog_id = d.dog_id
      JOIN Users u ON d.owner_id = u.user_id
      WHERE wr.status = 'open'
      ORDER BY wr.requested_time
    `);
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching open walk requests:', error);
    res.status(500).json({ error: 'Failed to fetch open walk requests' });
  }
});

app.get('/api/walkers/summary', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        u.username as walker_username,
        COALESCE(rating_stats.total_ratings, 0) as total_ratings,
        rating_stats.average_rating,
        COALESCE(completed_stats.completed_walks, 0) as completed_walks
      FROM Users u
      LEFT JOIN (
        SELECT 
          walker_id,
          COUNT(*) as total_ratings,
          ROUND(AVG(rating), 1) as average_rating
        FROM WalkRatings
        GROUP BY walker_id
      ) rating_stats ON u.user_id = rating_stats.walker_id
      LEFT JOIN (
        SELECT 
          wa.walker_id,
          COUNT(*) as completed_walks
        FROM WalkApplications wa
        JOIN WalkRequests wr ON wa.request_id = wr.request_id
        WHERE wr.status = 'completed' AND wa.status = 'accepted'
        GROUP BY wa.walker_id
      ) completed_stats ON u.user_id = completed_stats.walker_id
      WHERE u.role = 'walker'
      ORDER BY u.username
    `);
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching walker summary:', error);
    res.status(500).json({ error: 'Failed to fetch walker summary' });
  }
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await initializeSampleData();
});

module.exports = app;