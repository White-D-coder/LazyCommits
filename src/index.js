#!/usr/bin/env node
import { program } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkGitStatus, processFiles, pushChanges, getBranches, checkoutBranch } from './gitLogic.js';
import { stateManager } from './stateManager.js';
import { configManager } from './config.js';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomInterval(config) {
    const minMinutes = config.intervals.minMinutes;
    const maxMinutes = config.intervals.maxMinutes;
    const minutes = Math.floor(Math.random() * (maxMinutes - minMinutes + 1) + minMinutes);
    return minutes * 60 * 1000;
}

function isWorkingHour(config) {
    if (!config.workingHours.enabled) return true;

    const now = new Date();
    const currentHour = now.getHours();
    const dayOfWeek = now.getDay();

    if (!config.workingHours.weekendsEnabled && (dayOfWeek === 0 || dayOfWeek === 6)) {
        return false; // It's the weekend
    }

    return currentHour >= config.workingHours.startHour && currentHour < config.workingHours.endHour;
}

async function main() {
    program
        .name('Deep')
        .description('Automatically commits files in batches with human-like intervals.')
        .version('1.0.0');

    program.parse();

    console.log(chalk.blue('Running Deep (Auto Git Pusher) in Human-like Mode...'));
    console.log(chalk.dim('Press Ctrl+C to stop.'));

    // Initialize state
    stateManager.loadState();

    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));
    const currentVersion = pkg.version;

    const lastSeen = stateManager.getAnnouncementVersion();
    if (lastSeen !== currentVersion) {
        console.log(chalk.magenta.bold(`\n🎉 New Update is Here! Welcome to LazyCommits v${currentVersion}! 🎉`));
        console.log(chalk.cyan('--------------------------------------------------'));
        console.log(chalk.yellow('🚀 NEW FEATURES IN THIS RELEASE:'));
        console.log(chalk.white(' 1. ') + chalk.green('Smart File Chunking: ') + chalk.gray('Automatically commits 1-3 files at a time intelligently.'));
        console.log(chalk.white(' 2. ') + chalk.green('Working Hours: ') + chalk.gray('Pauses completely at night & weekends to protect your graph.'));
        console.log(chalk.white(' 3. ') + chalk.green('Human Commits: ') + chalk.gray('Messages now look exactly like a real developer wrote them.'));
        console.log(chalk.white(' 4. ') + chalk.green('Global Settings: ') + chalk.gray('Edit limits and templates at ~/.lazycommits/config.json'));
        console.log(chalk.cyan('--------------------------------------------------\n'));
        stateManager.setAnnouncementVersion(currentVersion);
    }

    // Branch selection
    const branches = await getBranches();
    if (branches) {
        const answers = await inquirer.prompt([
            {
                type: 'list',
                name: 'branch',
                message: 'Select the branch to work on:',
                choices: branches.all,
                default: branches.current
            }
        ]);

        if (answers.branch !== branches.current) {
            await checkoutBranch(answers.branch);
        } else {
            console.log(chalk.green(`Staying on current branch: ${branches.current}`));
        }
    }

    while (true) {
        // Load config on each iteration to catch updates dynamically
        const config = configManager.loadConfig();

        if (!isWorkingHour(config)) {
            console.log(chalk.yellow('\nCurrently outside of working hours. Pausing until next check...'));
            await sleep(60 * 60 * 1000); // Sleep for 1 hour
            continue;
        }

        // 1. Check current status
        let files = await checkGitStatus();

        if (files === null) {
            console.error(chalk.red('Error reading git status. Retrying in 30s...'));
            await sleep(30000);
            continue;
        }

        if (files.length > 0) {
            console.log(chalk.yellow(`\nFound ${files.length} changed files.`));

            // 2. Check Daily Limit
            const { count, limit } = stateManager.getLimit();
            console.log(chalk.dim(`Daily Progress: ${count}/${limit} commits`));

            if (count >= limit) {
                console.log(chalk.magenta('\nDaily commit limit reached!'));
                // Play a sound or notify? (skipped for CLI simplicity)

                const answer = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'continue',
                        message: `You have reached your daily limit of ${limit} commits. Do you want to add 20 more slots and continue?`,
                        default: true
                    }
                ]);

                if (answer.continue) {
                    const newLimit = stateManager.increaseLimit(20);
                    console.log(chalk.green(`Limit increased to ${newLimit}. Continuing...`));
                } else {
                    console.log(chalk.yellow('Limit maintained. Pausing for 1 hour before checking again...'));
                    await sleep(60 * 60 * 1000);
                    continue;
                }
            }

            // 3. Process & Push
            await processFiles(files);
            await pushChanges();
            stateManager.incrementCount();
        } else {
            console.log(chalk.gray('No changes found.'));
        }

        // 4. Wait for random interval
        const intervalMs = getRandomInterval(config);
        const nextTime = new Date(Date.now() + intervalMs).toLocaleTimeString();
        console.log(chalk.blue(`\nNext check scheduled for ${nextTime} (approx ${Math.round(intervalMs / 60000)} mins).`));
        await sleep(intervalMs);
    }
}

main();
