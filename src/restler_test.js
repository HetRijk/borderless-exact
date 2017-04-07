var rest = require('restler');

rest.get('http://google.com').on('complete', function(result) {
  if (result instanceof Error) {
    console.log('Error:', result.message);
    this.retry(5000); // try again after 5 sec
  } else {
    console.log('Google leeft\n');
  }
});

url_base = 'https://start.exactonline.nl/api/v1/';
cur_div = 'current'
token = 'gAAAABBI2HKVS6CBoMqfr-WTijvYUaNN-ol0ausYtcPPQ1CL-ECkLrA2IjpPPa3YugQC8i6vE8k5DgM4A7CxL7JkUQU2BaultyjCh53rCbtg5q_IZtoOu8ZIa2BNACILuAlML5ftJ_yPRrMZTYVYqfldYlcN5x_edQNGxp9mrX8tNsZ7JAEAAIAAAABuVcA5uMO8XM8DGw2D6ZebVcIl5MrLnUAhZsuO8FEx8yukKSpWVo5b94I3bL3-3SLAIoDO1qGdq0gfsCQOkVlOijB421N68p0B0Ir_Yd5_T_O1zJ6VD4rVI_yHtaKiOudZqVLVdKqvID0usoXWNCQkLUtr3z_tLhArtfY7olcgOagOyFns8heVoJjAN72125ZKtdmjeTqyE3x97biqR0n88sftaYaiIvu195h_qEk22ytmC0tyFinBAWTTQwbJSGAAkAigwQ72ok2yO2YDgrUh85Ikx1Rl9Viz6X2KTLYqL_OonM4mqj30mcEG9f6IMl_m-CErldBeUXUeIlQStrTA9oCqV-yDl9F6337KeDUQPpcfQS6e_AXMCRyxlJfYbiU'

rest.get(url_base + cur_div + '/' + 'Me', {
  headers: {
    '$select': 'CurrentDivision',
    'accept': 'application/json',
  },
  accessToken: token,
}).on('complete', function(data) {
  console.dir(data.d.results[0]);
  cur_div = data.d.results[0].CurrentDivision;
  console.log('Succesful connection with Exact REST API, CurrentDivision = ' + cur_div);
});
