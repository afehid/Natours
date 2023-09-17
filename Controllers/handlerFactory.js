const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

exports.deleteOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndRemove(req.params.id);

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(204).json({
      status: 'Success',
      data: null
    });
  });

exports.updateOne = Model =>
  catchAsync(async (req, res, next) => {
    //remember very important --> when we use findbyIdAndUpdate , all the safe middlewares is not running so admin cannot change user's password
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'Success',
      data: {
        data: doc
      }
    });
  });

exports.createOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: 'Success',
      data: {
        data: doc
      }
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);
    const doc = await query;

    if (!doc) {
      return next(new AppError('No document found with that ID', 404)); // needs explaination
    }
    res.status(200).json({
      status: 'success',
      data: {
        data: doc
      }
    });
  });

exports.getAll = Model =>
  catchAsync(async (req, res, next) => {
    // To allow for nested GET reviews on tour (hack)
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };

    const features = new APIFeatures(Model.find(filter), req.query) //tour.find() because it returns a query object of the database
      .filter()
      .sort()
      .limitFields()
      .paginate();
    //Execute Query
    const doc = await features.query; // await because we're waiting the sorting filtering and all these methods to be executed query in the args
    // const doc = await features.query.explain(); // await because we're waiting the sorting filtering and all these methods to be executed query in the args
    res.status(200).json({
      status: 'success',
      results: `${doc.length}`,
      data: {
        data: doc
      }
    });
  });

// exports.updateTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//     new: true,
//     runValidators: true
//   });
//   if (!tour) {
//     return next(new AppError('No Tour found with that ID', 404));
//   }
//   res.status(200).json({
//     status: 'Success',
//     data: {
//       tour
//     }
//   });
// });

// exports.deleteTour = catchAsync(async (req, res, next) => {
//     const tour = await Tour.findByIdAndRemove(req.params.id);
//     if (!tour) {
//       return next(new AppError('No Tour found with that ID', 404));
//     }
//     res.status(204).json({
//       status: 'Success',
//       data: null
//     });
//   });
