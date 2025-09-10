# mcp_sever_htt
Got it 🚀 — here’s a **README.md** you can drop straight into your GitHub repo for your MCP HTTP Client project:

---

# HTTP Client MCP Server

A **Model Context Protocol (MCP)** server that acts as a universal HTTP client.
It lets MCP-compatible clients (like Claude Desktop) send **GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS**, and custom HTTP requests.

Supports query parameters, custom headers, request bodies, authentication, and configurable defaults.

---

## ✨ Features

* 🌐 Supports all HTTP methods (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`, `CONNECT`, `TRACE`)
* ⚡ Simplified convenience methods: `http_get`, `http_post`
* 🛠 Configure default headers (useful for API keys, tokens, User-Agent, etc.)
* 📑 Full response details: status, headers, body, and URL
* ⏱ Timeout + redirect handling
* 🧰 Works with any MCP client (Claude Desktop, VSCode MCP, custom clients)

---

## 📂 Project Structure

```
http-client-mcp/
├── package.json        # Project config
├── server.mjs          # Main MCP server
├── test.mjs            # Local test runner (bypasses MCP)
├── README.md           # This file
```

---

## ⚙️ Installation

1. Clone the repo:

   ```bash
   git clone https://github.com/your-username/http-client-mcp.git
   cd http-client-mcp
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. (Optional) Make sure you’re on **Node.js 20+** (native `fetch` support).

   ```bash
   node -v
   ```

---

## ▶️ Usage

### Run as MCP Server

This server is designed to run under an MCP client (e.g., Claude Desktop).

In your `.claude/config.json`, add:

```json
{
  "mcpServers": {
    "http-client-server": {
      "command": "node",
      "args": ["C:/path/to/http-client-mcp/server.mjs"]
    }
  }
}
```

Restart Claude Desktop, and the following tools will appear:

* `http_request` → full HTTP client
* `http_get` → simple GET helper
* `http_post` → simple POST helper
* `set_default_headers` → set API keys or headers globally

---

### Run Locally (Testing without MCP)

You can test the server’s HTTP logic directly:

```bash
npm run test
```

Example (`test.mjs`):

```js
import { HttpClientServer } from "./server.mjs";

const test = async () => {
  const s = new HttpClientServer();

  const res = await s.handleHttpGet({
    url: "https://jsonplaceholder.typicode.com/posts/1"
  });

  console.log("Response:\n", res.content[0].text);
};

test();
```

---

## 🛠 Example Tool Calls

### GET Example

```json
{
  "tool": "http_get",
  "arguments": {
    "url": "https://jsonplaceholder.typicode.com/posts/1"
  }
}
```

### POST Example

```json
{
  "tool": "http_post",
  "arguments": {
    "url": "https://jsonplaceholder.typicode.com/posts",
    "data": "{\"title\": \"foo\", \"body\": \"bar\", \"userId\": 1}",
    "content_type": "application/json"
  }
}
```

### Set Default Headers

```json
{
  "tool": "set_default_headers",
  "arguments": {
    "headers": {
      "Authorization": "Bearer YOUR_TOKEN"
    }
  }
}
```

---

## 📜 License

MIT License. Free to use, modify, and share.

---

👉 Would you like me to also include a **ready-made badge section** (Node.js version, NPM, license) for the top of the README so it looks polished on GitHub?
