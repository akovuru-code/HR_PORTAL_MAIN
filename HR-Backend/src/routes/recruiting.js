const express = require('express');
const router = express.Router();

const authenticateToken = require('../middleware/auth');
const Recruiting = require('../models/recruiting');


// GET all candidates
router.get('/', authenticateToken, async (req, res) => {
    try {

        const candidates = await Recruiting.findAll({
            order: [['createdAt', 'DESC']]
        });

        res.json({
            candidates
        });

    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
});


// CREATE candidate
router.post('/', authenticateToken, async (req, res) => {
    try {

        const candidate = await Recruiting.create({
            ...req.body,
            createdBy: req.user.email
        });


        res.json({
            candidate
        });

    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
});


// UPDATE candidate
router.patch('/:id', authenticateToken, async (req, res) => {
    try {

        const candidate = await Recruiting.findByPk(req.params.id);

        if (!candidate) {
            return res.status(404).json({
                error: 'Candidate not found'
            });
        }


        await candidate.update({
            ...req.body,
            updatedBy: req.user.email
        });


        res.json({
            candidate
        });


    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
});


// DELETE candidate
router.delete('/:id', authenticateToken, async (req, res) => {
    try {

        const candidate = await Recruiting.findByPk(req.params.id);

        if (!candidate) {
            return res.status(404).json({
                error: 'Candidate not found'
            });
        }

        await candidate.destroy();

        res.json({
            success: true
        });
    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
});


module.exports = router;