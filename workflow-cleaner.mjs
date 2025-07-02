import dotenv from "dotenv";
dotenv.config();

import { Octokit } from "octokit";
import { createAppAuth } from "@octokit/auth-app";
import pLimit from "p-limit";

// --- Configuration ---
const APP_ID = process.env.APP_ID;
const OWNER = process.env.OWNER;
const DAYS_OLD = parseInt(process.env.DAYS_OLD || "30", 10);
const PRIVATE_KEY = process.env.PRIVATE_KEY_BASE64
  ? Buffer.from(process.env.PRIVATE_KEY_BASE64, "base64").toString("utf-8")
  : undefined;
const DRY_RUN = process.env.DRY_RUN === "true";
const CONCURRENCY = parseInt(process.env.CONCURRENCY || "5", 10);

/**
 * Checks if all required environment variables are set.
 */
function checkEnv() {
  if (!APP_ID || !OWNER || !PRIVATE_KEY) {
    throw new Error(
      "Missing required environment variables: APP_ID, OWNER, PRIVATE_KEY_BASE64"
    );
  }
}

/**
 * Creates an Octokit instance authenticated for the app installation.
 * @returns {Promise<Octokit>} An authenticated Octokit instance.
 */
async function createInstallationOctokit() {
  const appOctokit = new Octokit({
    authStrategy: createAppAuth,
    auth: { appId: APP_ID, privateKey: PRIVATE_KEY },
  });

  const { data: installations } = await appOctokit.request("GET /app/installations");
  const installation = installations.find(
    (inst) => inst.account.login.toLowerCase() === OWNER.toLowerCase()
  );

  if (!installation) {
    throw new Error(`No installation found for owner '${OWNER}'`);
  }

  const auth = createAppAuth({
    appId: APP_ID,
    privateKey: PRIVATE_KEY,
    installationId: installation.id,
  });

  const { token } = await auth({ type: "installation" });
  return new Octokit({ auth: token });
}

/**
 * Fetches all repositories for the installation using pagination.
 * @param {Octokit} octokit - The authenticated Octokit instance.
 * @returns {Promise<object[]>} A list of repository objects.
 */
async function fetchAllRepos(octokit) {
  return octokit.paginate("GET /installation/repositories", {
    per_page: 100,
  });
}

/**
 * Fetches workflow runs older than the specified cutoff date for a given repository.
 * @param {Octokit} octokit - The authenticated Octokit instance.
 * @param {object} repo - The repository object.
 * @param {Date} cutoffDate - The cutoff date.
 * @returns {Promise<object[]>} A list of old workflow run objects.
 */
async function fetchOldWorkflowRuns(octokit, repo, cutoffDate) {
  return octokit.paginate("GET /repos/{owner}/{repo}/actions/runs", {
    owner: OWNER,
    repo: repo.name,
    per_page: 100,
    // Filter runs created before the cutoff date.
    created: `<${cutoffDate.toISOString()}`,
  });
}

/**
 * Deletes a list of workflow runs for a given repository.
 * @param {Octokit} octokit - The authenticated Octokit instance.
 * @param {object} repo - The repository object.
 * @param {object[]} runsToDelete - The list of workflow runs to delete.
 */
async function deleteRuns(octokit, repo, runsToDelete) {
  if (runsToDelete.length === 0) {
    console.log(`No old runs to delete in ${repo.name}.`);
    return;
  }

  console.log(`Found ${runsToDelete.length} old runs in ${repo.name}.`);

  for (const run of runsToDelete) {
    try {
      if (DRY_RUN) {
        console.log(
          `[DRY RUN] Would delete run ${run.id} from ${repo.name} (created at ${run.created_at})`
        );
      } else {
        await octokit.request(
          "DELETE /repos/{owner}/{repo}/actions/runs/{run_id}",
          {
            owner: OWNER,
            repo: repo.name,
            run_id: run.id,
          }
        );
        console.log(`Deleted run ${run.id} from ${repo.name}`);
      }
    } catch (err) {
      console.error(
        `Failed to delete run ${run.id} in ${repo.name}: ${err.message}`
      );
    }
  }
}

/**
 * Main handler function to clean up old workflow runs.
 */
export const handler = async () => {
  checkEnv();
  console.log("Starting GitHub App workflow runs cleanup...");
  if (DRY_RUN) {
    console.log("--- DRY RUN MODE ENABLED ---");
  }

  const octokit = await createInstallationOctokit();
  const repos = await fetchAllRepos(octokit);
  const cutoffDate = new Date(Date.now() - DAYS_OLD * 86400000);
  console.log(`Purging workflow runs older than ${cutoffDate.toISOString()}`);

  const limit = pLimit(CONCURRENCY);

  const processingPromises = repos.map((repo) =>
    limit(async () => {
      try {
        const oldRuns = await fetchOldWorkflowRuns(octokit, repo, cutoffDate);
        await deleteRuns(octokit, repo, oldRuns);
      } catch (err) {
        // Check for 404 Not Found, which can happen if the repo was deleted
        // during the script run or if Actions are disabled.
        if (err.status === 404) {
          console.warn(`Skipping repo ${repo.name}: Not found or Actions disabled.`);
        } else {
          console.error(`Error processing repo ${repo.name}: ${err.message}`);
        }
      }
    })
  );

  await Promise.all(processingPromises);

  console.log("Cleanup complete!");
  return "Success!";
};

// Only run when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  handler().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
