const express = require('express');
const authorController = require('../controllers/authorController');
const bookController = require('../controllers/bookController');

const router = express.Router();

router.route('/')
  .post(authorController.createAuthor)
  .get(authorController.getAuthors);

router.route('/:id')
  .get(authorController.getAuthor)
  .put(authorController.updateAuthor)
  .delete(authorController.deleteAuthor);

// Linking endpoint
router.get('/:id/books', bookController.getBooksByAuthor);

module.exports = router;