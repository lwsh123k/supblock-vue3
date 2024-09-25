// TriggerEvents.ts
import { useEventStore } from '@/stores/modules/autoUploadEvent';

// not used
export function triggerEvents() {
    const eventStore = useEventStore();

    eventStore.triggerUploadHashAction();

    // example for trigger random reupload
    // eventStore.triggerReuploadNumAction();
}
