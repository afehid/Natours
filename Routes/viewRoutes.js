const express = require('express');
const viewsController = require('../Controllers/viewController');
const authController = require('../Controllers/authController');

const router = express.Router();

router.get('/', authController.isLoggedIn, viewsController.getOverview);
router.get('/tour/:slug', authController.isLoggedIn, viewsController.getTour);
router.get('/login', authController.isLoggedIn, viewsController.getLoginForm);
router.get('/me', authController.protect, viewsController.getAccount);
// router.get('/signup', viewsController.getSignupForm, authController.signup);
router.get('/signup', viewsController.getSignupForm);
router.post(
  '/submit-user-data',
  authController.protect,
  viewsController.updateUserData
);

module.exports = router;
