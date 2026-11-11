// Turns common errors into clean, helpful JSON responses.
module.exports = (err, req, res, next) => {
  // Body was not valid JSON
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Malformed JSON in request body' });
  }

  // e.g. GET /authors/not-an-id
  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid ${err.path}: "${err.value}" is not a valid id` });
  }

  // Schema validation failed (missing required field, wrong type...)
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: 'Validation failed', errors });
  }

  // Unique index violation
  if (err.code === 11000) {
    return res.status(409).json({ message: 'Duplicate value', fields: err.keyValue });
  }

  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
};