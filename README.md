# deegeetalthesis

This is the same student portal and design, prepared for Cloudflare Workers.
Written submissions go into D1; documents and assignment settings go into R2.
The committed configuration uses placeholders. Keep your account-specific values in wrangler.local.jsonc, which Git ignores.
No passwords or API tokens are included.

## Setup and deployment on Windows

1. Clone this repository and open its folder in VS Code.
2. Open Terminal > New Terminal. Check that package.json is in this folder.
3. Copy the configuration template before deploying:

    Copy-Item wrangler.jsonc wrangler.local.jsonc

   Open wrangler.local.jsonc and replace YOUR_D1_DATABASE_NAME,
   YOUR_D1_DATABASE_ID and YOUR_R2_BUCKET_NAME with your Cloudflare resources.
   The deploy and instructor-setup scripts automatically use this local file.
   If you already have a working project, retain your existing local configuration.

4. Run these commands one at a time:

    npm install
    npx wrangler login
    npm run deploy
    npm run instructor:setup

The login command opens Cloudflare in your browser. Choose the same account
that contains the database and bucket configured in your local file.

The deploy command builds the website, applies the idempotent schema, and
publishes the Worker. It does not delete existing database rows. It prints
your new workers.dev URL. Submissions start closed and instructor access is
disabled until the password setup is completed.

The setup command asks for a password of at least 12 characters twice.
Typing is hidden. It sends the password and an automatically generated
session secret directly to Cloudflare secrets, without saving them in files.
If you run setup again, existing instructor sessions are signed out.

5. Open the new URL. Click Instructor, then Sign in. You can also open
   /instructor-login on that URL.
6. Sign in with the password you just set, then activate the instructor
   workspace. Set your deadline and instructions and save.
7. Submit a small test PDF as a student, including a short reflection.
8. Confirm the row appears in D1 > your database > Tables > submissions,
   and confirm you can download the PDF while signed in as instructor.
9. Share the NEW workers.dev URL with students after your test passes.

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

## Student IDs

Each new successful submission is assigned an ID such as DEEGEETAL-SS1-SCI-4827.
The four-digit suffix is randomly generated on the server; a unique database
index prevents duplicates, and collisions are retried. These IDs identify
submissions and are not passwords or download credentials.

The student sees the ID on an animated confirmation card, can copy it, and
can save a receipt containing it. The instructor inbox can search by ID.
Existing submissions remain readable and are not given invented IDs.

After updating the source, run npm run deploy. It creates any missing base
tables, applies pending D1 migrations, then deploys the app. Confirm the
migration prompt. The student_id column is added without deleting records.
Subsequent deployments skip migrations already applied.

Four decimal digits provide 10,000 unique IDs per class and department. If an ID cannot be allocated,
the submission shows an error instead of displaying an unrecorded ID.

Run npm test and npm run build to check the submission flow and frontend.

Student IDs include the submitted class (SS1 or SS2) and department: SCI for Science, ART for Art, COM for Commercial. The random four-digit suffix is unique within that class and department. Existing IDs remain unchanged.

## Instructor IDs and CSV exports

The submission inbox displays a labelled student ID for every new submission.
Older records that predate IDs are labelled accordingly. IDs can be selected
and searched. Export all CSV downloads every submission; Export filtered CSV
appears when a class filter or search is active. Both exports require the
instructor session and include IDs, names, classes, departments, thesis titles,
reflections, document filenames, sizes, UTC dates and submission references.
CSV uses UTF-8 with BOM for Excel, quotes commas/newlines, and neutralises
spreadsheet formulas in student-supplied text. The files themselves stay private.

## Hosting the frontend on Vercel

This is a Vite frontend with a Cloudflare Worker backend. Vercel does not run
Wrangler or provide the D1/R2 bindings. Keep the Cloudflare Worker deployed.

1. Update your local code and run npm run deploy to publish the updated Worker
   and instructor inbox to Cloudflare.
2. Import this repository into Vercel, with the repository root as Root Directory.
   The committed vercel.json selects Vite, npm run build and dist/client.
   If you have dashboard overrides, use those same values. Redeploy main.
3. vercel.json forwards /api/* and /instructor-login to the existing public
   Cloudflare Worker. If the Worker URL changes, update both destinations.
   Static page navigation falls back to index.html.
4. From your local project folder run npm run vercel:connect. Paste the exact
   production frontend URL, for example https://your-project.vercel.app.
   This stores PUBLIC_APP_ORIGIN in the Cloudflare Worker so requests from
   that frontend pass origin verification. It uses your existing local config.
   Run this after deploying the updated Worker. Cloudflare login may be needed.
5. Open the production Vercel URL, sign in as instructor, test a student
   submission and ID, download a CSV, and check a private document download.
   Each hostname has its own instructor session, so sign in again on Vercel.

PUBLIC_APP_ORIGIN permits one exact HTTPS frontend origin in addition to the
Worker itself. Set it to your custom domain if using one. Preview deployment
URLs are not automatically trusted; their read-only pages may load but writes
and sign-in are intentionally rejected. Never use a wildcard or trust arbitrary
forwarded Host headers. Do not copy passwords or API keys into Vercel frontend
variables. CSV and private document responses are not cached.

If Vercel shows 404, check that it deployed the latest main commit, the Root
Directory contains package.json, and the Output Directory is dist/client.
A Vercel-only redeploy does not update the Worker; deploy both when backend
code changes. Existing database records and files are retained.
