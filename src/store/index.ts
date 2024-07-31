//@ts-ignore
import {ActionContext, Commit, createStore} from 'vuex'

type RootState = {
    username: string
}

export const store = createStore<RootState>({
    state: {
        username: /*localStorage.getItem('username') || */'',
    },
    mutations: {
        SET_USERNAME: (state: RootState, username: string) => {
            state.username = username
        }
    },
    actions: {
        setUsername: (commit: Commit, username: string) => {
            localStorage.setItem('username', username)
            commit.commit('SET_USERNAME', username)
        },
    },
    getters: {
        getUsername(state: RootState): string {
            return state.username
        },
        isRegistered(state: RootState): boolean {
            return !!state.username
        }
    }
})