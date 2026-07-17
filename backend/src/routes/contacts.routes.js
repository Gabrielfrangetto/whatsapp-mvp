const express = require('express');
const { updateContact } = require('../controllers/contacts.controller');
const router = express.Router();
router.patch('/:id', updateContact);
module.exports = router;
