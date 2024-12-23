import type { Point } from 'ecurve';
import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';
import ecc from './eccBlind';
import BigInteger from 'bigi';
import eccBlind from './eccBlind';
import { padTo64 } from '@/ethers/util';
import type { Token } from './types';
import { useLoginStore } from './login';

export const useVerifyStore = defineStore('verifySig', () => {
    let { chainLength, chainNumber } = useLoginStore();

    // State
    const γ_string = 'c5a39eef19d5ae97aa0721850debfaed4982061404cb4325424dd8023e178917';
    const δ_string = 'f288dbc4cf8efef384fd606e7e78bff661c50619e3e31e2bf9449f611ab06ddd';
    const pointR = ref<Point>();
    const pointP = ref<Point>();
    const message = ref(''); // 原始message
    const blindedMessage = reactive({ c: '', cBlinded: '', s: '', γ: '', δ: '' });
    const chain0 = reactive({ t_hash: '', t: '' });
    const chain1 = reactive({ t_hash: '', t: '' });
    const chain2 = reactive({ t_hash: '', t: '' });

    // 中间token
    let intermediateToken = reactive<string[][]>(
        Array(chainNumber)
            .fill(null)
            .map(() => {
                // 每个子数组长度为 chainLength，初始值为 ''
                return Array(chainLength).fill('');
            })
    );

    // save token
    let tokens = reactive<Token[]>([]);
    for (let i = 0; i < chainNumber; i++) {
        tokens.push({
            tokenReceived: '',
            tokenDecrypted: '',
            tokenHash: '',
            verifyResult: false
        });
    }

    // Actions
    function writeTHash(tokenHashArray: string[]) {
        chain0.t_hash = tokenHashArray[0];
        chain1.t_hash = tokenHashArray[1];
        chain2.t_hash = tokenHashArray[2];
    }

    function verifySigFunc() {
        if (
            message.value === '' ||
            blindedMessage.c === '' ||
            blindedMessage.s === '' ||
            chain0.t === '' ||
            chain1.t === '' ||
            chain2.t === ''
        ) {
            console.log('Values check failed:');
            console.log({
                'message.value': message.value,
                'blindedMessage.c': blindedMessage.c,
                'blindedMessage.s': blindedMessage.s,
                'chain0.t': chain0.t,
                'chain1.t': chain1.t,
                'chain2.t': chain2.t
            });
            return false;
        }
        let t0 = BigInteger.fromHex(padTo64(chain0.t)),
            t1 = BigInteger.fromHex(padTo64(chain1.t)),
            t2 = BigInteger.fromHex(padTo64(chain2.t)),
            n = eccBlind.n;
        let t = t0.add(t1).add(t2).mod(n);
        let result = ecc.verifySig(message.value, blindedMessage.c, blindedMessage.s, t.toString(16)).result;
        console.log({
            'verify result': result,
            'message.value': message.value,
            'blindedMessage.c': blindedMessage.c,
            'blindedMessage.s': blindedMessage.s,
            'chain0.t': chain0.t,
            'chain1.t': chain1.t,
            'chain2.t': chain2.t,
            t: t.toString(16)
        });
        return result;
    }
    // Return state and actions for use in components
    return {
        γ_string,
        δ_string,
        pointR,
        pointP,
        message,
        blindedMessage,
        chain0,
        chain1,
        chain2,
        writeTHash,
        tokens,
        verifySigFunc,
        intermediateToken
    };
});
