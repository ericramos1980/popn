'use strict';

const db = require('../server-lib/session_store');
const twilioApi = require('../server-lib/twillio_api');
const logger = require('../server-lib/logger');
const {validate, normalize} = require('../server-lib/validations');
const {createResponseObject} = require('../server-lib/utils');
const getTransaction = require('../server-lib/get_transaction');
const getTxReceipt = require('../server-lib/get_tx_receipt');
const validateTxInfo = require('../server-lib/validate_tx_info');
const validateTxDetails = require('../server-lib/validate_tx_details');
const validateTxReceipt = require('../server-lib/validate_tx_receipt');
const validateAddressIndex = require('../server-lib/validate_address_index');
const getAddressIndex = require('../server-lib/get_address_index');
const getAddressDetails = require('../server-lib/get_address_details');
const postcardLimiter = require('../server-lib/postcard_limiter');
const getSha3cc = require('../server-lib/get_sha3cc');

const validateData = (opts, prelog = '') => {
    if (!opts.body) return createResponseObject(false, 'request body: empty');
    const {body} = opts;

    // wallet
    if (!validate.wallet(body.wallet).ok) {
        logger.log(`${prelog} validation error on wallet: body.wallet, error: ${validate.wallet(body.wallet).msg}`);
        return createResponseObject(false, validate.wallet(body.wallet).msg);
    }
    // txId
    if (!validate.string(body.txId).ok) {
        logger.log(`${prelog} validation error on txId: body.txId, error: ${validate.string(body.txId).msg}`);
        return createResponseObject(false, validate.string(body.txId).msg);
    }
    // sessionKey
    if (!validate.string(body.sessionKey).ok || isNaN(Number(body.sessionKey))) {
        logger.log(`${prelog} validation error on sessionKey: body.sessionKey, error: ${validate.string(body.sessionKey).msg}`);
        return createResponseObject(false, validate.string(body.sessionKey).msg);
    }
    return createResponseObject(true, '');
};

const normalizeData = (body) => {
    const wallet = body.wallet;
    const txId = normalize.string(body.txId);
    const sessionKey = normalize.string(body.sessionKey);
    return {wallet, txId, sessionKey};
};

const getTxInfo = (opts, prelog = '') => {
    const {sessionKey, wallet} = opts;
    logger.log(`${prelog} fetching info by sessionKey: ${sessionKey}`);

    return db.getAndLock(sessionKey)
        .then(info => (validateTxInfo({info, sessionKey, wallet})));
};

const getTxBlockNumber = (opts, prelog = '') => {
    const {txId, wallet, contractAddress, waitInterval, waitMaxTime, startedAt} = opts;


    logger.log(`${prelog} fetching tx_details from blockchain by txId: ${txId}`);
    return getTransaction(txId)
        .then((result) => {
            const {error, txDetails} = result;
            return validateTxDetails(error, txDetails, contractAddress, wallet);
        })
        .then(txDetails => {
            logger.log(`${prelog} got block number for txId: ${txId}, txBn: ${txDetails.blockNumber}`);
            return txDetails.blockNumber;
        })
        .then(() => {
            logger.log(`${prelog} checking tx receipt for status`);
            return getTxReceipt(txId);
        })
        .then((result) => {
            const {error, txReceipt} = result;
            return validateTxReceipt(txId, error, txReceipt);
        })
        .catch((error) => {
            if (error.fatal || new Date() - startedAt > waitMaxTime) {
                throw new Error(error);
            }
            logger.error(`${prelog} ${error.msg}`);
            logger.log(`${prelog} check txId: ${txId} again in: ${waitInterval}ms`);
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve(getTxBlockNumber(opts));
                }, waitInterval);
            });
        });
};

const getAddressByBN = (opts, prelog = '') => {
    const {wallet} = opts;

    return getAddressIndex(opts)
        .then(result => {
            const {err, addressIndex} = result;
            return validateAddressIndex(err, addressIndex);
        })
        .then(addressIndex => {
            logger.log(`${prelog} getting address details from contract`);
            return getAddressDetails(addressIndex, wallet);
        })
        .then(addressDetails => {
            logger.log(`${prelog} full address: ${JSON.stringify(addressDetails)}`);
            return addressDetails;
        });
};

const createPostCard = (opts, prelog) => {
    const {wallet, txId, phone, confirmationCodePlain} = opts;
    return new Promise((resolve, reject) => {
        logger.log(`${prelog} locking mutex`);
        return db.mutexLock('postcardsSentMutex').then(() => {
            postcardLimiter.canSend().then(canSend => {
                if (!canSend) {
                    logger.error(`${prelog} Limit of postcards per day was reached`);
                    logger.log(`${prelog} unlocking mutex`);
                    return db.mutexUnlock('postcardsSentMutex').then(() => {
                        return reject(createResponseObject(false, 'Max limit of postcards reached, please try again tomorrow'));
                    });
                }
                twilioApi.send_text(wallet, phone, txId, confirmationCodePlain, function (err, result) {
                    if (err) {
                        logger.error(`${prelog} error returned by create_postcard: ${err}`);
                        logger.log(`${prelog} unlocking mutex`);
                        return db.mutexUnlock('postcardsSentMutex').then(() => {
                            return reject(createResponseObject(false, 'Error while sending postcard'));
                        });
                    }
                    postcardLimiter.inc().then(() => {
                        logger.log(`${prelog} unlocking mutex`);
                        return db.mutexUnlock('postcardsSentMutex').then(() => {
                            return resolve(result);
                        });
                    });
                });
            });
        });
    });
};

const removeUsedSessionKey = (opts, prelog) => {
    const {sessionKey, postcard} = opts;

    logger.log(`${prelog} removing used sessionKey from memory: ${sessionKey}`);
    return db.unset(sessionKey)
        .then(() => {
            return {
                ok: true,
                result: {
                    mail_type: postcard.mail_type,
                    expected_delivery_date: postcard.expected_delivery_date,
                },
            };
        })
        .catch(err => {
            logger.error(`${prelog} error removing used sessionKey: ${err}`);
            throw new Error(createResponseObject(false, 'error removing used sessionKey'));
        });
};

const validateTx = (txId, sha3cc) => {
    return getSha3cc(txId)
        .then(txSha3cc => {
            const valid = txSha3cc === sha3cc;
            if (!valid) {
                throw new Error(`Invalid transaction ${txId}`);
            }
        });
};

const unlockSession = (sessionKey, prelog) => {
    logger.log(`${prelog} unlocking session: ${sessionKey}`);
    return db.unlock(sessionKey);
};

module.exports = {
    validateData,
    normalizeData,
    getTxInfo,
    getTxBlockNumber,
    getAddressByBN,
    createPostCard,
    removeUsedSessionKey,
    validateTx,
    unlockSession,
};
