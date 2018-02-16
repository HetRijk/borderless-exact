import 'source-map-support/register';

import { Passport } from 'passport';
import { ExactStrategy } from './utils/ExactStrategy';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as session from 'express-session';

const app = express();
const passport = new Passport();
const lookupTable: any = {};

class User {
  public static storage: any;
  public static findOrCreate(query: { exactid: string}, data: any, cb: (err, user) => any ) {
    let x = this.storage[query.exactid];
    if (!x) {
      this.storage[query.exactid] = data;
      x = this.storage[query.exactid];
    }
    return cb(undefined, x);
  }
}


// {
//   "client-id": "f5fcbe04-c19e-45c4-8aa5-f9316d70bb0d",
//   "client-secret": "WhKLQKKQjkOY",
//   "callback-url": "http://localhost:3000/auth/callback",
//   "authorization-url": "https://start.exactonline.nl/api/oauth2/auth",
//   "token-url": "https://start.exactonline.nl/api/oauth2/token"
// }
passport.use(new ExactStrategy(
  {
  clientID: 'f5fcbe04-c19e-45c4-8aa5-f9316d70bb0d',
  clientSecret: 'WhKLQKKQjkOY',
  callbackURL: 'http://localhost:3000/auth/callback',
  }, (accessToken, refreshToken, profile, done) => {
    User.findOrCreate({ exactid: profile.id },
                      {accessToken, refreshToken, profile} ,
                      (err, user) => {
                        return done(err, user);
                      });
  }));

app.use(session({secret: '-- ENTER CUSTOM SESSION SECRET --'}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
  // placeholder for custom user serialization
  // null is for errors
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  // placeholder for custom user deserialization.
  // maybe you are going to get the user from mongo by id?
  // null is for errors
  done(null, user);
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// main menu route
app.get('/', (req, res) => {
  const html = "<ul>\
    <li><a href='/auth/exact'>Exact</a></li>\
    <li><a href='/logout'>logout</a></li>\
  </ul>";

  res.send(html);
});

app.get('/logout', (req, res) => {
  console.log('logging out');
  req.logout();
  res.redirect('/');
});

// we will call this to start the GitHub Login process
app.get('/auth/exact', passport.authenticate('exact'));

// GitHub will call this URL
app.get('/auth/callback', passport.authenticate('exact', { failureRedirect: '/' }),
  (req, res) => {
    console.log('yes');
    res.redirect('/');
  },
);

// callbackURL: 'http://127.0.0.1:3000/auth/exact/callback',

const server = app.listen(3000, () => {
  console.log('Example app listening at http://%s:%s',
              server.address().address, server.address().port);
});
