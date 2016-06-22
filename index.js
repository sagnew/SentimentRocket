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
  var twiml = twilio.TwimlResponse();
  var addOns = JSON.parse(req.body.AddOns);
  var sentimentStatus = addOns.results.ibm_watson_sentiment.status;

  io.emit('sms', { sentiment: sentiment, number: req.body.From });

  twiml.message('Thanks for playing. Join us tonight at Bash for more fun & games');

  res.send(twiml.toString());
});
