const express = require('express');
const Issue = require('../models/Issue');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const router = express.Router();

// Raise an Issue (Citizen)
router.post('/raise', authenticate, authorize(['citizen']), async (req, res) => {
  const { title, description } = req.body;

  try {
    const newIssue = new Issue({ title, description, raisedBy: req.user.id });
    await newIssue.save();
    res.status(201).json({ message: 'Issue raised successfully', issue: newIssue });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign an Issue to Authority
router.put('/assign/:id', authenticate, authorize(['authority']), async (req, res) => {
  const { id } = req.params;

  try {
    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    issue.assignedTo = req.user.id;
    issue.status = 'in-progress';
    await issue.save();

    res.status(200).json({ message: 'Issue assigned successfully', issue });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Resolve an Issue
router.put('/resolve/:id', authenticate, authorize(['authority']), async (req, res) => {
  const { id } = req.params;

  try {
    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    if (issue.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to resolve this issue' });
    }

    issue.status = 'resolved';
    issue.resolvedAt = Date.now();
    await issue.save();

    res.status(200).json({ message: 'Issue resolved successfully', issue });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
