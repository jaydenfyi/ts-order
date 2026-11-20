# Changesets

This folder holds [changesets](https://github.com/changesets/changesets). Each changeset describes one change and how it bumps the version.

Rules for this repo:

- Every pull request adds a changeset. Run `bun changeset`. CI fails without one.
- A pull request that changes no published code adds an empty changeset: `bun changeset --empty`.
- While the version is 0.x, a breaking change is a `minor` changeset. A `major` changeset releases 1.0.0.
