import dotenv from "dotenv";
dotenv.config();

import { Octokit } from "@octokit/core";
import { createAppAuth } from "@octokit/auth-app";
import pLimit from "p-limit";

const APP_ID = process.env.APP_ID;
const OWNER = process.env.OWNER;
const DAYS_OLD = parseInt(process.env.DAYS_OLD || "30", 10);
const PRIVATE_KEY = Buffer.from(process.env.PRIVATE_KEY_BASE64, "base64").toString("utf-8");
const DRY_RUN = process.env.DRY_RUN === "true";
const CONCURRENCY = parseInt(process.env.CONCURRENCY || "4", 10); // Limit parallel repos

function checkEnv() {
  if (!APP_ID || !OWNER || !PRIVATE_KEY) {
    throw new Error("Missing required environment variables!");
  }
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function getInstallationId(appOctokit) {
  const installations = await appOctokit.request("GET /app/installations");
  const installation = installations.data.find(
    (inst) => inst.account.login.toLowerCase() === OWNER.toLowerCase()
  );
  if (!installation) throw new Error(`No installation found for ${OWNER}`);
  return installation.id;
}

async function getInstallationToken(installationId) {
  const auth = createAppAuth({
    appId: APP_ID,
    privateKey: PRIVATE_KEY,
    installationId,
  });
  const { token } = await auth({ type: "installation" });
  return token;
}

async function fetchAllRepos(octokit) {
  let repos = [];
  let page = 1, fetched;
  do {
    const res = await octokit.request("GET /installation/repositories", {
      per_page: 100, page,
    });
    fetched = res.data.repositories;
    repos = repos.concat(fetched);
    page++;
  } while (fetched.length === 100);
  return repos;
}

async function fetchAllWorkflowRuns(octokit, repo) {
  let runs = [];
  let page = 1, fetched;
  do {
    const res = await octokit.request("GET /repos/{owner}/{repo}/actions/runs", {
      owner: OWNER,
      repo: repo.name,
      per_page: 100,
      page,
    });
    fetched = res.data.workflow_runs;
    runs = runs.concat(fetched);
    page++;
  } while (fetched.length === 100);
  return runs;
}

async function deleteRuns(octokit, repo, oldRuns) {
  for (const run of oldRuns) {
    try {
      if (DRY_RUN) {
        console.log(`[DRY RUN] Would delete run ${run.id} from ${repo.name} (created at ${run.created_at})`);
      } else {
        await octokit.request("DELETE /repos/{owner}/{repo}/actions/runs/{run_id}", {
          owner: OWNER,
          repo: repo.name,
          run_id: run.id,
        });
        console.log(`Deleted run ${run.id} from ${repo.name}`);
        // Optionally: await delay(500); // to ease rate limits
      }
    } catch (err) {
      console.error(`Failed to delete run ${run.id} in ${repo.name}: ${err.message}`);
    }
  }
}

export const handler = async () => {
  checkEnv();
  console.log("Starting GitHub App workflow runs cleanup...");

  // Step 1: Authenticate as App
  const appOctokit = new Octokit({
    authStrategy: createAppAuth,
    auth: { appId: APP_ID, privateKey: PRIVATE_KEY },
  });

  // Step 2: Find installation and get installation token
  const installationId = await getInstallationId(appOctokit);
  const token = await getInstallationToken(installationId);
  const octokit = new Octokit({ auth: token });

  // Step 3: List all repos
  const repos = await fetchAllRepos(octokit);
  const cutoffDate = new Date(Date.now() - DAYS_OLD * 86400000);

  const limit = pLimit(CONCURRENCY);

  await Promise.all(
    repos.map((repo) =>
      limit(async () => {
        try {
          const runs = await fetchAllWorkflowRuns(octokit, repo);
          const oldRuns = runs.filter((run) => new Date(run.created_at) < cutoffDate);
          if (oldRuns.length) {
            console.log(`Found ${oldRuns.length} old runs in ${repo.name}`);
            await deleteRuns(octokit, repo, oldRuns);
          }
        } catch (err) {
          console.error(`Error processing repo ${repo.name}: ${err.message}`);
        }
      })
    )
  );

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
