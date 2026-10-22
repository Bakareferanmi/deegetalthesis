# deegeetalthesis

This is the same student portal and design, prepared for Cloudflare Workers.
Written submissions go into D1; documents and assignment settings go into R2.
The source includes your database ID and the bucket name you confirmed.
No passwords or API tokens are included.

## Setup and deployment on Windows

1. Clone this repository and open its folder in VS Code.
2. Open Terminal > New Terminal. Check that package.json is in this folder.
3. Run these commands one at a time:

    npm install
    npx wrangler login
    npm run deploy
    npm run instructor:setup

The login command opens Cloudflare in your browser. Choose the same account
that contains deegeetalthesis-db and deegeetalthesis-files.

The deploy command builds the website, applies the idempotent schema, and
publishes the Worker. It does not delete existing database rows. It prints
your new workers.dev URL. Submissions start closed and instructor access is
disabled until the password setup is completed.

The setup command asks for a password of at least 12 characters twice.
Typing is hidden. It sends the password and an automatically generated
session secret directly to Cloudflare secrets, without saving them in files.
If you run setup again, existing instructor sessions are signed out.

4. Open the new URL. Click Instructor, then Sign in. You can also open
   /instructor-login on that URL.
5. Sign in with the password you just set, then activate the instructor
   workspace. Set your deadline and instructions and save.
6. Submit a small test PDF as a student, including a short reflection.
7. Confirm the row appears in D1 > deegeetalthesis-db > Tables > submissions,
   and confirm you can download the PDF while signed in as instructor.
8. Share the NEW workers.dev URL with students after your test passes.

## Existing ChatGPT-hosted site

The old ChatGPT-hosted URL is a separate deployment. It does not automatically
move to your Cloudflare account. No historical submissions or uploaded files
are included in this repository. If the old site has real records, arrange an export
and import before switching students to this deployment. Assignment settings
and the instructor password are initialized afresh in your own account.

## Updating

Run npm run deploy after making changes. Cloudflare retains the instructor
secrets between deployments. Keep the R2 bucket private. Do not enable its
public development URL; the backend handles instructor-authorized downloads.

## Authentication

Students do not need a ChatGPT account. Instructor routes use a signed,
HttpOnly, Secure session cookie that expires after eight hours. D1 limits
sign-in attempts per address and 15-minute window. Caller-supplied ChatGPT
identity headers are ignored in this standalone deployment.

## Verification already performed

The export is checked for frontend compilation and Worker bundling. Automated
route tests check instructor login, tampered/expired sessions, authorization,
D1 writes, private downloads and the 299-word limit. Your remote database and
bucket still require the live upload test above after deploying in your account.

## Tool versions

Wrangler is pinned to 4.151.3 with @cloudflare/workers-types 5.20261022.1,
matching the dependency update used during setup. Update these together to
avoid an npm peer dependency conflict.
