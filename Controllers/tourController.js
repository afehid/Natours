const multer = require('multer');
const sharp = require('sharp');
const Tour = require('../models/tourModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an Image!, Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

//upload.single('image')   req.file
//upload.array('images', 5)& fields req.files

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 }
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  console.log(req.files);

  if (!req.files.imageCover || !req.files.images) next();

  //1) imageCover
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;

  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`); //we here upload the file to the filesystem
  //2) Images

  //cause they're many images
  req.body.images = [];

  //remember we used async in the map function so we are awaiting 3 images so we make promise all
  await Promise.all(
    //we replaced map with foreach because map returns a new array and now it returns a new array of promises of the inside the loop
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);
    })
  );
  next();
});

// exports.getTour = factory.getOne(Tour,{path: 'reviews'})

exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, 'reviews');
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);
exports.aliasTopTours = (req, res, next) => {
  // eslint-disable-next-line no-sequences, no-unused-expressions
  (req.query.limit = '5'),
    (req.query.sort = '-ratingsAverage,price'),
    (req.query.fields = 'name,price,ratingsAverage,summary,difficulty');
  next();
};
exports.getTourStats = catchAsync(async (req, res, next) => {
  //every stage comes after the output of the previous stage as mentioned in third stage
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } }
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 }, //Expression 1 to a document will return 1, since the expression will apply to each document in the group, so {$sum: 1} will return the amount of documents in the group
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }
    },
    {
      $sort: { avgPrice: 1 }
    }
    // {
    //   $match: { _id: { $ne: 'easy' } }
    // }
  ]);
  res.status(200).json({
    status: 'Success',
    data: {
      stats
    }
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1; // 2021

  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates'
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' }
      }
    },
    {
      $addFields: { month: '$_id' }
    },
    {
      $project: {
        _id: 0
      }
    },
    {
      $sort: { numTourStarts: -1 }
    },
    {
      $limit: 12
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan
    }
  });
});

// /tours-within/:distance/center/:latlng/unit/:unit
// /tours-within/233/center/-40,45/unit/mi

exports.getTourWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please Provide Latitude and Longitude in the format of lat,lng',
        400
      )
    );
  }

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
  });
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours
    }
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please Provide Latitude and Longitude in the format of lat,lng',
        400
      )
    );
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1]
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier
      }
    },
    {
      $project: { distance: 1, name: 1 }
    }
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      data: distances
    }
  });
});
// exports.getAllTours = catchAsync(async (req, res, next) => {
//   const features = new APIFeatures(Tour.find(), req.query) //tour.find() because it returns a query object of the database
//     .filter()
//     .sort()
//     .limitFields()
//     .paginate();
//   //Execute Query
//   const tours = await features.query; // await because we're waiting the sorting filtering and all these methods to be executed query in the args
//   res.status(200).json({
//     status: 'success',
//     results: `${tours.length} Tours`,
//     data: {
//       tours
//     }
//   });
// });
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// exports.getTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findById(req.params.id).populate('reviews'); // 'reviews' comes from virtual population in tourModel
//   if (!tour) {
//     return next(new AppError('No Tour found with that ID', 404)); // needs explaination
//   }
//   res.status(200).json({
//     status: 'success',
//     data: {
//       tour
//     }
//   });
// });
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// exports.createTour = catchAsync(async (req, res, next) => {
//   const newTour = await Tour.create(req.body);
//   res.status(201).json({
//     status: 'success',
//     data: {
//       tour: newTour
//     }
//   });
// });
////////////////////////////////////////////////////////////////////////////////////////////
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
//////////////////////////////////////////////////////////////////////////////
// exports.deleteTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findByIdAndRemove(req.params.id);
//   if (!tour) {
//     return next(new AppError('No Tour found with that ID', 404));
//   }
//   res.status(204).json({
//     status: 'Success',
//     data: null
//   });
// });

//code before mongodb
// const fs = require('fs');

// const tours = JSON.parse(
//   fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
// );
// exports.checkID = (req, res, next, val) => {
//   if (req.params.id * 1 > tours.lenght) {
//     return res.status(404).json({
//       status: 'fail',
//       message: 'Ivalid Id'
//     });
//   }
//   next();
// };

// exports.checkBody = (req, res, next) => {
//   if (!req.body.name || !req.body.price) {
//     return res.status(400).json({
//       status: 'fail',
//       message: 'name and price not provided'
//     });
//   }
//   next();
// };

// exports.getAllTours = (req, res) => {
//   console.log(req.requestTime);

//   res.status(200).json({
//     status: 'success',
//     requestedAt: req.requestTime,
//     results: tours.lenght,
//     data: { tours }
//   });
// };
// exports.getTour = (req, res) => {
//   //get tour function

//   const id = req.params.id * 1;
//   const tour = tours.find(el => el.id === id);
//   console.log(`Tour id is: ${id}`);
//   console.log(req.params);

//   //   if (id > tours.length) {

//   res.status(200).json({
//     status: 'success',
//     data: { tour }
//   });
// };
// exports.createTour = (req, res) => {
//   //create tour
//   // console.log(req.body);
//   const newId = tours[tours.length - 1].id + 1;
//   const newTour = Object.assign({ id: newId }, req.body);
//   tours.push(newTour);
//   fs.writeFile(
//     `${__dirname}/../dev-data/data/tours-simple.json`,
//     JSON.stringify(tours),
//     () => {
//       res.status(201).json({
//         status: 'success',
//         tour: newTour
//       });
//     }
//   );
// };
// exports.updateTour = (req, res) => {
//   // update tour

//   res.status(200).json({
//     status: 'Success',
//     data: { tour: 'Updated tour here' }
//   });
// };
// exports.deleteTour = (req, res) => {
//   res.status(204).json({
//     status: 'Success',
//     data: null
//   });
// };

// Mongoose API
// //1A) FILTERING
// const queryObj = { ...req.query };
// const excludeFields = ['page', 'sort', 'limit', 'fields'];
// excludeFields.forEach(el => delete queryObj[el]);
// //1B) Advanced filtering
// let queryStr = JSON.stringify(queryObj);
// queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

// let query = Tour.find(JSON.parse(queryStr));

// //2) Sorting
// if (req.query.sort) {
//   const sortBy = req.query.sort.split(',').join(' ');
//   query = query.sort(sortBy);
// } else {
//   query = query.sort('-createdAt');
// }

// //3) Field Limiting
// if (req.query.fields) {
//   const fields = req.query.fields.split(',').join(' ');
//   query = query.select(fields);
// } else {
//   query = query.select('-__v');
// }

// //4) Pagination

// // page = 2 & limit = 10 , 1-10 page 1, 11-20 page 2, 21-30 page 3

// const page = req.query.page * 1 || 1; //by multiplying 1 we convert to number from string && ||1 is to define default value
// const limit = req.query.limit * 1 || 100;
// const skip = (page - 1) * limit; // the formula of pagination
// query = query.skip(skip).limit(limit);

// if (req.query.page) {
//   const numTours = await Tour.countDocuments(); //  await because we're waiting the method to count documents.
//   if (skip >= numTours) throw new Error('This page is not exist');
// }
