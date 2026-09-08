'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ethers = require('ethers');
const ts = require('typescript');

// Exercise the production adapter against real ethers contracts without a chain.
const root = path.resolve(__dirname, '..');
const adapter = { exports: {} };
vm.runInNewContext(ts.transpileModule(
    fs.readFileSync(path.join(root, 'src/ethers/eventListener.ts'), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }
).outputText, { exports: adapter.exports });
const { withEventArgs } = adapter.exports;

(async () => {
    const address = '0x' + '1'.repeat(40);
    const other = '0x' + '2'.repeat(40);
    const hash = '0x' + 'a'.repeat(64);
    const txHash = '0x' + 'b'.repeat(64);
    let subscribed;
    const provider = {
        get provider() { return this; },
        async on(filter, listener) { subscribed = { filter, listener }; },
        async off() { subscribed = undefined; }
    };
    const contract = new ethers.Contract(address,
        JSON.parse(fs.readFileSync(path.join(root, 'src/ethers/abi/FairInteger.json'))), provider);
    const values = [address, other, 42n, 256n, 1700000000n, 1700000030n, hash, hash];
    const encoded = contract.interface.encodeEventLog('ResInfoUpload', values);
    const log = new ethers.Log({
        address, ...encoded, transactionHash: txHash, blockHash: hash,
        blockNumber: 1, index: 0, transactionIndex: 0, removed: false
    }, provider);
    let resolveEvent;
    const result = new Promise(resolve => { resolveEvent = resolve; });
    const listener = withEventArgs((...args) => resolveEvent(args));
    const filter = contract.filters.ResInfoUpload(address, other);
    await contract.once(filter, listener);
    assert.deepEqual(subscribed.filter.topics, await filter.getTopicFilter());
    subscribed.listener(log);
    const timeout = setTimeout(() => { throw new Error('Event listener timed out'); }, 2000);
    const args = await result;
    clearTimeout(timeout);
    assert.deepEqual(args.slice(0, -1), values);
    assert.equal(args.at(-1).transactionHash, txHash);
    assert.equal(JSON.stringify({ ni: ethers.toNumber(args[2]), ri: ethers.toBeHex(args[3]), t: ethers.toNumber(args[5]) }),
        '{"ni":42,"ri":"0x0100","t":1700000030}');
    assert.throws(() => ethers.toNumber(2n ** 53n));
    await contract.on(filter, listener);
    assert.equal(await contract.listenerCount(filter), 1);
    await contract.off(filter, listener);
    assert.equal(await contract.listenerCount(filter), 0);
    await contract.removeAllListeners();
    // Failed asynchronous registration must reject every business promise and clear its timer.
    const registrationError = new Error('synthetic registration failure');
    const pendingTimers = new Set();
    const failingContract = {
        filters: new Proxy({}, { get: () => () => ({}) }),
        once: () => Promise.reject(registrationError)
    };
    const timed = { exports: {} };
    vm.runInNewContext(ts.transpileModule(
        fs.readFileSync(path.join(root, 'src/ethers/timedListen.ts'), 'utf8'),
        { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }
    ).outputText, {
        exports: timed.exports, console: { log() {} },
        setTimeout: () => { const timer = {}; pendingTimers.add(timer); return timer; },
        clearTimeout: timer => pendingTimers.delete(timer),
        require(name) {
            if (name === './contract') return { getFairIntGen: async () => failingContract };
            if (name === './eventListener') return { withEventArgs };
            assert.equal(name, 'ethers'); return ethers;
        }
    });
    for (const name of ['listenResHash', 'listenReqNum', 'listenReqReupload']) {
        await assert.rejects(timed.exports[name](address, other), error => error === registrationError);
        assert.equal(pendingTimers.size, 0);
    }
    for (const name of ['stopableListenResNum', 'stopableListenReqReupload', 'stopableListenResReupload']) {
        const { p } = await timed.exports[name](address, other);
        await assert.rejects(p, error => error === registrationError);
        assert.equal(pendingTimers.size, 0);
    }
    // The UI sends hash and random-number transactions back to back with the same wallet.
    // Exercise the real WebSocketProvider cache using an in-memory socket, never a network.
    let pendingNonce = 0, nonceQueries = 0;
    const socket = {
        send(message) {
            const request = JSON.parse(message);
            assert(['eth_chainId', 'eth_getTransactionCount'].includes(request.method));
            const result = request.method === 'eth_chainId' ? '0x539' : ethers.toQuantity(pendingNonce);
            if (request.method === 'eth_getTransactionCount') nonceQueries++;
            queueMicrotask(() => socket.onmessage({ data: JSON.stringify({ jsonrpc: '2.0', id: request.id, result }) }));
        },
        close() {}
    };
    const loadedProvider = { exports: {} };
    vm.runInNewContext(ts.transpileModule(
        fs.readFileSync(path.join(root, 'src/ethers/provider.ts'), 'utf8'),
        { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }
    ).outputText, {
        exports: loadedProvider.exports,
        require(name) {
            assert.equal(name, 'ethers');
            return { ethers: { WebSocketProvider: class extends ethers.WebSocketProvider {
                constructor(_url, network, options) { super(socket, network, options); }
            } } };
        }
    });
    const liveProvider = loadedProvider.exports.provider;
    await socket.onopen();
    try {
        const wallet = new ethers.Wallet('0x' + '1'.padStart(64, '0'), liveProvider);
        assert.equal(await wallet.getNonce('pending'), 0);
        pendingNonce = 1;
        assert.equal(await wallet.getNonce('pending'), 1);
        assert.equal(nonceQueries, 2);
    } finally { await liveProvider.destroy(); }
    console.log('ethers 6 events, JSON values, cancellation, six registration failures and fresh pending nonce passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
