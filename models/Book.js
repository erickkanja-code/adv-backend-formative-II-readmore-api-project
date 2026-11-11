const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'title is required'], trim: true },
    genre: { type: String, required: [true, 'genre is required'], trim: true },
    price: { type: Number, required: [true, 'price is required'] },
    publishedYear: { type: Number },
    // The link: stores an Author's _id and lets us populate full author details
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Author',
      required: [true, 'author is required'],
      index: true, // we query books by author a lot
    },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('Book', bookSchema);