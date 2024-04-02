import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';

export const useSocketStore = defineStore('socket', () => {
    interface Item {
        id: string;
        title: string;
        completed: string;
    }
    let todos = reactive<Item[]>([]);

    let socketMap = new Map();

    function bindEvents(address: string, signedAuthString: string) {
        // initiate socket
        let socket = io('http://localhost:3000', {
            reconnectionAttempts: 5,
            reconnectionDelay: 5000,
            query: {
                address,
                signedAuthString
            }
        });
        socketMap.set(address, socket);

        // listen event
        socket.on('connect', () => {
            console.log('连接成功');
        });
        socket.on('disconnect', () => {
            console.log('连接断开');
        });

        // others
        socket.on('todo:created', (todo) => {
            todos.push(todo);
        });

        socket.on('todo:updated', (todo) => {
            const existingTodo = todos.find((t) => {
                return t.id === todo.id;
            });
            if (existingTodo) {
                existingTodo.title = todo.title;
                existingTodo.completed = todo.completed;
            }
        });

        socket.on('todo:deleted', (id) => {
            const i = todos.findIndex((t) => {
                return t.id === id;
            });
            if (i !== -1) {
                todos.splice(i, 1);
            }
        });
    }

    return { socketMap, bindEvents };
});
