// Source maps and debugging tools
import 'source-map-support/register';

// Libraries
import * as passport from 'passport';
import * as OAuth2Strategy from 'passport-oauth2';
import * as express from 'express';
import * as opn from 'opn';
import * as nodemailer from 'nodemailer';
// import * as multer from 'multer';
import * as bodyParser from 'body-parser';

// Homebrew
import TokenWrapper from '../utils/TokenWrapper';
import AuthBootstrap from '../utils/auth-bootstrap';
import Exact from './Exact';
import MailSettings from './MailSettings';

// Constants
const app = express();
app.use(express.static('public'));
//const upload = multer();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Globals
let e : Exact;
let mailSettings : MailSettings;

//app.use( bodyParser.json() );       // to support JSON-encoded bodies
//app.use(express.bodyParser());

// app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
//   extended: true
// }));

const injector = new AuthBootstrap();
const tokenWrapper = injector.getTokenWrapper();
injector.hookServer(app, '/auth', async (req: express.Request , res: express.Response) => {
  try {
    e = new Exact(tokenWrapper);
    await e.testInternet();
    await e.initAPI()
    res.redirect('/');
  } catch(e) {
    res.json(e);
  }
});


app.get('/', async (req: express.Request , res: express.Response) => {
  try {
    if(!e) {
      res.redirect('/auth');
    }

    res.type('html');
    res.write('Logged in as ' + await e.getMyName() + '.<br><br>\n');
    res.write('<a href="/verify">Verify</a><br>\n');
    res.write('<a href="/users">List users</a><br>\n');
    res.write('<a href="/mail-form.html">Enter mail settings</a><br>\n');
    res.write('<a href="/send-mail">Send test email</a><br>\n');
    res.end();
  } catch(e) {
    res.json(e);
  }
});

app.post('/save-settings', (req: express.Request, res: express.Response) => {
  let {server, email, password} = req.body;
  mailSettings = new MailSettings( server, email, password); // TODO(@jlicht): filthy global
  res.redirect('/');
});

