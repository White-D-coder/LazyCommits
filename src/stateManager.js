import fs from 'fs';
import path from 'path';
import os from 'os';

const LAZYCOMMITS_DIR = path.join(os.homedir(), '.lazycommits');
const STATE_FILE = path.join(LAZYCOMMITS_DIR, 'state.json');

// Ensure the directory exists
if (!fs.existsSync(LAZYCOMMITS_DIR)) {
    fs.mkdirSync(LAZYCOMMITS_DIR, { recursive: true });
}

export const stateManager = {
    loadState() {
        if (fs.existsSync(STATE_FILE)) {
            try {
                return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
            } catch (error) {
                console.error('Error reading state file, resetting:', error.message);
            }
        }
        return this.resetDaily();
    },

    saveState(state) {
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    },

    resetDaily() {
        const today = new Date().toISOString().split('T')[0];
        const state = {
            date: today,
            count: 0,
            limit: Math.floor(Math.random() * (22 - 15 + 1)) + 15, // Random limit between 15 and 22
            daemons: {} // { repoPath: pid }
        };
        this.saveState(state);
        return state;
    },

    checkAndResetIfNeeded(state) {
        const today = new Date().toISOString().split('T')[0];
        if (state.date !== today) {
            // Preserve daemons across days
            const daemons = state.daemons || {};
            const newState = this.resetDaily();
            newState.daemons = daemons;
            this.saveState(newState);
            return newState;
        }
        if (!state.daemons) {
            state.daemons = {};
            this.saveState(state);
        }
        return state;
    },

    incrementCount() {
        let state = this.loadState();
        state = this.checkAndResetIfNeeded(state);
        state.count += 1;
        this.saveState(state);
        return state;
    },

    getLimit() {
        let state = this.loadState();
        state = this.checkAndResetIfNeeded(state);
        return { count: state.count, limit: state.limit };
    },

    increaseLimit(amount = 20) {
        let state = this.loadState();
        state.limit += amount;
        this.saveState(state);
        return state.limit;
    },

    registerDaemon(repoPath, pid) {
        let state = this.loadState();
        state = this.checkAndResetIfNeeded(state);
        state.daemons[repoPath] = pid;
        this.saveState(state);
    },

    removeDaemon(repoPath) {
        let state = this.loadState();
        state = this.checkAndResetIfNeeded(state);
        delete state.daemons[repoPath];
        this.saveState(state);
    },

    getDaemons() {
        let state = this.loadState();
        state = this.checkAndResetIfNeeded(state);
        return state.daemons;
    }
};
