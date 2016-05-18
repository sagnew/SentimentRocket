"use strict";
const express = require('express');
const twilio = require('twilio');
const bodyParser = require('body-parser');

const app = express();

// Run server to listen on port 5000.
const server = app.listen(5000, () => {
  console.log('listening on *:5000');
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
  let sentiment = 'positive'; // For now

  io.emit('sms', sentiment);
  twiml.message('Thanks for joining my demo :)');
  res.send(twiml.toString());
});
