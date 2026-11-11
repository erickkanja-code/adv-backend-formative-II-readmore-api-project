const Book = require('../models/Book');
const Author = require('../models/Author');
const { pick, notFound } = require('../utils/helpers');

const BOOK_FIELDS = ['title', 'genre', 'price', 'publishedYear', 'author'];
const AUTHOR_DETAILS = 'name country bio';

// POST /books
exports.createBook = async (req, res) => {
  const book = await Book.create(pick(req.body, BOOK_FIELDS));
  await book.populate('author', AUTHOR_DETAILS);
  res.status(201).json(book);
};

// GET /books
exports.getBooks = async (req, res) => {
  const books = await Book.find().populate('author', AUTHOR_DETAILS);
  res.json(books);
};

// GET /books/:id
exports.getBook = async (req, res) => {
  const book = await Book.findById(req.params.id).populate('author', AUTHOR_DETAILS);
  if (!book) return notFound(res, 'book', req.params.id);
  res.json(book);
};

// PUT /books/:id
exports.updateBook = async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book) return notFound(res, 'book', req.params.id);

  book.set(pick(req.body, BOOK_FIELDS));
  await book.save();
  await book.populate('author', AUTHOR_DETAILS);
  res.json(book);
};

// DELETE /books/:id
exports.deleteBook = async (req, res) => {
  const book = await Book.findByIdAndDelete(req.params.id);
  if (!book) return notFound(res, 'book', req.params.id);
  res.json({ message: `Book "${book.title}" deleted`, book });
};

// GET /authors/:id/books
exports.getBooksByAuthor = async (req, res) => {
  const author = await Author.findById(req.params.id);
  if (!author) return notFound(res, 'author', req.params.id);

  const books = await Book.find({ author: author._id }).sort({ publishedYear: 1 });
  res.json({ author: author.name, count: books.length, books });
};