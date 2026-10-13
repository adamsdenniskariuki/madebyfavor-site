# Made by Favor website deployment

This repository hosts the public Made by Favor homepage at
<https://madebyfavor.com>.

## Architecture

- Repository: `adamsdenniskariuki/madebyfavor-site`
- Hosting: GitHub Pages, **source: GitHub Actions** (`build_type: workflow`)
- Workflow: `.github/workflows/deploy.yml` — installs dependencies, generates
  the Open Graph image, builds with Vite, runs the Playwright tests and deploys
  `dist/` on every push to `main`. Pull requests run the build and tests only.
- Custom domain: `madebyfavor.com` (also shipped as `public/CNAME`)
- DNS provider: Cloudflare
- App sites (`langto`, `playto`, `devprep`, `verserecall`, `sortile`
  subdomains) live in their own repositories

The site is consultancy-first, with the apps presented as a portfolio. It
links to each app, the Sortile privacy policy, its own privacy page and
`support@madebyfavor.com`.

## DNS

The apex domain uses the four A records documented by GitHub Pages:

| Type | Name | Content | Proxy status |
| --- | --- | --- | --- |
| A | `@` | `185.199.108.153` | DNS only |
| A | `@` | `185.199.109.153` | DNS only |
| A | `@` | `185.199.110.153` | DNS only |
| A | `@` | `185.199.111.153` | DNS only |

All four records must remain **DNS only** in Cloudflare. Orange-cloud proxying
hides the GitHub addresses and can prevent GitHub from validating the domain
and issuing its TLS certificate.

Do not change the separate `sortile` DNS record when updating the root site.

Verify the records in PowerShell:

```powershell
Resolve-DnsName madebyfavor.com -Type A
```

## GitHub Pages

Pages must be set to deploy from GitHub Actions (one-time switch):

```powershell
$env:GH_TOKEN = gh auth token --user adamsdenniskariuki
gh api -X PUT repos/adamsdenniskariuki/madebyfavor-site/pages -f build_type=workflow
gh api repos/adamsdenniskariuki/madebyfavor-site/pages --jq '{build_type, cname, https_enforced}'
```

Expected: `build_type` is `workflow`, `cname` is `madebyfavor.com` and
`https_enforced` is `true`. Switching the build type does not change the
custom domain or DNS.

Check the latest deployment run:

```powershell
gh run list --repo adamsdenniskariuki/madebyfavor-site --workflow deploy.yml --limit 3
```

## HTTPS

GitHub provisions the certificate after the custom domain resolves directly to
the GitHub Pages A records. Certificate issuance is asynchronous and can take
additional time after DNS is correct.

Enable HTTPS once the certificate exists:

```powershell
Remove-Item Env:GH_TOKEN -ErrorAction SilentlyContinue
Remove-Item Env:GITHUB_TOKEN -ErrorAction SilentlyContinue

'{"https_enforced":true}' |
  gh api --method PUT repos/adamsdenniskariuki/madebyfavor-site/pages --input -
```

If GitHub responds with `The certificate does not exist yet`, leave the DNS
records unchanged and retry later.

Verify the final site:

```powershell
$response = Invoke-WebRequest -Uri 'https://madebyfavor.com' `
  -MaximumRedirection 5 -TimeoutSec 20

$response.StatusCode
$response.BaseResponse.ResponseUri.AbsoluteUri
```

## Publishing updates

The shell may contain GitHub credentials for a different account. Remove those
environment variables and use the authenticated personal `gh` token for each
push:

```powershell
Remove-Item Env:GH_TOKEN -ErrorAction SilentlyContinue
Remove-Item Env:GITHUB_TOKEN -ErrorAction SilentlyContinue

$token = gh auth token
$basic = [Convert]::ToBase64String(
  [Text.Encoding]::ASCII.GetBytes("x-access-token:$token")
)

git fetch origin main
git rebase origin/main
git -c http.extraheader="AUTHORIZATION: basic $basic" push origin HEAD:main
```

Every push to `main` triggers the workflow, which only deploys if the build
and all tests pass. Confirm the run succeeded before considering the update
live.

## Display preferences

The site offers:

- colour mode: System (default, follows the device), Light or Dark
- accent theme: Ink (default), Forest or Ember

Preferences are stored only in the visitor's local storage (`mbf-mode`,
`mbf-theme`). The site has no analytics, accounts, cookies, third-party
requests or server-side data collection.
