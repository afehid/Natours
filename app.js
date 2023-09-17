const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const compression = require('compression');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./Controllers/errController');
const tourRouter = require('./Routes/tourRoutes');
const userRouter = require('./Routes/userRoutes');
const reviewRouter = require('./Routes/reviewRoutes');
const viewRouter = require('./Routes/viewRoutes');

const app = express();

//Start Express App
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1) GLOBAL MIDDLEWARES
//Serving static files
app.use(express.static(path.join(__dirname, 'public')));
//SET SECURITY HTTP HEADERS
// Further HELMET configuration for Content Security Policy (CSP)
// Source: https://github.com/helmetjs/helmet

app.use(helmet());
// // //DEVELOPMENT LOGGING
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev')); // gives green status when development, and the method
}
// // //LIMIT REQUESTS FROM SAME API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000, // 100 request per hour
  message: 'Too many requests from this IP, Please try again in an hour'
});
app.use('/api', limiter);

// //BODY PARSER, READING DAT FROM THE BODY into req.body
app.use(express.json({ limit: '10kb' })); //responsible of creating objects in json files
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
//Data sanitization againt NoSQL query injection //Data sanitization after body parser because we need to clean the code after req.body
app.use(mongoSanitize());

// // //Data sanitization against XSS
app.use(xss());

// // //Prevent paramater pollution and sort to the last one
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price'
    ]
  })
);

app.use(compression());

//Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

// ROUTES

app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404)); //err = new Error but we inherited it from the appError module
});

app.use(globalErrorHandler);

module.exports = app;
//3)SERVER

// // app.get('/api/v1/tours',getAllTours);    //get all tours
// app.get('/api/v1/tours/:id', getTour);   //get tour
// // app.post('/api/v1/tours',createTour ); //create tour
// app.patch('/api/v1/tours/:id', updateTour); //update tour
// app.delete('/api/v1/tours/:id',deleteTour );  //delete tour
