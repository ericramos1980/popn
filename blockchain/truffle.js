const HDWalletProvider = require('truffle-hdwallet-provider');

const mnemonic = 'toddler weather rocket off sentence chat unlock flame organ shuffle treat awful';
const rinkebyUrl = 'https://rinkeby.infura.io';
const sokolUrl = 'https://sokol.poa.network';

module.exports = {
    networks: {
        development: {
            host: '127.0.0.1',
            port: 8545,
            network_id: '*',
            from: '0xdbde11e51b9fcc9c455de9af89729cf37d835156',
        },
        test: {
            host: '127.0.0.1',
            port: 8545,
            network_id: '*',
            gas: '5000000',
        },
        coverage: {
            host: '127.0.0.1',
            port: 8555,
            network_id: '*',
            gas: '0xfffffffffff',
            gasPrice: 0x01,
        },
        rinkeby: {
            provider: new HDWalletProvider(mnemonic, rinkebyUrl),
            network_id: 4,
        },
        sokol: {
            provider: new HDWalletProvider(mnemonic, sokolUrl),
            network_id: 77,
        },
    },
};
