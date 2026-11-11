const express = require('express');
const authorController = require('../controllers/authorController');

const router = express.Router();

router.route('/')
  .post(authorController.createAuthor)
  .get(authorController.getAuthors);

router.route('/:id')
  .get(authorController.getAuthor)
  .put(authorController.updateAuthor)
  .delete(authorController.deleteAuthor);

module.exports = router;