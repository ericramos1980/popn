import React from 'react';
import { BrowserRouter } from 'react-router-dom'
import { mount, shallow } from 'enzyme';

import RegisterPhoneNumberPage from './RegisterPhoneNumberPage';


const web3 = { eth: { accounts: ['0x1aa2d288d03d8397c193d2327ee7a7443d4ec3a1'] } };
const contract = require('../ProofOfPhysicalAddress.json');

const componentDidMount = jest.spyOn(RegisterPhoneNumberPage.prototype, 'componentDidMount');
const checkAddressExists = jest.spyOn(RegisterPhoneNumberPage.prototype, 'check_address_exists');
const checkUserExists = jest.spyOn(RegisterPhoneNumberPage.prototype, 'check_user_exists');
const checkWalletSame = jest.spyOn(RegisterPhoneNumberPage.prototype, 'check_wallet_same');
const onChange = jest.spyOn(RegisterPhoneNumberPage.prototype, 'on_change');
const orderClicked = jest.spyOn(RegisterPhoneNumberPage.prototype, 'order_clicked');
const registerPhone = jest.spyOn(RegisterPhoneNumberPage.prototype, 'registerPhone');
const showAlert = jest.spyOn(window, 'show_alert');

jest.mock('./BackButton', () => () => (<span>Back</span>));

