// @ts-check
import dotenv from "dotenv";
dotenv.config();

import { Octokit } from "octokit";
import { createAppAuth } from "@octokit/auth-app";
import { throttling } from "@octokit/plugin-throttling";
import pLimit from "p-limit";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

// Async exec
const execAsync = /** @type {(cmd: string, opts?: import('child_process').ExecOptions) => Promise<{ stdout: string, stderr: string }>} */ (promisify(exec));

// --- Configuration ---
const APP_ID = process.env.PRE_COMMIT_UPDATER_APP_ID;
const APP_UID = process.env.PRE_COMMIT_UPDATER_APP_UID;
const OWNER = process.env.PRE_COMMIT_UPDATER_OWNER;
const PRIVATE_KEY = process.env.PRE_COMMIT_UPDATER_PRIVATE_KEY_BASE64
    ? Buffer.from(process.env.PRE_COMMIT_UPDATER_PRIVATE_KEY_BASE64, "base64").toString("utf-8")
    : undefined;
const DRY_RUN = process.env.DRY_RUN === "true";
const CONCURRENCY = parseInt(process.env.CONCURRENCY || "5", 10);

// --- Octokit with Throttling ---
const ThrottledOctokit = Octokit.plugin(throttling);

/**
 * Checks if all required environment variables are set.
 */
