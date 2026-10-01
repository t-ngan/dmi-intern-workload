# DMI Intern Workload Dashboard

A Netlify-ready internal workload dashboard with a private admin upload page.

## What it does

- Public leader view: `/`
- Private update console: `/admin/` (not linked from the dashboard)
- Upload `.xlsx`, `.xls`, or `.csv` every week
- Reads only `Ngày` + `Nội dung`
- Ignores `Gain`, `Cải thiện`, `Task tự giao`, `Note`
- Merge mode keeps old workload and removes duplicates by date + task text
- Audit Plan / Media Plan can be labeled as Practice to avoid implying official client audit/planning work
- Saves current data in Netlify Blobs, so weekly updates do not require editing HTML or redeploying
- Stores a server-side snapshot before each update

## Deploy on Netlify

This version uses Netlify Functions + Netlify Blobs, so deploy through a connected Git repository or the Netlify CLI rather than a static-only drag-and-drop deploy.

1. Put this folder in a GitHub/GitLab/Bitbucket repository.
2. In Netlify: **Add new project → Import an existing project**.
3. Select the repository. Netlify will read `netlify.toml`; no build command is required.
4. In **Project configuration → Environment variables**, add:
   - Key: `ADMIN_PASSWORD`
   - Value: a strong password only you know
5. Trigger a deploy after adding the environment variable.
6. Open the site root for the leader dashboard.
7. Open `/admin/` yourself to upload the weekly workload file.

## Weekly update workflow

1. Update the Excel workbook using the same columns (`Ngày`, `Nội dung`).
2. Go to `https://YOUR-SITE.netlify.app/admin/`.
3. Enter the admin password.
4. Upload the new Excel file.
5. Keep **Merge weekly file** selected for normal weekly updates.
6. Review the parsed task list. You can edit task wording before publishing.
7. Click **Publish dashboard update**.
8. Refresh the public dashboard. The update is live immediately.

## Data behavior

- If Netlify Blobs has no published data yet, the dashboard falls back to `public/data/initial-workload.json` generated from the current `Intern.xlsx`.
- The first admin publish creates the live dataset in Netlify Blobs.
- Merge mode also uses the fallback initial dataset before the first publish, so the original September workload is not lost when the first new weekly file is uploaded.
- Uploading a cumulative workbook is safe because duplicate items are removed by date + normalized task text.

## Security notes

- The dashboard never links to `/admin/`.
- The admin page uses a password stored only as a Netlify environment variable; it is not embedded in the HTML/JavaScript.
- After login, an 8-hour signed admin token is stored in browser session storage.
- Write requests are verified server-side before data can be changed.
- The public dashboard remains readable by anyone who has the dashboard URL. If the dashboard itself must also be private, add site-level access control in Netlify.

## Brand styling

The interface uses a dark automotive/agency visual system with DMI/Detailers Movement labeling and a warm performance accent. Brand tokens are centralized at the top of `assets/styles.css` for easy adjustment if an official DMI brand guide/logo is supplied later.
