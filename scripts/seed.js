require('dotenv').config();
const mongoose = require('mongoose');
const Author = require('../models/Author');
const Book = require('../models/Book');

const data = [
  {
    author: { name: 'Chinua Achebe', country: 'Nigeria', bio: 'Nigerian novelist, poet and critic.' },
    books: [
      { title: 'Things Fall Apart', genre: 'Literary Fiction', price: 15, publishedYear: 1958 },
      { title: 'No Longer at Ease', genre: 'Literary Fiction', price: 20, publishedYear: 1960 },
      { title: 'Arrow of God', genre: 'Literary Fiction', price: 22, publishedYear: 1964 },
      { title: 'Anthills of the Savannah', genre: 'Literary Fiction', price: 29, publishedYear: 1987 },
    ],
  },
  {
    author: { name: 'Chimamanda Ngozi Adichie', country: 'Nigeria', bio: 'Nigerian writer of novels, short stories and essays.' },
    books: [
      { title: 'Purple Hibiscus', genre: 'Literary Fiction', price: 18.5, publishedYear: 2003 },
      { title: 'Half of a Yellow Sun', genre: 'Historical Fiction', price: 24.99, publishedYear: 2006 },
      { title: 'Americanah', genre: 'Literary Fiction', price: 27.5, publishedYear: 2013 },
    ],
  },
  {
    author: { name: "Ngũgĩ wa Thiong'o", country: 'Kenya', bio: 'Kenyan novelist, playwright and academic.' },
    books: [
      { title: 'Weep Not, Child', genre: 'Literary Fiction', price: 12.99, publishedYear: 1964 },
      { title: 'Petals of Blood', genre: 'Literary Fiction', price: 16.5, publishedYear: 1977 },
    ],
  },
  {
    author: { name: 'Amara Okafor', country: 'Ghana', bio: 'Fictional thriller writer used for demo data.' },
    books: [
      { title: 'The Silent Sea', genre: 'Thriller', price: 24.99, publishedYear: 2021 },
      { title: 'Sea of Glass', genre: 'Thriller', price: 11.99, publishedYear: 2019 },
      { title: 'Night Harbour', genre: 'Thriller', price: 32, publishedYear: 2023 },
    ],
  },
  {
    author: { name: 'Tsitsi Dangarembga', country: 'Zimbabwe', bio: 'Author with no books in the store yet (for demoing empty stats and delete).' },
    books: [],
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected. Clearing collections...');
  await Book.deleteMany({});
  await Author.deleteMany({});

  for (const { author, books } of data) {
    const created = await Author.create(author);
    if (books.length) {
      await Book.insertMany(books.map((b) => ({ ...b, author: created._id })));
    }
    console.log(`  ${created.name} (${created._id}) — ${books.length} book(s)`);
  }

  await mongoose.disconnect();
  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});