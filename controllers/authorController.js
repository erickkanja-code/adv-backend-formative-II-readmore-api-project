const Author = require('../models/Author');
const { pick, notFound } = require('../utils/helpers');

const AUTHOR_FIELDS = ['name', 'country', 'bio'];

// POST /authors
exports.createAuthor = async (req, res) => {
  const author = await Author.create(pick(req.body, AUTHOR_FIELDS));
  res.status(201).json(author);
};

// GET /authors
exports.getAuthors = async (req, res) => {
  const authors = await Author.find().sort({ name: 1 });
  res.json(authors);
};

// GET /authors/:id
exports.getAuthor = async (req, res) => {
  const author = await Author.findById(req.params.id);
  if (!author) return notFound(res, 'author', req.params.id);
  res.json(author);
};

// PUT /authors/:id
exports.updateAuthor = async (req, res) => {
  const author = await Author.findById(req.params.id);
  if (!author) return notFound(res, 'author', req.params.id);

  author.set(pick(req.body, AUTHOR_FIELDS));
  await author.save(); // runs schema validation
  res.json(author);
};

// DELETE /authors/:id
exports.deleteAuthor = async (req, res) => {
  const author = await Author.findByIdAndDelete(req.params.id);
  if (!author) return notFound(res, 'author', req.params.id);
  res.json({ message: `Author "${author.name}" deleted`, author });
};