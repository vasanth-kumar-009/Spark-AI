# Spark-AI

A conversational AI web application powered by **Google Gemini**, with a responsive chat interface, browser-saved conversations, light and dark themes, Markdown-style replies, and an Express backend that keeps the API key on the server.

[Live Demo](https://spark-ai-vt1q.onrender.com/) · [Repository](https://github.com/vasanth-kumar-009/Spark-AI) · [Report an issue](https://github.com/vasanth-kumar-009/Spark-AI/issues)

**Spark-AI is deployed on Render and configured to use Google Gemini.** Open the live application to chat without installing the project or supplying your own API key. The deployment's Gemini credential is configured on the server.

> **Current attachment limitation:** the frontend includes image, PDF, and text-file attachment controls, but the backend currently accepts only string message content. Image messages are rejected. Small text/PDF extracts can work when the entire constructed message stays within the backend's 4,000-character limit. See [Attachments and current compatibility](#attachments-and-current-compatibility).

## Contents

- [Features](#features)
- [Technology stack](#technology-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Using the app](#using-the-app)
- [How it works](#how-it-works)
- [API reference](#api-reference)
- [Attachments and current compatibility](#attachments-and-current-compatibility)
- [Chat history and privacy](#chat-history-and-privacy)
- [Deploy on Render](#deploy-on-render)
- [Configuration and customization](#configuration-and-customization)
- [Limits and known limitations](#limits-and-known-limitations)
- [Troubleshooting](#troubleshooting)
- [Validation](#validation)
- [Contributing](#contributing)

## Features

### Chat experience

- Multi-turn conversations backed by Gemini.
- New chats, reopening saved chats, individual deletion, and clearing all chats.
- Automatic chat titles based on the first message or attached filename.
- History grouped into Today, Yesterday, Previous 7 days, and Older.
- Prompt suggestions for writing, studying, coding, and general questions.
- Typing indicator and automatic scrolling when the reader is near the bottom.
- Enter to send and Shift+Enter for a new line.
- Automatically resizing message composer.
- Basic Markdown rendering: headings, lists, bold, italics, inline code, links, and fenced code blocks.
- Copy buttons for code blocks.
- Light/dark themes with saved preferences.
- Collapsible desktop sidebar and mobile drawer.
- Keyboard focus styles, accessible labels, and reduced-motion styling.

### Backend

- Express serves the frontend and API from the same origin.
- Gemini API credentials loaded from server environment variables.
- Configurable model and port.
- Request validation and conversation-context trimming.
- In-memory rate limiting of 20 requests per minute per IP.
- Health-check endpoint.
- API error mapping for authentication, model, quota, and timeout failures.
- SSE-formatted responses consumed through the browser Fetch API.

The server currently waits for the complete Gemini answer before sending one content event. The response format is SSE, but generation is not streamed token by token.

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | HTML, CSS, vanilla JavaScript |
| Backend | Node.js with ES modules, Express |
| AI provider | Google Gemini through `@google/genai` |
| Environment configuration | `dotenv` |
| Browser persistence | `localStorage` |
| Response transport | Fetch API and SSE-formatted response body |
| PDF text extraction | PDF.js loaded on demand from cdnjs |
| Image preparation | Browser Image API and Canvas |
| Typography | Manrope and JetBrains Mono through Google Fonts |

Dependencies declared in `package.json`:

| Package | Declared version |
| --- | --- |
| `@google/genai` | `2.32.0` |
| `express` | `^5.1.0` |
| `dotenv` | `^16.6.1` |

The package declares **Node.js 20 or later**. Use a maintained Node.js release compatible with the installed dependencies.

## Project structure

| Path | Purpose |
| --- | --- |
| `index.js` | Express server, Gemini configuration, validation, rate limiting, health check, and chat endpoint |
| `package.json` | Project metadata, dependencies, Node requirement, and start script |
| `.gitignore` | Excludes `node_modules/` and `.env` |
| `public/index.html` | Chat interface, sidebar, theme control, and attachment input |
| `public/style.css` | Theme tokens, layout, responsive styles, and attachment styling |
| `public/script.js` | Chat state, local history, rendering, attachments, and API communication |
| `public/ai.png` | Spark-AI logo and assistant avatar |
| `public/favicon.png` | Browser tab icon |

Some frontend files contain commented-out earlier implementations. The active code defines the current interface and behavior documented here.

## Getting started

### Try the live application

Open **[Spark-AI on Render](https://spark-ai-vt1q.onrender.com/)** to use the deployed app. The installation instructions below are for running your own local copy, which requires your own Gemini API key.

### Prerequisites

- Node.js and npm.
- Git, or a downloaded copy of the repository.
- A Gemini API key with access to a model supported by your account.
- An internet connection for AI responses and external frontend resources.

You can create and manage Gemini API keys through [Google AI Studio](https://aistudio.google.com/). Model access, quotas, and billing depend on the provider account and configuration.

### 1. Clone the repository

```bash
git clone https://github.com/vasanth-kumar-009/Spark-AI.git
cd Spark-AI
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure the environment

Create a file named `.env` in the repository root, beside `index.js`:

```dotenv
GEMINI_API_KEY=replace_with_your_actual_gemini_api_key
PORT=3000
```

The source defaults to the model identifier `gemini-3.5-flash-lite`. Before sending a request, confirm that this identifier is available to your API key. If it is unavailable, add `GEMINI_MODEL` to `.env` with a valid model ID supported by your account.

Do not include quotation marks as part of an API key, and do not commit your real `.env` file.

### 4. Start the server

```bash
npm start
```

The start script runs:

```bash
node index.js
```

### 5. Open the app

```text
http://localhost:3000
```

Use the port from `.env` if you changed it. Stop the server with `Ctrl+C`.

Opening `public/index.html` directly or serving it with a static-only server does not provide the required `/api/chat` backend.

## Environment variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | Yes | None | Gemini API credential used by the backend |
| `GEMINI_MODEL` | No | `gemini-3.5-flash-lite` | Model identifier passed to Gemini |
| `PORT` | No | `3000` | HTTP server listening port |

The server throws `Missing GEMINI_API_KEY environment variable.` at startup if the key is absent. A present key and model are validated by the provider only when a chat request is made.

**One API key is supported.** The server reads `process.env.GEMINI_API_KEY` once and constructs one Gemini client. Adding `GEMINI_API_KEY_2`, a comma-separated list, or multiple keys in Render does not enable automatic fallback or rotation in the current code.

Restart the local server after changing `.env`. On a hosting platform, apply its restart or deployment process after updating environment variables.

## Using the app

1. Open the application and type a question, or select a suggestion chip.
2. Press Enter or use the send button. Use Shift+Enter to add a line break.
3. Wait for the response. Sending and chat-history actions are paused while a request is in progress.
4. Continue with follow-up questions in the same conversation.
5. Select **New chat** to start another conversation.
6. Reopen earlier conversations through the history sidebar.
7. Use the theme button to switch between light and dark mode.

Individual chats can be deleted through their trash buttons. **Clear all chats** removes the locally saved chat list after confirmation.

The attachment button, drag-and-drop handling, and image paste handling prepare files in the browser. Their current backend compatibility is described below.

## How it works

1. Express serves the files in `public/`.
2. The browser builds the conversation payload and sends a JSON request to `POST /api/chat`.
3. The server applies its per-IP request limit and validates every supplied message.
4. The server keeps the last 20 messages and maps `assistant` roles to Gemini's `model` role.
5. The Gemini SDK requests a response using the configured model and system instruction.
6. The server sends the completed answer in an SSE content event, followed by `[DONE]`.
7. The browser renders the answer and saves the conversation locally.

The backend does not use a database to retain conversations. Context comes from the messages supplied by the browser on each request.

## API reference

### `GET /api/health`

Checks that the Express server is responding.

```bash
curl http://localhost:3000/api/health
```

Response:

```json
{
  "status": "ok",
  "provider": "Gemini"
}
```

This endpoint does not call Gemini or validate the configured model, API key, permissions, or remaining quota.

### `POST /api/chat`

Accepts a JSON conversation with `Content-Type: application/json`.

Request:

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Explain recursion in simple words."
    }
  ]
}
```

#### Validation rules

| Item | Rule |
| --- | --- |
| `messages` | Array containing 1–100 messages |
| `role` | `user` or `assistant` |
| `content` | Nonempty string after trimming; at most 4,000 JavaScript string characters |
| Final message | Must have role `user` |
| Context forwarded to Gemini | Last 20 messages |
| JSON request body | Express parser limit of `100kb` |

All incoming messages are validated before the last 20 are selected. An invalid old message can therefore reject the request even if it would have been excluded from the model context.

#### Successful response

Content type:

```text
text/event-stream; charset=utf-8
```

Body format:

```text
data: {"content":"Recursion means a function calls itself..."}

data: [DONE]

```

The blank line after each event is part of the framing. The current implementation makes a non-streaming `generateContent()` call, then writes the full reply as one event.

#### Errors

Application-generated errors normally use this JSON shape before SSE headers are sent:

```json
{
  "error": "A human-readable error message."
}
```

| HTTP status | Situation |
| --- | --- |
| `400` | Invalid conversation or a provider request/model configuration error |
| `404` | Unknown API endpoint |
| `429` | Local rate limit or Gemini usage limit |
| `500` | Unclassified provider failure or an empty generated response |
| `502` | Provider authentication/permission failure or unavailable model |
| `504` | Recognized provider/request timeout |

Malformed or oversized JSON can be rejected by Express before the chat handler; those parser errors do not have a custom JSON response formatter in this repository.

## Attachments and current compatibility

### Browser preparation limits

| Attachment | Frontend limit | Browser processing |
| --- | --- | --- |
| Files per message | 5 | Preview chips with removal controls |
| PNG, JPEG, WebP, GIF | 15 MiB per file | Resized to a maximum longest side of 1,600 pixels and converted to JPEG at quality `0.85` |
| PDF | 20 MiB per file | Text extracted locally using PDF.js |
| Text/code files | 5 MiB per file | Read locally as text |
| Extracted text | 50,000 characters per file | Longer extracts are shortened |

Supported text/code extensions include `.txt`, `.md`, `.csv`, `.json`, `.js`, `.ts`, `.jsx`, `.tsx`, `.py`, `.java`, `.c`, `.cpp`, `.cs`, `.go`, `.rs`, `.php`, `.rb`, `.sh`, `.sql`, `.html`, `.css`, `.xml`, `.yaml`, `.yml`, and `.log`. Files with a `text/*` MIME type are also accepted by the frontend.

### What the backend currently accepts

- **Text and PDF extracts:** the frontend inserts extracted text into a string alongside filenames, code fences, and the prompt. That complete string must stay within 4,000 characters. Larger extracts are rejected even though the frontend can prepare up to 50,000 characters per file.
- **Images:** the frontend constructs OpenAI-style `image_url` content parts. The backend rejects array content and does not convert image data into Gemini inline-data parts. Image analysis is not functional in the current backend.
- **Request size:** base64 images and long conversation histories can exceed the `100kb` JSON-body limit before normal message validation.

PDF extraction reads embedded text; there is no OCR implementation. Image conversion flattens transparency onto white and does not preserve GIF animation. DOCX, XLSX, audio, and video are not supported attachment formats in the current code.

When a file is sent without a typed question, the frontend uses: `Please review the attached file(s) and summarize them.`

## Chat history and privacy

| Browser storage key | Stored information |
| --- | --- |
| `spark_chats` | Saved conversations, timestamps, messages, and attachment metadata/text |
| `spark_active_chat` | Active conversation identifier |
| `spark_theme` | Selected theme |
| `spark_sidebar` | Desktop sidebar preference |

History belongs to the current browser profile and website origin. It is not synchronized across devices, accounts, browsers, or different deployment URLs. Private browsing or clearing site data can remove it.

Text attachments and extracted PDF text are included in saved conversation data. Image data is deliberately excluded from persisted history; only metadata is retained, so previews and image content are unavailable after a reload.

Prompts and the retained conversation context are sent through the backend to Gemini. Short text/PDF extracts included in those messages are sent too. Keeping the API key on the server does not make chat content local-only.

The application does not implement authentication, encrypted chat storage, cloud history, or an application database. Storage writes fail silently when browser storage is blocked or full, allowing the current session to continue without guaranteed persistence.

## Deploy on Render

The existing live deployment is **[https://spark-ai-vt1q.onrender.com/](https://spark-ai-vt1q.onrender.com/)** and uses a Gemini API key configured on Render. The instructions below explain how to create your own deployment.

Use a **Node.js Web Service** for the full application.

1. Push the project to GitHub.
2. Create a Render Web Service connected to this repository.
3. Configure the service using the values below.
4. Add the Gemini environment variables through the service's environment settings.
5. Deploy and inspect the startup logs.
6. Check `/api/health`, then send an actual chat message to check provider access.

| Setting | Value |
| --- | --- |
| Repository | `vasanth-kumar-009/Spark-AI` |
| Runtime | Node |
| Root directory | Repository root |
| Build command | `npm install` |
| Start command | `npm start` |
| Required environment variable | `GEMINI_API_KEY` |
| Optional model override | `GEMINI_MODEL` set to a model available to your key |
| Health-check path | `/api/health` |

The server reads the host-provided `PORT` and binds to `0.0.0.0`. Keep the API key in the hosting environment rather than placing it in `public/` or committing it to GitHub.

The repository does not include a Render blueprint or Dockerfile; configure the service through the platform or add deployment configuration separately.

GitHub Pages and other static-only hosts cannot run this Express backend. A separate frontend deployment would require additional API URL and cross-origin configuration; the current frontend requests `/api/chat` on its own origin.

## Configuration and customization

| Change | Location |
| --- | --- |
| Gemini model | `GEMINI_MODEL` environment variable |
| Assistant instructions | `systemInstruction` in `index.js` |
| Output-token limit | `maxOutputTokens: 2048` in `index.js` |
| Sampling temperature | `temperature: 0.7` in `index.js` |
| Request timeout signal | `AbortSignal.timeout(90000)` in `index.js` |
| Conversation context | `incoming.slice(-20)` in `index.js` |
| Per-IP request limit | `WINDOW_MS` and `MAX_REQUESTS` in `index.js` |
| Backend message/body limits | Validation and `express.json()` in `index.js` |
| Prompt suggestions | `SUGGESTIONS` in the active section of `public/script.js` |
| Frontend attachment limits | `MAX_FILES`, file-size constants, and `MAX_TEXT_CHARS` in `public/script.js` |
| Colors, typography, layout | CSS variables and component rules in `public/style.css` |
| Branding | `public/index.html`, `public/ai.png`, and `public/favicon.png` |

If enabling larger attachments, update and validate both frontend preparation and backend payload handling. Changing only a browser-side limit does not make the backend accept the resulting request.

## Limits and known limitations

- **Model access is account-dependent.** The configured identifier is passed directly to Gemini, and startup does not verify its availability.
- **No API-key rotation or automatic retries.** A failed provider call returns an error to the user.
- **Conversation-length ceiling:** the frontend sends its full stored conversation. Once that exceeds 100 messages, the backend rejects it even though only 20 would be forwarded. Start a new chat when necessary.
- **Oversized assistant replies can affect later turns.** The same 4,000-character validation applies to assistant messages sent back in history. The frontend does not truncate long saved answers before sending a follow-up.
- **No token-by-token generation streaming.** The typing indicator remains until the completed provider response arrives.
- **Attachment handling is only partly integrated.** Image requests fail validation, and larger text/PDF content exceeds backend limits.
- **Rate limits are process-local.** They reset on restart and are not shared between server instances. Users behind a shared IP can share the same local allowance.
- **Proxy configuration is deployment-specific.** `app.set("trust proxy", 1)` assumes one trusted proxy hop; adjust this for a different network topology before relying on IP-based limits.
- **The chat API has no login gate.** Anyone able to access the endpoint can submit requests within its limits and consume the configured provider quota.
- **Markdown support is intentionally basic.** There is no dedicated syntax-highlighting library, full Markdown parser, or math renderer.
- **External resources need connectivity.** Google Fonts and the on-demand PDF.js CDN resources are not bundled locally.
- **No server-side chat database, file-storage service, or automated test script** is included.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| `Missing GEMINI_API_KEY environment variable.` | Put `.env` beside `index.js`, or set the variable on the host. Restart the process. |
| Gemini authentication or permission failed | Check that the key is correct and has permission for the selected API/model. Inspect the backend logs. |
| Gemini model not found or unavailable | Set `GEMINI_MODEL` to a model ID available to your account, then restart or redeploy. |
| Invalid Gemini request/model configuration | Inspect the provider error in server logs and verify model settings. |
| `Invalid or oversized message.` after attaching an image | Image content arrays are not supported by this backend. Send plain text until multimodal support is implemented. |
| `Invalid or oversized message.` after a PDF/text upload | Reduce the extract and prompt so the entire message stays under 4,000 characters. |
| Follow-up fails after a long answer | A previous assistant message may exceed the backend's per-message limit. Start a new conversation or update the handling of long history. |
| `Invalid conversation length.` | The request is empty or contains more than 100 messages. Start a new chat. |
| `Request failed.` with large files/history | The JSON body may exceed `100kb`; parser errors do not use the chat handler's custom error JSON. |
| `Too many messages. Try again in a minute.` | The local 20-request window has been exceeded for your IP. Wait for its reset. |
| Gemini usage limit reached | Check provider quota/billing and wait as appropriate. Adding extra environment variables does not enable key fallback. |
| Health check passes but chat fails | Health only checks Express. Validate provider credentials, model access, and quota with a real chat request. |
| PDF reader cannot load | Check access to cdnjs and whether the browser/network blocks the PDF.js script or worker. |
| PDF yields no useful content | Scanned/image-only PDFs need OCR, which this app does not implement. |
| History disappears | Use the same browser profile and site URL, allow local storage, and check whether site data was cleared or storage became full. |
| Image disappears after reload | Image bytes are intentionally not persisted in `localStorage`. |
| Copy button fails | Clipboard access may require HTTPS, localhost, or browser permission. Select and copy the code manually. |
| UI opens but `/api/chat` is missing | Run `npm start` and open the Express server URL. Do not open the HTML file directly. |
| Deployment shows missing package/version errors | Check `npm install` logs, registry access, the declared dependency versions, and the selected Node runtime. |

## Validation

The repository currently defines only `npm start`; it does not include `npm test`, a development script, or a build script.

Basic syntax checks:

```bash
node --check index.js
node --check public/script.js
```

For a manual integration check:

1. Install dependencies, configure a valid Gemini key/model, and start the server.
2. Verify `/api/health`.
3. Send a short text prompt and a follow-up.
4. Refresh the page and confirm that chat history returns.
5. Check theme switching, mobile navigation, and code-copy behavior.
6. Confirm that invalid requests receive the documented errors.

A successful health or syntax check alone does not confirm live Gemini access.

## Contributing

1. Fork the repository.
2. Create a branch for your change.
3. Keep credentials out of source files and commits.
4. Validate the affected UI and API behavior.
5. Open a pull request describing the change and how it was checked.

Useful areas for improvement include Gemini-native image handling, consistent attachment limits, true generation streaming, shared rate-limit storage, automated integration tests, long-conversation handling, and clearer storage-error feedback.

