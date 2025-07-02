# GhActions

**Reusable GitHub Actions workflows for DevOps, automation, and project maintenance.**

This repository contains a collection of [reusable GitHub Action workflows](https://docs.github.com/en/actions/using-workflows/reusing-workflows) and admin scripts I use across many projects—covering Docker, Python, release/tag cleanup, security, notification, and more.

---

## 📦 Organization & Usage

- All workflows are stored in `.github/workflows/`.
- Many workflows are **reusable**: you can call them from other repositories via  
  `uses: <user>/<repo>/.github/workflows/<workflow>.yml@main`
- **Admin scripts** (like `workflow-cleaner.mjs`) and shell scripts live in the repo root.
- This repo is designed to be open source, safe for publishing, and easy for others to adopt.

---

## 🚦 Security Best Practices

- **No secrets are committed.**
- Example `.env.example` is provided—**never commit `.env` or `.pem` files**.
- Workflows never log private repo names or sensitive data.

---

## 🔥 Workflows Catalog

### Docker

<details>
<summary>DockerHub Bumper (`dockerhub-push.yml`)</summary>

| Name                 | Input Data Type | Default                                | Input Type | Mandatory? | Description                          |
|----------------------|-----------------|----------------------------------------|------------|------------|--------------------------------------|
| `DOCKERHUB_USERNAME` | string          | -                                      | secrets    | ✅          | Dockerhub Username                   |
| `DOCKERHUB_TOKEN`    | string          | -                                      | secrets    | ✅          | Dockerhub Password/Token             |
| `IMAGE_TAG`          | string          | ${{ github.repository }}:latest        | inputs     | ❎          | Tag for image                        |
| `PLATFORMS`          | string          | linux/amd64,linux/arm64,linux/arm64/v8 | inputs     | ❎          | Platforms to build for               |
| `FILE`               | string          | DockerFile                             | inputs     | ❎          | DockerFile to use for building image |
</details>

---

### GitHub Maintenance

<details>
<summary>Org-wide Workflow Cleaner (`workflow-cleaner.mjs` + `github-workflow-cleaner.yml`)</summary>

- **What it does:** Deletes old workflow runs (default: 30 days old) across all repos in your GitHub organization or user account using a GitHub App (with logs never revealing private repo names).
- **Setup:**
    - Create a GitHub App (see [docs](./workflow-cleaner.mjs) or repo wiki).
    - Set secrets: `APP_ID`, `PRIVATE_KEY_BASE64`, `OWNER`, `DAYS_OLD`, `DRY_RUN`.
    - Use as a scheduled or manual workflow via GitHub Actions.

**Inputs:**

| Name                 | Type   | Required? | Description                                       |
|----------------------|--------|-----------|---------------------------------------------------|
| `APP_ID`             | secret | ✅         | GitHub App ID                                     |
| `PRIVATE_KEY_BASE64` | secret | ✅         | Base64-encoded private key of the GitHub App      |
| `OWNER`              | secret | ✅         | GitHub org/user name where App is installed       |
| `DAYS_OLD`           | env    | ❎         | Days old before a run is deleted (default: 30)    |
| `DRY_RUN`            | env    | ❎         | Set to `true` for dry-run (no deletes, logs only) |

</details>

<details>
<summary>Github Cleaner (Tags/Releases/Workflows) (`github-cleanup.yml`)</summary>

| Name                      | Input Data Type | Default                  | Input Type | Mandatory? | Description                                                |
|---------------------------|-----------------|--------------------------|------------|------------|------------------------------------------------------------|
| `GH_TOKEN`                | string          | -                        | secrets    | ✅          | [GitHub Token][GH-TOKEN]                                   |
| `GITHUB_REPOSITORY`       | string          | ${{ github.repository }} | inputs     | ❎          | Github Repo to cleanup workflow runs                       |
| `RELEASE_CLEANUP_PATTERN` | string          | [\s\S]*                  | inputs     | ❎          | Release patterns to delete. (Remove everything by default) |

</details>

<details>
<summary>Github Release Tag Cleaner (`github-release-tag-cleaner.yml`)</summary>

| Name                      | Input Data Type | Default           | Input Type | Mandatory? | Description                                                |
|---------------------------|-----------------|-------------------|------------|------------|------------------------------------------------------------|
| `GH_TOKEN`                | string          | -                 | secrets    | ✅          | [GitHub Token][GH-TOKEN]                                   |
| `RELEASE_CLEANUP_PATTERN` | string          | [\s\S]*           | inputs     | ❎          | Release patterns to delete. (Remove everything by default) |

</details>

<details>
<summary>Github Action Workflow Run Cleaner (`github-workflow-cleaner.yml`)</summary>

| Name                | Input Data Type | Default | Input Type | Mandatory? | Description                          |
|---------------------|-----------------|---------|------------|------------|--------------------------------------|
| `GH_TOKEN`          | string          | -       | secrets    | ✅          | [GitHub Token][GH-TOKEN]             |
| `GITHUB_REPOSITORY` | string          | -       | secrets    | ✅          | Github Repo to cleanup workflow runs |

</details>

---

### Python

<details>
<summary>Linter (`python-linter.yml`)</summary>

| Name                    | Input Data Type | Default            | Input Type | Mandatory? | Description                   |
|-------------------------|-----------------|--------------------|------------|------------|-------------------------------|
| `CACHE_DEPENDENCY_PATH` | string          | `requirements.txt` | inputs     | ❎          | Path(s) to requirements file. |
| `PYTHON_VERSION`        | string          | `3.x`              | inputs     | ❎          | Python Version to Use.        |

</details>

<details>
<summary>Precommit Updater (`python-precommit-updater.yml`)</summary>

| Name                    | Input Data Type | Default            | Input Type | Required? | Description                                     |
|-------------------------|-----------------|--------------------|------------|-----------|-------------------------------------------------|
| `GH_TOKEN`              | string          | -                  | secrets    | ✅         | [Github Token][GH-TOKEN] to raise Pull Request. |
| `CACHE_DEPENDENCY_PATH` | string          | `requirements.txt` | inputs     | ❎         | Path(s) to requirements file.                   |
| `PYTHON_VERSION`        | string          | `3.x`              | inputs     | ❎         | Python Version to Use.                          |

</details>

---

### Telegram

<details>
<summary>Telegram Uploader (`telegram-uploader.yml`)</summary>

| Name                          | Input Data Type | Default                                                      | Input Type | Mandatory? | Description                                        |
|-------------------------------|-----------------|--------------------------------------------------------------|------------|------------|----------------------------------------------------|
| `TELEGRAM_API_ID`             | number          | -                                                            | secrets    | ✅          | API ID from [Telegram][TELEGRAM-TOKEN]             |
| `TELEGRAM_API_HASH`           | string          | -                                                            | secrets    | ✅          | API HASH from [Telegram][TELEGRAM-TOKEN]           |
| `TELEGRAM_BOT_TOKEN`          | string          | -                                                            | secrets    | ✅          | Bot Token from [Telegram][BOT-TOKEN]               |
| `TELEGRAM_CHAT_ID`            | number          | -                                                            | secrets    | ✅          | CHAT ID from [Telegram][CHAT-ID]                   |
| `TELEGRAM_STICKER_ID`         | string          | -                                                            | secrets    | ❎          | Projects default sticker.                          |
| `CHANGELOG_GITHUB_REPOSITORY` | string          | ${{ github.repository }}                                     | secrets    | ❎          | GitHub Repo for changelog URL.                     |
| `DOWNLOAD_GITHUB_REPOSITORY`  | string          | ${{ github.repository }}                                     | secrets    | ❎          | GitHub Repo to download assets for upload.         |
| `ASSETS_PATTERN`              | string          | .*                                                           | secrets    | ❎          | Regex pattern for GitHub assets.Upload everything  |
| `MESSAGE`                     | string          | New Release(s)🥳 See Changelog `CHANGELOG_GITHUB_REPOSITORY` | secrets    | ❎          | Message which will be sent before uploading assets |

</details>

---

### VirusTotal

<details>
<summary>VirusTotal Scan (`virustotal-scan.yml`)</summary>

| Name           | Input Data Type | Default | Input Type | Mandatory? | Description                                    |
|----------------|-----------------|---------|------------|------------|------------------------------------------------|
| `GITHUB_TOKEN` | string          | -       | secrets    | ✅          | [GitHub Token][GH-TOKEN] to edit Release info. |
| `VT_API_KEY`   | string          | -       | secrets    | ✅          | Virus Total API Key.                           |
| `FILES`        | string          | -       | inputs     | ✅          | Files to Scan.                                 |
| `REQUEST_RATE` | number          | 4       | inputs     | ❎          | Rate Limit for Virus Total API.                |

</details>

---

## 🛡️ Security & Local Usage

- Never commit `.env` or secrets; use `.env.example` as a template.
- Node-based scripts (like `workflow-cleaner.mjs`) require a `package.json` with dependencies listed.

---

## 📝 Contributions

PRs and issues welcome! Feel free to submit your own reusable workflows or bugfixes.

---

[GH-TOKEN]: https://github.com/settings/tokens
[TELEGRAM-TOKEN]: https://my.telegram.org/apps
[BOT-TOKEN]: https://t.me/BotFather
[CHAT-ID]: https://t.me/username_to_id_bot  
