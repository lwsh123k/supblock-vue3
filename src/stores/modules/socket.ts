import { defineStore } from 'pinia';
import { socket } from '@/socket';
import { reactive, ref } from 'vue';

export const useSocketStore = defineStore('socket', () => {
    interface Item {
        id: string;
        title: string;
        completed: string;
    }
    let todos = reactive<Item[]>([]);

    function bindEvents() {
        // my listen
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
});
