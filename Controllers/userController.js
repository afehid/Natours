const multer = require('multer');
const sharp = require('sharp');

const User = require('../models/userModel');
const AppError = require('../utils/appError');
// const APIFeatures = require('../utils/apiFeatures');
// const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     //destination we upload photo to
//     //cb stands for next function in express but it's not express so we call it cb
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   }
// });
//we store images as a buffer in memory not in our file system
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

exports.uploadUserPhoto = upload.single('photo');
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  //buffer because we have stored these photo uploads in memory

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`); //we here upload the file to the filesystem

  next();
});

const filterObj = (obj, ...allowedFields) => {
  //1) we will allow loop through the req.body to see if allowed fields (names or emails) is in the req.body we will return those values into empty object to modify
  const newObjet = {};
  Object.keys(obj).forEach(el => {
    //Object.keys returns an array of elements and we gonna loop through them
    if (allowedFields.includes(el)) newObjet[el] = obj[el];
  });
  return newObjet;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  //1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password update please go /updatePassword',
        400
      )
    );
  }

  //2) Filtered out unwanted field names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name', 'email');
  if (req.file) filteredBody.photo = req.file.filename;
  //3) Update user documents
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    //we didn't put req.body because we don't allow users to change roles (body.role)
    new: true,
    runValidators: true
  }); //we use findIdandUpdate because we don't want password updates
  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });
  res.status(204).json({
    status: 'success',
    data: null
  });
});
exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined, Please use /signup'
  });
};

// DO NOT update passwords with (updateUser) will not work ,look in the comment in handlerFactory
// notice admin can delete from db while user when delete he deactivate himself not completely deleted
exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);

// exports.deleteUser = (req, res) => {
//   res.status(500).json({
//     status: 'error',
//     message: 'This route is not yet defined.'
//   });
// };
///////////////////////////////////////////////////////////////////////////////////////////////////////
// exports.getAllUsers = catchAsync(async (req, res) => {
//   const users = await User.find(); // await because we're waiting the sorting filtering and all these methods to be executed query in the args

//   res.status(200).json({
//     status: 'success',
//     results: users.length,
//     data: {
//       users
//     }
//   });
// });
