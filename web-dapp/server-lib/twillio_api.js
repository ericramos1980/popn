'use strict';
const config = require('../server-config');
const logger = require('./logger');
const twilio = require('twilio');

const accountSid = config.twilioAccountSid;
const authToken = config.twilioAuthToken;
const fromTelNumber = config.twilioFromNo;

var prelog = '[twillio_api] ';
logger.log(prelog + 'loading twillio');
const smsClient = new twilio(accountSid, authToken);

function verify_tel(telNumber) {
    return new Promise((resolve, reject) => {
      if(telNumber.length > 30) {
        reject(new Error("telNumber is too long"));
      }else{
        return resolve(telNumber);
      }
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
    done(null, message);
  })
  .catch(function(err) {
    done(err);
  });
}

module.exports = {
    verify_tel,
    send_text,
    lists: {},
};
