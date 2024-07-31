import {createRouter, createWebHistory} from "vue-router";
import Register from "../components/Register.vue";
import Call from "../components/Call.vue";
//@ts-ignore
import App from "../App.vue";

export const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: "/",
            name: "App",
            component: App,
        },
        {
            path: "/register",
            name: "Register",
            component: Register
        },
        {
            path: "/call",
            name: "Call",
            component: Call
        }
    ]
})