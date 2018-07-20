'use strict';

module.exports = function () {
    return {
        lobApiKey: 'test_abcabcabcabcabcabcabcabcabcabcabcab',
        // test credentials
        twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
        twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
        twilioFromNo: '+15005550006',
        signer: process.env.SIGNER,
        signerPrivateKey: process.env.SIGNER_PRIVATE_KEY,
        lobApiVersion: '2018-03-01',
    };
};
