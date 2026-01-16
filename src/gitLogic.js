import simpleGit from 'simple-git';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';

const git = simpleGit();

export async function checkGitStatus() {
    try {
        const isRepo = await git.checkIsRepo();
        if (!isRepo) {
            console.error(chalk.red('Current directory is not a git repository.'));
            return null;
        }

        const status = await git.status();
        return status.files;
    } catch (error) {
        console.error(chalk.red('Error checking git status:'), error.message);
        return null;
    }
}

/**
 * Stages and commits all files in a single batch.
 */
export async function processFiles(files) {
    if (!files || files.length === 0) {
        console.log(chalk.yellow('No files to process.'));
        return;
    }

    console.log(chalk.green(`Processing ${files.length} files...`));
    const spinner = ora('Committing files...').start();

    try {
        // Add all files
        await git.add('.');

        // Generate message
        // Format: "Update: file1, file2... and N others"
        const fileNames = files.map(f => f.path);
        let messageBody = '';
        if (fileNames.length <= 2) {
            messageBody = fileNames.join(', ');
        } else {
            messageBody = `${fileNames.slice(0, 2).join(', ')} and ${fileNames.length - 2} others`;
        }

        const commitMessage = `Update: ${messageBody}`;

        await git.commit(commitMessage);
        spinner.succeed(`Committed: ${commitMessage}`);
    } catch (error) {
        spinner.fail(`Failed to commit: ${error.message}`);
        throw error; // Re-throw to handle in main loop
    }
}

export async function pushChanges() {
    const spinner = ora('Pushing changes...').start();
    try {
        await git.push();
        spinner.succeed('Changes pushed to remote.');
    } catch (error) {
        // Handle "No upstream branch" or missing remote
        if (error.message.includes('No configured push destination') || error.message.includes('no upstream branch')) {
            spinner.fail('No remote/upstream configured.');

            // Check if we already have a remote named 'origin'
            const remotes = await git.getRemotes();
            const hasOrigin = remotes.find(r => r.name === 'origin');

            let remoteUrl;

            if (hasOrigin) {
                // If origin exists but no upstream, try to set it
                spinner.text = 'Remote "origin" found. Attempting to link upstream...';
                try {
                    const branch = await git.revparse(['--abbrev-ref', 'HEAD']);
                    await git.push('origin', branch, ['-u']);
                    spinner.succeed('Upstream linked and changes pushed!');
                    return;
                } catch (linkErr) {
                    // Fallthrough to standard error handling if this fails (e.g. divergent)
                    error = linkErr;
                    spinner.fail(`Failed to link upstream: ${linkErr.message}`);
                }
            } else {
                // Only ask if we TRULY don't have a remote
                console.log(chalk.yellow('\nIt looks like this repository is not connected to a remote server.'));
                const answers = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'remoteUrl',
                        message: 'Enter the GitHub/Remote URL to connect to (or leave empty to skip):'
                    }
                ]);
                remoteUrl = answers.remoteUrl;

                if (remoteUrl) {
                    try {
                        await git.addRemote('origin', remoteUrl);
                    } catch (e) {
                        console.log(chalk.yellow('Remote "origin" might already exist, proceeding...'));
                    }
                } else {
                    return; // User skipped
                }
            }

            // Now try to push with the (possibly new) remote
            if (hasOrigin || remoteUrl) {
                const setupSpinner = ora('Syncing with remote...').start();
                let branch;
                try {
                    branch = await git.revparse(['--abbrev-ref', 'HEAD']);
                    // Try push -u
                    await git.push('origin', branch, ['-u']);
                    setupSpinner.succeed('Remote configured and changes pushed!');
                } catch (pushErr) {
                    // Handle Divergent / Rejected
                    if (pushErr.message.includes('fetch first') || pushErr.message.includes('rejected') || pushErr.message.includes('divergent branches') || pushErr.message.includes('non-fast-forward')) {
                        setupSpinner.text = 'Remote contains changes. Reconciling...';

                        // Ensure branch is defined if it failed before assignment (unlikely but safe)
                        if (!branch) branch = await git.revparse(['--abbrev-ref', 'HEAD']);

                        try {
                            // Try pulling with allow-unrelated-histories (good for first connect)
                            await git.pull('origin', branch, { '--allow-unrelated-histories': null });
                            await git.push('origin', branch, ['-u']);
                            setupSpinner.succeed('Reconciled and pushed!');
                        } catch (pullErr) {
                            // If that fails, try rebase
                            try {
                                setupSpinner.text = 'Trying rebase...';
                                await git.pull('origin', branch, { '--rebase': 'true' });
                                await git.push('origin', branch, ['-u']);
                                setupSpinner.succeed('Rebased and pushed!');
                            } catch (finalErr) {
                                setupSpinner.fail(`Critical failure syncing with remote: ${finalErr.message}`);
                            }
                        }
                    } else {
                        setupSpinner.fail(`Failed to push: ${pushErr.message}`);
                    }
                }
            }

        } else if (error.message.includes('fetch first') || error.message.includes('rejected') || error.message.includes('divergent branches')) {
            // Case 2: Standard "Remote ahead" during normal operation
            spinner.text = 'Remote is ahead. Pulling changes...';
            try {
                const branch = await git.revparse(['--abbrev-ref', 'HEAD']);
                await git.pull('origin', branch, { '--rebase': 'true' });
                await git.push();
                spinner.succeed('Pulled remote changes and pushed.');
            } catch (pullError) {
                spinner.fail('Failed to auto-sync. Please pull manually to resolve conflicts.');
            }
        } else {
            spinner.fail(`Failed to push changes: ${error.message}`);
        }
    }
}

export async function getBranches() {
    try {
        const branchSummary = await git.branchLocal();
        return branchSummary;
    } catch (error) {
        console.error(chalk.red('Error getting branches:'), error.message);
        return null;
    }
}

export async function checkoutBranch(branchName) {
    const spinner = ora(`Switching to branch ${branchName}...`).start();
    try {
        await git.checkout(branchName);
        spinner.succeed(`Switched to branch ${branchName}`);
    } catch (error) {
        spinner.fail(`Failed to switch branch: ${error.message}`);
        console.log(chalk.yellow('Continuing on current branch...'));
    }
}