function checkEnv() {
  const missing = [];
  if (!APP_ID) missing.push("PRE_COMMIT_UPDATER_APP_ID");
  if (!APP_UID) missing.push("PRE_COMMIT_UPDATER_APP_UID");
  if (!OWNER) missing.push("PRE_COMMIT_UPDATER_OWNER");
  if (!PRIVATE_KEY) missing.push("PRE_COMMIT_UPDATER_PRIVATE_KEY_BASE64");
  if (missing.length) {
    throw new Error(
        `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}

/**
 * Creates an Octokit instance authenticated for the app installation.
 * This instance will automatically handle rate limiting.
 * @returns {Promise<Octokit>} An authenticated Octokit instance.
 */
async function createInstallationOctokit() {
  const appOctokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: APP_ID,
      privateKey: PRIVATE_KEY,
    },
  });

  const { data: installations } = await appOctokit.rest.apps.listInstallations();
  const installation = installations.find(
    (inst) => inst.account.login.toLowerCase() === OWNER.toLowerCase()
  );

  if (!installation) {
    throw new Error(`No installation found for owner '${OWNER}'`);
  }

  return new ThrottledOctokit({
    authStrategy: createAppAuth,
    auth: {
      appId: APP_ID,
      privateKey: PRIVATE_KEY,
      installationId: installation.id,
    },
    throttle: {
      onRateLimit: (retryAfter, options, octokit, retryCount) => {
        octokit.log.warn(
          `Request quota exhausted for request ${options.method} ${options.url}`
        );
        if (retryCount < 1) {
          octokit.log.info(`Retrying after ${retryAfter} seconds!`);
          return true;
        }
      },
      onSecondaryRateLimit: (retryAfter, options, octokit) => {
        octokit.log.warn(
          `Secondary rate limit hit for ${options.method} ${options.url}`
        );
        return true; // Retry the request
      },
    },
  });
}

/**
 * Fetches all repositories for the installation using pagination.
 * @param {Octokit} octokit - The authenticated Octokit instance.
 * @returns {Promise<object[]>} A list of repository objects.
 */
async function fetchAllRepos(octokit) {
  return octokit.paginate(octokit.rest.apps.listReposAccessibleToInstallation, {
    per_page: 100,
  });
}

/**
 * Processes a single repository.
 * @param {Octokit} octokit - The authenticated Octokit instance.
 * @param {object} repo - The repository object.
 */
async function processRepo(octokit, repo) {
  const repoIdentifier = repo.private ? `private-repo` : repo.html_url;
  const branchName = "update/precommit";

  if (repo.archived) {
    console.log(`Skipping archived repo ${repoIdentifier}.`);
    return;
  }

  // 1. Get the content of the pre-commit config file
  let configContent;
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: OWNER,
      repo: repo.name,
      path: ".pre-commit-config.yaml",
    });
    configContent = Buffer.from(data.content, "base64").toString("utf-8");
  } catch (error) {
    if (error.status === 404) {
      console.log(`No .pre-commit-config.yaml found in ${repoIdentifier}. Skipping.`);
      return;
    }
    throw error;
  }

  // 2. Run pre-commit autoupdate locally to get the new content
  const tempDir = await fs.mkdtemp(path.join("/tmp", "pre-commit-"));
  const tempFile = path.join(tempDir, ".pre-commit-config.yaml");
  await fs.writeFile(tempFile, configContent);

  let updatedContent = null;
  let autoupdateLogs = "";
  try {
    await execAsync("git init", { cwd: tempDir });

    // (Optional, uncomment if you see errors)
    // await execAsync('git config user.email "bot@example.com"', { cwd: tempDir });
    // await execAsync('git config user.name "Pre-commit Bot"', { cwd: tempDir });

    console.log(`Running pre-commit autoupdate for ${repoIdentifier}...`);
    const { stdout, stderr } = await execAsync(`pre-commit autoupdate -c ${tempFile}`, { cwd: tempDir });

    autoupdateLogs = [
      "```shell",
      "stdout:",
      stdout,
      ...(stderr ? ["", "stderr:", stderr] : []),
      "```"
    ].join("\n");

    updatedContent = await fs.readFile(tempFile, "utf-8");
  } catch (err) {
    console.error(`execAsync error for ${repoIdentifier}:`, err);
    if (err.stdout) console.error('STDOUT:', err.stdout);
    if (err.stderr) console.error('STDERR:', err.stderr);
    // Clean up before exiting on error
    await fs.rm(tempDir, { recursive: true, force: true });
    return;
  }

  try {
    if (updatedContent === configContent) {
      console.log(`No updates found for ${repoIdentifier}.`);
      return;
    }

    console.log(`Updates found for ${repoIdentifier}. Creating PR...`);

    if (DRY_RUN) {
      console.log(`[DRY RUN] Would create a verified commit and PR for ${repoIdentifier}.`);
      await fs.rm(tempDir, { recursive: true, force: true });
      return;
    }

    // 3. Create a new blob with the updated content
    const { data: blob } = await octokit.rest.git.createBlob({
      owner: OWNER,
      repo: repo.name,
      content: updatedContent,
      encoding: "utf-8",
    });

    // 4. Get the latest commit and tree
    const { data: ref } = await octokit.rest.git.getRef({
      owner: OWNER,
      repo: repo.name,
      ref: `heads/${repo.default_branch}`,
    });
    const latestCommitSha = ref.object.sha;

    const { data: latestCommit } = await octokit.rest.git.getCommit({
      owner: OWNER,
      repo: repo.name,
      commit_sha: latestCommitSha,
    });
    const latestTreeSha = latestCommit.tree.sha;

    // 5. Create a new tree
    const { data: newTree } = await octokit.rest.git.createTree({
      owner: OWNER,
      repo: repo.name,
      base_tree: latestTreeSha,
      tree: [
        {
          path: ".pre-commit-config.yaml",
          mode: "100644",
          type: "blob",
          sha: blob.sha,
        },
      ],
    });

    // 6. Create a new commit
    const { data: newCommit } = await octokit.rest.git.createCommit({
      owner: OWNER,
      repo: repo.name,
      message: "⬆️ pre-commit updates",
      tree: newTree.sha,
      parents: [latestCommitSha],
    });

    // 7. Create or update the branch
    try {
      await octokit.rest.git.createRef({
        owner: OWNER,
        repo: repo.name,
        ref: `refs/heads/${branchName}`,
        sha: newCommit.sha,
      });
    } catch (error) {
      if (error.status === 422) { // Branch already exists
        await octokit.rest.git.updateRef({
          owner: OWNER,
          repo: repo.name,
          ref: `heads/${branchName}`,
          sha: newCommit.sha,
          force: true,
        });
      } else {
        throw error;
      }
    }

    // 8. Create a pull request
    try {
      const prBody = `
This PR was automatically generated to update the pre-commit hooks to their latest versions.

**Pre-commit Autoupdate Logs:**
${autoupdateLogs}

This helps ensure our code quality checks are always up-to-date.

---
*This PR was generated at ${new Date().toUTCString()}*
`;

      const { data: pr } = await octokit.rest.pulls.create({
        owner: OWNER,
        repo: repo.name,
        title: "⬆️ Update pre-commit hooks",
        head: branchName,
        base: repo.default_branch,
        body: prBody,
      });
      console.log(`Pull request created for ${repoIdentifier}`);

      await octokit.rest.issues.addLabels({
        owner: OWNER,
        repo: repo.name,
        issue_number: pr.number,
        labels: ["dependencies"],
      });
      console.log(`Added 'dependencies' label to PR #${pr.number} for ${repoIdentifier}`);
      return repo.private ? "example.com" : pr.html_url;
    } catch (error) {
      if (error.status === 422 && error.message.includes("A pull request already exists")) {
        console.log(`Pull request already exists for ${repoIdentifier}.`);
        return null;
      } else {
        throw error;
      }
    }
  } finally {
    // Always clean up tempDir
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

/**
 * Main handler function to update pre-commit hooks.
 */
export const handler = async () => {
  checkEnv();
  console.log("Starting pre-commit update check...");
  if (DRY_RUN) {
    console.log("--- DRY RUN MODE ENABLED ---");
  }

  const octokit = await createInstallationOctokit();
  const repos = await fetchAllRepos(octokit);
  console.log(`Found ${repos.length} repositories.`);

  const createdPRs = []; // Array to store created PR details

  const limit = pLimit(CONCURRENCY);
  const processingPromises = repos.map((repo) =>
      limit(async () => {
        try {
          const prUrl = await processRepo(octokit, repo);
          if (prUrl) {
            createdPRs.push({ repo: repo.full_name, url: prUrl });
          }
        } catch (err) {
          const repoIdentifier = repo.private ? `private-repo` : repo.html_url;
          console.error(`Error processing repo ${repoIdentifier}: ${err.message}`);
        }
      })
  );

  await Promise.all(processingPromises);

  console.log("\n--- Pre-commit update check complete ---");
  console.log(`Processed ${repos.length} repositories.`);
  console.log(`Total PRs created: ${createdPRs.length}`);

  if (createdPRs.length > 0) {
    console.log("\nCreated Pull Requests:");
    createdPRs.forEach(pr => {
      console.log(`- ${pr.repo}: ${pr.url}`);
    });
  }

  return "Success!";
};

// Only run when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  handler().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
