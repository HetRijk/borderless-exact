import * as nodemailer from 'nodemailer';

export default class MailSettings {
  private _server : string;
  private _email : string;
  private _password : string;
  private _port : number;

  public constructor(server, email, password) {
    this._server = server;
    this._email = email;
    this._password = password;
    this._port = 465 // TODO(@jlicht): Allow customization.
  }

  public getTransporter(): nodemailer.Transporter {
    return nodemailer.createTransport({
      host: this._server,
      port: this._port,
      secure: true, // secure:true for port 465, secure:false for port 587
      auth: {
        user: this._email,
        pass: this._password
      }
    });
  }
}

// Todo:
// - Promises & error handling
// - Store cur_div properly and start querying interesting things

// Lijstje objecten in Exact DB:
// https://start.exactonline.nl/docs/HlpRestAPIResources.aspx?SourceAction=10
