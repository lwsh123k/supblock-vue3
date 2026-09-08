'use strict';

const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { createRequire } = require('node:module');
const path = require('node:path');
const vectors = require('./elliptic-regression-vectors.json');

async function check(directory) {
    const target = path.resolve(directory);
    const projectRequire = createRequire(path.join(target, 'package.json'));
    const ethersRequire = createRequire(projectRequire.resolve('ethers'));
    const signingRequire = createRequire(ethersRequire.resolve('@ethersproject/signing-key'));
    const { ec: EC } = signingRequire('elliptic');
    const ec = new EC('p521');

    // A sign/verify round trip alone misses the faulty deterministic nonce.
    for (const vector of vectors.tests) {
        const digest = createHash('sha512').update(Buffer.from(vector.msg, 'hex')).digest();
        const signature = ec.sign(digest, vector.privateKey).toDER('hex');
        assert.equal(signature, vector.sig, `${target}: P-521 vector ${vector.tcId}`);
    }

    // Synthetic test key 1; expected outputs were captured from unchanged ethers 5.
    const ethers = projectRequire('ethers');
    const wallet = new ethers.Wallet('1'.padStart(64, '0'));
    const message = 'ethers 5 elliptic regression';
    const signature = await wallet.signMessage(message);
    assert.equal(signature, '0xc59b64bd446159862b2d7ce147ad4b78542c0aadfa022b902bb0717d61fa6c38533f4f79db7a76827d2122d97c98aa520be82d90ddbdcf98563bca49e80f46881c');
    assert.equal(ethers.utils.verifyMessage(message, signature), wallet.address);
    const transaction = await wallet.signTransaction({
        to: '0x' + '5'.repeat(40), nonce: 0, gasLimit: 21000,
        gasPrice: 1000000000, value: 1, chainId: 1337,
    });
    assert.equal(transaction, '0xf86580843b9aca008252089455555555555555555555555555555555555555550180820a95a05db380661b215b7bd5c94c0a19d0c9cd2a809a4a72df96513e9eba9da0b6a158a02a8c1770409e958a6531284098e3ffa1b410d4ed62bc66c8a0e17e50dd1f277e');
    console.log(`${target}: nonce regression and ethers 5 signatures passed`);
}

(async () => {
    for (const directory of process.argv.length > 2 ? process.argv.slice(2) : ['.']) {
        await check(directory);
    }
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
