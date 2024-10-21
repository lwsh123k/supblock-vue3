import { number } from 'echarts';
import { defineStore } from 'pinia';
import { stringify } from 'querystring';
export const useVerifyStore = defineStore('verifySig', {
    actions: {
        // writeC(chainIndex: number, c: string) {
        //     if (chainIndex == 0) {
        //         this.chain0.c = c;
        //     } else if (chainIndex == 1) {
        //         this.chain1.c = c;
        //     } else if (chainIndex == 2) {
        //         this.chain2.c = c;
        //     }
        // },
        // writeS(chainIndex: number, s: string) {
        //     if (chainIndex == 0) {
        //         this.chain0.s = s;
        //     } else if (chainIndex == 1) {
        //         this.chain1.s = s;
        //     } else if (chainIndex == 2) {
        //         this.chain2.s = s;
        //     }
        // },
        writeT(tokenHashArray: string[]) {
            this.chain0.t_hash = tokenHashArray[0];
            this.chain1.t_hash = tokenHashArray[1];
            this.chain2.t_hash = tokenHashArray[2];
        }
    },
    state() {
        return {
            c: '',
            s: '',
            chain0: {
                t_hash: '',
                t: ''
            },
            chain1: {
                t_hash: '',
                t: ''
            },
            chain2: {
                t_hash: '',
                t: ''
            }
        };
    }
});
