'use strict';
const {validate, normalize} = require('../server-lib/validations');
const config = require('../server-config');
const generateCode = require('../server-lib/generate_code');
const recalcPrice = require('../server-lib/recalc_price');
const buildSignature = require('../server-lib/buildSignature');
const db = require('../server-lib/session_store');
const twilioApi = require('../server-lib/twillio_api');

const signerPrivateKey = config.signerPrivateKey;

const validateWallet = (body) => {
    return validateParams(body, 'wallet');
};
const validateName = (body) => {
    return validateParams(body, 'name');
};
const validatePhone = (body) => {
    return validateParams(body, 'phone');
};
const validateParams = (body, param) => {
    return new Promise((resolve, reject) => {
        const result = (param === 'wallet') ? validate.wallet(body[param]) : validate.string(body[param]);
        if (!result.ok) {
            const log = `validation error on ${param}: ${body[param]}, err: ${result.msg}`;
            return reject({...result, log});
        }
        return resolve(body);
    });
};

const validateData = (data = {}) => {
    return new Promise((resolve, reject) => {
        if (!data || !Object.keys(data).length) return reject({ok: false, log: 'request body empty', msg: 'request body empty'});
        return resolve(data);
    })
        .then(validateWallet)
        .then(validateName)
        .then(validatePhone)
        .then(verifyPhone)
        .then(normalizeData);
};

const verifyPhone = (params) => {
    return twilioApi.verify_tel(params.phone)
        .then(() => params);
};

const normalizeData = (data) => {
    const wallet = data.wallet;
    const params = {
        name: normalize.string(data.name),
        phone: normalize.string(data.phone)
    };
    return Promise.resolve({wallet, params});
};

const getConfirmationCodes = () => {
    const confirmationCodePlain = generateCode();
    const sha3cc = config.web3.sha3(confirmationCodePlain);

    return {confirmationCodePlain, sha3cc};
};

const getPriceWei = () => {
    return recalcPrice.get_price_wei();
};

const sign = (params, wallet, sha3cc, priceWei) => {
    return new Promise((resolve, reject) => {
        try {
            const signatureParams = Object.assign(params, {wallet, sha3cc, priceWei: priceWei});
            const signOutput = buildSignature(signatureParams, signerPrivateKey);
            return resolve ({sha3cc, signOutput});
        } catch(err) {
            const log = `exception in sign(): ${err.stack}`;
            const msg = 'exception occured during signature calculation';
            return reject({ok: false, log, msg});
        }
    });
};

const setSessionKey = (wallet, confirmationCodePlain) => {
    const sessionKey = Math.random();
    return db.set(sessionKey, {wallet, date: new Date(), confirmationCodePlain})
        .then(() => sessionKey)
        .catch(err => {
            const log = `error setting sessionKey: ${err}`;
            const msg = 'error setting sessionKey';
            throw {ok: false, log, msg};
        });
};

module.exports = {
    validateData,
    getConfirmationCodes,
    getPriceWei,
    sign,
    setSessionKey,
};
