# GhActions

Common GitHub action which I use commonly.

## Docker

<details><summary>DockerHub Bumper (dockerhub-push.yml)</summary>

| Name                 | Input Data Type | Default                 | Input Type | Mandatory? | Description                          |
|----------------------|-----------------|-------------------------|------------|------------|--------------------------------------|
| `DOCKERHUB_USERNAME` | string          | -                       | secrets    | ✅          | Dockerhub Username                   |
| `DOCKERHUB_TOKEN`    | string          | -                       | secrets    | ✅          | Dockerhub Password/Token             |
| `IMAGE_TAG`          | string          | linux/amd64,linux/arm64 | inputs     | ❎          | Tage for image                       |
| `PLATFORMS`          | string          | <YourRepoName>:latest   | inputs     | ❎          | Platforms to build for               |
| `FILE`               | string          | DockerFile              | inputs     | ❎          | DockerFile to use for building image |

</details>


## GitHub

<details><summary>Github Cleaner(Tags/Releases/Workflows) (github-cleanup.yml)</summary>

| Name                      | Input Data Type | Default           | Input Type | Mandatory? | Description                                                |
|---------------------------|-----------------|-------------------|------------|------------|------------------------------------------------------------|
| `GH_TOKEN`                | string          | -                 | secrets    | ✅          | [Github Token][GH-TOKEN]                                   |
| `GITHUB_REPOSITORY`       | string          | Your Current Repo | inputs     | ❎          | Github Repo to cleanup workflow runs                       |
| `RELEASE_CLEANUP_PATTERN` | string          | [\s\S]*           | inputs     | ❎          | Release patterns to delete. (Remove everything by default) |

</details>

<details><summary>Github Action Workflow run Cleaner(github-release-tag-cleaner.yml)</summary>

| Name                      | Input Data Type | Default           | Input Type | Mandatory? | Description                                                |
|---------------------------|-----------------|-------------------|------------|------------|------------------------------------------------------------|
| `GH_TOKEN`                | string          | -                 | secrets    | ✅          | [Github Token][GH-TOKEN]                                   |
| `RELEASE_CLEANUP_PATTERN` | string          | [\s\S]*           | inputs     | ❎          | Release patterns to delete. (Remove everything by default) |

</details>

<details><summary>Github Action Workflow run Cleaner(github-workflow-cleaner.yml)</summary>

| Name                | Input Data Type | Default | Input Type | Mandatory? | Description                          |
|---------------------|-----------------|---------|------------|------------|--------------------------------------|
| `GH_TOKEN`          | string          | -       | secrets    | ✅          | [Github Token][GH-TOKEN]             |
| `GITHUB_REPOSITORY` | string          | -       | secrets    | ✅          | Github Repo to cleanup workflow runs |

</details>

## Python

<details><summary>(Linter (python-linter.yml)</summary>

| Name                    | Input Data Type | Default            | Input Type | Mandatory? | Description                   |
|-------------------------|-----------------|--------------------|------------|------------|-------------------------------|
| `CACHE_DEPENDENCY_PATH` | string          | `requirements.txt` | inputs     | ❎          | Path(s) to requirements file. |
| `PYTHON_VERSION`        | string          | `3.x`              | inputs     | ❎          | Python Version to Use.        |

</details>

<details><summary>Precommit Updater (python-precommit-updater.yml)</summary>

| Name                    | Input Data Type | Default            | Input Type | Required? | Description                                     |
|-------------------------|-----------------|--------------------|------------|-----------|-------------------------------------------------|
| `GH_TOKEN`              | string          | -                  | secrets    | ✅         | [Github Token][GH-TOKEN] to raise Pull Request. |
| `CACHE_DEPENDENCY_PATH` | string          | `requirements.txt` | inputs     | ❎         | Path(s) to requirements file.                   |
| `PYTHON_VERSION`        | string          | `3.x`              | inputs     | ❎         | Python Version to Use.                          |

</details>


## Telegram

<details><summary>Telegram Uploader (telegram-uploader.yml)</summary>

| Name                          | Input Data Type | Default                                                      | Input Type | Mandatory? | Description                                        |
|-------------------------------|-----------------|--------------------------------------------------------------|------------|------------|----------------------------------------------------|
| `TELEGRAM_API_ID`             | number          | -                                                            | secrets    | ✅          | API ID from [Telegram][TELEGRAM-TOKEN]             |
| `TELEGRAM_API_HASH`           | string          | -                                                            | secrets    | ✅          | API HASH from [Telegram][TELEGRAM-TOKEN]           |
| `TELEGRAM_BOT_TOKEN`          | string          | -                                                            | secrets    | ✅          | Bot Token from [Telegram][BOT-TOKEN]               |
| `TELEGRAM_CHAT_ID`            | number          | -                                                            | secrets    | ✅          | CHAT ID from [Telegram][CHAT-ID]                   |
| `TELEGRAM_STICKER_ID`         | string          | -                                                            | secrets    | ❎          | Projects default sticker.                          |
| `CHANGELOG_GITHUB_REPOSITORY` | string          | Your own repo                                                | secrets    | ❎          | GitHub Repo for changelog URL.                     |
| `DOWNLOAD_GITHUB_REPOSITORY`  | string          | Your own repo                                                | secrets    | ❎          | GitHub Repo to download assets for upload.         |
| `ASSETS_PATTERN`              | string          | .* (Upload everything)                                       | secrets    | ❎          | Regex pattern for GitHub assets                    |
| `SEND_MESSAGE`                | boolean         | True                                                         | secrets    | ❎          | Whether to send message before uploading assets    |
| `SEND_STICKER`                | boolean         | False                                                        | secrets    | ❎          | Whether to send sticker before uploading assets    |
| `MESSAGE`                     | string          | New Release(s)🥳 See Changelog `CHANGELOG_GITHUB_REPOSITORY` | secrets    | ❎          | Message which will be sent before uploading assets |

</details>

## VirusTotal

<details><summary>VirusTotal Scan (virustotal-scan.yml)</summary>

| Name           | Input Data Type | Default | Input Type | Mandatory? | Description                                    |
|----------------|-----------------|---------|------------|------------|------------------------------------------------|
| `GITHUB_TOKEN` | string          | -       | secrets    | ✅          | [Github Token][GH-TOKEN] to edit Release info. |
| `VT_API_KEY`   | string          | -       | secrets    | ✅          | Virus Total API Key.                           |
| `FILES`        | string          | -       | inputs     | ✅          | Files to Scan.                                 |
| `REQUEST_RATE` | number          | 4       | inputs     | ❎          | Rate Limit for Virus Total API.                |

</details>



[GH-TOKEN]: https://github.com/settings/tokens

[TELEGRAM-TOKEN]: https://my.telegram.org/apps

[BOT-TOKEN]: https://t.me/BotFather

[CHAT-ID]: https://t.me/username_to_id_bot
