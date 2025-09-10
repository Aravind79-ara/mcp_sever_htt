#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

class HttpClientServer {
  constructor() {
    this.server = new Server(
      { name: "http-client-server", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );

    this.defaultHeaders = {
      "User-Agent": "MCP-HTTP-Client/1.0",
    };

    this.setupToolHandlers();

    this.server.onerror = (error) =>
      console.error("[MCP Error]", error);

    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "http_request",
          description:
            "Make HTTP requests with any method (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS, etc.)",
          inputSchema: {
            type: "object",
            properties: {
              url: { type: "string" },
              method: {
                type: "string",
                enum: [
                  "GET",
                  "POST",
                  "PUT",
                  "DELETE",
                  "PATCH",
                  "HEAD",
                  "OPTIONS",
                  "CONNECT",
                  "TRACE",
                ],
                default: "GET",
              },
              headers: {
                type: "object",
                additionalProperties: { type: "string" },
              },
              body: { type: "string" },
              query_params: {
                type: "object",
                additionalProperties: { type: "string" },
              },
              timeout: { type: "integer", default: 30000 },
              follow_redirects: { type: "boolean", default: true },
            },
            required: ["url"],
          },
        },
        {
          name: "http_get",
          description: "Simplified GET request",
          inputSchema: {
            type: "object",
            properties: {
              url: { type: "string" },
              headers: {
                type: "object",
                additionalProperties: { type: "string" },
              },
              query_params: {
                type: "object",
                additionalProperties: { type: "string" },
              },
            },
            required: ["url"],
          },
        },
        {
          name: "http_post",
          description: "Simplified POST request",
          inputSchema: {
            type: "object",
            properties: {
              url: { type: "string" },
              data: { type: "string" },
              content_type: {
                type: "string",
                enum: [
                  "application/json",
                  "application/x-www-form-urlencoded",
                  "text/plain",
                  "application/xml",
                ],
                default: "application/json",
              },
              headers: {
                type: "object",
                additionalProperties: { type: "string" },
              },
            },
            required: ["url", "data"],
          },
        },
        {
          name: "set_default_headers",
          description: "Set headers for all requests",
          inputSchema: {
            type: "object",
            properties: {
              headers: {
                type: "object",
                additionalProperties: { type: "string" },
              },
              merge: { type: "boolean", default: true },
            },
            required: ["headers"],
          },
        },
      ],
    }));

    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request) => {
        const { name, arguments: args } = request.params;

        try {
          switch (name) {
            case "http_request":
              return await this.handleHttpRequest(args);
            case "http_get":
              return await this.handleHttpGet(args);
            case "http_post":
              return await this.handleHttpPost(args);
            case "set_default_headers":
              return await this.handleSetDefaultHeaders(args);
            default:
              throw new McpError(
                ErrorCode.MethodNotFound,
                `Unknown tool: ${name}`
              );
          }
        } catch (error) {
          if (error instanceof McpError) throw error;
          throw new McpError(
            ErrorCode.InternalError,
            `Tool execution failed: ${error.message}`
          );
        }
      }
    );
  }

  buildUrl(baseUrl, queryParams) {
    if (!queryParams || Object.keys(queryParams).length === 0) {
      return baseUrl;
    }
    const url = new URL(baseUrl);
    Object.entries(queryParams).forEach(([k, v]) =>
      url.searchParams.append(k, v)
    );
    return url.toString();
  }

  async handleHttpRequest(args) {
    const {
      url,
      method = "GET",
      headers = {},
      body,
      query_params,
      timeout = 30000,
      follow_redirects = true,
    } = args;

    if (!url) {
      throw new McpError(ErrorCode.InvalidParams, "URL is required");
    }

    try {
      const finalUrl = this.buildUrl(url, query_params);
      const finalHeaders = { ...this.defaultHeaders, ...headers };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const fetchOptions = {
        method: method.toUpperCase(),
        headers: finalHeaders,
        signal: controller.signal,
        redirect: follow_redirects ? "follow" : "manual",
      };

      if (body && ["POST", "PUT", "PATCH"].includes(method.toUpperCase())) {
        fetchOptions.body = body;
      }

      const response = await fetch(finalUrl, fetchOptions);
      clearTimeout(timeoutId);

      const responseHeaders = Object.fromEntries(
        response.headers.entries()
      );

      let responseBody;
      const text = await response.text();
      try {
        responseBody = JSON.parse(text);
      } catch {
        responseBody = text;
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                status: response.status,
                headers: responseHeaders,
                body: responseBody,
                url: response.url,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      if (error.name === "AbortError") {
        throw new McpError(
          ErrorCode.InternalError,
          `Request timed out after ${timeout}ms`
        );
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: false,
                error: error.message,
                type: error.name,
                url,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  }

  async handleHttpGet(args) {
    return await this.handleHttpRequest({ ...args, method: "GET" });
  }

  async handleHttpPost(args) {
    const {
      url,
      data,
      content_type = "application/json",
      headers = {},
    } = args;

    if (!data) {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Data is required for POST"
      );
    }

    const finalHeaders = { "Content-Type": content_type, ...headers };

    return await this.handleHttpRequest({
      url,
      method: "POST",
      headers: finalHeaders,
      body: data,
    });
  }

  async handleSetDefaultHeaders(args) {
    const { headers, merge = true } = args;

    if (!headers || typeof headers !== "object") {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Headers object is required"
      );
    }

    if (merge) {
      this.defaultHeaders = { ...this.defaultHeaders, ...headers };
    } else {
      this.defaultHeaders = { ...headers };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              message: "Default headers updated",
              current_defaults: this.defaultHeaders,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("HTTP Client MCP server running on stdio");
  }
}

const server = new HttpClientServer();
server.run().catch(console.error);

export { HttpClientServer };
