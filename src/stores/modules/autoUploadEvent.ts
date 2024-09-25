// stores/eventStore.ts
import { ref } from 'vue';
import { defineStore } from 'pinia';

export const useEventStore = defineStore('event', () => {
    const triggerUploadHash = ref(false);
    const triggerReuploadNum = ref(false);

    function triggerUploadHashAction() {
        triggerUploadHash.value = true;
        setTimeout(() => {
            triggerUploadHash.value = false;
        }, 100);
    }

    function triggerReuploadNumAction() {
        triggerReuploadNum.value = true;
        setTimeout(() => {
            triggerReuploadNum.value = false;
        }, 100);
    }

    return {
        triggerUploadHash,
        triggerReuploadNum,
        triggerUploadHashAction,
        triggerReuploadNumAction
    };
});
