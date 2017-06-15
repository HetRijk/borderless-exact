// Libraries
import * as passport from 'passport';
import * as OAuth2Strategy from 'passport-oauth2';
import * as express from 'express';
import * as opn from 'opn';

// Homebrew
import TokenWrapper from './utils/TokenWrapper';

// Constants
const app = express();
const CLIENT_ID = 'f5fcbe04-c19e-45c4-8aa5-f9316d70bb0d';
const CLIENT_SECRET = 'WhKLQKKQjkOY';
const CB_URL = 'http://localhost:3000/auth/callback';
const TOKEN_URL = 'https://start.exactonline.nl/api/oauth2/token';
const tokenWrapper = new TokenWrapper( TOKEN_URL, CLIENT_ID, CLIENT_SECRET);

// TODO: wtf, y we need this.
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

passport.use(new OAuth2Strategy({
  authorizationURL: 'https://start.exactonline.nl/api/oauth2/auth',
  tokenURL: TOKEN_URL,
  clientID: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  callbackURL: CB_URL,
}, (accessToken, refreshToken, profile, cb) => {
  tokenWrapper.initialise(refreshToken);
  return cb(null, true);
}));

app.use(passport.initialize());
app.use(passport.session());
app.get('/auth',
        passport.authenticate('oauth2'));
app.get('/auth/callback',
        passport.authenticate('oauth2', { failureRedirect: '/login' }),
        (req: express.Request , res: express.Response) => {
          res.setHeader('Content-Type', 'application/json');
          res.send(JSON.stringify({ message: 'auth complete' }));
        });

app.get('/verify',
        (req: express.Request , res: express.Response) => {
          // Successful authentication, redirect home.
          const tokenLogger = (err: any, token: string) => {
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({
              error: err,
              token,
            }));
          };
          tokenWrapper.getToken(tokenLogger);
        });

app.listen(3000,  () => {
  console.log('Example app listening on port 3000!')
  opn('http://localhost:3000/auth/');
});
