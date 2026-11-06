
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

if (!process.env.OMNIROUTE_API_KEY ||
    !process.env.OMNIROUTE_BASE_URL) {
    throw new Error("Missing OmniRoute environment variables.");
}


const client = new OpenAI({
    baseURL: process.env.OMNIROUTE_BASE_URL,
    apiKey: process.env.OMNIROUTE_API_KEY,
    timeout: 90000,
    defaultHeaders: {
        "cf-aig-gateway-id":
            process.env.CLOUDFLARE_GATEWAY_ID || "spark-ai-gateway"
    }
});


const MODEL = process.env.OMNIROUTE_MODEL || "auto";

app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
});

// app.post("/api/chat", async (req, res) => {
//     try {
//         const incoming = req.body.messages;

//         if (!Array.isArray(incoming)) {
//             return res.status(400).json({
//                 error: "Messages must be an array."
//             });
//         }

//         const messages = incoming
//             .filter(m =>
//                 ["user", "assistant"].includes(m.role) &&
//                 typeof m.content === "string"
//             )
//             .slice(-20);

//         if (!messages.length ||
//             messages[messages.length - 1].role !== "user") {
//             return res.status(400).json({
//                 error: "Please send a valid user message."
//             });
//         }

//         const stream = await client.chat.completions.create({
//             model: MODEL,
//             messages: [
//                 {
//                     role: "system",
//                     content: "You are a helpful AI assistant. Give clear, accurate and friendly answers."
//                 },
//                 ...messages
//             ],
//             stream: true
//         });

//         res.setHeader("Content-Type", "text/event-stream");
//         res.setHeader("Cache-Control", "no-cache, no-transform");
//         res.setHeader("Connection", "keep-alive");
//         res.flushHeaders();

//         for await (const chunk of stream) {
//             if (res.destroyed) break;

//             const content = chunk.choices?.[0]?.delta?.content;

//             if (typeof content === "string" && content.length) {
//                 res.write(`data: ${JSON.stringify({ content })}\n\n`);
//             }
//         }

//         if (!res.destroyed) {
//             res.write("data: [DONE]\n\n");
//             res.end();
//         }

//     } catch (error) {
//         console.error("Chat error:", error);

//         if (!res.headersSent) {
//             res.status(error.status || 500).json({
//                 error: error.status === 401
//                     ? "OmniRoute authentication failed."
//                     : "Unable to get an AI response. Please try again."
//             });
//         } else if (!res.destroyed) {
//             res.write(`data: ${JSON.stringify({
//                 error: "The AI response was interrupted."
//             })}\n\n`);
//             res.end();
//         }
//     }
// });


app.post("/api/chat", async (req, res) => {
    try {
        const incoming = req.body.messages;

        if (!Array.isArray(incoming)) {
            return res.status(400).json({
                error: "Messages must be an array."
            });
        }

        const messages = incoming
            .filter(m =>
                ["user", "assistant"].includes(m.role) &&
                typeof m.content === "string"
            )
            .slice(-20);

        if (!messages.length ||
            messages[messages.length - 1].role !== "user") {
            return res.status(400).json({
                error: "Please send a valid user message."
            });
        }

        // Request a complete response from OmniRoute.
        const completion = await client.chat.completions.create({
            model: MODEL,
            messages: [
                {
                    role: "system",
                    content: "You are a helpful AI assistant. Give clear, accurate and friendly answers."
                },
                ...messages
            ],
            stream: false
        });

        const content =
            completion.choices?.[0]?.message?.content;

        if (typeof content !== "string") {
            throw new Error("Invalid AI response.");
        }

        // Keep the existing browser-facing SSE format.
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        res.write(`data: ${JSON.stringify({ content })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();

    } catch (error) {
        console.error("Chat error:", error);

        if (!res.headersSent) {
            res.status(error.status || 500).json({
                error: error.status === 401
                    ? "OmniRoute authentication failed."
                    : "Unable to get an AI response. Please try again."
            });
        } else if (!res.destroyed) {
            res.write(`data: ${JSON.stringify({
                error: "The AI response was interrupted."
            })}\n\n`);
            res.end();
        }
    }
});


app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI chatbot running on port ${PORT}`);
});
