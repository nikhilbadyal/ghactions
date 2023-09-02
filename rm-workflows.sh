#!/bin/bash
# shellcheck disable=SC2207
workflow_ids=($(gh api repos/"$GITHUB_REPOSITORY"/actions/workflows | jq '.workflows[] | .id'))
for workflow_id in "${workflow_ids[@]}"
do
  echo "Listing runs for the workflow ID $workflow_id"
  run_ids=($(gh api repos/"$GITHUB_REPOSITORY"/actions/workflows/"$workflow_id"/runs?status=completed --paginate | jq '.workflow_runs[].id'))
  for run_id in "${run_ids[@]}"
  do
    echo "Deleting Run ID $run_id"
    gh api repos/"$GITHUB_REPOSITORY"/actions/runs/"$run_id" -X DELETE >/dev/null
  done
done
echo "Deleting orphan workflows"
run_ids=($(gh api repos/"$GITHUB_REPOSITORY"/actions/runs?status=completed --paginate | jq '.workflow_runs[].id'))
for run_id in "${run_ids[@]}"
do
  echo "Deleting Run ID $run_id"
  gh api repos/"$GITHUB_REPOSITORY"/actions/runs/"$run_id" -X DELETE >/dev/null
done
