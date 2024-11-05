import type { Point } from 'ecurve';
import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';
import type { Token } from './applicant';

export const useVerifyStore = defineStore('verifySig', () => {
    const chainNumber = 3;

    // State
    const pointR = ref<Point>();
    const pointP = ref<Point>();
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

    // Return state and actions for use in components
    return {
        pointR,
        pointP,
        blindedMessage,
        chain0,
        chain1,
        chain2,
        writeT,
        tokens
    };
});
