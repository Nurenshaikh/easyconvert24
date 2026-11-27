# EasyConvert v2

A responsive static website with browser-first file conversion and an optional LibreOffice server API.

## Included working browser tools
- JPG/PNG images to PDF
- PDF pages to JPG
- Merge, split, rotate and re-save PDF
- PNG to JPG, JPG to PNG, image compression and resizing
- DOCX to PDF (rendered page image; formatting may vary)
- PDF text extraction to DOCX
- XLSX first sheet to PDF
- PDF text extraction to XLSX (best-effort rows)

**Important:** PDF-to-Word and PDF-to-Excel are text-extraction workflows, not exact-layout reconstruction. Scanned PDFs need OCR. Browser PDF re-save does not guarantee smaller file sizes.

## Publish static site free
1. Extract this ZIP.
2. Create a GitHub repository and upload the contents of this folder (the `index.html` file should be at repository root).
3. In Cloudflare, open Workers & Pages → Create → Pages → Connect to Git.
4. Select the repository. Framework preset: None; build command: leave blank; output directory: `/`.
5. Deploy. Add a custom domain in Pages → Custom domains. A domain is not included in free hosting and is a separate purchase.
6. Test the deployed HTTPS site on mobile and desktop.

Alternative: Cloudflare Pages Direct Upload by uploading the site folder through the dashboard.

## Optional server conversions (DOCX/PDF/XLSX)
The included `api/` folder uses FastAPI + LibreOffice in Docker. It supports DOCX → PDF and XLSX → PDF. PDF → DOCX/XLSX remains browser-based text extraction because LibreOffice does not reliably reconstruct Office files from arbitrary PDFs. The API is separate from Cloudflare Pages.
- Deploy the Dockerfile to a container host that supports persistent service processes.
- Set `ALLOWED_ORIGINS` to your exact website origin, e.g. `https://yourdomain.com`.
- Add upload limits, rate limiting, abuse protection, monitoring and automatic cleanup before public launch.
- In `app.js`, set `window.CONVERTEASY_API_URL="https://your-api-host.example"` near the beginning of the file.
- The UI's "Try configured server converter" checkbox sends the selected Office/PDF file to that API. Do not enable until you have reviewed the host's file retention and privacy terms.

Free container hosts may sleep, impose limits or change their free plans. Verify current pricing before deployment. The browser tools work without the API.

## Before launch
- Replace `YOURDOMAIN.com` and `support@YOURDOMAIN.com` in contact, privacy, robots and sitemap files.
- Add your real operator/business details and a working contact method.
- Update the privacy policy to match actual analytics, advertising, hosting, cookie consent and server processing.
- Add original tutorials and helpful content, not thin auto-generated pages.
- Add Google AdSense only after approval. Insert the AdSense code supplied in your account; do not click your own ads or encourage clicks.
- Add a consent management platform if required for your visitors/regions.
- Add a sitemap to Google Search Console and submit it.
- Confirm all buttons, links, conversions, mobile layout and accessibility.

## Configure API URL
In `app.js`, add this line immediately after the opening IIFE:
`window.CONVERTEASY_API_URL = "https://YOUR-API-HOST";`
