// IDCS SDK
import passport = require('passport');
import OAuth2Strategy = require('passport-oauth2');
import config = require('../config/auth_config');

const express = require('express');

const router = express.Router();

const { ClientTenant } = config.idcs.classOpts;

// IDCS Login
passport.use(
  new OAuth2Strategy(
    {
      authorizationURL: `https://${ClientTenant}}/oauth2/authorize`,
      tokenURL: `https://${ClientTenant}/oauth2/token`,
      clientID: config.idcs.classOpts.ClientId,
      clientSecret: config.idcs.classOpts.ClientSecret,
      callbackURL: config.idcs.loginRedirectUrl,
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ exampleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

function idcsLogin() {
  passport.authenticate('oauth2', {
    successRedirect: '/',
    failureRedirect: '/login',
    successMessage: 'Welcome!',
    failureMessage: 'Invalid login',
  });

  return request;
}

router.get('/auth/example', passport.authenticate('oauth2'));

router.get(
  '/auth/example/callback',
  passport.authenticate('oauth2', { failureRedirect: '/login' }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  }
);

module.exports = { router, idcsLogin };
