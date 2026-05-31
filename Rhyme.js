export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { word } = req.body || {};
  if (!word || typeof word !== "string" || word.trim().length === 0) {
    return res.status(400).json({ error: "No word provided" });
  }

  const prompt = "Rhyming words for the word: " + word.trim() + ". Respond with ONLY a comma-separated list of words and short phrases. Nothing else. No intro, no explanation, no numbers, no categories. Example: never, clever, forever, together, endeavor, whether. Give 30 to 40 rhymes.";

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
        max_tokens: 700,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const text = data.content && data.content[0] ? data.content[0].text : "";
    return res.status(200).json({ text });

  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
}
