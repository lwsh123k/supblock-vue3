import type { Point } from 'ecurve';
import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';
import type { Token } from './applicant';
import ecc from './eccBlind';
import BigInteger from 'bigi';
import eccBlind from './eccBlind';

export const useVerifyStore = defineStore('verifySig', () => {
    const chainNumber = 3;

    // State
    const γ_string = 'c5a39eef19d5ae97aa0721850debfaed4982061404cb4325424dd8023e178917';
    const δ_string = 'f288dbc4cf8efef384fd606e7e78bff661c50619e3e31e2bf9449f611ab06ddd';
    const pointR = ref<Point>();
    const pointP = ref<Point>();
    const message = ref('');
    const blindedMessage = reactive({ c: '', cBlinded: '', s: '', γ: '', δ: '' });
    const chain0 = reactive({ t_hash: '', t: '' });
    const chain1 = reactive({ t_hash: '', t: '' });
    const chain2 = reactive({ t_hash: '', t: '' });

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
    function writeT(tokenHashArray: string[]) {
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
        let t1 = BigInteger.fromHex(chain0.t),
            t2 = BigInteger.fromHex(chain1.t),
            t3 = BigInteger.fromHex(chain2.t),
            n = eccBlind.n;
        let t = t1.add(t2).add(t3).mod(n);
        let result = ecc.verifySig(
            '0x7333Ed521D675fDD15AE459fCcac3b4D9763F50d',
            blindedMessage.c,
            blindedMessage.s,
            t.toString(16)
        ).result;
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
        writeT,
        tokens,
        verifySigFunc
    };
});
