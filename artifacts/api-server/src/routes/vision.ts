import { Router, type IRouter } from "express";

const router: IRouter = Router();
const categories = new Set(["car", "truck", "bus", "motorcycle", "bicycle", "building", "tree", "other", "none"]);
const requestsThisMinute: number[] = [];
let dailyRequests = 0;
let day = "";

router.post("/vision/classify", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const key = process.env.openAl;
  if (!key) {
    res.status(503).json({ error: "AI image analysis is not configured." });
    return;
  }
  const body: unknown = req.body;
  if (!body || typeof body !== "object") {
    res.status(400).json({ error: "Expected a JPEG image and aim position." });
    return;
  }
  const { imageBase64, aimX, aimY } = body as Record<string, unknown>;
  if (typeof imageBase64 !== "string" ||
      imageBase64.length > 85000 || imageBase64.length < 100 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64) ||
      typeof aimX !== "number" || !Number.isFinite(aimX) || aimX < 0 || aimX > 1 ||
      typeof aimY !== "number" || !Number.isFinite(aimY) || aimY < 0 || aimY > 1) {
    res.status(400).json({ error: "Invalid JPEG image or aim position." });
    return;
  }
  const image = Buffer.from(imageBase64, "base64");
  if (image.length > 60_000 || image.length < 100 ||
      image[0] !== 0xff || image[1] !== 0xd8 || image[2] !== 0xff) {
    res.status(400).json({ error: "Invalid or oversized JPEG image." });
    return;
  }

  const now = Date.now();
  const currentDay = new Date(now).toISOString().slice(0, 10);
  if (day !== currentDay) { day = currentDay; dailyRequests = 0; }
  while (requestsThisMinute.length && requestsThisMinute[0] <= now - 60_000) requestsThisMinute.shift();
  // A small global budget protects the user's API key even without accounts.
  if (requestsThisMinute.length >= 4 || dailyRequests >= 40) {
    res.status(429).json({ error: "AI image-analysis limit reached. Try again later." });
    return;
  }
  requestsThisMinute.push(now);
  dailyRequests += 1;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5-mini",
        max_completion_tokens: 240,
        response_format: { type: "json_object" },
        messages: [{
          role: "user",
          content: [
            { type: "text", text: `Identify the visible physical object directly under the sight at normalized x=${aimX.toFixed(3)}, y=${aimY.toFixed(3)}. If it is too small, ambiguous, a person, or not identifiable, return category "none". Respond ONLY as JSON: {"category":"car|truck|bus|motorcycle|bicycle|building|tree|other|none","confidence":0.0}. Do not infer unseen objects. Confidence must be a number 0..1.` },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: "low" } },
          ],
        }],
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      res.status(502).json({ error: "AI image analysis is unavailable." });
      return;
    }
    const data = await response.json() as { choices?: { message?: { content?: string } }[] };
    const parsed: unknown = JSON.parse(data.choices?.[0]?.message?.content ?? "");
    const result = parsed as { category?: unknown; confidence?: unknown };
    if (!categories.has(String(result.category)) ||
        typeof result.confidence !== "number" ||
        !Number.isFinite(result.confidence) ||
        result.confidence < 0 || result.confidence > 1) {
      res.status(502).json({ error: "AI returned an invalid recognition result." });
      return;
    }
    res.json({ category: result.category, confidence: result.confidence });
  } catch {
    res.status(502).json({ error: "AI image analysis is unavailable." });
  }
});

export default router;