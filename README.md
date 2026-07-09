# Literature Stock App

A responsive React/Vite starter app for managing Tamil literature stock.

## Features

- Dashboard with image-first literature cards
- Tap a card to record given-out or restocked quantity
- Literature catalogue with search and category filters
- Add/edit/delete literature
- Upload or take a cover photo
- Tamil + English OCR for new literature photos using `tesseract.js`
- Packing List tab: take/upload a received-stock image, review parsed rows, then apply stock increases
- Automatically adds missing literature from packing-list scans when no existing item matches
- Low-stock warnings
- Recent stock activity log
- Local browser storage demo mode
- Supabase schema included for a later shared multi-user database

## Run locally

```powershell
npm.cmd config set registry https://registry.npmjs.org/
npm.cmd install
npm.cmd run dev -- --host 0.0.0.0
```

Then open the local or network URL shown by Vite.

## Phone access while testing

Use the Network URL shown by Vite, for example:

```text
http://192.168.1.25:5173
```

Your laptop and phone must be on the same Wi-Fi, and Windows Firewall must allow Node.js on private networks.

## OCR notes

The OCR features run in the browser using Tesseract.js. Tamil OCR can be imperfect, especially with blurry photos, glare, angled pages, or stylised title fonts. The app therefore always shows editable fields/review rows before saving or applying stock.

For best results:

- take the photo straight-on
- use good light
- avoid reflections
- make sure the title/code/quantity are visible
- review the extracted result before saving

The first OCR scan may take longer because the Tamil/English OCR files need to load.

## Production multi-user setup

The current app stores data in the browser for quick testing. For multiple users sharing the same stock, connect it to:

- Supabase Auth
- Supabase Postgres
- Supabase Storage for images
- Vercel for hosting

See `supabase/schema.sql` for the initial database design.
