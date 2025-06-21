const express = require('express');
const router = express.Router();
const db = require('../models/db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT wr.*, d.name AS dog_name, d.size, u.username AS owner_name
      FROM WalkRequests wr
      JOIN Dogs d ON wr.dog_id = d.dog_id
      JOIN Users u ON d.owner_id = u.user_id
      WHERE wr.status = 'open'
    `);
    res.json(rows);
  } catch (error) {
    console.error('SQL Error:', error);
    res.status(500).json({ error: 'Failed to fetch walk requests' });
  }
});

router.post('/', async (req, res) => {
  const { dog_id, requested_time, duration_minutes, location } = req.body;

  try {
    const [result] = await db.query(`
      INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location)
      VALUES (?, ?, ?, ?)
    `, [dog_id, requested_time, duration_minutes, location]);

    res.status(201).json({ message: 'Walk request created', request_id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create walk request' });
  }
});

router.post('/:id/apply', async (req, res) => {
  const requestId = req.params.id;
  const { walker_id } = req.body;

  try {
    await db.query(`
      INSERT INTO WalkApplications (request_id, walker_id)
      VALUES (?, ?)
    `, [requestId, walker_id]);

    await db.query(`
      UPDATE WalkRequests
      SET status = 'accepted'
      WHERE request_id = ?
    `, [requestId]);

    res.status(201).json({ message: 'Application submitted' });
  } catch (error) {
    console.error('SQL Error:', error);
    res.status(500).json({ error: 'Failed to apply for walk' });
  }
});

router.post('/apply', async (req, res) => {
    try {
        const { walkId, walkerId } = req.body;

        if (!req.session.userId || req.session.userId !== walkerId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const [walk] = await pool.query(
            'SELECT * FROM walks WHERE id = ?',
            [walkId]
        );

        if (!walk || walk.length === 0) {
            return res.status(404).json({ error: 'Walk not found' });
        }

        const [existingApplication] = await pool.query(
            'SELECT * FROM walk_applications WHERE walk_id = ? AND walker_id = ?',
            [walkId, walkerId]
        );

        if (existingApplication && existingApplication.length > 0) {
            return res.status(400).json({ error: 'Already applied to this walk' });
        }

        await pool.query(
            'INSERT INTO walk_applications (walk_id, walker_id, status, applied_at) VALUES (?, ?, ?, NOW())',
            [walkId, walkerId, 'pending']
        );

        res.status(201).json({ message: 'Successfully applied for walk' });
    } catch (error) {
        console.error('Error applying for walk:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
