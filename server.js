const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  //.connect(process.env.DATABASE_LOCAL,{
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  })

  .then(() => console.log('DB connection successfull'));

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
//when password db is wrong
process.on('unhandledRejection', err => {
  const fullMessage = err.message;
  const errmsgStart = 0; // Start at the beginnning
  const newline = /\n/; // new line character
  const errmsgStop = fullMessage.search(newline); // Find new line
  const errmsgLen = errmsgStop - errmsgStart;
  const errorText = fullMessage.substr(errmsgStart, errmsgLen);
  console.log(`💥Error Name💥: ${err.name}`);
  console.log(`💥💥Error Text: ${errorText}`);
  console.log('UNHANDLED REJECTION! Shutting down!');
  server.close(() => {
    process.exit(1);
  });
});
