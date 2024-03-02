import { Subject, timer, Observable } from 'rxjs';
import { filter, switchMap, take, takeUntil, map, withLatestFrom } from 'rxjs/operators';

interface Event {
    type: 'hasha' | 'hashb' | 'numa' | 'numb';
    value: string | number;
}

interface DetectionResult {
    hasha: Event;
    hashb: Event;
    numa: Event;
    numb: Event;
}

// 事件源Subject
const eventSource = new Subject<Event>();

// 分类事件流
const hasha$ = eventSource.pipe(filter((event: Event) => event.type === 'hasha'));
const hashb$ = eventSource.pipe(filter((event: Event) => event.type === 'hashb'));
const numa$ = eventSource.pipe(filter((event: Event) => event.type === 'numa'));
const numb$ = eventSource.pipe(filter((event: Event) => event.type === 'numb'));

// 定义检测流程
const detectionFlow$: Observable<DetectionResult> = hasha$.pipe(
    // 对于每个hasha事件，进行流程检测
    switchMap((hashaEvent: Event) => {
        // 30秒内检测hashb事件
        const hashbWithin30s$: Observable<Event> = hashb$.pipe(
            take(1), // 取第一个hashb事件
            takeUntil(timer(30000)) // 30秒超时
        );

        // 60秒内检测numa和numb事件，需要在hashb事件之后开始计时
        const numaAndNumbWithin60s$ = hashbWithin30s$.pipe(
            switchMap(() => {
                const numaWithin60s$: Observable<Event> = numa$.pipe(take(1), takeUntil(timer(60000)));
                const numbWithin60s$: Observable<Event> = numb$.pipe(take(1), takeUntil(timer(60000)));

                // 合并numa和numb事件流，确保都接收到
                return numaWithin60s$.pipe(
                    withLatestFrom(numbWithin60s$),
                    map(([numa, numb]) => ({ numa, numb }))
                );
            })
        );

        // 返回整个流程的事件流，首先是hashb，然后是numa和numb
        return hashbWithin30s$.pipe(
            withLatestFrom(numaAndNumbWithin60s$),
            map(([hashb, { numa, numb }]): DetectionResult => ({ hasha: hashaEvent, hashb, numa, numb }))
        );
    })
);

// 订阅并处理流程结果
detectionFlow$.subscribe({
    next: (result: DetectionResult) => {
        console.log('Detection Flow Result:', result);
    },
    error: (err) => {
        console.error('Error in detection flow:', err);
    },
    complete: () => {
        console.log('Detection flow complete');
    }
});

// 模拟事件源发送事件
eventSource.next({ type: 'hasha', value: 'A' });
setTimeout(() => eventSource.next({ type: 'hashb', value: 'B' }), 10000); // 10秒后发送hashb
setTimeout(() => eventSource.next({ type: 'numa', value: 1 }), 40000); // 40秒后发送numa
setTimeout(() => eventSource.next({ type: 'numb', value: 2 }), 50000); // 50秒后发送numb
