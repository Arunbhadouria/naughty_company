const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

module.exports = function (passport) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        const newUser = {
          googleId: profile.id,
          displayName: profile.displayName,
          email: profile.emails[0].value,
        };

        try {
          // Check for existing user
          let user = await User.findOne({ googleId: profile.id });

          if (user) {
            done(null, user);
          } else {
            // Check if user with this email already exists but without Google linking
            user = await User.findOne({ email: profile.emails[0].value });
            
            if (user) {
              user.googleId = profile.id;
              await user.save();
              done(null, user);
            } else {
              // Create new user
              user = await User.create(newUser);
              done(null, user);
            }
          }
        } catch (err) {
          console.error(err);
          done(err, null);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};
