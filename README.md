# ReadMore API

A bookstore REST API built with **Express 5**, **MongoDB** and **Mongoose**. It has two linked entities, Authors and Books, and the controllers enforce business rules that the database can't enforce on its own.

**Demo video:** [Watch on YouTube](https://youtu.be/jkq_lDma_OU?si=hjRG-injDqMYC8BC)

**API docs:** `http://localhost:3000/api-docs` (Swagger UI)

---

## Setup

```bash
npm install
cp .env.example .env      # then set MONGO_URI (local or Atlas)
npm run seed              # optional: resets the database and loads demo data
npm run dev
```

```
MONGO_URI=mongodb://127.0.0.1:27017/readmore
PORT=3000
```

The server only starts listening once the MongoDB connection succeeds.

## Structure

```
server.js            entry point: connect to the DB, then start the server
models/              Author and Book schemas (Book.author → Author ObjectId)
controllers/         all logic: CRUD, business rules, filtering, stats
routes/              URL → controller wiring only
middleware/          central error handler
utils/helpers.js     shared helpers
docs/openapi.js      Swagger specification
scripts/seed.js      demo data
```

## Data model

`authors ──< books`: one author has many books, and each book references one author. Reads populate the full author details.

| Entity | Fields (* = required) |
|---|---|
| Author | name\*, country, bio |
| Book | title\*, genre\*, price\*, publishedYear, author\* (→ Author) |

## Endpoints

| Method | Path | Notes |
|---|---|---|
| POST / GET | `/authors` | Create / list |
| GET / PUT / DELETE | `/authors/:id` | 404 if not found; DELETE returns 409 if the author has books |
| GET | `/authors/:id/books` | All books by this author |
| GET | `/authors/:id/stats` | Book count, average price, cheapest and most expensive |
| POST / GET | `/books` | GET supports filtering, sorting and pagination |
| GET / PUT / DELETE | `/books/:id` | Author populated; 404 if not found |

## Business rules

| Rule | Behaviour | Status |
|---|---|---|
| No orphan books | The author id must belong to an existing author | 400 |
| No duplicate titles | Per author, case-insensitive (different authors may share a title) | 409 |
| Valid values | price > 0; publishedYear a whole year from 1450 to the current year | 422 |
| Safe delete | Deleting an author who still has books is blocked | 409 |
| Filter / sort | `genre`, `minPrice`, `maxPrice`, `author`, `search`, `sort`, `order`, in any combination | 400 if invalid |
| Stats | An author with no books gets a count of 0 and `null` for the other values | 200 |
| Pagination | `page` and `limit` (default 10, max 100); the response includes the total | n/a |

Example: `GET /books?genre=Thriller&minPrice=10&maxPrice=30&search=sea&sort=price&order=asc`

## Key decisions

- **Why `required` isn't enough:** it only checks that the author id has a valid format. MongoDB has no foreign keys, so the controller checks that the author exists with `Author.exists()`.
- **Dynamic filter:** the query starts as `{}`, and a condition is added only for each parameter that is present. The response includes `appliedFilter`, which shows the exact query that was built.
- **Check order:** shape (400) → values (422) → author exists (400) → duplicate (409). The checks that don't need the database run first.
- **Delete policy: block (Option A).** Books are tied to orders and sales history. Cascading would destroy that history, and reassigning would attach the books to the wrong author. Blocking never loses or falsifies data.
  - *Downside:* it adds steps for the admin, and there is a small race condition that a transaction would fix.
  - *If books have been sold:* a real store would archive (soft-delete) the author instead of deleting them.
- **Empty stats use `null`, not 0:** an average price of 0 would suggest a free book, while `null` means "no data".