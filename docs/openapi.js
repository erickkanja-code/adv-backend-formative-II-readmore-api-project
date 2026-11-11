const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema) => ({ 'application/json': { schema } });
const ok = (description, schema) => ({ description, content: json(schema) });
const fail = (description) => ({ description, content: json(ref('Error')) });
const idParam = (entity) => ({
  name: 'id', in: 'path', required: true,
  description: `The ${entity}'s MongoDB id (24 hex characters)`,
  schema: { type: 'string' },
});
const q = (name, description, schema) => ({ name, in: 'query', required: false, description, schema });

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'ReadMore API',
    version: '1.0.0',
    description: 'Bookstore REST API: Authors and Books (Express + MongoDB/Mongoose).',
  },
  servers: [{ url: '/' }],
  tags: [{ name: 'Health' }, { name: 'Authors' }, { name: 'Books' }],

  components: {
    schemas: {
      AuthorInput: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', example: 'Chinua Achebe' },
          country: { type: 'string', example: 'Nigeria' },
          bio: { type: 'string', example: 'Nigerian novelist, poet and critic.' },
        },
      },
      Author: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          country: { type: 'string' },
          bio: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      BookInput: {
        type: 'object',
        required: ['title', 'genre', 'price', 'author'],
        properties: {
          title: { type: 'string', example: 'The Silent Sea' },
          genre: { type: 'string', example: 'Thriller' },
          price: { type: 'number', example: 24.99 },
          publishedYear: { type: 'integer', example: 2021 },
          author: { type: 'string', description: 'Id of an EXISTING author', example: 'PASTE_AN_AUTHOR_ID_HERE' },
        },
      },
      Book: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          title: { type: 'string' },
          genre: { type: 'string' },
          price: { type: 'number' },
          publishedYear: { type: 'integer' },
          author: ref('Author'),
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      BookPage: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
          appliedFilter: { type: 'object', description: 'The MongoDB filter built from your query params' },
          sort: { type: 'object' },
          results: { type: 'array', items: ref('Book') },
        },
      },
      AuthorBooks: {
        type: 'object',
        properties: {
          author: { type: 'string' },
          count: { type: 'integer' },
          books: { type: 'array', items: { type: 'object' } },
        },
      },
      AuthorStats: {
        type: 'object',
        properties: {
          author: { type: 'string', example: 'Chinua Achebe' },
          bookCount: { type: 'integer', example: 4 },
          averagePrice: { type: 'number', nullable: true, example: 21.5 },
          cheapestBook: { type: 'string', nullable: true, example: 'Things Fall Apart' },
          mostExpensiveBook: { type: 'string', nullable: true, example: 'Anthills of the Savannah' },
        },
      },
      Message: { type: 'object', properties: { message: { type: 'string' } } },
      Error: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          errors: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },

  paths: {
    '/': {
      get: { tags: ['Health'], summary: 'Health check', responses: { 200: ok('API is running', ref('Message')) } },
    },

    '/authors': {
      post: {
        tags: ['Authors'], summary: 'Create an author',
        requestBody: { required: true, content: json(ref('AuthorInput')) },
        responses: { 201: ok('Author created', ref('Author')), 400: fail('Validation failed') },
      },
      get: {
        tags: ['Authors'], summary: 'Get all authors',
        responses: { 200: ok('List of authors', { type: 'array', items: ref('Author') }) },
      },
    },

    '/authors/{id}': {
      get: {
        tags: ['Authors'], summary: 'Get one author', parameters: [idParam('author')],
        responses: { 200: ok('The author', ref('Author')), 400: fail('Invalid id'), 404: fail('Author not found') },
      },
      put: {
        tags: ['Authors'], summary: 'Update an author (send only the fields to change)', parameters: [idParam('author')],
        requestBody: { required: true, content: json(ref('AuthorInput')) },
        responses: { 200: ok('Updated author', ref('Author')), 400: fail('Invalid id / validation failed'), 404: fail('Author not found') },
      },
      delete: {
        tags: ['Authors'], summary: 'Delete an author (blocked while they still have books)', parameters: [idParam('author')],
        responses: { 200: ok('Author deleted', ref('Message')), 404: fail('Author not found'), 409: fail('Author still has books') },
      },
    },

    '/authors/{id}/books': {
      get: {
        tags: ['Authors'], summary: 'Get all books by an author', parameters: [idParam('author')],
        responses: { 200: ok("Author's books", ref('AuthorBooks')), 404: fail('Author not found') },
      },
    },

    '/authors/{id}/stats': {
      get: {
        tags: ['Authors'], summary: "Statistics computed from an author's books", parameters: [idParam('author')],
        responses: { 200: ok('Author statistics', ref('AuthorStats')), 404: fail('Author not found') },
      },
    },

    '/books': {
      post: {
        tags: ['Books'], summary: 'Create a book for an existing author',
        requestBody: { required: true, content: json(ref('BookInput')) },
        responses: {
          201: ok('Book created', ref('Book')),
          400: fail('Validation failed, or author does not exist'),
          409: fail('This author already has a book with that title'),
          422: fail('Price or publishedYear breaks a business rule'),
        },
      },
      get: {
        tags: ['Books'], summary: 'Get books (search, filter, sort, paginate — all optional)',
        parameters: [
          q('genre', 'Only books of this genre (case-insensitive)', { type: 'string', example: 'Thriller' }),
          q('minPrice', 'Minimum price', { type: 'number' }),
          q('maxPrice', 'Maximum price', { type: 'number' }),
          q('author', 'Only books by this author id', { type: 'string' }),
          q('search', 'Title contains this text (case-insensitive)', { type: 'string', example: 'sea' }),
          q('sort', 'Field to sort by', { type: 'string', enum: ['price', 'title', 'publishedYear'] }),
          q('order', 'Sort direction', { type: 'string', enum: ['asc', 'desc'] }),
          q('page', 'Page number (enables pagination)', { type: 'integer', minimum: 1 }),
          q('limit', 'Results per page, max 100 (enables pagination)', { type: 'integer', minimum: 1, maximum: 100 }),
        ],
        responses: { 200: ok('Matching books', ref('BookPage')), 400: fail('Invalid query parameter') },
      },
    },

    '/books/{id}': {
      get: {
        tags: ['Books'], summary: 'Get one book (author populated)', parameters: [idParam('book')],
        responses: { 200: ok('The book', ref('Book')), 400: fail('Invalid id'), 404: fail('Book not found') },
      },
      put: {
        tags: ['Books'], summary: 'Update a book (send only the fields to change)', parameters: [idParam('book')],
        requestBody: { required: true, content: json(ref('BookInput')) },
        responses: {
          200: ok('Updated book', ref('Book')),
          400: fail('Invalid id / validation failed / author does not exist'),
          404: fail('Book not found'),
          409: fail('Duplicate title for this author'),
          422: fail('Business rule broken'),
        },
      },
      delete: {
        tags: ['Books'], summary: 'Delete a book', parameters: [idParam('book')],
        responses: { 200: ok('Book deleted', ref('Message')), 404: fail('Book not found') },
      },
    },
  },
};