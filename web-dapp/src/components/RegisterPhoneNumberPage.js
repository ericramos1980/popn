import React from 'react';

import * as log from 'loglevel';

import { Loading } from './Loading';
import BackButton from './BackButton';

import '../assets/javascripts/show-alert.js';

log.setLevel("debug", true)
const logger = log.getLogger('RegisterPhoneNumberPage');

const REACT_APP_PRICE = process.env.REACT_APP_PRICE;
const REACT_APP_PRICE_SYMBOL = process.env.REACT_APP_PRICE_SYMBOL;

class RegisterPhoneNumberPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            number: '',
            loading: false,
        };
        this.on_change = this.on_change.bind(this);
        this.check_wallet_same = this.check_wallet_same.bind(this);
        this.check_user_exists = this.check_user_exists.bind(this);
        this.check_address_exists = this.check_address_exists.bind(this);
        this.registerPhone = this.registerPhone.bind(this);
        this.order_clicked = this.order_clicked.bind(this);
    }

    componentDidMount() {
        const [wallet] = this.props.my_web3 && this.props.my_web3.eth.accounts
            ? this.props.my_web3.eth.accounts
            : [];

        if (!wallet) {
            window.show_alert('warning', 'MetaMask account', 'Please unlock your account in MetaMask and refresh the page first');
        }
    }

    on_change(event) {
        logger.debug('on_change ' + event.target.name + ': ' + event.target.value);
        this.setState({ [event.target.name]: event.target.value });
    };

    check_wallet_same(current_wallet, initial_wallet) {
        logger.debug('check_wallet current_wallet: ' + current_wallet);
        logger.debug('check_wallet initial_wallet: ' + initial_wallet);

        if (!current_wallet) {
            return 'MetaMask account should be unlocked';
        }

        if (current_wallet.trim().toLowerCase() !== initial_wallet) {
            return 'MetaMask account was switched';
        }

        return '';
    };

    check_user_exists(opts, callback) {
        const contract = this.props.contract;
        const wsame = this.check_wallet_same(this.props.my_web3.eth.accounts[0], opts.wallet);

        if (wsame) {
            return callback(wsame);
        }

        logger.debug('calling contract.check_user_exists');

        contract.userExists(opts.wallet, { from: opts.wallet }, (err, result) => {
            if (err) {
                logger.debug('Error calling contract.check_user_exists:', err);
                return callback(err);
            }

            logger.debug('contract.check_user_exists result =', result);
            return callback(null, result);
        });
    };

    check_address_exists(opts, callback) {
        const contract = this.props.contract;
        const wsame = this.check_wallet_same(this.props.my_web3.eth.accounts[0], opts.wallet);

        if (wsame) {
            return callback(wsame);
        }

        this.check_user_exists(opts, (err, exists) => {
            if (err) {
                window.show_alert('error', 'Checking if user exists: ', [['Error', err.message]]);
                return callback(err, false);
            }

            if (!exists) {
                logger.debug('No previously registered addresses found, continue');
                return callback(null, false);
            }

            logger.debug('call contract.userAddressByAddress');
            contract.userAddressByAddress(
                opts.wallet,
                opts.params.phone,
                { from: opts.wallet }, (err, result) => {
                    if (err) {
                        logger.debug('Error calling contract.userAddressByAddress:', err);
                        return callback(err);
                    }

                    logger.debug('contract.userAddressByAddress result =', result);
                    return callback(null, result[0]);
                });
        });
    };

    registerPhone(opts, callback) {
        const contract = this.props.contract;

        logger.debug('Calling contract.registerAddress.estimateGas');
        logger.debug('opts = ' + JSON.stringify(opts));

        opts.params.priceWei = new this.props.my_web3.BigNumber(opts.params.priceWei);
        logger.debug('Price for the sms (in wei): ' + opts.params.priceWei);
        logger.debug('opts.params.phone' + opts.params.phone);
        contract.registerAddress.estimateGas(
            opts.params.name,
            opts.params.phone,
            opts.params.priceWei,
            opts.confirmationCodeSha3,
            opts.v,
            opts.r,
            opts.s,
            { from: opts.wallet, value: opts.params.priceWei }, (err, result) => {

                if (err) {
                    logger.debug('Estimate gas callback error:', err, result);
                    return callback(err);
                }

                const egas = result;
                logger.debug('Estimated gas: ' + egas);

                const ugas = Math.floor(1.1 * egas);
                logger.debug('Will set gas = ' + ugas);

                const wallet = this.props.my_web3 && this.props.my_web3.eth.accounts[0];
                logger.debug('Current wallet: ' + wallet);

                if (!wallet) {
                    return callback('Account locked');
                }
                if (wallet.trim().toLowerCase() !== opts.wallet) {
                    return callback('Account was switched');
                }

                logger.debug('Calling contract.registerAddress');
                contract.registerAddress(
                    opts.params.name,
                    opts.params.phone,
                    opts.params.priceWei,
                    opts.confirmationCodeSha3,
                    opts.v,
                    opts.r,
                    opts.s,
                    { from: opts.wallet, value: opts.params.priceWei, gas: ugas }, (err, txId) => {

                        if (err) {
                            logger.debug('Error calling contract.registerAddress:', err);
                            return callback(err);
                        }
                        logger.debug('contract.registerAddress, txId = ' + txId);

                        return callback(null, txId);
                    });
            });
    };

    order_clicked() {
        logger.debug('Form data:');
        logger.debug('name = ' + this.state.name);
        logger.debug('phone = ' + this.state.phone);

        const [wallet] = this.props.my_web3 && this.props.my_web3.eth.accounts
            ? this.props.my_web3.eth.accounts
            : [];

        if (!wallet) {
            window.show_alert('warning', 'MetaMask account', 'Please unlock your account in MetaMask and refresh the page first');
            return;
        }

        logger.debug('Using account ' + wallet);

        if (!this.state.name) {
            window.show_alert('warning', 'Verification', 'Please provide NAME');
            return;
        }

        if (!this.state.phone) {
            window.show_alert('warning', 'Verification', 'Please provide PHONE');
            return;
        }

        this.setState({ loading: true });

        window.$.ajax({
            type: 'post',
            url: '/api/prepareRegTx',
            data: {
                wallet,
                name: this.state.name,
                phone: this.state.phone
            },
            success: (res) => {
                if (!res) {
                    logger.debug('Empty response from server');
                    this.setState({ loading: false });
                    window.show_alert('error', 'Preparing register transaction', [['Error', 'Empty response from server']]);
                    return;
                }
                logger.debug(res);

                if (!res.ok) {
                    logger.debug('Error: ' + res.err);
                    this.setState({ loading: false });
                    window.show_alert('error', 'Preparing register transaction', [['Request ID', res.x_id], ['Error', res.err]]);
                    return;
                }

                if (!res.result) {
                    logger.debug('Invalid response: missing result');
                    this.setState({ loading: false });
                    window.show_alert('error', 'Preparing register transaction', [['Request ID', res.x_id], ['Error', 'Missing result field']]);
                    return;
                }

                this.check_address_exists(res.result, (err, exists) => {
                    if (err) {
                        logger.debug('Error occured in check_address_exists: ', err);
                        this.setState({ loading: false });
                        window.show_alert('error', 'Checking if address exists', [['Error', err.message]]);
                        return;
                    }
                    if (exists) {
                        logger.debug('This address already exists');
                        this.setState({ loading: false });
                        window.show_alert('error', 'Checking if address exists', 'This address is already registered under your current MetaMask account');
                        return;
                    }

                    logger.debug('calling registerPhone');
                    this.registerPhone(res.result, (err, txId) => {
                        if (err) {
                            logger.debug('Error occured in registerPhone: ', err);
                            this.setState({ loading: false });
                            window.show_alert('error', 'Register address', [['Error', err.message]]);
                        } else if (txId) {
                            logger.debug('Transaction submitted: ' + txId);
                            window.$.ajax({
                                type: 'post',
                                url: '/api/notifyRegTx',
                                data: {
                                    wallet,
                                    txId,
                                    sessionKey: res.result.sessionKey
                                },
                                success: (res) => {
                                    this.setState({ loading: false });

                                    if (!res) {
                                        logger.debug('Empty response from server');
                                        window.show_alert('error', 'Postcard sending', [
                                            ['Transaction to register address was mined, but postcard was not sent'],
                                            ['Transaction ID', txId],
                                            ['Error', 'empty response from server']
                                        ]);
                                        return;
                                    }

                                    if (!res.ok) {
                                        logger.debug('Not ok response from server: ' + res.err);
                                        window.show_alert('error', 'Postcard sending', [
                                            ['Transaction to register address was mined, but postcard was not sent'],
                                            ['Request ID', res.x_id],
                                            ['Transaction ID', txId],
                                            ['Error', res.err]
                                        ]);
                                        return;
                                    }
                                    window.show_alert('success', 'Address registered!', [
                                        ['Transaction to register address was mined and postcard was sent'],
                                        ['Transaction ID', txId],
                                        ['Expected delivery date', res.result.expected_delivery_date],
                                        ['Mail type', res.result.mail_type]
                                    ]);
                                },
                                error: ({ statusText, status }) => {
                                    logger.debug('Server returned error on notifyRegTx: ' + statusText + ' (' + status + ')');
                                    this.setState({ loading: false });
                                    window.show_alert('error', 'Postcard sending', [['Server error', statusText + ' (' + status + ')']]);
                                }
                            });
                        } else {
                            logger.debug('JSON RPC unexpected response: err is empty but txId is also empty');
                            this.setState({ loading: false });
                            window.show_alert('error', 'Register address', 'Error is empty but txId is also empty!');
                        }
                    });
                });
            },
            error: ({ responseJSON, statusText, status }) => {
                logger.debug('Server returned error on prepareRegTx: ' + statusText + ' (' + status + ')');
                this.setState({ loading: false });
                const errorBody = [
                    ['Server error', statusText + ' (' + status + ')']
                ];
                if (responseJSON && responseJSON.err) {
                    errorBody.push([responseJSON.err]);
                }
                window.show_alert('error', 'Preparing register transaction', errorBody);
            }
        });
    };

    render() {
        return (
            <div className="col-md-12">
                <div className="content">
                    <h1 className="main-title">Register your Physical Address</h1>
                    <form id="registerForm">
                        <div className="form-group">
                            <label>Name</label>
                            <div className="info"><img className="svg-info" src={require('../assets/images/info.svg')} alt="info" />
                                <div className="hidden-info">Enter your full name</div>
                            </div>
                            <input type="text" className="form-control" placeholder="Enter your full name" name="name" value={this.state.name}
                                   onChange={this.on_change} />
                        </div>
                        <div className="form-group">
                            <label>Phone Number</label>
                            <div className="info"><img className="svg-info" src={require('../assets/images/info.svg')} alt="info" />
                                <div className="hidden-info">Enter your phone number</div>
                            </div>
                            <input type="text" className="form-control" placeholder="Enter your phone number" name="phone" value={this.state.phone}
                                   onChange={this.on_change} />
                        </div>
                        <BackButton />
                        <button id="sendMessageButton" type="button" className="action-btn mt-3" onClick={this.order_clicked}>
                            Order
                            <img className="btn-arrow" src={require('../assets/images/arrow.svg')} alt="arrow" />
                        </button>
                    </form>
                    <div className="small-c-copy"><strong>{REACT_APP_PRICE} {REACT_APP_PRICE_SYMBOL}</strong> This is the price we charge for sending a postcard to you</div>
                </div>
                <Loading show={this.state.loading}/>
            </div>
        );
    }
}

export default RegisterPhoneNumberPage;