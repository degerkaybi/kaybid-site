# Portfolio migration

The current Notion powered site is preserved at the `notion-site-2026-10-27` tag and `archive/notion-site-2026-10-27` branch. The new portfolio is developed on `portfolio-v2`. Production remains on `main` until the new site is reviewed and published.

## Content

- `data/portfolio-content.json` is the versioned, static snapshot used by the site. It contains 81 pages and 695 media references, with no expiring Notion file URLs or API token.
- The Works index contains 69 entries. A work can have several practice tags, so it appears under every relevant filter. One secondary presentation of the same sculpture links from the primary work page instead of appearing as a duplicate card.
- `legacy/scripts/export-notion-content.mjs` creates the snapshot from the existing Notion integration. Use `--media` to download media, `--media-only` to retry downloads from an existing export, or `--sanitize-only` to regenerate the versioned snapshot from the ignored raw export.
- `legacy/scripts/audit-portfolio.mjs` reports page, media and failure counts.

## Media

- 43 existing Imgur images use their existing URLs.
- 22 video blocks use 19 distinct YouTube URLs. `legacy/scripts/repair-youtube-links.mjs` recovered each block's original URL after the first export accidentally collapsed `watch?v=...` links.
- 628 media references were copied locally to `public/media/` and originals to `.media-source/`. Both directories are ignored by Git. Duplicate references and optimization mean the versioned snapshot uses 523 distinct files totaling about 151 MiB. The directory also contains superseded files from an early export run; upload only paths referenced in the snapshot.
- Five legacy external images could not be fetched: two in *Night Watch Bull Run Edition*, and one each in *In Between Sips*, *Bifokalus* and *Passage*. Their sources returned HTTP 403 or 404. Their positions are shown as unavailable media in the portfolio.
- For deployment, put Cloudinary's `CLOUDINARY_URL` API environment variable in the existing, ignored `.env` file. The script also accepts `.env.local` if one exists. Run `node scripts/upload-cloudinary-media.mjs --dry-run` to audit, then `node scripts/upload-cloudinary-media.mjs` to upload only referenced files. The script saves progress after each file in `data/media-urls.json`, so it can resume after interruption. Commit the URL map with the site. It contains public delivery URLs, not credentials. Any file absent from the map uses local `public/media/` for preview.

The exported snapshot does not change when Notion is edited. A future selective Notion publishing workflow can be added separately.
