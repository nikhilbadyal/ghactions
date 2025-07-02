import click
import os
import subprocess

def set_github_secret(repo, key, value):
    """Set a secret using GitHub CLI."""
    try:
        subprocess.run(
            ["gh", "secret", "set", key, "--repo", repo, "--body", value],
            check=True,
            capture_output=True,
            text=True
        )
        click.echo(f"Set secret: {key}")
    except subprocess.CalledProcessError as e:
        click.secho(f"Error setting secret {key}: {e.stderr}", fg='red')

def parse_env_file(env_file):
    """Yield key, value pairs from a .env file."""
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.replace("export ", "").strip()
            value = value.strip().strip("'\"")
            yield key, value

@click.command()
@click.argument("repo", required=False)
@click.option("--env-file", "-f", default=".env", help="Path to .env file")
def main(repo, env_file):
    """
    Upload .env secrets to a GitHub repository.

    If .env file is not found, enter interactive mode.
    """
    if os.path.isfile(env_file):
        if not repo:
            repo = click.prompt("Enter target repo (owner/repo)", type=str)
        click.secho(f"Loading secrets from {env_file} into {repo}...", fg="green")
        for key, value in parse_env_file(env_file):
            set_github_secret(repo, key, value)
    else:
        click.secho(f"No {env_file} file found.", fg="yellow")
        if not repo:
            repo = click.prompt("Enter target repo (owner/repo)", type=str)
        click.secho("Entering interactive mode. Leave key blank to finish.", fg="cyan")
        while True:
            key = click.prompt("Secret key", type=str, default="", show_default=False)
            if not key:
                break
            value = click.prompt(f"Value for {key}", hide_input=True, confirmation_prompt=False, show_default=False)
            set_github_secret(repo, key, value)
        click.secho("Done setting secrets interactively.", fg="green")

if __name__ == "__main__":
    main()
