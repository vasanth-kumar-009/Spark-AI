
import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// 1. CLOUDFLARE CONFIGURATION
// ==========================================

const API_KEY = process.env.OMNIROUTE_API_KEY;
const BASE_URL = process.env.OMNIROUTE_BASE_URL;
const MODEL =
    process.env.OMNIROUTE_MODEL ||
    "@cf/meta/llama-3.1-8b-instruct";

const GATEWAY_ID = process.env.CLOUDFLARE_GATEWAY_ID;

if (!API_KEY || !BASE_URL) {
    throw new Error(
        "Missing Cloudflare API key or base URL."
    );
}

if (!GATEWAY_ID) {
    throw new Error(
        "Missing CLOUDFLARE_GATEWAY_ID."
    );
}

// ==========================================
// 2. OPENAI-COMPATIBLE CLOUDFLARE CLIENT
// ==========================================

const client = new OpenAI({
    apiKey: API_KEY,
    baseURL: BASE_URL,
    timeout: 90000,
    maxRetries: 1,
    defaultHeaders: {
        "cf-aig-gateway-id": GATEWAY_ID
    }
});

// ==========================================
// 3. EXPRESS MIDDLEWARE
// ==========================================

app.disable("x-powered-by");

app.use(express.json({
    limit: "100kb"
}));

app.use(express.static(
    path.join(__dirname, "public")
));

// ==========================================
// 4. HEALTH CHECK
// ==========================================

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok"
    });
});

// ==========================================
// 5. CHATBOT API
// ==========================================

app.post("/api/chat", async (req, res) => {
    try {
        const incoming = req.body?.messages;

        if (!Array.isArray(incoming)) {
            return res.status(400).json({
                error: "Messages must be an array."
            });
        }

        // Validate and limit messages
        const messages = incoming
            .filter((message) =>
                message &&
                ["user", "assistant"].includes(message.role) &&
                typeof message.content === "string" &&
                message.content.trim().length > 0
            )
            .slice(-20);

        if (
            !messages.length ||
            messages[messages.length - 1].role !== "user"
        ) {
            return res.status(400).json({
                error: "Please send a valid user message."
            });
        }

        // Limit individual message length
        const MAX_MESSAGE_LENGTH = 4000;

        const safeMessages = messages.map((message) => ({
            role: message.role,
            content: message.content.slice(
                0,
                MAX_MESSAGE_LENGTH
            )
        }));

        // ==================================
        // 6. SEND REQUEST TO CLOUDFLARE AI
        // ==================================

        const completion =
            await client.chat.completions.create({
                model: MODEL,
                messages: [
                    {
                        role: "system",
                        content:
                            "You are Spark-AI, a helpful AI assistant. " +
                            "Give clear, accurate, friendly and concise answers."
                    },
                    ...safeMessages
                ],
                max_tokens: 1024,
                stream: false
            });

        const content =
            completion.choices?.[0]?.message?.content;

        if (
            typeof content !== "string" ||
            !content.trim()
        ) {
            throw new Error(
                "Cloudflare returned an empty or invalid response."
            );
        }

        // ==================================
        // 7. RETURN RESPONSE TO FRONTEND
        // ==================================

        // Keep the existing SSE response format
        res.setHeader(
            "Content-Type",
            "text/event-stream; charset=utf-8"
        );

        res.setHeader(
            "Cache-Control",
            "no-cache, no-transform"
        );

        res.setHeader(
            "Connection",
            "keep-alive"
        );

        res.flushHeaders();

        res.write(
            `data: ${JSON.stringify({
                content
            })}\n\n`
        );

        res.write("data: [DONE]\n\n");
        res.end();

    } catch (error) {

        // ==================================
        // 8. ERROR HANDLING
        // ==================================

        console.error("Cloudflare AI error:", {
            status: error.status || 500,
            code: error.code,
            type: error.type,
            message: error.message
        });

        let errorMessage =
            "Unable to get an AI response. Please try again.";

        if (error.status === 400) {
            errorMessage =
                "Invalid AI request or model configuration.";
        } else if (error.status === 401) {
            errorMessage =
                "Cloudflare API authentication failed. Check your API token.";
        } else if (error.status === 403) {
            errorMessage =
                "Cloudflare access denied. Check API permissions.";
        } else if (error.status === 404) {
            errorMessage =
                "AI model or API endpoint not found.";
        } else if (error.status === 429) {
            errorMessage =
                "AI request limit reached. Please try again later.";
        } else if (error.status === 408) {
            errorMessage =
                "AI request timed out. Please try again.";
        }

        const status =
            [400, 401, 403, 404, 429].includes(error.status)
                ? error.status
                : 500;

        if (!res.headersSent) {
            return res.status(status).json({
                error: errorMessage
            });
        }

        if (!res.destroyed) {
            res.write(
                `data: ${JSON.stringify({
                    error: errorMessage
                })}\n\n`
            );

            res.end();
        }
    }
});

// ==========================================
// 9. HANDLE INVALID API ROUTES
// ==========================================

app.use("/api", (req, res) => {
    res.status(404).json({
        error: "API endpoint not found."
    });
});

// ==========================================
// 10. START SERVER
// ==========================================

app.listen(PORT, "0.0.0.0", () => {
    console.log(
        `Spark-AI chatbot running on port ${PORT}`
    );

    console.log(
        "AI Provider: Cloudflare Workers AI"
    );

    console.log(
        `Model: ${MODEL}`
    );

    console.log(
        `AI Gateway: ${GATEWAY_ID}`
    );
});
