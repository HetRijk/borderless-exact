import * as passport from 'passport';
import * as OAuth2Strategy from 'passport-oauth2';
import * as express from 'express';
import * as url from 'url';
import * as config from '../../config/auth-config.json';

import TokenWrapper from './TokenWrapper';
/*
  AuthBootstrap class
 */
export default class AuthBootstrap {
  private _tokenWrapper: TokenWrapper;
  private _pathname: string;
  private _passport: passport.Passport;

  constructor() {
    this._tokenWrapper = new TokenWrapper(config['token-url'],
                                          config['client-id'],
                                          config['client-secret']);

    const callbackURL = url.parse(config['callback-url']);
    this._pathname = AuthBootstrap.extractCallbackPath(callbackURL);

    const strategy = new OAuth2Strategy({
      authorizationURL: config['authorization-url'],
      tokenURL: config['token-url'],
      clientID: config['client-id'],
      clientSecret: config['client-secret'],
      callbackURL: config['callback-url'],
    }, ({}, refreshToken, {}, callback ) => {
      this._tokenWrapper.initialise(refreshToken);
      return callback(null, true);
    });

    this._passport = new passport.Passport();
    const dummyUser = (user, done) => { done(null, user); };
    this._passport.serializeUser(dummyUser);
    this._passport.deserializeUser(dummyUser);
    this._passport.use(strategy);
  }

  private static extractCallbackPath(callbackURL: url.Url): string {
    const {hostname, pathname} = callbackURL;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      console.log('Callback url is not bound to localhost!');
    } else if (!pathname) {
      throw new Error('No path in callback url!');
    }
    console.log(pathname);
    return pathname || "";
  }

  public hookServer(app: express.Express, authEntryPath: string, authorizedHandler: express.Handler) {
    if (authEntryPath === this._pathname) {
      throw new Error('authEntryPath cannot be equal to callbackPath!');
    }

    app.use(this._passport.initialize());
    app.use(this._passport.session());

    app.get(authEntryPath, this._passport.authenticate('oauth2'));
    app.get(this._pathname,
            this._passport.authenticate('oauth2', { failureRedirect: '/login' }),
            authorizedHandler);
  }

  public getTokenWrapper(): TokenWrapper {
    return this._tokenWrapper;
  }
}
