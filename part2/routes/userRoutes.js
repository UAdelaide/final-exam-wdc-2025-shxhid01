const express = require('express');
const router = express.Router();
const db = require('../models/db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT user_id, username, email, role FROM Users');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/me', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const [user] = await pool.query(
            'SELECT id, username, email FROM users WHERE id = ?',
            [req.session.userId]
        );

        if (!user || user.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user[0]);
    } catch (error) {
        console.error('Error fetching current user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt:', { username, password }); // Debug log

  try {
    const [userRows] = await db.query(
      'SELECT user_id, username, password_hash, role FROM Users WHERE username = ?',
      [username]
    );
    console.log('User lookup by username:', userRows);

    const [rows] = await db.query(`
      SELECT user_id, username, role FROM Users
      WHERE username = ? AND password_hash = ?
    `, [username, password]);
    console.log('DB rows (username + password):', rows); // Debug log

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.user = rows[0];

    res.json({ message: 'Login successful', user: rows[0] });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out' });
  });
});

module.exports = router;
