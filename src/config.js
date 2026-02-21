import fs from 'fs';
import path from 'path';
import os from 'os';

const LAZYCOMMITS_DIR = path.join(os.homedir(), '.lazycommits');
const CONFIG_FILE = path.join(LAZYCOMMITS_DIR, 'config.json');

// Default configurations
const defaultConfig = {
    intervals: {
        minMinutes: 20,
        maxMinutes: 45
    },
    limits: {
        minCommits: 15,
        maxCommits: 22
    },
    workingHours: {
        enabled: true,
        startHour: 9, // 9 AM
        endHour: 18, // 6 PM
        weekendsEnabled: false
    },
    chunking: {
        enabled: true,
        minFiles: 1,
        maxFiles: 3
    },
    messages: {
        useAI: false,
        aiToken: '',
        templates: [
            "Update: {files}",
            "Refactor: adjusted {files}",
            "Fix: resolved issues in {files}",
            "Chore: general cleanup in {files}",
            "Feat: progress on {files}"
        ]
    },
    repositories: []
};

// Ensure the directory exists
if (!fs.existsSync(LAZYCOMMITS_DIR)) {
    fs.mkdirSync(LAZYCOMMITS_DIR, { recursive: true });
}

export const configManager = {
    loadConfig() {
        if (fs.existsSync(CONFIG_FILE)) {
            try {
                const userConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
                // Merge default with user config
                return {
                    ...defaultConfig, ...userConfig,
                    intervals: { ...defaultConfig.intervals, ...(userConfig.intervals || {}) },
                    limits: { ...defaultConfig.limits, ...(userConfig.limits || {}) },
                    workingHours: { ...defaultConfig.workingHours, ...(userConfig.workingHours || {}) },
                    chunking: { ...defaultConfig.chunking, ...(userConfig.chunking || {}) },
                    messages: { ...defaultConfig.messages, ...(userConfig.messages || {}) }
                };
            } catch (error) {
                console.error('Error reading config file, using defaults:', error.message);
            }
        }
        this.saveConfig(defaultConfig);
        return defaultConfig;
    },

    saveConfig(config) {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    }
};
