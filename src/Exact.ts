//import * as restler from 'restler';

import * as restlerPromise from 'restler-promise';
const restler = restlerPromise(Promise);

import TokenWrapper from './main/utils/TokenWrapper';

export default class Exact {
  private _baseURL : string;
  private _tokenWrapper : TokenWrapper;
  private _currentDivision : number;

  constructor(tokenWrapper) {
    this._baseURL = 'https://start.exactonline.nl/api/v1/';
    this._tokenWrapper = tokenWrapper;
  }

  public async testInternet() : Promise<boolean> {
    try {
      let res = await restler.get('http://google.com/');
      console.log('Internet OK');
      return true;
    } catch(e) {
      console.log('Internet KAPOT:');
      console.error(e);
      return false;
    }
  }

  // params is an object with Exact API parameters, eg:
  // params: {$select: 'CurrentDivision'}
  // or {$filter: '...'}
  public async query(what : string, params = {}) {
    var url = '';

    if (what == 'Me') {
      url = this._baseURL + 'current/Me';
    } else {
      if (this._currentDivision == 0) {
        throw new Error('API not initialized');
      }
      url = this._baseURL + this._currentDivision + '/' + what;
    }

    try {
      let token = await this._tokenWrapper.getTokenPromise();

      let reply = await restler.get(url, {
          accessToken: token,
          headers: {'accept': 'application/json'},
          query: params,
        });

      // Todo: add some mechanism to stop
      // Eg: yielding / Stream
      while('__next' in reply.data.d) {
        console.log('Loading next batch of results...');
        let nexturl = reply.data.d.__next;
        let results = reply.data.d.results;
        reply = await restler.get(nexturl, {
            accessToken: token,
            headers: {'accept': 'application/json'}
        });
        reply.data.d.results = results.concat(reply.data.d.results);
      }

      console.log('Successful query for "' + what + '"');
      //console.dir(reply);
      //console.dir(reply.data.d);

      // For some reason certain querys (with $top=1) dont containt the reults field
      if('results' in reply.data.d) {
        return reply.data.d.results;
      } else {
        return reply.data.d;
      }

    } catch(e) {
      console.log('Error while querying "' + what + '"');
      console.error(e);
      //throw e; -werkt niet voor asynchroon oid
    }
  }

  public async initAPI() {
    let data = await this.query('Me', {$select: 'CurrentDivision'});
    this._currentDivision = data[0].CurrentDivision;
    console.log('Succesful connection with Exact REST API (CurrentDivision = ' + this._currentDivision + ')');
  }

  // Query 'Me' object
  public async getMe() {
    let people = await this.query('Me');
    return people[0];
  }

  // Example query with select
  public async getMyName() {
    let people = await this.query('Me', {$select: 'FullName'});
    let me = people[0];
    console.log('Hi, my name is ' + me.FullName);
    return me.FullName;
  }

  // Example query: list contacts
  public async listContacts() {
     return await this.query('crm/Contacts');
  }

  // Example: account names
  public async listAccountNames() {
     let contacts = await this.query('crm/Accounts', {$select:'Name'});
     let names = contacts.map(x => x.Name);
     return names;
  }


}

// Todo:
// - Promises & error handling
// - Store cur_div properly and start querying interesting things

// Lijstje objecten in Exact DB:
// https://start.exactonline.nl/docs/HlpRestAPIResources.aspx?SourceAction=10
