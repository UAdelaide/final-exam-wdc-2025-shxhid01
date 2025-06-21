const express = require('express');
const router = express.Router();
const db = require('../db');

// GET owner dashboard
router.get('/dashboard', async (req, res) => {
    const ownerId = req.session.ownerId; // assumes session stores logged-in owner's id
    const [dogs] = await db.query('SELECT dog_id, name FROM dogs WHERE owner_id = ?', [ownerId]);

    res.render('ownerDashboard', {
        dogs: dogs,
    });
});

module.exports = router;