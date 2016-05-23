"use strict";
const express = require('express');
const twilio = require('twilio');
const bodyParser = require('body-parser');

const app = express();

// Run server to listen on port 8000.
const server = app.listen(8000, () => {
  console.log('listening on *:8000');
});

const io = require('socket.io')(server);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('static'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.post('/sms', (req, res) => {
  let twiml = twilio.TwimlResponse();
  let addOns = JSON.parse(req.body.AddOns);
  let sentimentStatus = addOns.results.ibm_watson_sentiment.status;
  console.log(req.body.From);

  if (sentimentStatus === 'successful') {
    let sentiment = addOns.results.ibm_watson_sentiment.result.docSentiment.type;
    io.emit('sms', { sentiment: sentiment, number: req.body.From });
    console.log(sentiment);
  } else {
    console.log('Sentiment failed');
  }

  twiml.message('Thanks for playing.  Join us tonight at Bash for more fun & games');

  res.send(twiml.toString());
});
