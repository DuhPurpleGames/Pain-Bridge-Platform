export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { words } = req.body || {};
  if (!words || !Array.isArray(words) || words.length === 0) {
    return res.status(400).json({ error: "No words provided" });
  }

  const prompt = "A songwriter searched rhymes for: " + words.join(", ") + ". Give 3 short practical songwriting tips based on these word themes. Use a bullet before each. Plain text only, no intro.";

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
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
    return res.status(200).json({ text });

  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
}
