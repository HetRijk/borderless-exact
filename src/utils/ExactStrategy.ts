import { Strategy } from 'passport';
import * as OAuth2Strategy from 'passport-oauth2';
import { OAuth2 } from 'oauth';
import * as restlerPromise from 'restler-promise';

import * as util from 'util';

const restler = restlerPromise(Promise);

export interface IExactOptions {// extends OAuth2Strategy.StrategyOptions {
  clientID: string;
  clientSecret: string;
  baseUrl?: string;
  callbackURL: string;
}

export class ExactStrategy extends OAuth2Strategy {
  public readonly name: string;
  public readonly baseUrl: string;

  constructor(options: IExactOptions, verify: OAuth2Strategy.VerifyFunction) {

    const revisedOptions: IExactOptions & OAuth2Strategy.StrategyOptions = {} as any;
    revisedOptions.passReqToCallback = false;
    revisedOptions.clientID = options.clientID;
    revisedOptions.clientSecret = options.clientSecret;
    revisedOptions.baseUrl = options.baseUrl || 'https://start.exactonline.nl';
    revisedOptions.callbackURL = options.callbackURL;

    revisedOptions.authorizationURL = revisedOptions.baseUrl + '/api/oauth2/auth';
    revisedOptions.tokenURL = revisedOptions.baseUrl + '/api/oauth2/token';
    super(revisedOptions, verify);
    console.log(JSON.stringify(revisedOptions));
    this.name = 'exact';
    this.baseUrl = revisedOptions.baseUrl;
  }

  private extractQueryData(reply): any {
    if (!reply.data.d) {
      throw new Error('Reply does not have correct form');
    }
    let ret = reply.data.d;
    if ('results' in reply.data.d) {
      ret = reply.data.d.results;
    }
    return ret;
  }

  public async userProfile(accessToken: string, done: (err?: Error | null, profile?: any) => void): Promise<void> {
    try {
      // console.log(JSON.stringify({url: this.baseUrl + '/api/v1/current/Me',
      //                             accessToken,
      //                             headers: { accept: 'application/json' },
      //                             query: {}}));
      const reply = await restler.get(this.baseUrl + '/api/v1/current/Me',
                               { accessToken,
                                 headers: { accept: 'application/json' },
                                 query: {},
                               });

      return done(null, this.extractQueryData(reply)[0]);
    } catch (e) {
      return done(e);
    }
  }
}
//   options.baseUrl = options.baseUrl || 'https://start.exactonline.nl';
//   options.authorizationURL = options.baseUrl + '/api/oauth2/auth';
// options.tokenURL = options.baseUrl + '/api/oauth2/token';
