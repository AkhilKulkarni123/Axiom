// Axiom AI Integration
// Handles communication with Claude API for all AI features

class AxiomAI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.anthropic.com/v1/messages';
    this.model = 'claude-sonnet-4-20250514';
  }

  async call(systemPrompt, userMessage, maxTokens = 1024) {
    if (!this.apiKey) {
      throw new Error('API key not configured. Please set your Claude API key in Axiom settings.');
    }

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`AI request failed: ${response.status} - ${err}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  async summarizePage(content, profile) {
    const system = `You are Axiom, an AI assistant that summarizes web content.
Tailor your summary to the user's knowledge level: ${profile.knowledgeLevel}.
User interests: ${profile.interests.join(', ') || 'general'}.
User goals: ${profile.goals.join(', ') || 'general learning'}.

Return a JSON object with:
- "summary": a clear, concise summary (3-5 bullet points)
- "keyPoints": array of the most important takeaways
- "relevance": how relevant this is to the user's interests/goals (high/medium/low)
- "simplifiedExplanation": if the content is technical, provide a simpler explanation`;

    const result = await this.call(system, `Summarize this web page content:\n\n${content.substring(0, 8000)}`, 1500);
    try {
      return JSON.parse(result);
    } catch {
      return { summary: result, keyPoints: [], relevance: 'medium', simplifiedExplanation: '' };
    }
  }

  async confidenceCheck(claims, profile) {
    const system = `You are Axiom's fact-checking engine. Analyze the following claims for reliability.
User knowledge level: ${profile.knowledgeLevel}.

For each claim, return a JSON object with:
- "claims": array of objects, each with:
  - "text": the claim
  - "confidence": number 0-100 (how likely this is accurate)
  - "rating": "verified" | "likely" | "uncertain" | "misleading" | "false"
  - "explanation": brief explanation of your assessment
  - "sources": array of suggested search terms or known references to verify

Also include:
- "overallScore": average confidence score 0-100
- "overallRating": overall page reliability rating`;

    const result = await this.call(system, `Analyze these claims for accuracy:\n\n${claims.substring(0, 6000)}`, 2000);
    try {
      return JSON.parse(result);
    } catch {
      return { claims: [], overallScore: 50, overallRating: 'uncertain' };
    }
  }

  async suggestActions(profile, browsingContext) {
    const system = `You are Axiom, a proactive AI assistant. Based on the user's profile and current browsing, suggest helpful actions.

User profile:
- Interests: ${profile.interests.join(', ') || 'not specified'}
- Goals: ${profile.goals.join(', ') || 'not specified'}
- Education: ${profile.education || 'not specified'}
- Occupation: ${profile.occupation || 'not specified'}

Return a JSON array of 3-5 suggestions, each with:
- "type": "learn" | "apply" | "read" | "tool" | "opportunity"
- "title": short action title
- "description": why this is relevant
- "searchQuery": a search query the user could use to find this`;

    const result = await this.call(system, `Current browsing context: ${browsingContext.substring(0, 3000)}`, 1500);
    try {
      return JSON.parse(result);
    } catch {
      return [];
    }
  }

  async chat(message, profile, pageContext) {
    const system = `You are Axiom, a helpful AI assistant that lives in the user's browser. You act as their second brain.

User profile:
- Name: ${profile.name || 'User'}
- Interests: ${profile.interests.join(', ') || 'not specified'}
- Goals: ${profile.goals.join(', ') || 'not specified'}
- Knowledge level: ${profile.knowledgeLevel || 'intermediate'}

Current page context: ${pageContext || 'No page context available'}

Be concise, helpful, and personalized. Reference the user's interests and goals when relevant.`;

    return await this.call(system, message, 1500);
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.AxiomAI = AxiomAI;
}
