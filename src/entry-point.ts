import 'source-map-support/register';

import { Passport } from 'passport';
import { ExactStrategy } from './utils/ExactStrategy';
import { IUser, IUserCompound } from './utils/User';
import { Storage } from './utils/Storage';
import { AuthTokenRefresh } from './utils/TokenUtils';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as session from 'express-session';
import MailSettings from './utils/MailSettings';
import * as mustache from 'mustache';
import { ExactQuery } from './utils/Query';

import * as fs from 'fs';
const app = express();
const passport = new Passport();

const User = new Storage<IUserCompound>();
const tokenRefresh = new AuthTokenRefresh();

function readTemplate(filename: string): string {
  return fs.readFileSync( __dirname + '/../templates/' + filename, 'utf8');
}

function extractUserFromRequestSession(req: express.Request)  {
  if (req.user) {
    return req as express.Request & { user: IUserCompound};
  } else {
    throw new Error('Cannot extract user from session.');
  }
}

function extractMailSettingsFromRequestSession(req: express.Request)  {
  if (req.session) {
    if (req.session.mail) {
      return req as express.Request & { session: Express.Session & { mail: MailSettings }};
    }
  }
  throw new Error('Cannot extract mail settings from session')
}

const strategy = new ExactStrategy(
  {
  clientID: '1a8b565e-1f29-4bb1-ba28-fd6b16554bf0',
  // clientID: 'f5fcbe04-c19e-45c4-8aa5-f9316d70bb0d',
  clientSecret:  'OOexJOZHwJSv',
  // clientSecret: 'WhKLQKKQjkOY',
  callbackURL: 'http://home.jlicht.org:3000/auth/callback',
  // callbackURL: 'http://localhost:3000/auth/callback',
}, (accessToken, refreshToken, profile, done) => {
  User.findOrCreate(profile.UserID,
                    {accessToken, refreshToken, profile} ,
                    (err, user) => {
                      return done(err, user);
                    });
});

const exactQuery = new ExactQuery(strategy.baseUrl);

app.use(express.static('public'));
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


