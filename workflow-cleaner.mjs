import dotenv from "dotenv";
dotenv.config();

import { Octokit } from "@octokit/core";
import { createAppAuth } from "@octokit/auth-app";

const APP_ID = process.env.APP_ID;
const OWNER = process.env.OWNER;
const DAYS_OLD = parseInt(process.env.DAYS_OLD || "30", 10);
const PRIVATE_KEY = Buffer.from(process.env.PRIVATE_KEY_BASE64, "base64").toString("utf-8");
const DRY_RUN = process.env.DRY_RUN === "true";

// Main function
export const handler = async () => {
    console.log("Starting GitHub App workflow runs cleanup...");

    // Step 1: Authenticate as App
    const appOctokit = new Octokit({
        authStrategy: createAppAuth,
        auth: {
            appId: APP_ID,
            privateKey: PRIVATE_KEY,
        },
    });

    // Step 2: Find installation for your org/account
    const installations = await appOctokit.request("GET /app/installations");
    const installation = installations.data.find(
        (inst) => inst.account.login.toLowerCase() === OWNER.toLowerCase()
    );
    if (!installation) throw new Error(`No installation found for ${OWNER}`);

    // Step 3: Create installation token for the org/account
    const installationId = installation.id;
    const auth = createAppAuth({
        appId: APP_ID,
        privateKey: PRIVATE_KEY,
        installationId,
    });
    const { token } = await auth({ type: "installation" });
    const octokit = new Octokit({ auth: token });

    // Step 4: List all repos accessible to the installation
    let repos = [];
    let page = 1;
    let reposResponse;
    do {
        reposResponse = await octokit.request("GET /installation/repositories", {
            per_page: 100,
            page,
        });
        repos = repos.concat(reposResponse.data.repositories);
        page++;
    } while (reposResponse.data.repositories.length === 100);

    const cutoffDate = new Date(Date.now() - DAYS_OLD * 86400000);

    for (const repo of repos) {
        const isPrivate = repo.private;
        const displayName = isPrivate ? "[PRIVATE]" : repo.name;
        console.log(`Checking repo: ${displayName}`);

        // Step 5: List workflow runs, paginated
        let runs = [];
        let runPage = 1;
        let runsResponse;
        do {
            runsResponse = await octokit.request("GET /repos/{owner}/{repo}/actions/runs", {
                owner: OWNER,
                repo: repo.name,
                per_page: 100,
                page: runPage,
            });
            runs = runs.concat(runsResponse.data.workflow_runs);
            runPage++;
        } while (runsResponse.data.workflow_runs.length === 100);

        const oldRuns = runs.filter((run) => new Date(run.created_at) < cutoffDate);

        if (oldRuns.length) {
            console.log(`Found ${oldRuns.length} old runs in ${displayName}`);
        }

        for (const run of oldRuns) {
            if (DRY_RUN) {
                console.log(`[DRY RUN] Would delete run ${run.id} from ${displayName} (created at ${run.created_at})`);
            } else {
                await octokit.request("DELETE /repos/{owner}/{repo}/actions/runs/{run_id}", {
                    owner: OWNER,
                    repo: repo.name,
                    run_id: run.id,
                });
                console.log(`Deleted run ${run.id} from ${displayName}`);
            }
        }
    }

    console.log("Cleanup complete!");
    return "Success!";
};

// For local testing
if (process.env.LOCAL_RUN === "true") {
    handler().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
