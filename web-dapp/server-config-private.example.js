'use strict';

module.exports = function () {
    return {
        lobApiKey: 'test_abcabcabcabcabcabcabcabcabcabcabcab',
        // test credentials
        twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
        twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
        twilioFromNo: '+15005550006',
        signer: '0xdbde11e51b9fcc9c455de9af89729cf37d835156',
        signerPrivateKey: '1dd9083e16e190fa5413f87837025556063c546bf16e38cc53fd5d018a3acfbb',
        lobApiVersion: '2018-03-01',
    };
};
