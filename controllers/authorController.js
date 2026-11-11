const Author = require('../models/Author');
const Book = require('../models/Book');
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
  await author.save();
  res.json(author);
};

// DELETE /authors/:id
// Rule 4 — Policy A: block the delete while the author still has books.
exports.deleteAuthor = async (req, res) => {
  const author = await Author.findById(req.params.id);
  if (!author) return notFound(res, 'author', req.params.id);

  const bookCount = await Book.countDocuments({ author: author._id });
  if (bookCount > 0) {
    return res.status(409).json({
      message: `Cannot delete "${author.name}": they still have ${bookCount} book(s). Delete or reassign those books first.`,
      bookCount,
      seeBooks: `/authors/${author._id}/books`,
    });
  }

  await author.deleteOne();
  res.json({ message: `Author "${author.name}" deleted`, author });
};

// GET /authors/:id/stats
// Rule 6 — summary computed from the author's books.
exports.getAuthorStats = async (req, res) => {
  const author = await Author.findById(req.params.id);
  if (!author) return notFound(res, 'author', req.params.id);

  const [stats] = await Book.aggregate([
    { $match: { author: author._id } },
    { $sort: { price: 1, title: 1 } }, // cheapest first, so $first/$last give min/max
    {
      $group: {
        _id: null,
        bookCount: { $sum: 1 },
        averagePrice: { $avg: '$price' },
        cheapestBook: { $first: '$title' },
        mostExpensiveBook: { $last: '$title' },
      },
    },
  ]);

  // No books: sensible empty values instead of crashing (null = "no data", not 0)
  if (!stats) {
    return res.json({
      author: author.name,
      bookCount: 0,
      averagePrice: null,
      cheapestBook: null,
      mostExpensiveBook: null,
    });
  }

  res.json({
    author: author.name,
    bookCount: stats.bookCount,
    averagePrice: Math.round(stats.averagePrice * 100) / 100,
    cheapestBook: stats.cheapestBook,
    mostExpensiveBook: stats.mostExpensiveBook,
  });
};