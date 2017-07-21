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
import * as mustache from 'mustache';
import * as readFile from 'fs-readfile-promise';

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
    res.write('<a href="/verify">Verify Exact authentication</a><br>\n');
    res.write('<a href="/accounts">List debitor/creditor accounts</a><br>\n');
    res.write('<a href="/mail-form.html">Enter mail settings</a><br>\n');
    res.write('<a href="/send-mail">Send test email</a><br>\n');
    res.write('<a href="/accbal">List account balances (limited)</a><br>\n');
    res.write('<a href="/incasso-script">Incasso script (limited)</a><br>\n');
    res.write('<a href="/trans/e8acbe7f-ceb0-42a7-8d5d-9e921e281c56">Example transactions</a><br>\n');
    res.write('<a href="/preview-mail/e8acbe7f-ceb0-42a7-8d5d-9e921e281c56">Example mail</a><br>\n');


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

let roundMoney = (b) => {
  return Math.round(b * 100) / 100;
}

let formatBalance = (b) : string => {
  b = roundMoney(b);
  if (b < 0)
    return '<span style="color: red">' + b.toFixed(2) + '</span>';
  else
    return '<span style="color: green">' + b.toFixed(2) + '</span>';
}



app.get('/verify', async (req: express.Request , res: express.Response) => {
  try {
    res.json(await tokenWrapper.getTokenPromise());
  } catch(e) {
    res.json(e);
  }
});

app.get('/accounts', async (req: express.Request , res: express.Response) => {
  res.type('html');
  try {
    res.write('Listing all debitor/creditor accounts...<br>\n');

    let contacts = await e.getDebtors();
    let names = contacts.map(x =>
      x.Code + ' - ' + '<a href="/trans/' + x.ID + '">' + x.Name + '</a> (' + x.Email + ')' + ' <a href="/account/' + x.ID + '">Details</a>' );

    res.write('Debiteuren/Crediteuren:<br>');
    res.write(names.join('<br>\n'));
  } catch(e) {
    res.write('ERROR: ' + JSON.stringify(e));
  }
  res.end();
});

app.get('/account/:accId', async (req: express.Request, res: express.Response) => {
  try {
    let contact = await e.getAccount(req.params.accId);
    res.json(contact);
  } catch(e) {
    res.json(e);
  }
});

app.get('/accbal', async (req: express.Request, res: express.Response) => {
  res.type('html');
  res.charset = 'utf-8';
  try {
    res.write('Retreiving account list...<br>\n');
    let accounts = await e.getDebtors();
    res.write('Computing balances... <br><br>\n');

    accounts = accounts.reverse();
    for (let i = 0; i < 20; i++) {
      let account = accounts[i];
      let balance = await e.getAccountBalance(account.ID);
      let x = account;
      res.write(x.Code + ' - ' + '<a href="/trans/' + x.ID + '">' + x.Name + '</a> ' + formatBalance(balance));
      res.write('<br>\n');
    }

    res.write('<br><br>Done.');
  } catch(e) {
    res.write('ERROR: ' + JSON.stringify(e));
  }
  res.end();
});

app.get('/verify', async (req: express.Request , res: express.Response) => {
  try {
    res.json(await tokenWrapper.getTokenPromise());
  } catch(e) {
    res.json(e);
  }
});

