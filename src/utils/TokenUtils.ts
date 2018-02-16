import * as passport from 'passport-oauth2';

export class AuthTokenRefresh {
  private _strategies: any = {};
  public use(strategy: passport.Strategy);
  public use(name: string, strategy: passport.Strategy);

  public use(nameOrStrategy: string | passport.Strategy, strategy?: passport.Strategy) {
    let name: string;
    if (typeof nameOrStrategy === 'string') {
      name = nameOrStrategy
      strategy = strategy as passport.Strategy;
    } else {
      name = nameOrStrategy.name;
      strategy = nameOrStrategy;
    }

    const wideCast = (strategy as any);
    const OAuth2 = wideCast._oauth2.constructor;

    this._strategies[name] = {
      strategy,
      refreshOAuth2: new OAuth2(
        wideCast._oauth2._clientId,
        wideCast._oauth2._clientSecret,
        wideCast._oauth2._baseSite,
        wideCast._oauth2._authorizeUrl,
        wideCast._refreshURL || wideCast._oauth2._accessTokenUrl,
        wideCast._oauth2._customHeaders),
    };

  }

  public has(name: string) {
    return !!this._strategies[name];
  }

  public requestNewAccessToken(name: string, refreshToken: string, params?: any): Promise<string> {
    if (!params) {
      params = {};
    }

    return new Promise<string>((resolve, reject) => {
      const strategy = this._strategies[name];
      if (!strategy) {
        reject(new Error('Strategy was not registered to refresh a token'));
      }
      const wrapperCB = (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      };

      params.grant_type = 'refresh_token';

      strategy.refreshOAuth2.getOAuthAccessToken(refreshToken, params, wrapperCB);
    });
  }
}
