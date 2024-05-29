import { defineStore, storeToRefs } from 'pinia';
import { reactive, ref } from 'vue';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { getStoreData } from '@/ethers/contract';
import { useApplicantStore } from './applicant';
import { getEncryptData } from '@/ethers/util';
import { getAccountInfo } from '@/api';
import { useEventListenStore } from './relayEventListen';
import { useLoginStore } from './login';
import { Wallet } from 'ethers';
import { provider } from '@/ethers/provider';

export const useSocketStore = defineStore('socket', () => {});