function ensureSession(req: Express.Request, res: Express.Response, next: Function) {
  if (!req.session) {
    (res as any).status(500).send({
      success: false,
      message: 'OMG no session, this will NOT work.',
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
    <li><a href='/name2'>name2</a></li>\
    <li><a href='/logged-in'>logged-in</a></li>\
    <li><a href='/logout'>logout</a></li>\
    <li><a href='/mail-form.html'>Enter mail settings</a></li>\
    <li><a href='/get-settings'>Review mail settings</a></li>\
    <li><a href='/accounts'>List accounts</a></li>\
    <li><a href='/accbal'>List accounts balances</a></li>\
  </ul>";

  res.send(html);
});

app.get('/logout', (req, res) => {
  if (req.session) {
  req.session.destroy(() => console.log('Somebody logged out'));
  }
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
    try {
      let { user } = extractUserFromRequestSession(req);
      const html = `<p>Hello,friend ${req.user.profile.FullName}!</p>`;
      res.send(html);
    }
    catch(e) {
      const html = `<p>Hello,stranger!</p>`;
      res.send(html);
    }
  },
);


app.get('/name2', ensureLoggedIn, async (req, res) => {
    try {
      const { user } = extractUserFromRequestSession(req);
      const me = await exactQuery.getMe(user);
      const html = `<p>Hello,friend ${me}!</p>`;
      res.send(html);
    }
    catch(e) {
      const html = `<p>Hello,stranger!</p>`;
      res.send(html);
    }
  },
);

app.get('/logged-in', ensureLoggedIn, async (req, res) => {
  let { user } = extractUserFromRequestSession(req);
  const accessToken = await tokenRefresh.requestNewAccessToken('exact', user.refreshToken);
  user = await User.updateByIdPromise(user.profile.UserID, { accessToken });
  const html = `<pre>${JSON.stringify(user)}</pre>`;
  res.send(html);
});

app.get('/logged-in', ensureLoggedIn, async (req, res) => {
  let { user } = extractUserFromRequestSession(req);
  const accessToken = await tokenRefresh.requestNewAccessToken('exact', user.refreshToken);
  user = await User.updateByIdPromise(user.profile.UserID, { accessToken });
  const html = `<pre>${JSON.stringify(user)}</pre>`;
  res.send(html);
});

app.get('/get-settings', async (req, res) => {
  let html;
  try {
    const { session: {mail}} = extractMailSettingsFromRequestSession(req);
    html = `<pre>${JSON.stringify(mail)}</pre>`;
  } catch (e) {
    html = `<pre>No settings yet</pre>`;
  }
  res.send(html);
});

app.post('/save-settings', ensureSession, (req: express.Request, res: express.Response) => {
  const { server, email, password} = req.body;
  const mailSettings = new MailSettings( server, email, password);
  req.session!.mail = mailSettings;
  res.redirect('/');
});

app.get('/accounts', ensureLoggedIn, async (req: express.Request , res: express.Response) => {

  const session = req.session!;
  let accounts;
  res.type('html');
  try {
    console.log('starting listing');
    res.write('Listing all accounts...<br><br>\n');
    const { user } = extractUserFromRequestSession(req);
    console.log('starting user stuff');
    if(!session) {
      console.log('wtf no session');
    }
    if (!session.accounts) {
      console.log('not cached');
      session.accounts = (await exactQuery.getAccounts(user)).reverse();
    }
    accounts = session.accounts;

    console.log(`Accounts len: ${accounts.length}`);
    const template = `<table>{{#.}}<tr>
      <td>{{Code}}</td>
      <td><a href="/account/{{ID}}">{{Name}}</a></td>
      <td>{{Email}}</td>
      <td><a href="/trans/{{ID}}">Transactions</a></td>
      <td><a href="/preview-mail/{{ID}}">Preview mail</a></td>
      <td><a href="/send-mail/{{ID}}">Send mail</a></td>
      </tr>{{/.}}</table>`;
    const html = mustache.render(template, accounts);
    res.write(html);
  } catch (e) {
    res.write('ERROR: ' + JSON.stringify(e));
  }
  res.end();
});


app.get('/account/:accId', ensureLoggedIn, async (req: express.Request, res: express.Response) => {
  const { user } = extractUserFromRequestSession(req);
  return res.redirect(exactQuery.generateExactContactLink(user, req.params.accId));
});


app.get('/preview-mail/:accId/', ensureLoggedIn, async (req: express.Request, res: express.Response) => {
  res.type('html');
  res.charset = 'utf-8';
  try {
    const { user } = extractUserFromRequestSession(req);
    const account = await exactQuery.getAccount(user, req.params.accId);
    const trans = await exactQuery.getTransactionsObj(user, req.params.accId);
    res.write((await makeIncassoMail(account, trans)).html); //TODO
  } catch (e) {
    res.write('ERROR: ' + JSON.stringify(e));
  }
  res.end();
});


app.get('/send-mail/:accId', ensureLoggedIn, async (req: express.Request, res: express.Response) => {
  try {
    let { session: {mail}} = extractMailSettingsFromRequestSession(req);
    mail = new MailSettings(mail._server, mail._email, mail._password);
    const { user } = extractUserFromRequestSession(req);
    const account = await exactQuery.getAccount(user, req.params.accId);
    const trans = await exactQuery.getTransactionsObj(user, req.params.accId); // TODO caching
    const email = await makeIncassoMail(account, trans);
    const info = await mail.getTransporter().sendMail(email);
    console.log('Message %s sent: %s', info.messageId, info.response);
    res.json({ message: 'All okay'});
  } catch (e) {
    res.json(e);
    console.dir(e);
  }
});


app.get('/accbal/:id?', ensureLoggedIn, async (req: express.Request, res: express.Response) => {
  const MAX_HACK = 200; //TODO: change this
  res.type('html');
  res.charset = 'utf-8';
  try {
    let session = req.session!;
    const { user } = extractUserFromRequestSession(req);
    if (!session.accounts) {
      session.accounts = (await exactQuery.getAccounts(user)).reverse();
    }
    let accounts = session.accounts;
    const id = +req.params.id || 0;
    const prevLink = '/accbal/' + String(id-1);
    const nextLink = '/accbal/' + String(id+1);
    const minIterator = id * MAX_HACK;
    const maxIterator = minIterator + MAX_HACK;
    res.write('Retreiving account list...<br>\n');
    res.write('OK, got ' + accounts.length + ' accounts. Fetching transactions and computing balances... <br><br>\n');

    for (let i = minIterator; i < accounts.length && i < maxIterator; i++) {
      if (accounts[i].trans == null) {
        accounts[i].trans = await exactQuery.getTransactionsObj(user, accounts[i].ID);
        accounts[i].balance = accounts[i].trans.balance;
        accounts[i].balanceHTML = formatBalance(accounts[i].trans.balance);

        if (accounts[i].trans.balance !== 0) {
          accounts[i].MainBankAccount = await exactQuery.getAccountMainBankAccount(user, accounts[i].ID);
        }
      }

      // Display progress indicator
      if (i % 10 === 0) {
        res.write('.');
      }
    }

    res.write('<br><br>Done.<br><br>');
    res.write(`<br><br><a href="${prevLink}">previous page</a><br><br>`);
    res.write(`<br><br><a href="${nextLink}">next page</a><br><br>`);

    const template = `<table>{{#.}}<tr>
      <td style="text-align: right;">{{Code}}</td>
      <td><a href="/account/{{ID}}">{{Name}}</a></td>
      <td>{{Email}}</td>
      <td>{{MainBankAccount.IBAN}}</td>
      <td style="text-align: right;">{{{balanceHTML}}}</td>
      <td><a href="/trans/{{ID}}">Transactions</a></td>
      </tr>{{/.}}</table>`;

    let debcred = accounts.filter((x) => x.balance !== undefined && x.balance !== 0);
    res.write('Got ' + debcred.length + ' people with non-zero balance.');
    res.write('<br><br>');

    // Sort by name (ascending)
    debcred = debcred.sort( (a, b) => {
      if (a.Name < b.Name) {
        return -1;
      } else if (a.Name > b.Name) {
        return 1;
      }
      return 0;
    });

    const creditors = debcred.filter((x) => x.balance > 0);
    res.write('Got ' + creditors.length + ' creditors: <br><br>');
    res.write(mustache.render(template, creditors));
    res.write('<br><br>');

    const debitors = debcred.filter((x) => x.balance < 0);
    res.write('Got ' + debitors.length + ' debitors: <br><br>');
    res.write(mustache.render(template, debitors));
    res.write('<br><br>');

  } catch (e) {
    res.write('ERROR: ' + JSON.stringify(e));
  }
  res.end();
});

const formatBalance = (b): string => {
  b = Math.round(b * 100) / 100;
  if (b < 0) {
    return '<span style="color: red">' + b.toFixed(2) + '</span>';
  } else {
    return '<span style="color: green">' + b.toFixed(2) + '</span>';
  }
};

const formatTransactionTable = async (trans, lastYearOnly: boolean) => {
  const years = [...new Set(trans.tList.map((x) => x.FinancialYear))];
  const lastYear = years[years.length - 1];

  let tList = trans.tList;
  if (lastYearOnly) {
    tList = tList.filter((x) => x.FinancialYear === lastYear);
  }

  // Convert a Microsoft AJAX date string (from the Exact API) to a human readable format
  // e.g. "/Date(012345687)/" to "2017-05-26"
  const fixDate = (d) => {
    const date = new Date(parseInt(d.substr(6), 10));
    return date.toISOString().substring(0, 10);
  };

  for (const t of tList) {
    t.niceDate = fixDate(t.Date);
    t.balanceNegStr = ((-t.AmountDC < 0) ? (-t.AmountDC).toFixed(2) : '');
    t.balancePosStr = ((-t.AmountDC >= 0) ? (-t.AmountDC).toFixed(2) : '');
  }

  const outSum = tList.map((x) => (-x.AmountDC < 0) ? -x.AmountDC : 0).reduce((a, b) => a + b, 0);
  const inSum = tList.map((x) => (-x.AmountDC > 0) ? -x.AmountDC : 0).reduce((a, b) => a + b, 0);
  const netSum = inSum + outSum;

  let startBalance = trans.balance - netSum;
  let balance = trans.balance;

  // Needed to avoid "-0.00"
  // !! Use only after calculations are done since precision is lost
  startBalance = Math.round(startBalance * 100) / 100;
  balance = Math.round(balance * 100) / 100;

  const params = {
    tList,
    outSumStr: outSum.toFixed(2),
    inSumStr: inSum.toFixed(2),
    startBalanceNegStr: ((startBalance < 0) ? startBalance.toFixed(2) : ''),
    startBalancePosStr: ((startBalance >= 0) ? startBalance.toFixed(2) : ''),
    balanceNegStr: ((balance < 0) ? balance.toFixed(2) : ''),
    balancePosStr: ((balance >= 0) ? balance.toFixed(2) : ''),
  };

  const template = readTemplate('transaction_table');
  return new Promise((resolve, reject) => {
    resolve(mustache.render(template, params));
  });
};

app.get('/trans/:accId', ensureLoggedIn, async (req: express.Request, res: express.Response) => {
  res.type('html');
  res.charset = 'utf-8';
  try {

    const { user } = extractUserFromRequestSession(req);
    const account = await exactQuery.getAccount(user, req.params.accId);
    res.write('Listing transaction lines for ' + account.Name + ':<br><br>\n');
    console.log('listing');
    const trans = await exactQuery.getTransactionsObj(user, req.params.accId);
    res.write( await formatTransactionTable(trans, false));
    res.write('<br><br><a href="/preview-mail/' + account.ID + '">Preview Email</a>');
  } catch (e) {
    res.write('ERROR: ' + JSON.stringify(e));
  }
  res.end();
});

const makeIncassoMail = async (account, trans) => {
  const variables = {
    name: account.Name,
    amount: Math.abs(trans.balance).toFixed(2),
    balance: Number(trans.balance.toFixed(2)),
    balanceColored: formatBalance(trans.balance),
    transactions: await formatTransactionTable(trans, true),
  };

  let template = readTemplate('standard_email');
  if (trans.balance <= -100) {
    template = readTemplate('extreme_email');
  } else if (trans.balance > 0) {
    template = readTemplate('creditor_email');
  } else if (trans.balance == 0) {
    template = readTemplate('zero_email');
  }
  const body = mustache.render(template, variables);

  const mailOptions = {
    from: '"Automatic Invoice AEGEE-Delft" <invoice@aegee-delft.nl>',
    to: `"${account.Name}" <${account.Email}>`,
    subject: 'AEGEE-Delft Personal Financial Overview',
    text: 'Please see HTML body',
    html: body,
    headers: {
      'Reply-To': '"Treasurer AEGEE-Delft" <treasurer@aegee-delft.nl>',
    },
  };

  return mailOptions;
};

const server = app.listen(3000, () => {
  console.log('Borderless exact listening at http://%s:%s',
              server.address().address, server.address().port);
});