app.get('/send-mail', async (req: express.Request, res: express.Response) => {
  try {
    if(!mailSettings) {
      throw new Error("Invalid State Error: mailsettings have not been setup.");
    }
    let mailOptions = {
      from: '"Treasurer-auto AEGEE-Delft" <invoice@aegee-delft.nl>',
      to: '"Jelle Test" <jlicht@posteo.net>',
      subject: 'Test mailsysteem',
      text: 'message - test',
      html: 'html <b> test </b>',
    };

    let info = await mailSettings.getTransporter().sendMail(mailOptions);
    console.log('Message %s sent: %s', info.messageId, info.response);
    res.json({});
  } catch(e) {
    res.json(e);
    console.dir(e);
  }
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

app.get('/users', async (req: express.Request , res: express.Response) => {
  try {
    res.type('html');
    res.write('Listing all users...<br>\n');

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

// Convert a Microsoft AJAX date string (from the Exact API) to a human readable format
// e.g. "Date(012345687)" to "2017-05-26"
let fixDate = (d) => {
  var date = new Date(parseInt(d.substr(6)));
  return date.toISOString().substring(0, 10);
}

let formatMoney = (n) => {
  let s = n < 0 ? "-" : "+";
  let str = Math.abs(n).toFixed(2);
  return '€ ' + s + "&nbsp;&nbsp;&nbsp;&nbsp;".substring(0, 6*(6 - str.length)) + str;
};


// Turn an array of transactions into an HTML formatted table
let makeTransactionTable = (trans, endSaldo) : string => {
  let tblStr = '<table style="border-spacing: 7pt 0pt">\n';

  tblStr = tblStr + "<tr>"
    + '<th style="text-align: left">' + "Periode</th>"
    + '<th style="text-align: left">' + "Datum</th>"
    + '<th style="text-align: left">' + "Omschrijving</th>"
    + '<th style="text-align: right">' + "Uit (€)</th>"
    + '<th style="text-align: right">' + "In (€)</th>"
    + "</tr>\n";

  let rows = trans.map(x => "<tr>"
                       + "<td>" + x.FinancialYear + '.' + x.FinancialPeriod + "</td>"
                       + "<td>" + fixDate(x.Date) + "</td>"
                       + "<td>" + x.Description + "</td>"
                       + '<td style="color: red; text-align: right">' + ((-x.AmountDC < 0) ? (-x.AmountDC).toFixed(2) : "") + "</td>"
                       + '<td style="color: green; text-align: right">' + ((-x.AmountDC >= 0) ? (-x.AmountDC).toFixed(2) : "") + "</td>"
                       + "</tr>\n");

  tblStr = tblStr + rows.join('');

  let outSum = trans.map(x => (-x.AmountDC < 0) ? -x.AmountDC : 0).reduce((a,b)=>a+b, 0);
  let inSum = trans.map(x => (-x.AmountDC > 0) ? -x.AmountDC : 0).reduce((a,b)=>a+b, 0);
  let saldo = inSum + outSum;

  tblStr = tblStr + "<tr><td>&nbsp;</td></tr>\n";

  tblStr = tblStr + "<tr>"
    + "<td>" + "</td>"
    + "<td>" + "</td>"
    + '<th style="text-align: left">' + "Totaal" + "</th>"
    + '<td style="color: red; text-align: right">' + outSum.toFixed(2) + "</td>"
    + '<td style="color: green; text-align: right">' + inSum.toFixed(2) + "</td>"
    + "</tr>\n";

  tblStr = tblStr + "<tr><td>&nbsp;</td></tr>\n";

  let startSaldo = 0;
  if(endSaldo) {
    startSaldo = endSaldo - saldo;
  }

  let posnul = (d) => (d > 0 || d.toFixed(2) == "0.00" || d.toFixed(2) == "-0.00");

  tblStr = tblStr + "<tr>"
    + "<td>" + "</td>"
    + "<td>" + "</td>"
    + '<th style="text-align: left">' + "Beginsaldo:" + "</th>"
    + '<td style="color: red; text-align: right">' + ((startSaldo < 0) ? startSaldo.toFixed(2) : "") + "</td>"
    + '<td style="color: green; text-align: right">' + (posnul(startSaldo) ? startSaldo.toFixed(2) : "") + "</td>"
    + "</tr>\n";

  tblStr = tblStr + "<tr>"
    + "<td>" + "</td>"
    + "<td>" + "</td>"
    + '<th style="text-align: left">' + "Saldo:" + "</th>"
    + '<td style="color: red; text-align: right">' + ((saldo < 0) ? saldo.toFixed(2) : "") + "</td>"
    + '<td style="color: green; text-align: right">' + (posnul(saldo) ? saldo.toFixed(2) : "") + "</td>"
    + "</tr>\n";

  tblStr = tblStr + "</table>\n";

  return tblStr;
}

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

    // Compute saldo as the sum of all transaction amounts
    let saldo = trans.map(x => -x.AmountDC).reduce((a,b)=>a+b, 0);

    let yearSaldo = 0;
    if('year' in req.params && req.params.year) {
      trans = trans.filter(x => x.FinancialYear == req.params.year);
      yearSaldo = trans.map(x => -x.AmountDC).reduce((a,b)=>a+b, 0);
    }
    let startSaldo = saldo - yearSaldo;

    let tlist = trans
      .map(x => x.FinancialYear + '.' + x.FinancialPeriod + ' | ' + fixDate(x.Date)
           + " | <kbd>" + formatMoney(-x.AmountDC) + '</kbd> | ' + x.Description);

    //console.dir(contacts);
    res.write(tlist.join('<br>\n'));
    res.write('<br><br>');
    res.write(makeTransactionTable(trans, saldo));
    res.write('<br><br>');

    res.write('Start saldo: ' + formatMoney(startSaldo) + '<br>');
    res.write('Year saldo: ' + formatMoney(yearSaldo) + '<br>');
    res.write('End saldo: ' + formatMoney(saldo));
    res.end();
  } catch(e) {
    console.dir(e);
    res.json(e);
  }
});



app.listen(3000,  () => {
  console.log('Listening on http://localhost:3000/');
  opn('http://localhost:3000/');
});
