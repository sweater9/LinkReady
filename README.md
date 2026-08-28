# LinkReady

**One link. Ready for anywhere.**

LinkReady turns a pasted URL into a clean, destination-ready version for sharing.

## Website MVP

- Remove common tracking parameters locally in the browser
- Copy clean URL
- Copy for WhatsApp
- Copy for Email
- Copy for LinkedIn
- Copy as Markdown
- No account
- No API
- No backend
- No uploaded data

Open `index.html` locally, or deploy the repository with GitHub Pages.

## Chrome extension prototype

The website is the discovery/trial layer. The higher-frequency product is the browser extension in `/extension`.

Current extension actions:

- toolbar click → copy clean link
- right-click → Copy clean link
- right-click → Copy for WhatsApp
- right-click → Copy for Email
- right-click → Copy for LinkedIn
- right-click → Copy as Markdown

To test locally in Chrome:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select the repository's `extension` folder.
5. Visit a normal web page and use the LinkReady toolbar button or right-click menu.

## Privacy

V1 processes URLs entirely client-side. LinkReady does not upload links to a server.

The cleaner deliberately removes only known/common tracking identifiers. It avoids stripping generic query parameters that may be required for the destination page to work.
