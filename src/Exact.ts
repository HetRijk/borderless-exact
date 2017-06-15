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
      console.log('Internet KAPOT');
      console.error(e);
      return false;
    }
  }

  public async query(what : string, filter = '', select = '') {
    var url = '';

    if (what == 'Me') {
      url = this._baseURL + 'current/Me';
    } else {
      if (this._currentDivision == 0) {
        throw new Error('API not initialized');
      }
      url = this._baseURL + this._currentDivision + '/' + what;
    }

    let token = await this._tokenWrapper.getTokenPromise();

    try {
      let reply = await restler.get(url, {
          accessToken: token,
          headers: {'accept': 'application/json'},
          query: {
            '$filter': filter,
            '$select': select
          }
        });

      //console.dir(data);
      return reply.data.d.results;
    } catch(e) {
      console.error(e);
      throw e;
    }
  }

  public async initAPI() {
    let data = await this.query('Me', '', 'CurrentDivision');
    this._currentDivision = data[0].CurrentDivision;
    console.log('Succesful connection with Exact REST API (CurrentDivision = ' + this._currentDivision + ')');
  }

  // Example query
  public getMe() {
    return this.query('Me').then( (data) => {
      data = data[0];
      //console.dir(data);
      return data;
    });
  }

  // Example query with select
  public async getMyName() {
    let people = await this.query('Me', '', 'FullName');
    let me = people[0];
    console.log('Hi, my name is ' + me.FullName);
    return me.FullName;
  }


  public async listContacts() {
     return await this.query('crm/Contacts');
  }


}

// Todo:
// - Promises & error handling
// - Store cur_div properly and start querying interesting things

// Lijstje objecten in Exact DB:
// https://start.exactonline.nl/docs/HlpRestAPIResources.aspx?SourceAction=10