app.get('/incasso-script', async (req: express.Request, res: express.Response) => {
  res.type('html');
  res.charset = 'utf-8';
  try {
    res.write('Retreiving account list...<br>\n');
    let accounts = await e.getDebtors();
    res.write('Processing accounts... <br><br>\n');

    let incassos = <any>[];
    let excassos = <any>[];
    let thugs = <any>[];
    let threshold = -100;

    accounts = accounts.reverse();
    for (let i = 0; i < 50; i++) {
      let account = accounts[i];
      let balance = await e.getAccountBalance(account.ID);

      let x = account;
      res.write(x.Code + ' - ' + '<a href="/trans/' + x.ID + '">' + x.Name + '</a> ' + formatBalance(balance));

      if (balance != 0) {
        if (account.Email == null) {
          res.write(' -- NO EMAIL LISTED');
        } else {
          res.write(' -- Ready to send mail to ' + x.Email);
        }

        if (balance > 0) {
          res.write(' - excasso ');
          excassos.push({account: account, amount: balance});
        } else {
          if (balance < threshold) {
            res.write(' - thug');
            thugs.push({account: account, amount: -balance});
          } else {
            res.write(' - incasso');
            incassos.push({account: account, amount: -balance});
          }
        }
      }

      res.write('<br>\n');
    }

    res.write('<br><br>Done.<br><br>');


    let sortfun = (a,b) => b.amount - a.amount; // descending
    excassos.sort(sortfun);
    incassos.sort(sortfun);
    thugs.sort(sortfun);

    res.write('Excassos: <br>');
    res.write(excassos.map(x => x.account.Name + '\t' + x.amount.toFixed(2)).join('<br>\n'));
    res.write('<br><br>');

    res.write('Incassos: <br>');
    res.write(incassos.map(x => x.account.Name + '\t' + x.amount.toFixed(2)).join('<br>\n'));
    res.write('<br><br>');

    res.write('Boeven: <br>');
    res.write(thugs.map(x => x.account.Name + '\t' + x.amount.toFixed(2)).join('<br>\n'));
    res.write('<br><br>');



  } catch(e) {
    res.write('ERROR: ' + JSON.stringify(e));
  }
  res.end();
});



let formatTransactionList = (trans) : string => {
  let formatMoney = (n) => {
    let s = n < 0 ? "-" : "+";
    let str = Math.abs(n).toFixed(2);
    return '€ ' + s + "&nbsp;&nbsp;&nbsp;&nbsp;".substring(0, 6*(6 - str.length)) + str;
  };

  // Convert a Microsoft AJAX date string (from the Exact API) to a human readable format
  // e.g. "/Date(012345687)/" to "2017-05-26"
  let fixDate = (d) => {
    var date = new Date(parseInt(d.substr(6)));
    return date.toISOString().substring(0, 10);
  }


  let tlist = trans.tList
    .map(x => x.FinancialYear + '.' + x.FinancialPeriod + ' | ' + fixDate(x.Date)
         + " | <kbd>" + formatMoney(-x.AmountDC) + '</kbd> | ' + x.Description);

  tlist = tlist.join('<br>\n');
  tlist = tlist + '<br><br>';

  let transSum = trans.map(x => -x.AmountDC).reduce((a,b)=>a+b, 0);

  tlist = tlist + 'Start balance: ' + formatMoney(trans.balance - transSum) + '<br>';
  tlist = tlist + 'Year balance: ' + formatMoney(transSum) + '<br>';
  tlist = tlist + 'End balance: ' + formatMoney(trans.balance);

  return tlist;
}


