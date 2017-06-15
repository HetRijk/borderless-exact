var rest = require('restler');

rest.get('http://google.com').on('complete', function(result) {
  if (result instanceof Error) {
    console.log('Error:', result.message);
    this.retry(5000); // try again after 5 sec
  } else {
    console.log('Google leeft\n');
  }
});

const url_base = 'https://start.exactonline.nl/api/v1/';
let cur_div = 'current'
const token = 'gAAAAE0Qad55YlDatSMFZsmHG4qfPle-69sN8xXSbCkwg4gNwQEj7LYmDFrJVVyZjS80_p-DQMVhKKc5FB8C8yuVCbCecFwHOE41tk5-XwQtB2M6RjwU6epsifkslwfOnBItEh0HdERJyxC0kBI6TIG_wVhPPCcTVtf9xDoLB_pksHAzJAEAAIAAAACju3tgVNRFBAQt94eoDKo5AlyRTgvvmWTIrIzdYStKwmTMqJYMTZXfFjFfy8i5OuF-xQWIOPJwhSID823dtpodNL8OzZDwKjcfbJBlp_hcKqZASNNAUeEI5WJcKLCv5KKqVAsXAnsoVtDHWPb3sRkxuGIKMmD---_Y7sbX4x7F5yqvbU42Z5X86yYG5nwKYkZjA2XFYv02IFvaux-9jDX1gkjGzKX1pHqiEGxT70WhDt-Rf81qqHnkMVYlDlFUYgyR8kksg6ydY42PZjdupe8qz8YPxFm8H34EBlTb4kWawOytFYPvYURI6f-L5v2VP1BX4v1T3UGLQLUg4j0dtxvdfophJ4p16PCrOhN91ShiMnrTH_N4Kabw5twBnfymqY4'
// token = 'gAAAABBI2HKVS6CBoMqfr-WTijvYUaNN-ol0ausYtcPPQ1CL-ECkLrA2IjpPPa3YugQC8i6vE8k5DgM4A7CxL7JkUQU2BaultyjCh53rCbtg5q_IZtoOu8ZIa2BNACILuAlML5ftJ_yPRrMZTYVYqfldYlcN5x_edQNGxp9mrX8tNsZ7JAEAAIAAAABuVcA5uMO8XM8DGw2D6ZebVcIl5MrLnUAhZsuO8FEx8yukKSpWVo5b94I3bL3-3SLAIoDO1qGdq0gfsCQOkVlOijB421N68p0B0Ir_Yd5_T_O1zJ6VD4rVI_yHtaKiOudZqVLVdKqvID0usoXWNCQkLUtr3z_tLhArtfY7olcgOagOyFns8heVoJjAN72125ZKtdmjeTqyE3x97biqR0n88sftaYaiIvu195h_qEk22ytmC0tyFinBAWTTQwbJSGAAkAigwQ72ok2yO2YDgrUh85Ikx1Rl9Viz6X2KTLYqL_OonM4mqj30mcEG9f6IMl_m-CErldBeUXUeIlQStrTA9oCqV-yDl9F6337KeDUQPpcfQS6e_AXMCRyxlJfYbiU'

rest.get(url_base + cur_div + '/' + 'Me', {
  headers: {
    '$select': 'CurrentDivision',
    'accept': 'application/json',
  },
  accessToken: token,
}).on('complete', function(data) {
  if (typeof(data) == 'string') {
    console.log('Error retreiving data, probably not authorized. Response was: ');
    console.log(data);
    return;
  }
  console.dir(data.d.results[0]);
  cur_div = data.d.results[0].CurrentDivision;
  console.log('Succesful connection with Exact REST API, CurrentDivision = ' + cur_div);
});
