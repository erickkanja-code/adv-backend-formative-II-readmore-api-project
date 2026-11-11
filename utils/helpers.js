// Copy only allowed keys from the request body (stops clients setting _id, createdAt, etc.)
const pick = (obj, keys) => {
  const src = obj || {};
  return Object.fromEntries(keys.filter((k) => src[k] !== undefined).map((k) => [k, src[k]]));
};

// Escape user text before putting it inside a RegExp
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Strict check for a 24-char hex MongoDB ObjectId
const isObjectId = (v) => typeof v === 'string' && /^[a-f\d]{24}$/i.test(v);

const notFound = (res, entity, id) =>
  res.status(404).json({ message: `No ${entity} found with id ${id}` });

module.exports = { pick, escapeRegex, isObjectId, notFound };