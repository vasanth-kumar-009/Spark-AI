
import express from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =====================================
// 1. GEMINI API CONFIGURATION
// =====================================

const API_KEY = process.env.GEMINI_API_KEY;

const MODEL =
    process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

if (!API_KEY) {
    throw new Error(
        "Missing GEMINI_API_KEY environment variable."
    );
}

const ai = new GoogleGenAI({
    apiKey: API_KEY
});

// =====================================
// 2. EXPRESS CONFIGURATION
// =====================================

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(express.json({
    limit: "100kb"
}));

app.use(express.static(
    path.join(__dirname, "public")
));

// =====================================
// 3. BASIC RATE LIMITING
// =====================================

// 20 chat requests per minute per IP.
// For a larger production deployment,
// use a shared rate-limit store.

const rateLimits = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 20;

app.use("/api/chat", (req, res, next) => {
    const now = Date.now();
    const ip = req.ip;

    let record = rateLimits.get(ip);

    if (!record || now >= record.resetAt) {
        record = {
            count: 0,
            resetAt: now + WINDOW_MS
        };
    }

    record.count++;
    rateLimits.set(ip, record);

    if (record.count > MAX_REQUESTS) {
        return res.status(429).json({
            error: "Too many messages. Try again in a minute."
        });
    }

    next();
});

// Clean up expired rate-limit entries
const cleanup = setInterval(() => {
    const now = Date.now();

    for (const [ip, record] of rateLimits) {
        if (now >= record.resetAt) {
            rateLimits.delete(ip);
        }
    }
}, 60 * 1000);

cleanup.unref();

// =====================================
// 4. HEALTH CHECK
// =====================================

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        provider: "Gemini"
    });
});

// =====================================
// 5. CHATBOT API
// =====================================

app.post("/api/chat", async (req, res) => {
    try {
        const incoming = req.body?.messages;

        if (!Array.isArray(incoming)) {
            return res.status(400).json({
                error: "Messages must be an array."
            });
        }

        if (
            incoming.length === 0 ||
            incoming.length > 100
        ) {
            return res.status(400).json({
                error: "Invalid conversation length."
            });
        }

        // Validate all messages before sending
        const validMessages = incoming.every((m) =>
            m &&
            ["user", "assistant"].includes(m.role) &&
            typeof m.content === "string" &&
            m.content.trim().length > 0 &&
            m.content.length <= 4000
        );

        if (!validMessages) {
            return res.status(400).json({
                error: "Invalid or oversized message."
            });
        }

        // Keep the last 20 messages
        const messages = incoming.slice(-20);

        if (
            messages[messages.length - 1].role !== "user"
        ) {
            return res.status(400).json({
                error: "Last message must be from the user."
            });
        }

        // =====================================
        // 6. CONVERT MESSAGES FOR GEMINI
        // =====================================

        const contents = messages.map((message) => ({
            role:
                message.role === "assistant"
                    ? "model"
                    : "user",
            parts: [
                {
                    text: message.content
                }
            ]
        }));

        // =====================================
        // 7. GENERATE GEMINI RESPONSE
        // =====================================

        const response = await ai.models.generateContent({
            model: MODEL,
            contents,
            config: {
                systemInstruction:
                    "You are Spark-AI, a helpful AI chatbot. " +
                    "Give clear, accurate, friendly and " +
                    "easy-to-understand answers.",

                maxOutputTokens: 2048,
                temperature: 0.7,

                abortSignal: AbortSignal.timeout(90000)
            }
        });

        const content = response.text;

        if (
            typeof content !== "string" ||
            content.trim().length === 0
        ) {
            throw new Error(
                "Gemini returned an empty response."
            );
        }

        // =====================================
        // 8. SEND RESPONSE TO FRONTEND
        // =====================================

        // Preserve your existing SSE format
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
        // =====================================
        // 9. ERROR HANDLING
        // =====================================

        const status = Number(
            error.status || error.code
        );

        console.error("Gemini API error:", {
            status: Number.isFinite(status)
                ? status
                : 500,
            message: error.message
        });

        let errorMessage =
            "Unable to get an AI response. Please try again.";

        let httpStatus = 500;

        if (status === 400) {
            errorMessage =
                "Invalid Gemini request or model configuration.";
            httpStatus = 400;

        } else if (status === 401 || status === 403) {
            errorMessage =
                "Gemini API authentication or permission failed.";
            httpStatus = 502;

        } else if (status === 404) {
            errorMessage =
                "Gemini model not found or unavailable.";
            httpStatus = 502;

        } else if (status === 429) {
            errorMessage =
                "Gemini API usage limit reached. Try again later.";
            httpStatus = 429;

        } else if (
            error.name === "AbortError" ||
            error.name === "TimeoutError" ||
            status === 504
        ) {
            errorMessage =
                "Gemini took too long to respond.";
            httpStatus = 504;
        }

        if (!res.headersSent) {
            return res.status(httpStatus).json({
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

// =====================================
// 10. UNKNOWN API ROUTES
// =====================================

app.use("/api", (req, res) => {
    res.status(404).json({
        error: "API endpoint not found."
    });
});

// =====================================
// 11. START SERVER
// =====================================

app.listen(PORT, "0.0.0.0", () => {
    console.log(
        `Spark-AI running on port ${PORT}`
    );

    console.log("AI provider: Google Gemini");
    console.log(`Model: ${MODEL}`);
});
