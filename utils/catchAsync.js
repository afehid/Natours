module.exports = fn => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
// catchAsync = fn => {  ////////////////////////////////////// 1)
//   return (req, res, next) => {
//     fn(req, res, next).catch(next);
//   };
// };

//1) here i made a function (catchAsync) has args of (fn){function}
//2) then i called it with args of the Async function so now the function fn = the async function
//3) since we know that createTour is a function,, we need to call it and we call it by returning a callback function (req,res,next)
//4) inside it we have to check if no error we use the catchAsync function with args of async function and if error we catch error

// exports.createTour = catchAsync(async (req, res, next) => { ///////////////////////////// 2)  && 3)
//   const newTour = await Tour.create(req.body);
//   res.status(201).json({
//     status: 'success',
//     data: {
//       tour: newTour
//     }
//   });
// })
//needs explaination in tourController
