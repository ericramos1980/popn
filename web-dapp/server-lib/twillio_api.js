'use strict';
const config = require('../server-config');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const twilio = require('twilio');

var accountSid = 'ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'; // Your Account SID from www.twilio.com/console
var authToken = 'your_auth_token';   // Your Auth Token from www.twilio.com/console
var fromTelNumber = ''

var prelog = '[twillio_api] ';
logger.log(prelog + 'loading twillio');
const smsClient = new twilio(accountSid, authToken);

function verify_tel(telNumber) {
    return new Promise((resolve, reject) => {
        return resolve(telNumber);
    });
}

function send_text(wallet, toTelNumber, txId, confirmationCodePlain, done) {
  smsClient.messages.create({
    body: `code for ${wallet} is ${confirmationCodePlain}.`,
    to: toTelNumber, // number '+12345678901',
    from: fromTelNumber
    /*
        need metadata
        txId
        wallet
    */
  })
  .then(function(message) {
    done(null, message)
  })
  .catch(function(err) {
    done(err)
  })
}

module.exports = {
    verify_tel,
    send_text,
    lists: {},
};
