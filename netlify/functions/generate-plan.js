exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing GROQ_API_KEY in Netlify environment variables." })
      };
    }

    const body = JSON.parse(event.body || "{}");
    const prompt = body.prompt;
    if (!prompt) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing prompt" })
      };
    }

    const models = ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"];
    let lastError = "Groq API request failed";

    for (const model of models) {
      const endpoint = "https://api.groq.com/openai/v1/chat/completions";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          temperature: 0.7,
          messages: [
            {
              role: "system",
              content: "You are an expert fitness coach. Provide safe, practical workout guidance. Always follow the user's required [SECTION:] and [DAY:] format exactly, keep days in numeric order, and include Warm-up, Main Workout, and Cooldown for each training day."
            },
            {
              role: "user",
              content: prompt
            }
          ]
        })
      });

      const data = await response.json();
      if (!response.ok) {
        lastError = data?.error?.message || `Groq API request failed on model ${model}`;
        continue;
      }

      const text = data?.choices?.[0]?.message?.content;
      if (text) {
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text })
        };
      }

      lastError = `Model ${model} returned empty content`;
    }

    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: lastError })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message || "Unexpected server error" })
    };
  }
};
