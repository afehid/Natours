const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review cannot be empty!']
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour']
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user']
    }
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'name photo'
  });
  next();
});
//we turned tour off because we don't want to see tour then review having inside it a tour details again
// this.populate({
//   path: 'tour',
//   select: 'name'
// }).populate({
//   path: 'user',
//   select: 'name photo'
// });

//statics function because we want to calculate the averageRating of the tour when we create a new review
reviewSchema.statics.calcAverageRatings = async function(tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId }
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);
  // console.log(stats);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5
    });
  }
};

// document middleware
reviewSchema.post('save', function() {
  //this points to the current review

  this.constructor.calcAverageRatings(this.tour);
  //we made this.constructor because Review is not yet defined and we cannot define it after the schema is completed which we cannot use middlewares
  //Review.calcAverageRatings(this.tour);
});

//remeber these are shorthands of findOne and delete & Update
//findByIdAndUpdate
//findByIdAndDelete

// to access the calcAverageRatings we have to use POST middleware
reviewSchema.post(/^findOneAnd/, async function(doc) {
  await doc.constructor.calcAverageRatings(doc.tour);
  // console.log(doc);
  //doc refers to the document review we used to findOneAndUpdate or Delete
});

// query middleware
// reviewSchema.pre(/^findOneAnd/, async function(next) {
//   // this.findOne() this refers to current query and then .fineOne() to get the document review
//   // we used this.r to pass parameters from the pre middleware to the post middleware

//   const r = await this.findOne();
//   console.log(r);
//   next();
// });
// we need to call the static method on the model so we use this.r = document and then .constructor = model
// reviewSchema.post(/^findOneAnd/, async function() {
//   await this.r.constructor.calcAverageRatings(this.r.tour);
// });

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
