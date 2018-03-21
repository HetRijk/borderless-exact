
import { IUser, IUserCompound } from './User';
import * as restlerPromise from 'restler-promise';
const restler = restlerPromise(Promise);

// params is an object with Exact API parameters, eg:
// params: {$select: 'CurrentDivision'}
// or {$filter: '...'}

export class ExactQuery {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl + '/api/v1/';
  }

  public async query(userCompound: IUserCompound, what: string, params = {}) {
    let url = this.baseUrl;
    url = url +  userCompound.profile.CurrentDivision + '/' + what;

    console.log(url);
    try {
      const token = userCompound.accessToken;

      let reply = await restler.get(url, {
        accessToken: token,
        headers: { 'accept': 'application/json'},
        query: params,
      });

      // Todo: add some mechanism to stop
      // Eg: yielding function / Stream
      // NB: Exact API has 60 records per page
      //     except for 'bulk' tables, where it supports 1000 records per page
      while ('__next' in reply.data.d) {
        console.log('Got ' + reply.data.d.results.length + ' records of "' + what + '", fetching next page...');

        const nexturl = reply.data.d.__next;
        const results = reply.data.d.results;
        reply = await restler.get(nexturl, {
          accessToken: token,
          headers: {accept: 'application/json'},
        });
        reply.data.d.results = results.concat(reply.data.d.results);
      }

      // For some reason certain queries (with $top=1) does not contain the results field
      let ret = reply.data.d;
      if ('results' in reply.data.d) {
        ret = reply.data.d.results;
      }

      console.log('Successful query for "' + what + '" (' + ret.length + ' records)');
      if (! ret.length ) {
        console.log('...:  "' + JSON.stringify(reply.data.d) + '');

      }

      return ret;

    } catch (e) {
      console.log(`Error while querying " ${what}'`);
      console.log(url);
      console.error(e);
      // throw e; -werkt niet voor asynchroon oid
    }
  }

  public async getMe(userCompound: IUserCompound) {
    const people = await this.query( userCompound, 'Me');
    return people[0];
  }

  public generateExactContactLink(userCompound: IUserCompound, accId: string) {
    return 'https://start.exactonline.nl/docs/CRMAccountCard.aspx?_Division_=' +
      userCompound.profile.CurrentDivision +
      '&AccountID=%7b' + accId + '%7d';
  }

  public listContacts(userCompound: IUserCompound) {
    return this.query( userCompound, 'crm/Contacts');
  }

  public async listAccountNames(userCompound: IUserCompound) {
    const contacts = await this.query( userCompound, 'crm/Accounts', {$select: 'Name'});
    return contacts.map((x) => x.Name);
  }

  public getAccount(userCompound: IUserCompound, id: string) {
    return this.query( userCompound, 'crm/Accounts(guid\'' + id + '\')');
  }

  public getAccountBankAccounts(userCompound: IUserCompound, id: string) {
    return this.query( userCompound, 'crm/Accounts(guid\'' + id + '\')/BankAccounts');
  }

  public async getAccountMainBankAccount(userCompound: IUserCompound, id: string) {
    const bas = await this.query( userCompound, 'crm/Accounts(guid\'' + id + '\')/BankAccounts', {
      $filter: 'Main eq true',
      $top: '1',
    });
    return bas[0];
  }

  public getAccounts(userCompound: IUserCompound) {
    return this.query(userCompound, 'crm/Accounts', {
      $select: 'ID,Code,Name,Email',
      $orderby: 'Code',
    });
  }

  public getCreditorsDebtors(userCompound: IUserCompound) {
    return this.query(userCompound, 'crm/Accounts', {
      $select: 'ID,Code,Name,Email',
      $orderby: 'Code',
      $filter: 'IsSales eq true and IsSupplier eq true',
    });
  }

  // Get transactions for specified account
  //
  public getTransactionList(userCompound: IUserCompound, id: string) {
    // Bulk (bulk/Financial/TransactionLines) does not seem to support filtering...
    return this.query( userCompound, 'financialtransaction/TransactionLines', {
      $select: 'Description,AmountDC,Date,FinancialYear,FinancialPeriod',
      $filter: `Account eq guid'${id}'` +
        ' and (GLAccountCode eq trim(\'1300\')' +
        ' or GLAccountCode eq trim(\'1600\'))', // Debiteuren of Crediteuren grootboeken
      $orderby: 'Date',
    });
  }

  public async getTransactionsObj(userCompound: IUserCompound, id: string) {
    const tList = await this.getTransactionList(userCompound, id);
    let balance = tList.map( (x) => -x.AmountDC).reduce((a, b) => a + b, 0);

    const roundMoney = (b) => {
      return Math.round(b * 100) / 100;
    };

    balance = roundMoney(balance);

    return { tList , balance };
  }

  // Warning: slow
  public async getAccountBalance(userCompound: IUserCompound, id: string) {
    return (await this.getTransactionsObj(userCompound, id)).balance;
  }

  // Sum transactions for specified account
  // NOT WORKING
  // Exact does not seem to support the $apply syntax
  public getAccountBalanceXXX(userCompound: IUserCompound, id: string) {
    return this.query(userCompound, 'financialtransaction/TransactionLines', {
      $select: 'AmountDC',
      $filter: `Account eq guid'${id}'` +
        ' and (GLAccountCode eq trim(\'1300\')' +
        ' or GLAccountCode eq trim(\'1600\'))', // Debiteuren of Crediteuren grootboeken
      $apply: 'aggregate(AmountDC with sum as Total',
    });
  }

}
