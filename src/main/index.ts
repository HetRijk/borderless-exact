import { Calculator } from './models/';
import * as passport from 'passport';
import * as OAuth2Strategy from 'passport-oauth2';
import * as express from 'express';
import * as opn from 'opn';
var app = express()
import * as eo from 'exact-online';
export default Calculator;

let CLIENT_ID = 'f5fcbe04-c19e-45c4-8aa5-f9316d70bb0d';
let CLIENT_SECRET = 'WhKLQKKQjkOY';
let CB_URL = "http://localhost:3000/auth/callback";
// TODO: wtf, y we need this.
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});


passport.use(new OAuth2Strategy({
  authorizationURL: 'https://start.exactonline.nl/api/oauth2/auth',
  tokenURL: 'https://start.exactonline.nl/api/oauth2/token',
  clientID: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  callbackURL: CB_URL
}, (accessToken, refreshToken, profile, cb) => {

  console.log('AT: ',accessToken);
  console.log('RT: ',refreshToken);
  console.log('p: ',profile);
  return cb(null, true);
}));

app.use(passport.initialize());
app.use(passport.session());
app.get('/auth',
        passport.authenticate('oauth2'));
app.get('/auth/callback',
        passport.authenticate('oauth2', { failureRedirect: '/login' }),
        (req: express.Request , res: express.Response) => {
          // Successful authentication, redirect home.
          res.redirect('/');
        });

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
  opn('http://localhost:3000/auth/');
})
