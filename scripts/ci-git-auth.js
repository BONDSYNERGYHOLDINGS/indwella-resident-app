// @indwella/sdk is a private repo installed as a git dependency (see
// package.json). If a hosted CI is ever set up for this app (EAS Build,
// Xcode Cloud, GitHub Actions, ...), its automatic dependency-install step
// runs `yarn install` directly - there's usually no simple hook to run a
// command before that - so this happens as an npm/yarn lifecycle script
// instead. `preinstall` is the earliest one available, and runs before any
// dependency (including this git one) is fetched.
//
// Locally, developers already have their own GitHub credentials cached
// (SSH key or HTTPS credential helper), so this is a no-op unless
// SDK_GIT_TOKEN is set - only true inside CI, where it's a fine-grained
// GitHub PAT scoped read-only to the indwella-sdk repo, set as a CI
// environment variable, never committed anywhere.
const { execSync } = require('child_process');

const token = process.env.SDK_GIT_TOKEN;
if (!token) process.exit(0);

execSync(
  `git config --global url."https://${token}@github.com/".insteadOf "https://github.com/"`,
  { stdio: 'inherit' },
);
