import 'source-map-support/register';

import { Passport } from 'passport';
import { ExactStrategy } from './utils/ExactStrategy';
import { IUser } from './utils/User';
import { Storage } from './utils/Storage';
import { AuthTokenRefresh } from './utils/TokenUtils';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as session from 'express-session';

const app = express();
const passport = new Passport();

interface IUserCompound {
  accessToken: string;
  refreshToken: string;
  profile: IUser;
}

const User = new Storage<IUserCompound>();
const tokenRefresh = new AuthTokenRefresh();

function sessionExtend(req: Express.Request)  {
  if (req.user) {
    return req.user as IUserCompound;
  } else {
    return undefined;
  }
}

const strategy = new ExactStrategy(
  {
  clientID: 'f5fcbe04-c19e-45c4-8aa5-f9316d70bb0d',
  clientSecret: 'WhKLQKKQjkOY',
  callbackURL: 'http://localhost:3000/auth/callback',
}, (accessToken, refreshToken, profile, done) => {
  User.findOrCreate(profile.UserID,
                    {accessToken, refreshToken, profile} ,
                    (err, user) => {
                      return done(err, user);
                    });
});

passport.use(strategy);
tokenRefresh.use(strategy);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({secret: '-- ENTER CUSTOM SESSION SECRET --'}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user: IUserCompound, done) => {
  done(null, user.profile.UserID);
});

passport.deserializeUser((id: string, done) => {
  User.findById(id, (err, user) => {
    done(err, user);
  });
});

function ensureLoggedIn(req: Express.Request, res: Express.Response, next: Function) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    (res as any).status(401).send({
      success: false,
      message: 'You need to be authenticated to access this page!',
    });
  } else {
    next();
  }
}

// main menu route
app.get('/', (req, res) => {
  const html = "<ul>\
    <li><a href='/auth/exact'>Exact</a></li>\
    <li><a href='/users'>users</a></li>\
    <li><a href='/name'>name</a></li>\
    <li><a href='/logged-in'>logged-in</a></li>\
    <li><a href='/logout'>logout</a></li>\
  </ul>";

  res.send(html);
});

app.get('/logout', (req, res) => {
  const user = sessionExtend(req);
  req.logout();
  res.redirect('/');
});

app.get('/auth/exact', passport.authenticate('exact'));

app.get('/auth/callback', passport.authenticate('exact', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/');
  },
);

app.get('/users',
  (req, res) => {
    res.send('nope');
    //res.send(JSON.stringify(User.storage));
  },
);

app.get('/name',
  async (req, res) => {
    const user = sessionExtend(req);
    if (user) {
      const html = `<p>Hello,friend ${user.profile.FullName}!</p>`;
      res.send(html);
    } else {
      const html = `<p>Hello,stranger!</p>`;
      res.send(html);
    }
  },
);

app.get('/logged-in', ensureLoggedIn, async (req, res) => {
  let user = sessionExtend(req) as IUserCompound;
  const accessToken = await tokenRefresh.requestNewAccessToken('exact', user.refreshToken);
  user = await User.updateByIdPromise(user.profile.UserID, { accessToken });
  const html = `<pre>${JSON.stringify(user)}</pre>`;
  res.send(html);
});
// callbackURL: 'http://127.0.0.1:3000/auth/exact/callback',

const server = app.listen(3000, () => {
  console.log('Example app listening at http://%s:%s',
              server.address().address, server.address().port);
});
