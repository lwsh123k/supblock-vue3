'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const ethers = require('ethers');
const torus = require('@toruslabs/eccrypto');
const BigInteger = require('bigi');
const curve = require('ecurve').getCurveByName('secp256k1');
const fixture = require('./fixtures/ecies-legacy.json');
const root = path.resolve(__dirname, '..');

// Use the real application wire adapter; stub only its unused network provider.
let encryptionOptions;
function loadUtility() {
    const output = {};
    const source = fs.readFileSync(path.join(root, 'src/ethers/util.ts'), 'utf8');
    vm.runInNewContext(ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }
    }).outputText, {
        exports: output,
        require(name) {
            if (name === './provider') return { provider: undefined };
            if (name === '@toruslabs/eccrypto') return {
                ...torus,
                encrypt(publicKey, message, options) {
                    assert.equal(options.padding, false);
                    return torus.encrypt(publicKey, message, { ...encryptionOptions, ...options });
                }
            };
            return require(name);
        }
    });
    return output;
}

(async () => {
    const utility = loadUtility();
    const uncompressed = ethers.SigningKey.computePublicKey('0x04' + fixture.publicKey, false);
    const compressed = ethers.SigningKey.computePublicKey(uncompressed, true);
    const publicKeys = [fixture.publicKey, uncompressed.slice(2), compressed.slice(2)].flatMap(key => [key, '0x' + key]);
    for (const test of fixture.tests) {
        encryptionOptions = { ephemPrivateKey: Buffer.from(test.ephemPrivateKey, 'hex'), iv: Buffer.from(fixture.iv, 'hex') };
        for (const publicKey of publicKeys) {
            assert.equal(await utility.getEncryptData(publicKey, test.data), '0x' + test.legacyWire, test.name);
        }
        for (const wire of [test.legacyWire, test.paddedWire]) {
            for (const prefix of ['', '0x']) {
                const decoded = await utility.getDecryptData(prefix + fixture.privateKey, prefix + wire).catch(error => {
                    error.message += ` (${test.name}, ${wire === test.legacyWire ? 'legacy' : 'padded'}, prefix=${prefix})`; throw error;
                });
                assert.equal(JSON.stringify(decoded), JSON.stringify(test.data));
            }
        }
        for (const offset of [0, 20, 49, 81]) {
            const altered = Buffer.from(test.legacyWire, 'hex'); altered[offset] ^= 1;
            await assert.rejects(utility.getDecryptData(fixture.privateKey, altered.toString('hex')));
        }
        await assert.rejects(utility.getDecryptData('4'.repeat(64), test.legacyWire));
    }
    for (const invalid of ['0x', '0x00', 'xyz', fixture.tests[0].legacyWire.slice(2)]) {
        await assert.rejects(utility.getDecryptData(fixture.privateKey, invalid));
    }
    for (const invalidKey of ['', '0x', fixture.privateKey, '0x' + fixture.privateKey, 'zz'.repeat(33)]) {
        await assert.rejects(utility.getEncryptData(invalidKey, {}));
    }
    encryptionOptions = undefined;
    const data = { note: 'fresh randomness', chainIndex: 0, l: 1, b: 42 };
    const first = await utility.getEncryptData(uncompressed, data);
    const second = await utility.getEncryptData(uncompressed, data);
    assert.notEqual(first, second);
    assert.equal(JSON.stringify(await utility.getDecryptData(fixture.privateKey, first)), JSON.stringify(data));
    const wallet = new ethers.Wallet(fixture.privateKey);
    const signature = await utility.getSign(fixture.ethereum.message, fixture.privateKey);
    assert.equal(signature, fixture.ethereum.signature);
    assert.equal(ethers.verifyMessage(fixture.ethereum.message, signature), wallet.address);
    assert.equal(await wallet.signTransaction(fixture.ethereum.transaction), fixture.ethereum.serialized);

    // Extract only the random/hash functions; no application account or key material is evaluated.
    const source = fs.readFileSync(path.join(root, 'src/stores/modules/eccBlind.ts'), 'utf8');
    const functions = ['random', 'generateRandomT', 'keccak256'].map(name => source.match(new RegExp('function ' + name + '\\([\\s\\S]+?\\n}'))[0]).join('\n');
    const random = {}; let entropyCalls = 0;
    vm.runInNewContext(ts.transpileModule(functions + '\nexports.random=random;exports.generateRandomT=generateRandomT;exports.hash=keccak256;', {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
    }).outputText, {
        exports: random, BigInteger, n: curve.n, Buffer,
        keccak256Hash: require('js-sha3').keccak256,
        randomBytes(size) { entropyCalls++; return ethers.randomBytes(size); }
    });
    const seen = new Set();
    for (let i = 0; i < 32; i++) {
        const k = random.random(32), t = random.generateRandomT(32);
        assert.equal(k.gcd(curve.n).toString(), '1');
        assert(t.signum() >= 0 && t.compareTo(curve.n) < 0);
        seen.add(k.toString(16));
    }
    assert.equal(seen.size, 32); assert(entropyCalls >= 64);
    assert.equal(random.hash('hello'), '1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8');
    const d = BigInteger.ONE, k = random.random(32), t = random.generateRandomT(32);
    const gamma = BigInteger.valueOf(3), delta = BigInteger.valueOf(4), P = curve.G.multiply(d);
    const A = curve.G.multiply(k).add(curve.G.multiply(gamma)).add(P.multiply(delta));
    const c = BigInteger.fromHex(random.hash('synthetic blind signature' + A.affineX.mod(curve.n).toString()));
    const s = k.subtract(c.subtract(delta).multiply(d)).add(t).add(gamma).mod(curve.n);
    const recovered = P.multiply(c.mod(curve.n)).add(curve.G.multiply(s.subtract(t).mod(curve.n)));
    assert.equal(recovered.affineX.toString(16), A.affineX.toString(16));
    console.log('6 legacy/padded ECIES fixtures, public-key formats, tampering rejection, old signatures and blind-signature CSPRNG passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
