const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000 //to convert 90 days to milliseconds
    ),
    httpOnly: true //to receive cookie and store it and send it to the server with every request
    // secure: true, //to make it works on https only && we need it only in production environment not development environment
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  user.password = undefined; //remove the password from the output

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    //we make this for security because anyone can login as an admin
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm
  });

  console.log(req.body);
  //protocol http or https and req.get('host') will be the local host

  // const url = `${req.protocol}://localhost:3000/me`;
  // console.log(url);
  // await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, res);
});
//
//protocol http or https and req.get('host') will be the local host
// const url = `${req.protocol}://localhost:3000/me`;
// console.log(url);
// await new Email(newUser, url).sendWelcome();

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body; // this es-6 of const email or password = req.body.email or req.body.password

  //1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide a mail and password', 400));
  }

  //2) check if user exists and password is Correct
  const user = await User.findOne({ email }).select('+password'); // select (+) include and (-) is exclude // es6 email:email
  //   const correct = await user.correctPassword(password, user.password); //we removed it because if th user is not exist we don't make this function

  if (!user || !(await user.correctPassword(password, user.password))) {
    //if no user correct we don't have to check password so we moved the line to the if condition
    return next(new AppError('Invalid email or password', 401));
  }
  console.log(user);
  //3) if everything is ok, send token to client
  createSendToken(user, 200, res);
});

// exports.logout = (req, res) => {
//   res.cookie('jwt', 'loggedout', {
//     expires: new Date(Date.now() + 10 * 1000),
//     httpOnly: true
//   });
//   res.status(200).json({ status: 'success' });
// };
exports.logout = (req, res) => {
  res.clearCookie('jwt');
  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's here

  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  // console.log(token);

  if (!token) {
    return next(
      new AppError('You are not logged in!, Please log in to get access', 401)
    );
  }

  //2) verfication token

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  //3) Check if the user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user of this token is no longer exist', 401));
  }
  // console.log(decoded);
  //4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError(
        'The user of this token has changed Password!, Please log in again.',
        401
      )
    );
  }
  // GRANt ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

//it's actaully a middleware to only render pages so we don't expect any error so we use try&catch not catchasync
//we don't want catchAsync because when we signout we get the global error handling message
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.restrictTo = (...roles) => {
  //roles ['admin','lead-guide']. so role = 'user'
  return (req, res, next) => {
    //middleware parameters because remember we did this because we cannot pass arguments in the middleware function
    // remember in tour routes we have protect first and then we have restrictto
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have the permission to do this action', 403)
      );
    }
    next();
  };
};
exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1) Get user based on POST email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with that email', 404));
  }
  //2) Generate a random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); //turn off all the validation

  try {
    //3)Send it to user's email
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!'
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new AppError('Error in sending the email', 500));
  }
});
exports.resetPassword = catchAsync(async (req, res, next) => {
  //1) Get the user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });
  //2) if the token is not expired and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetExpires = undefined;
  user.passwordResetToken = undefined;
  await user.save(); // we didn't turn off the validators because we actually need to confirm password and password confirm

  //3) update change password property for the user (in the userModel middleware)
  //4) log the user in and send jwt
  createSendToken(user, 200, res);
});
exports.updatePassword = catchAsync(async (req, res, next) => {
  //1) Get user from the db and remember is that password is hidden
  const user = await User.findById(req.user.id).select('+password');
  //2) check that posted current password === the user original password
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is incorrect', 401));
  }
  //3) update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  // why we didn't use findbyIdAndUpdate() because we won't use the validators in the db and we won't use the middlewares

  //4)login send jwt token to the user
  createSendToken(user, 200, res);
});