// Turn an array of transactions into an HTML formatted table
let formatTransactionTable = (trans) : string => {
  // Convert a Microsoft AJAX date string (from the Exact API) to a human readable format
  // e.g. "/Date(012345687)/" to "2017-05-26"
  let fixDate = (d) => {
    var date = new Date(parseInt(d.substr(6)));
    return date.toISOString().substring(0, 10);
  }

  let tblStr = '<table style="border-spacing: 7pt 0pt">\n';

  tblStr = tblStr + "<tr>"
    + '<th style="text-align: left">' + "Periode</th>"
    + '<th style="text-align: left">' + "Datum</th>"
    + '<th style="text-align: left">' + "Omschrijving</th>"
    + '<th style="text-align: right">' + "Uit (€)</th>"
    + '<th style="text-align: right">' + "In (€)</th>"
    + "</tr>\n";

  let rows = trans.tList.map(x => "<tr>"
                       + "<td>" + x.FinancialYear + '.' + x.FinancialPeriod + "</td>"
                       + "<td>" + fixDate(x.Date) + "</td>"
                       + "<td>" + x.Description + "</td>"
                       + '<td style="color: red; text-align: right">' + ((-x.AmountDC < 0) ? (-x.AmountDC).toFixed(2) : "") + "</td>"
                       + '<td style="color: green; text-align: right">' + ((-x.AmountDC >= 0) ? (-x.AmountDC).toFixed(2) : "") + "</td>"
                       + "</tr>\n");

  tblStr = tblStr + rows.join('');

  let outSum = trans.tList.map(x => (-x.AmountDC < 0) ? -x.AmountDC : 0).reduce((a,b)=>a+b, 0);
  let inSum = trans.tList.map(x => (-x.AmountDC > 0) ? -x.AmountDC : 0).reduce((a,b)=>a+b, 0);
  let netSum = inSum + outSum;
  let startBalance = trans.balance - netSum;
  let balance = trans.balance;

  tblStr = tblStr + "<tr><td>&nbsp;</td></tr>\n";

  tblStr = tblStr + "<tr>"
    + "<td>" + "</td>"
    + "<td>" + "</td>"
    + '<th style="text-align: left">' + "Totaal" + "</th>"
    + '<td style="color: red; text-align: right">' + outSum.toFixed(2) + "</td>"
    + '<td style="color: green; text-align: right">' + inSum.toFixed(2) + "</td>"
    + "</tr>\n";

  tblStr = tblStr + "<tr><td>&nbsp;</td></tr>\n";

  // Needed to avoid "-0.00"
  // !! Use only after calculations are done since precision is lost
  startBalance = Math.round(startBalance * 100) / 100;
  balance = Math.round(balance * 100) / 100;

  tblStr = tblStr + "<tr>"
    + "<td>" + "</td>"
    + "<td>" + "</td>"
    + '<th style="text-align: left">' + "Beginsaldo:" + "</th>"
    + '<td style="color: red; text-align: right">' + ((startBalance < 0) ? startBalance.toFixed(2) : "") + "</td>"
    + '<td style="color: green; text-align: right">' + (startBalance >= 0 ? startBalance.toFixed(2) : "") + "</td>"
    + "</tr>\n";

  tblStr = tblStr + "<tr>"
    + "<td>" + "</td>"
    + "<td>" + "</td>"
    + '<th style="text-align: left">' + "Saldo:" + "</th>"
    + '<td style="color: red; text-align: right">' + ((balance < 0) ? balance.toFixed(2) : "") + "</td>"
    + '<td style="color: green; text-align: right">' + (balance >= 0 ? balance.toFixed(2) : "") + "</td>"
    + "</tr>\n";

  tblStr = tblStr + "</table>\n";

  return tblStr;
}

app.get('/trans/:accId/:year*?', async (req: express.Request, res: express.Response) => {
  res.type('html');
  res.charset = 'utf-8';
  try {
    let account = await e.getAccount(req.params.accId);
    res.write('Listing transaction lines for ' + account.Name + ':<br><br>\n');

    let trans = await e.getTransactionsObj(req.params.accId);

    let years = [...new Set(trans.tList.map(x => x.FinancialYear))];
    res.write(years.map(x => '<a href="/trans/' + req.params.accId + '/' + x + '">' + x + '</a> ').join(' '));
    res.write('<br><br>');

    if('year' in req.params && req.params.year) {
      trans.tList = trans.tList.filter(x => x.FinancialYear == req.params.year);
    }

    res.write(formatTransactionTable(trans));

    res.write('<br><br><a href="/preview-mail/' + account.ID + '">Preview Email</a>');
  } catch(e) {
    res.write('ERROR: ' + JSON.stringify(e));
  }
  res.end();
});

let makeIncassoMail = async (account, trans) => {
  let variables = {
    name: account.Name,
    amount: Math.abs(trans.balance).toFixed(2),
    balance: trans.balance.toFixed(2),
    balanceColored: formatBalance(trans.balance),
    transactions: formatTransactionTable(trans),
  };

  let template = (await readFile('templates/standard_email')).toString();
  if (trans.balance <= -100)
    template = (await readFile('templates/extreme_email')).toString();
  let body = mustache.render(template, variables);

  let mailOptions = {
    from: '"Treasurer-auto AEGEE-Delft" <invoice@aegee-delft.nl>',
    to: '"' + account.Name + '" <' + account.Email + '>',
    subject: 'Incasso',
    text: 'Please view HTML body',
    html: body,
  };

  return mailOptions;
}

app.get('/preview-mail/:accId/', async (req: express.Request, res: express.Response) => {
  res.type('html');
  res.charset = 'utf-8';
  try {
    let account = await e.getAccount(req.params.accId);
    let trans = await e.getTransactionsObj(req.params.accId, '2016'); // TODO proper filtering
    res.write((await makeIncassoMail(account, trans)).html);
  } catch(e) {
    res.write('ERROR: ' + JSON.stringify(e));
  }
  res.end();
});

app.listen(3000,  () => {
  console.log('Listening on http://localhost:3000/');
  opn('http://localhost:3000/');
});
