# GhActions

Common GitHub action which I use commonly.

## Python

<details><summary>Linter (python-linter.yml)</summary>

| Name                    | Input Data Type | Default            | Input Type | Mandatory? | Description                   |
|-------------------------|-----------------|--------------------|------------|------------|-------------------------------|
| `CACHE_DEPENDENCY_PATH` | String          | `requirements.txt` | inputs     | ❎          | Path(s) to requirements file. |
| `PYTHON_VERSION`        | String          | `3.x`              | inputs     | ❎          | Python Version to Use.        |

</details>

<details><summary>Precommit Updater (python-precommit-updater.yml)</summary>

| Name                    | Input Data Type | Default            | Input Type | Required? | Description                                     |
|-------------------------|-----------------|--------------------|------------|-----------|-------------------------------------------------|
| `GH_TOKEN`              | String          | -                  | secrets    | ✅         | [Github Token][GH-TOKEN] to raise Pull Request. |
| `CACHE_DEPENDENCY_PATH` | String          | `requirements.txt` | inputs     | ❎         | Path(s) to requirements file.                   |
| `PYTHON_VERSION`        | String          | `3.x`              | inputs     | ❎         | Python Version to Use.                          |

</details>

## Utilities

<details><summary>Telegram Uploader (telegram-uploader.yml)</summary>

| Name                          | Input Data Type | Default       | Input Type | Mandatory? | Description                              |
|-------------------------------|-----------------|---------------|------------|------------|------------------------------------------|
| `TELEGRAM_API_ID`             | Integer         | -             | secrets    | ✅          | API ID from [Telegram][TELEGRAM-TOKEN]   |
| `TELEGRAM_API_HASH`           | String          | -             | secrets    | ✅          | API HASH from [Telegram][TELEGRAM-TOKEN] |
| `TELEGRAM_BOT_TOKEN`          | String          | -             | secrets    | ✅          | Bot Token from [Telegram][BOT-TOKEN]     |
| `TELEGRAM_CHAT_ID`            | Integer         | -             | secrets    | ✅          | CHAT ID from [Telegram][CHAT-ID]         |
| `STICKER_ID`                  | String          | -             | inputs     | ✅          | STICKER ID from Telegram.                |
| `CHANGELOG_GITHUB_REPOSITORY` | String          | Your own repo | inputs     | ❎          | GitHub Repo for changelog URL.           |

</details>

<details><summary>VirusTotal Scan (virustotal-scan.yml)</summary>

| Name           | Input Data Type | Default | Input Type | Mandatory? | Description                                    |
|----------------|-----------------|---------|------------|------------|------------------------------------------------|
| `GITHUB_TOKEN` | String          | -       | secrets    | ✅          | [Github Token][GH-TOKEN] to edit Release info. |
| `VT_API_KEY`   | String          | -       | secrets    | ✅          | Virus Total API Key.                           |
| `FILES`        | String          | -       | inputs     | ✅          | Files to Scan.                                 |
| `REQUEST_RATE` | String          | -       | inputs     | ❎          | Rate Limit for Virus Total API.                |

</details>

[GH-TOKEN]: https://github.com/settings/tokens

[TELEGRAM-TOKEN]: https://my.telegram.org/apps

[BOT-TOKEN]: https://t.me/BotFather

[CHAT-ID]: https://t.me/username_to_id_bot
