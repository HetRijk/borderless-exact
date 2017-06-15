// Source maps and debugging tools
import 'source-map-support/register';

// Libraries
import * as passport from 'passport';
import * as OAuth2Strategy from 'passport-oauth2';
import * as express from 'express';
import * as opn from 'opn';

// Homebrew
import TokenWrapper from './utils/TokenWrapper';
import Exact from '../Exact';
import AuthBootstrap from './utils/auth-bootstrap';

// Constants
const app = express();

const injector = new AuthBootstrap();
const tokenWrapper = injector.getTokenWrapper();
injector.hookServer(app, '/auth', (req: express.Request , res: express.Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(JSON.stringify({ message: 'auth complete' }) +
           '<a href="/verify">verify</a> \
<a href="/test">test</a>');
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

app.get('/test', async (req: express.Request , res: express.Response) => {
  try {
    res.setHeader('Content-Type', 'text/html');
    var e = new Exact(tokenWrapper);
    await e.testInternet();
    await e.initAPI()
    await e.getMe();
    let myName = await e.getMyName();
    let contacts = await e.listContacts();
    let names = contacts.map(x => x.AccountName);
    //console.dir(contacts);
    res.send(names.join('<br>\n'));
  } catch(e) {
    res.send(JSON.stringify(e));
  }
});

app.listen(3000,  () => {
  console.log('Example app listening on port 3000!')
  opn('http://localhost:3000/auth/');
});
