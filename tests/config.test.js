import fs from 'fs';
import path from 'path';
import os from 'os';
import { configManager } from '../src/config.js';

describe('Config Manager', () => {
    const LAZYCOMMITS_DIR = path.join(os.homedir(), '.lazycommits');
    const CONFIG_FILE = path.join(LAZYCOMMITS_DIR, 'config.json');

    beforeEach(() => {
        // Clean up before each test
        if (fs.existsSync(CONFIG_FILE)) {
            fs.unlinkSync(CONFIG_FILE);
        }
    });

    test('Loads default config when file does not exist', () => {
        const config = configManager.loadConfig();
        expect(config.intervals.minMinutes).toBe(20);
        expect(config.intervals.maxMinutes).toBe(45);
        expect(config.chunking.enabled).toBe(true);
    });

    test('Saves and retrieves custom config', () => {
        const config = configManager.loadConfig();
        config.intervals.minMinutes = 10;
        configManager.saveConfig(config);

        const newConfig = configManager.loadConfig();
        expect(newConfig.intervals.minMinutes).toBe(10);
    });
});
