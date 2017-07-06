// Libraries
import * as passport from 'passport';
import * as OAuth2Strategy from 'passport-oauth2';
import * as express from 'express';
import * as opn from 'opn';

// Homebrew
import TokenWrapper from './utils/TokenWrapper';
import Exact from '../Exact';

// Constants
const app = express();
const CLIENT_ID = 'f5fcbe04-c19e-45c4-8aa5-f9316d70bb0d';
const CLIENT_SECRET = 'WhKLQKKQjkOY';
const CB_URL = 'http://localhost:3000/auth/callback';
const TOKEN_URL = 'https://start.exactonline.nl/api/oauth2/token';
const tokenWrapper = new TokenWrapper(TOKEN_URL, CLIENT_ID, CLIENT_SECRET);

var e; // Exact


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
    e = new Exact(tokenWrapper);
    await e.testInternet();
    await e.initAPI()
    let myName = await e.getMyName();
    res.type('html');
    res.write('Logged in as ' + myName + '<br><br>');

    //let contacts = await e.listContacts();
    let contacts = await e.query('crm/Accounts', {
      $select: 'ID,Code,Name',
      $orderby: 'Code',
      $filter: 'IsSales eq true and IsSupplier eq true',
    });
    //contacts = contacts.filter(x => x.IsSales && x.IsSupplier);

    let names = contacts.map(x => '<a href="/trans/' + x.ID + '">' + x.Code + ' - ' + x.Name + '</a>');
    res.write('Debiteuren/Crediteuren:<br>');
    res.write(names.join('<br>\n'));

    res.end();
  } catch(e) {
    res.json(e);
  }
});

app.get('/user/:accId', async (req: express.Request, res: express.Response) => {
  try {
      let contact = await e.query('crm/Accounts', {
          $filter: "ID eq guid'" + req.params.accId + "'",
          $top: '1',
        });
      res.json(contact);
  } catch(e) {
    res.json(e);
  }
});

let fixDate = (d) => {
  var date = new Date(parseInt(d.substr(6)));
  return date.toISOString().substring(0, 10);
}

let formatMoney = (n) => {
    let s = n < 0 ? "-" : "+";
    let str = Math.abs(n).toFixed(2);
    return '€ ' + s + "&nbsp;&nbsp;&nbsp;&nbsp;".substring(0, 6*(6 - str.length)) + str;
  };

app.get('/trans/:accId/:year*?', async (req: express.Request, res: express.Response) => {
  try {
      res.type('html');
      res.charset = 'utf-8';

      let contact = await e.query('crm/Accounts', {
          $filter: "ID eq guid'" + req.params.accId + "'",
          $top: '1',
        });
      contact = contact[0];
      res.write('Listing transaction lines for ' + contact.Name + ':<br><br>\n');

      let trans = await e.query('financialtransaction/TransactionLines', {
          $select: 'Description,AmountDC,Date,FinancialYear,FinancialPeriod',
          $filter: "Account eq guid'" + req.params.accId + "'" +
                   " and (GLAccountCode eq trim('1400') or GLAccountCode eq trim('1500'))", // Debiteuren of Crediteuren grootboeken
          $orderby: 'Date',
        });

      let years = [...new Set(trans.map(x => x.FinancialYear))];
      res.write(years.map(x => '<a href="/trans/' + req.params.accId + '/' + x + '">' + x + '</a> ').join(' '));
      res.write('<br><br>');

      let saldo = trans.map(x => -x.AmountDC).reduce((a,b)=>a+b, 0);

      let yearSaldo = 0;
      if('year' in req.params && req.params.year) {
        trans = trans.filter(x => x.FinancialYear == req.params.year);
        yearSaldo = trans.map(x => -x.AmountDC).reduce((a,b)=>a+b, 0);
      }
      let startSaldo = saldo - yearSaldo;

      let tlist = trans
        .map(x => x.FinancialYear + '.' + x.FinancialPeriod + ' - ' + fixDate(x.Date)
        + " - <kbd>" + formatMoney(-x.AmountDC) + '</kbd> - ' + x.Description);

      //console.dir(contacts);
      res.write(tlist.join('<br>\n'));
      res.write('<br><br>');
      res.write('Start saldo: ' + formatMoney(startSaldo) + '<br>');
      res.write('Year saldo: ' + formatMoney(yearSaldo) + '<br>');
      res.write('Saldo: ' + formatMoney(saldo));
      res.end();
  } catch(e) {
    console.dir(e);
    res.json(e);
  }
});



app.listen(3000,  () => {
  console.log('Example app listening on port 3000!')
  opn('http://localhost:3000/auth/');
});
