// Source maps and debugging tools
import 'source-map-support/register';

// Libraries
import * as passport from 'passport';
import * as OAuth2Strategy from 'passport-oauth2';
import * as express from 'express';
import * as opn from 'opn';
// import * as multer from 'multer';
import * as bodyParser from 'body-parser';
import * as mustache from 'mustache';
import * as fs from 'fs';

// Homebrew
import TokenWrapper from '../utils/TokenWrapper';
import AuthBootstrap from '../utils/auth-bootstrap';
import Exact from './Exact';
import MailSettings from './MailSettings';

// Constants
const app = express();
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Globals
let e: Exact;
let mailSettings: MailSettings;
let accounts: any; // list of accounts (cached)

function readTemplate(filename: string): string {
  return fs.readFileSync( __dirname + '/../../templates/' + filename, 'utf8');
}

const formatBalance = (b): string => {
  b = Math.round(b * 100) / 100;
  if (b < 0) {
    return '<span style="color: red">' + b.toFixed(2) + '</span>';
  } else {
    return '<span style="color: green">' + b.toFixed(2) + '</span>';
  }
};

const injector = new AuthBootstrap();
const tokenWrapper = injector.getTokenWrapper();
injector.hookServer(app, '/auth', async (req: express.Request , res: express.Response) => {
  try {
    e = new Exact(tokenWrapper);
    await e.testInternet();
    await e.initAPI();
    res.redirect('/');
  } catch (e) {
    res.json(e);
  }
});

app.get('/', async (req: express.Request , res: express.Response) => {
  try {
    if (!e) {
      res.redirect('/auth');
    }

    res.type('html');
    res.write('Logged in as ' + await e.getMyName() + '.<br>\n');
    res.write('<br>\n')
    res.write('<a href="/mail-form.html">Enter mail settings</a><br>\n');
    res.write('<br>\n');
    res.write('<a href="/accounts">List accounts</a><br>\n');
    res.write('<a href="/accbal">List account balances</a><br>\n');
    res.write('<br>\n');

    res.end();
  } catch (e) {
    res.json(e);
  }
});

app.get('/crash',  (req: express.Request , res: express.Response) => {
  res.type('html');
  res.write('<br>\n')
  res.write('<p>crashing...</p>')
  res.end();
  process.exit(7331);
});

app.post('/save-settings', (req: express.Request, res: express.Response) => {
  const { server, email, password} = req.body;
  mailSettings = new MailSettings( server, email, password); // TODO(@jlicht): filthy global
  res.redirect('/');
});

app.get('/verify', async (req: express.Request , res: express.Response) => {
  try {
    res.json(await tokenWrapper.getTokenPromise());
  } catch (e) {
    res.json(e);
  }
});

app.get('/accounts', async (req: express.Request , res: express.Response) => {
  res.type('html');
  try {
    res.write('Listing all accounts...<br><br>\n');

    if(accounts == undefined) {
      accounts = await e.getAccounts();
      accounts = accounts.reverse();
    }
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

app.get('/account/:accId', async (req: express.Request, res: express.Response) => {
  return res.redirect(e.generateExactContactLink(req.params.accId));
});

app.get('/preview-mail/:accId/', async (req: express.Request, res: express.Response) => {
   res.type('html');
   res.charset = 'utf-8';
   try {
     const account = await e.getAccount(req.params.accId);
     const trans = await e.getTransactionsObj(req.params.accId);
     res.write((await makeIncassoMail(account, trans)).html);
   } catch (e) {
     res.write('ERROR: ' + JSON.stringify(e));
   }
  res.end();
});

app.get('/send-mail/:accId', async (req: express.Request, res: express.Response) => {
  try {
    if (!mailSettings) {
      throw new Error('Invalid State Error: mailsettings have not been setup.');
    }
    const account = await e.getAccount(req.params.accId);
    const trans = await e.getTransactionsObj(req.params.accId); // TODO caching
    const email = await makeIncassoMail(account, trans);
    const info = await mailSettings.getTransporter().sendMail(email);
    console.log('Message %s sent: %s', info.messageId, info.response);
    res.json({ message: 'All okay'});
  } catch (e) {
    res.json(e);
    console.dir(e);
  }
});

const MAX_HACK = 200; //TODO: change this
app.get('/accbal/:id?', async (req: express.Request, res: express.Response) => {
  const id = +req.params.id || 0;
  const prevLink = '/accbal/' + String(id-1);
  const nextLink = '/accbal/' + String(id+1);
  const minIterator = id * MAX_HACK;
  const maxIterator = minIterator + MAX_HACK;
  res.type('html');
  res.charset = 'utf-8';
  try {
    res.write('Retreiving account list...<br>\n');
    if (accounts == null) {
      accounts = await e.getAccounts();
      accounts = accounts.reverse();
    }
    res.write('OK, got ' + accounts.length + ' accounts. Fetching transactions and computing balances... <br><br>\n');

    for (let i = minIterator; i < accounts.length && i < maxIterator; i++) {

      if (accounts[i].trans == null) {
        accounts[i].trans = await e.getTransactionsObj(accounts[i].ID);
        accounts[i].balance = accounts[i].trans.balance;
        accounts[i].balanceHTML = formatBalance(accounts[i].trans.balance);

        if (accounts[i].trans.balance !== 0) {
          accounts[i].MainBankAccount = await e.getAccountMainBankAccount(accounts[i].ID);
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



// Turn an array of transactions into an HTML formatted table
const formatTransactionTable = (trans, lastYearOnly : boolean): Promise<string> => {
  const years = [...new Set(trans.tList.map((x) => x.FinancialYear))];
  const lastYear = years[years.length-1];

  let tList = trans.tList;
  if (lastYearOnly) {
    tList = tList.filter((x) => x.FinancialYear === lastYear);
  }

  // Convert a Microsoft AJAX date string (from the Exact API) to a human readable format
  // e.g. "/Date(012345687)/" to "2017-05-26"
  const fixDate = (d) => {
    const date = new Date(parseInt(d.substr(6)));
    return date.toISOString().substring(0, 10);
  };

  for (let t of tList) {
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
    tList: tList,
    outSumStr: outSum.toFixed(2),
    inSumStr: inSum.toFixed(2),
    startBalanceNegStr: ((startBalance < 0) ? startBalance.toFixed(2) : ''),
    startBalancePosStr: ((startBalance >= 0) ? startBalance.toFixed(2) : ''),
    balanceNegStr: ((balance < 0) ? balance.toFixed(2) : ''),
    balancePosStr: ((balance >= 0) ? balance.toFixed(2) : ''),
  }

  const template = readTemplate('transaction_table');
  return new Promise((resolve, reject) => {
    resolve(mustache.render(template, params));
  });
};

app.get('/trans/:accId', async (req: express.Request, res: express.Response) => {
  res.type('html');
  res.charset = 'utf-8';
  try {
    const account = await e.getAccount(req.params.accId);
    res.write('Listing transaction lines for ' + account.Name + ':<br><br>\n');
    const trans = await e.getTransactionsObj(req.params.accId);
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
  } else if(trans.balance > 0) {
    template = readTemplate('creditor_email');
  } else if(trans.balance == 0) {
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

app.listen(3000,  () => {
  console.log('Listening on http://localhost:3000/');
  opn('http://localhost:3000/');
});
