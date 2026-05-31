module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured on server" });

  const body = req.body || {};
  const words = Array.isArray(body.words) ? body.words : [];
  if (!words.length) return res.status(400).json({ error: "No words provided" });

  const prompt = "A songwriter searched rhymes for: " + words.join(", ") + ". Give 3 short practical songwriting tips. Use a bullet before each. Plain text only, no intro.";

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 350,
        messages: [{ role: "user", content: prompt }]
      })
    });
    const data = await response.json();
    const text = data.content && data.content[0] ? data.content[0].text : "";
    return res.status(200).json({ text: text });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
};
