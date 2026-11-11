const express = require('express');
const bookController = require('../controllers/bookController');

const router = express.Router();

router.route('/')
  .post(bookController.createBook)
  .get(bookController.getBooks);

router.route('/:id')
  .get(bookController.getBook)
  .put(bookController.updateBook)
  .delete(bookController.deleteBook);

module.exports = router;