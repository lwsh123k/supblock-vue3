import type { ContractEventPayload } from 'ethers';
import type { TypedContractEvent, TypedListener } from './types/common';

// ethers 6 的过滤监听可能只传 payload；TypeChain 要求展开参数和 EventLog。
// 返回的同一函数也用于 off，保持取消监听有效。
export function withEventArgs<T extends TypedContractEvent>(listener: TypedListener<T>): TypedListener<T> {
    return ((...args: unknown[]) => {
        const payload = args[args.length - 1] as ContractEventPayload;
        return listener(...([...payload.args, payload.log] as unknown as Parameters<TypedListener<T>>));
    }) as TypedListener<T>;
}
