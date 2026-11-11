const Book = require('../models/Book');
const Author = require('../models/Author');
const { pick, escapeRegex, isObjectId, notFound } = require('../utils/helpers');

const BOOK_FIELDS = ['title', 'genre', 'price', 'publishedYear', 'author'];
const AUTHOR_DETAILS = 'name country bio';
const SORTABLE = ['price', 'title', 'publishedYear'];
const MIN_YEAR = 1450; // the printing press
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const CASE_INSENSITIVE = { locale: 'en', strength: 2 };

/* ---------- Business rules ---------- */

// Rule 3: rules the schema can't express -> 422
function checkValueRules(book) {
  const errors = [];
  if (book.price != null && book.price <= 0) {
    errors.push('price must be greater than 0');
  }
  if (book.publishedYear != null) {
    const currentYear = new Date().getFullYear();
    if (!Number.isInteger(book.publishedYear)) {
      errors.push('publishedYear must be a whole year, e.g. 2021');
    } else if (book.publishedYear < MIN_YEAR) {
      errors.push(`publishedYear cannot be before ${MIN_YEAR}`);
    } else if (book.publishedYear > currentYear) {
      errors.push(`publishedYear cannot be in the future (it is currently ${currentYear})`);
    }
  }
  return errors;
}

// Runs rules 3, 1 and 2 in order. Returns { status, body } if something fails, else null.
async function enforceRules(book) {
  // Rule 3 -> 422
  const valueErrors = checkValueRules(book);
  if (valueErrors.length) {
    return { status: 422, body: { message: 'Book breaks a business rule', errors: valueErrors } };
  }

  // Rule 1: no orphan books -> 400
  if (book.isNew || book.isModified('author')) {
    const authorExists = await Author.exists({ _id: book.author });
    if (!authorExists) {
      return { status: 400, body: { message: `Cannot save book: no author exists with id ${book.author}` } };
    }
  }

  // Rule 2: no duplicate titles per author (case-insensitive) -> 409
  if (book.isNew || book.isModified('title') || book.isModified('author')) {
    const duplicate = await Book.findOne({
      _id: { $ne: book._id }, // don't match the book against itself on update
      author: book.author,     // per-author, not global
      title: book.title,
    }).collation(CASE_INSENSITIVE);

    if (duplicate) {
      return {
        status: 409,
        body: {
          message: `This author already has a book titled "${duplicate.title}"`,
          existingBookId: duplicate._id,
        },
      };
    }
  }

  return null;
}

/* ---------- CRUD ---------- */

// POST /books
exports.createBook = async (req, res) => {
  const book = new Book(pick(req.body, BOOK_FIELDS));
  await book.validate(); // 400 for missing fields / wrong types

  const problem = await enforceRules(book);
  if (problem) return res.status(problem.status).json(problem.body);

  await book.save();
  await book.populate('author', AUTHOR_DETAILS);
  res.status(201).json(book);
};

// GET /books  (search, filter, sort, paginate)
exports.getBooks = async (req, res) => {
  // Normalise: take the first value of repeated params, ignore empty ones
  const q = {};
  for (const [key, value] of Object.entries(req.query)) {
    const v = Array.isArray(value) ? value[0] : value;
    if (v !== undefined && v !== '') q[key] = String(v).trim();
  }

  const filter = {};
  const errors = [];

  // Build the filter dynamically: only params that are present get added
  if (q.genre) {
    filter.genre = { $regex: `^${escapeRegex(q.genre)}$`, $options: 'i' };
  }
  if (q.search) {
    filter.title = { $regex: escapeRegex(q.search), $options: 'i' };
  }
  if (q.author) {
    if (isObjectId(q.author)) filter.author = q.author;
    else errors.push('author must be a valid 24-character id');
  }

  if (q.minPrice !== undefined || q.maxPrice !== undefined) {
    const price = {};
    if (q.minPrice !== undefined) {
      const min = Number(q.minPrice);
      if (Number.isNaN(min)) errors.push('minPrice must be a number');
      else price.$gte = min;
    }
    if (q.maxPrice !== undefined) {
      const max = Number(q.maxPrice);
      if (Number.isNaN(max)) errors.push('maxPrice must be a number');
      else price.$lte = max;
    }
    if (price.$gte !== undefined && price.$lte !== undefined && price.$gte > price.$lte) {
      errors.push('minPrice cannot be greater than maxPrice');
    }
    filter.price = price;
  }

  // Sorting
  let sort = { _id: 1 }; // default: insertion order
  if (q.order && !['asc', 'desc'].includes(q.order)) {
    errors.push('order must be "asc" or "desc"');
  }
  if (q.sort) {
    if (SORTABLE.includes(q.sort)) {
      sort = { [q.sort]: q.order === 'desc' ? -1 : 1, _id: 1 }; // _id = stable tie-breaker
    } else {
      errors.push(`sort must be one of: ${SORTABLE.join(', ')}`);
    }
  }

  // Pagination (only when page or limit is sent)
  const paginate = q.page !== undefined || q.limit !== undefined;
  const page = paginate ? Number(q.page ?? 1) : 1;
  const limit = paginate ? Number(q.limit ?? DEFAULT_LIMIT) : null;
  if (paginate) {
    if (!Number.isInteger(page) || page < 1) errors.push('page must be a whole number >= 1');
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      errors.push(`limit must be a whole number between 1 and ${MAX_LIMIT}`);
    }
  }

  if (errors.length) {
    return res.status(400).json({ message: 'Invalid query parameters', errors });
  }

  let query = Book.find(filter).sort(sort).populate('author', AUTHOR_DETAILS);
  if (paginate) query = query.skip((page - 1) * limit).limit(limit);

  const [results, total] = await Promise.all([query, Book.countDocuments(filter)]);

  res.json({
    page,
    limit: paginate ? limit : total,
    total,
    totalPages: paginate ? Math.ceil(total / limit) : 1,
    appliedFilter: filter,
    sort,
    results,
  });
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
  await book.validate();

  // Rules are checked against the MERGED book (existing values + changes)
  const problem = await enforceRules(book);
  if (problem) return res.status(problem.status).json(problem.body);

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