class AppError extends Error {
  constructor(message, statusCode) {
    // always with class we use constructor
    super(message); // super because we used iheritence and here we set the incoming message to this message just like the line down
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor); // docs: https://nodejs.org/dist/latest-v16.x/docs/api/errors.html#errorcapturestacktracetargetobject-constructoropt
  }
}
module.exports = AppError;
