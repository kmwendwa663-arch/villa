import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  app.use(express.json());
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // In-memory socket room management
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("identify", (userId: string) => {
      socket.join(userId);
      console.log(`User ${userId} joined their private room ${userId}`);
    });

    socket.on("send-message", (data: { 
      senderId: string; 
      receiverId: string; 
      content: string; 
      createdAt: string;
      chatId: string;
    }) => {
      console.log("Message event:", data);
      // Emit to both sender and receiver rooms for real-time updates
      io.to(data.receiverId).to(data.senderId).emit("receive-message", data);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/ai/suggest-wallpaper", async (req, res) => {
    const { mood } = req.body;
    if (!mood) return res.status(400).json({ error: "Mood is required" });

    try {
      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Suggest 4 high-quality wallpaper themes matching the mood: "${mood}". 
        Return a JSON array of objects, each with a "name" (short elegant title) and an "image_url" (a high-quality Unsplash image URL that represents this theme perfectly). 
        IMPORTANT: Use real Unsplash photo URLs with IDs that you are confident exist, e.g., https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1920&auto=format&fit=crop. 
        Focus on cinematic, luxury, minimal, and aesthetic landscapes or architectures that fit the "Villa" luxury aesthetic.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                image_url: { type: Type.STRING }
              },
              required: ["name", "image_url"]
            }
          }
        }
      });

      const suggestions = JSON.parse(result.text);
      res.json(suggestions);
    } catch (err) {
      console.error("Gemini Error:", err);
      res.status(500).json({ error: "Failed to generate suggestions" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Error starting server:", err);
});
