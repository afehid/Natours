const mongoose = require('mongoose');
const slugify = require('slugify');
// const validator = require('validator');

// const User = require('./userModel');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxLength: [40, 'A tour name must have less or equal than 40 characters'],
      MinLength: [10, 'A tour name must have more or equal than 10 characters']
      // validate: [
      //   validator.isAlpha,
      //   'The tour name must only contain characters'
      // ]
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration']
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a GroupSize']
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'diffuculty is eirther: easy, medium, difficult'
      }
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be above 5.0'],
      set: val => Math.round(val * 10) / 10 //4.6666, 46.666, 47, 4.7
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price']
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function(val) {
          //this only points to current doc on NEW document creation
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below regular price'
      }
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a summary']
    },
    description: {
      type: String,
      trim: true
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have an imageCover']
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false
    },
    startLocation: {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates: [Number],
      address: String,
      description: String
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number
      }
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      }
    ]
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);
//it boosts the performance ,, read the documentation
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

tourSchema.virtual('durationWeeks').get(function() {
  // not part of the db remember
  //Virtual Properties
  return this.duration / 7;
});
//virtual populate because we want to view the tour with all the reviews and that's child reference  and at the same time we use parent reference because we avoid having many reviews in the future in the db so we use virtual populate
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id'
});
//DOCUMENT MIDDLEWARE: run before .save() and .create()
tourSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true }); //it's executed before the get function is called and (this) refers to current document
  next();
});

//implementing embedded object
// tourSchema.pre('save', async function(next) {
//   const guidesPromises = this.guides.map( id =>  User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

// QUERY MIDDLEWARE

tourSchema.pre(/^find/, function(next) {
  // tourSchema.pre('find', function(next) {
  this.find({ secretTour: { $ne: true } }); // this refers to current query object
  this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function(next) {
  // //populate() to get guide information
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangeAt'
  });
  next();
});

// tourSchema.post(/^find/, function(docs, next) {
//   console.log(`Query took ${Date.now() - this.start} milliseconds`);
//   next();
// });

//AGGREGATION MIDDLEWARE

// tourSchema.pre('aggregate', function(next) {
//   //this refers to current aggregation object
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   next();
// });

const Tour = mongoose.model('Tour', tourSchema); //default feature in mongoose it creates a plural name (T)our ----> tours
module.exports = Tour;
