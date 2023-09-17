const mongoose = require('mongoose');
const crypto = require('crypto');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name']
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validator: [validator.isEmail, 'Please provide a valid email']
  },
  photo: { type: String, default: 'default.jpg' },

  role: {
    type: String,
    enum: ['user', 'admin', 'guide', 'lead-guide'],
    default: 'user'
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minLength: 8,
    select: false
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please provide your password'],
    validate: {
      //This only works on CREATE and SAVE
      validator: function(el) {
        return el === this.password;
      },
      message: 'Passwords are not matched!'
    }
  },
  passwordChangeAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  }
});

userSchema.pre('save', async function(next) {
  //middleware function
  //Only run this function if password was actually modified لو الباسورد متغيرش يبقى مش هنعمل تشفير خلاص هو معموله لكن لو متغير يبقى محتاج تشفير عشان هنعمل باسورد جديد
  if (!this.isModified('password')) return next();

  //Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangeAt = Date.now() - 1000; //because jwt is faster than saving data to db, we will put this to one second in the past to apply JWTTimestamp < changedTimestamp
  next();
});

userSchema.pre(/^find/, function(next) {
  // middleware to fetch data of find method that are not allowed to be shown and usually used to hide the deleted users
  //this points to the current query
  this.find({ active: { $ne: false } }); // not active:{true} because other properties do not have active to true yet
  next();
});

userSchema.methods.correctPassword = async function(
  //instance method
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword); // since we made password select false we cannot make this.password because it's not appeared so we make compare()
};
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangeAt) {
    const changedTimestamp = parseInt(
      this.passwordChangeAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp; //100 <200 so we changed the password after having the token
  }
  //False means Not Changed
  return false;
};
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex'); // we used crypto because we don't need such huge security
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // expiration date 10 mins
  console.log({ resetToken }, this.passwordResetToken);
  return resetToken; //we send the resetToken not the hashed one
};
const User = mongoose.model('User', userSchema);
module.exports = User;