describe('<RegisterPhoneNumberPage />', () => {
    const fields = ['name', 'phone'];

    const sample = new Map([
        ['name', 'Walt White'],
        ['phone', '+817012345678'],
    ]);

    it('renders correctly', () => {
        const page = mount(<RegisterPhoneNumberPage/>);

        expect(page.root()).toHaveLength(1);
        expect(page.find('#registerForm')).toHaveLength(1);

        for (const field of fields) {
            expect(page.find(`[name="${field}"]`)).toHaveLength(1);
        }

        expect(page.find('#sendMessageButton')).toHaveLength(1);
    });

    it('calls componentDidMount()', () => {
        const page = mount(<RegisterPhoneNumberPage/>);

        expect(page.root()).toHaveLength(1);
        expect(componentDidMount).toHaveBeenCalled();
    });

    it('receive web3 instance as property', () => {
        const page = mount(<RegisterPhoneNumberPage my_web3={web3}/>);

        expect(componentDidMount).toHaveBeenCalled();
        expect(page.prop('my_web3')).toBe(web3);
    });

    it('receive contract as property', () => {
        const page = mount(<RegisterPhoneNumberPage contract={contract}/>);

        expect(componentDidMount).toHaveBeenCalled();
        expect(page.prop('contract')).toBe(contract);
    });

    it('handles form changes', () => {
        const page = mount(<RegisterPhoneNumberPage/>);

        for (const field of fields) {
            const value = sample.get(field);

            const input = page.find(`[name="${field}"]`);
            expect(input).toHaveLength(1);

            input.simulate('change', { target: { name: field, value } });
        }

        expect(onChange).toHaveBeenCalledTimes(sample.size);
    });

    it('displays an alert message if MetaMask isn\'t unlocked', () => {
        const page = shallow(<RegisterPhoneNumberPage/>);
        const orderButton = page.find('#sendMessageButton');

        orderButton.simulate('click');

        expect(orderClicked).toHaveBeenCalled();

        expect(showAlert).toHaveBeenCalledWith(
            'warning',
            'MetaMask account',
            'Please unlock your account in MetaMask and refresh the page first'
        );
    });

    it('should displays alert messages if there is empty fields', () => {
        const page = mount(<RegisterPhoneNumberPage/>);
        const orderButton = page.find('#sendMessageButton');

        page.setProps({ my_web3: web3 });

        for (const field of fields) {
            if (field !== 'phone') {
                orderButton.simulate('click');

                expect(showAlert).toHaveBeenLastCalledWith(
                    'warning',
                    'Verification',
                    `Please provide ${field.toUpperCase()}`
                );

                page.setState({ [field]: sample.get(field) });
            }
        }

        window.$.ajax = jest.fn();

        expect(window.$.ajax).not.toHaveBeenCalled();
        orderButton.simulate('click');
        //expect(window.$.ajax).toHaveBeenCalled();
    });

    it('displays a message if received an error response', () => {
        const page = mount(<RegisterPhoneNumberPage my_web3={web3}/>);
        const orderButton = page.find('#sendMessageButton');

        for (const [field, value] of sample) {
            page.setState({ [field]: value });
        }

        window.$.ajax = jest.fn(({ error }) => {
            return error({ statusText: 'Server Error', status: 500 });
        });

        orderButton.simulate('click');

        expect(window.$.ajax).toHaveBeenCalled();
        expect(showAlert).toHaveBeenLastCalledWith(
            'error',
            'Preparing register transaction',
            [['Server error', 'Server Error (500)']]
        );
    });

    it('displays a message if received an empty response from server', () => {
        const page = mount(<RegisterPhoneNumberPage my_web3={web3}/>);
        const orderButton = page.find('#sendMessageButton');

        for (const [field, value] of sample) {
            page.setState({ [field]: value });
        }

        window.$.ajax = jest.fn(({ success }) => success());

        orderButton.simulate('click');

        expect(window.$.ajax).toHaveBeenCalled();
        expect(showAlert).toHaveBeenLastCalledWith(
            'error',
            'Preparing register transaction',
            [['Error', 'Empty response from server']]
        );
    });

    it('displays a message if received a not valid response', () => {
        const page = mount(<RegisterPhoneNumberPage my_web3={web3}/>);
        const orderButton = page.find('#sendMessageButton');

        for (const [field, value] of sample) {
            page.setState({ [field]: value });
        }

        window.$.ajax = jest.fn(({ success }) => success({ x_id: 'test', err: 'fake error' }));

        orderButton.simulate('click');

        expect(window.$.ajax).toHaveBeenCalled();
        expect(showAlert).toHaveBeenLastCalledWith(
            'error',
            'Preparing register transaction',
            [['Request ID', 'test'], ['Error', 'fake error']]
        );
    });

    it('displays a message if received a response without result', () => {
        const page = mount(<RegisterPhoneNumberPage my_web3={web3}/>);
        const orderButton = page.find('#sendMessageButton');

        for (const [field, value] of sample) {
            page.setState({ [field]: value });
        }

        window.$.ajax = jest.fn(({ success }) => success({ ok: true, x_id: 'test' }));

        orderButton.simulate('click');

        expect(window.$.ajax).toHaveBeenCalled();
        expect(showAlert).toHaveBeenLastCalledWith(
            'error',
            'Preparing register transaction',
            [['Request ID', 'test'], ['Error', 'Missing result field']]
        );
    });

    it('displays a message if user not exists', () => {
        const page = mount(<RegisterPhoneNumberPage my_web3={web3} contract={contract}/>);
        const orderButton = page.find('#sendMessageButton');

        for (const [field, value] of sample) {
            page.setState({ [field]: value });
        }

        window.$.ajax = jest.fn(({ success }) => {
            return success({
                ok: true,
                x_id: 'test',
                result: {
                    wallet: '0x1aa2d288d03d8397c193d2327ee7a7443d4ec3a1'
                }
            });
        });

        checkUserExists.mockImplementationOnce((opts, callback) => {
            return callback({ message: 'error message' });
        });

        orderButton.simulate('click');

        expect(window.$.ajax).toHaveBeenCalled();
        expect(checkAddressExists).toHaveBeenCalled();
        expect(checkWalletSame).toHaveBeenCalled();
        expect(showAlert).toHaveBeenLastCalledWith(
            'error',
            'Checking if address exists',
            [['Error', 'error message']]
        );
    });

    it('displays a message if there was an error calling contract.userAddressByAddress', () => {
        const page = mount(
            <RegisterPhoneNumberPage
                my_web3={web3}
                contract={{
                    ...contract,
                    userAddressByAddress: jest.fn((walet, phone, opts, callback) => {
                        return callback({
                            message: 'Error calling contract.userAddressByAddress'
                        });
                    })
                }}
            />
        );

        const orderButton = page.find('#sendMessageButton');

        for (const [field, value] of sample) {
            page.setState({ [field]: value });
        }

        window.$.ajax = jest.fn(({ success }) => {
            return success({
                ok: true,
                x_id: 'test',
                result: {
                    wallet: '0x1aa2d288d03d8397c193d2327ee7a7443d4ec3a1',
                    params: {
                        phone: sample.get('phone'),
                    }
                }
            });
        });

        checkUserExists.mockImplementationOnce((opts, callback) => {
            return callback(null, true);
        });

        orderButton.simulate('click');

        expect(window.$.ajax).toHaveBeenCalled();
        expect(checkAddressExists).toHaveBeenCalled();
        expect(checkWalletSame).toHaveBeenCalled();
        expect(showAlert).toHaveBeenLastCalledWith(
            'error',
            'Checking if address exists',
            [['Error', 'Error calling contract.userAddressByAddress']]
        );
    });

    it('displays a message if address already exists', () => {
        const page = mount(
            <RegisterPhoneNumberPage
                my_web3={web3}
                contract={{
                    ...contract,
                    userAddressByAddress: jest.fn((walet, phone, opts, callback) => {
                        return callback(null, [true]);
                    })
                }}
            />
        );

        const orderButton = page.find('#sendMessageButton');

        for (const [field, value] of sample) {
            page.setState({ [field]: value });
        }

        window.$.ajax = jest.fn(({ success }) => {
            return success({
                ok: true,
                x_id: 'test',
                result: {
                    wallet: '0x1aa2d288d03d8397c193d2327ee7a7443d4ec3a1',
                    params: {
                        phone: sample.get('phone'),
                    }
                }
            });
        });

        checkUserExists.mockImplementationOnce((opts, callback) => {
            return callback(null, true);
        });

        orderButton.simulate('click');

        expect(window.$.ajax).toHaveBeenCalled();
        expect(checkAddressExists).toHaveBeenCalled();
        expect(checkWalletSame).toHaveBeenCalled();
        expect(showAlert).toHaveBeenLastCalledWith(
            'error',
            'Checking if address exists',
            'This address is already registered under your current MetaMask account'
        );
    });

    it('displays a message when error happened sending postcard', () => {
        const page = mount(
            <RegisterPhoneNumberPage
                my_web3={web3}
                contract={{
                    ...contract,
                    userAddressByAddress: jest.fn((walet, phone, opts, callback) => {
                        return callback(null, [false]);
                    })
                }}
            />
        );

        const orderButton = page.find('#sendMessageButton');

        for (const [field, value] of sample) {
            page.setState({ [field]: value });
        }

        window.$.ajax = jest.fn(({ url, success, error }) => {
            switch (url) {
                case '/api/prepareRegTx':
                    return success({
                        ok: true,
                        x_id: 'test',
                        result: {
                            wallet: '0x1aa2d288d03d8397c193d2327ee7a7443d4ec3a1',
                            params: {
                                phone: sample.get('phone'),
                            }
                        }
                    });

                case '/api/notifyRegTx':
                    return error({
                        statusText: 'TX error',
                        status: 500
                    });
            }
        });

        checkUserExists.mockImplementationOnce((opts, callback) => {
            return callback(null, true);
        });

        registerPhone.mockImplementationOnce((opts, callback) => {
            return callback(null, '0xfd3c97d14b3979cc6356a92b79b3ac8038f0065fc5079c6a0a0ff9b0c0786291');
        });

        orderButton.simulate('click');

        expect(window.$.ajax).toHaveBeenCalled();
        expect(checkAddressExists).toHaveBeenCalled();
        expect(checkWalletSame).toHaveBeenCalled();
        expect(showAlert).toHaveBeenLastCalledWith(
            'error',
            'Postcard sending',
            [['Server error', 'TX error (500)']]
        );
    });

    it('displays a message when received error registering address', () => {
        const page = mount(
            <RegisterPhoneNumberPage
                my_web3={web3}
                contract={{
                    ...contract,
                    userAddressByAddress: jest.fn((walet, phone, opts, callback) => {
                        return callback(null, [false]);
                    })
                }}
            />
        );

        const orderButton = page.find('#sendMessageButton');

        for (const [field, value] of sample) {
            page.setState({ [field]: value });
        }

        window.$.ajax = jest.fn(({ url, success }) => {
            switch (url) {
                case '/api/prepareRegTx':
                    return success({
                        ok: true,
                        x_id: 'test',
                        result: {
                            wallet: '0x1aa2d288d03d8397c193d2327ee7a7443d4ec3a1',
                            params: {
                                phone: sample.get('phone'),
                            }
                        }
                    });

                case '/api/notifyRegTx':
                    return success({
                        ok: true,
                        result: {
                            expected_delivery_date: 'tomorrow',
                            mail_type: 'none'
                        }
                    });
            }
        });

        checkUserExists.mockImplementationOnce((opts, callback) => {
            return callback(null, true);
        });

        registerPhone.mockImplementationOnce((opts, callback) => {
            return callback({ message: 'error message' });
        });

        orderButton.simulate('click');

        expect(window.$.ajax).toHaveBeenCalled();
        expect(checkAddressExists).toHaveBeenCalled();
        expect(checkWalletSame).toHaveBeenCalled();
        expect(showAlert).toHaveBeenLastCalledWith(
            'error',
            'Register address',
            [['Error', 'error message']]
        );
    });

    it('displays a message when received an unexpected JSON RPC response registering address', () => {
        const page = mount(
            <RegisterPhoneNumberPage
                my_web3={web3}
                contract={{
                    ...contract,
                    userAddressByAddress: jest.fn((walet, phone, opts, callback) => {
                        return callback(null, [false]);
                    })
                }}
            />
        );

        const orderButton = page.find('#sendMessageButton');

        for (const [field, value] of sample) {
            page.setState({ [field]: value });
        }

        window.$.ajax = jest.fn(({ url, success }) => {
            switch (url) {
                case '/api/prepareRegTx':
                    return success({
                        ok: true,
                        x_id: 'test',
                        result: {
                            wallet: '0x1aa2d288d03d8397c193d2327ee7a7443d4ec3a1',
                            params: {
                                phone: sample.get('phone'),
                            }
                        }
                    });

                case '/api/notifyRegTx':
                    return success({
                        ok: true,
                        result: {
                            expected_delivery_date: 'tomorrow',
                            mail_type: 'none'
                        }
                    });
            }
        });

        checkUserExists.mockImplementationOnce((opts, callback) => {
            return callback(null, true);
        });

        registerPhone.mockImplementationOnce((opts, callback) => {
            return callback();
        });

        orderButton.simulate('click');

        expect(window.$.ajax).toHaveBeenCalled();
        expect(checkAddressExists).toHaveBeenCalled();
        expect(checkWalletSame).toHaveBeenCalled();
        expect(showAlert).toHaveBeenLastCalledWith(
            'error',
            'Register address',
            'Error is empty but txId is also empty!'
        );
    });

    it('displays a message when register address was mined but postcard was not sent', () => {
        const page = mount(
            <RegisterPhoneNumberPage
                my_web3={web3}
                contract={{
                    ...contract,
                    userAddressByAddress: jest.fn((walet, phone, opts, callback) => {
                        return callback(null, [false]);
                    })
                }}
            />
        );

        const orderButton = page.find('#sendMessageButton');

        for (const [field, value] of sample) {
            page.setState({ [field]: value });
        }

        window.$.ajax = jest.fn(({ url, success }) => {
            switch (url) {
                case '/api/prepareRegTx':
                    return success({
                        ok: true,
                        x_id: 'test',
                        result: {
                            wallet: '0x1aa2d288d03d8397c193d2327ee7a7443d4ec3a1',
                            params: {
                                phone: sample.get('phone'),
                            }
                        }
                    });

                case '/api/notifyRegTx':
                    return success({
                        x_id: 'test',
                        err: 'error message'
                    });
            }
        });

        checkUserExists.mockImplementationOnce((opts, callback) => {
            return callback(null, true);
        });

        registerPhone.mockImplementationOnce((opts, callback) => {
            return callback(null, '0xfd3c97d14b3979cc6356a92b79b3ac8038f0065fc5079c6a0a0ff9b0c0786291');
        });

        orderButton.simulate('click');

        expect(window.$.ajax).toHaveBeenCalled();
        expect(checkAddressExists).toHaveBeenCalled();
        expect(checkWalletSame).toHaveBeenCalled();
        expect(showAlert).toHaveBeenLastCalledWith(
            'error',
            'Postcard sending',
            [
                ['Transaction to register address was mined, but postcard was not sent'],
                ['Request ID', 'test'],
                ['Transaction ID', '0xfd3c97d14b3979cc6356a92b79b3ac8038f0065fc5079c6a0a0ff9b0c0786291'],
                ['Error', 'error message'],
            ]
        );
    });

    it('displays a message when register address was mined and postcard was sent', () => {
        const page = mount(
            <RegisterPhoneNumberPage
                my_web3={web3}
                contract={{
                    ...contract,
                    userAddressByAddress: jest.fn((walet, phone, opts, callback) => {
                        return callback(null, [false]);
                    })
                }}
            />
        );

        const orderButton = page.find('#sendMessageButton');

        for (const [field, value] of sample) {
            page.setState({ [field]: value });
        }

        window.$.ajax = jest.fn(({ url, success }) => {
            switch (url) {
                case '/api/prepareRegTx':
                    return success({
                        ok: true,
                        x_id: 'test',
                        result: {
                            wallet: '0x1aa2d288d03d8397c193d2327ee7a7443d4ec3a1',
                            params: {
                                phone: sample.get('phone')
                            }
                        }
                    });

                case '/api/notifyRegTx':
                    return success({
                        ok: true,
                        result: {
                            expected_delivery_date: 'tomorrow',
                            mail_type: 'none'
                        }
                    });
            }
        });

        checkUserExists.mockImplementationOnce((opts, callback) => {
            return callback(null, true);
        });

        registerPhone.mockImplementationOnce((opts, callback) => {
            return callback(null, '0xfd3c97d14b3979cc6356a92b79b3ac8038f0065fc5079c6a0a0ff9b0c0786291');
        });

        orderButton.simulate('click');

        expect(window.$.ajax).toHaveBeenCalled();
        expect(checkAddressExists).toHaveBeenCalled();
        expect(checkWalletSame).toHaveBeenCalled();
        expect(showAlert).toHaveBeenLastCalledWith(
            'success',
            'Address registered!',
            [
                ['Transaction to register address was mined and postcard was sent'],
                ['Transaction ID', '0xfd3c97d14b3979cc6356a92b79b3ac8038f0065fc5079c6a0a0ff9b0c0786291'],
                ['Expected delivery date', 'tomorrow'],
                ['Mail type', 'none']
            ]
        );
    });
});
