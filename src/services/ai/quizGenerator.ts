import { GoogleGenAI, Type, Schema } from '@google/genai';
import { QuestionModel, QuizCategoryModel } from '../../db/models.js';

async function callWithRetry<T>(fn: () => Promise<T>, retries: number = 5, initialDelayMs: number = 10000): Promise<T> {
  let delay = initialDelayMs;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const errMsg = String(err?.message || '').toLowerCase();
      
      // Fast-fail if it is a daily quota exhaustion (no use retrying the same model)
      const isDailyQuotaExceeded = errMsg.includes('quota exceeded') || 
                                   errMsg.includes('exceeded your current quota') ||
                                   errMsg.includes('limit: 20') ||
                                   errMsg.includes('limit: 15');
      if (isDailyQuotaExceeded) {
        console.warn(`[Gemini API] Daily quota limit exceeded. Fast-failing attempt ${attempt}/${retries}...`);
        throw err;
      }

      const isRateLimit = err?.status === 429 || 
                          err?.statusCode === 429 || 
                          err?.status === 503 ||
                          errMsg.includes('429') || 
                          errMsg.includes('503') ||
                          errMsg.includes('quota') ||
                          errMsg.includes('rate_limit') ||
                          errMsg.includes('resource_exhausted') ||
                          errMsg.includes('unavailable') ||
                          errMsg.includes('overloaded') ||
                          errMsg.includes('high demand') ||
                          errMsg.includes('temporary') ||
                          errMsg.includes('try again');
      
      if (isRateLimit && attempt < retries) {
        let waitMs = delay;
        try {
          if (err?.details) {
            for (const detail of err.details) {
              if (detail.retryDelay) {
                const secs = parseFloat(detail.retryDelay);
                if (!isNaN(secs)) {
                  waitMs = (secs + 3) * 1000; // Add extra buffer
                  break;
                }
              }
            }
          }
        } catch (e) {
          // ignore parsing error
        }

        console.warn(`[Gemini API] Rate limited/Quota exceeded. Attempt ${attempt}/${retries}. Waiting ${waitMs / 1000}s before retry...`);
        await new Promise(res => setTimeout(res, waitMs));
        delay *= 2; // exponential backoff
      } else {
        throw err;
      }
    }
  }
  throw new Error('Max retries exceeded for Gemini API call');
}

export async function generateQuizQuestions(categoryName: string, count: number = 100): Promise<void> {
  try {
    await QuizCategoryModel.findOneAndUpdate(
      { name: categoryName },
      { isGenerating: true, generationError: "" }
    );
  } catch (dbErr) {
    console.error("Failed to update QuizCategory to generating:", dbErr);
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found.');
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const questionSchema: Schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Exactly 4 options"
          },
          correctAnswer: {
            type: Type.INTEGER,
            description: "Index of the correct answer in the options array (0 to 3)"
          },
          difficulty: {
            type: Type.STRING,
            enum: ["EASY", "MEDIUM", "HARD"]
          },
          explanation: { type: Type.STRING }
        },
        required: ["question", "options", "correctAnswer", "difficulty", "explanation"]
      }
    };

    const chunkSize = 20;
    const QUIZ_MODELS = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];

    console.log(`Generating ${count} questions for category: ${categoryName}`);
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    const timeoutMs = 60000; // 60 seconds timeout
    let timeoutId: any;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error("Something went wrong please try again later."));
      }, timeoutMs);
    });

    const generationPromise = (async () => {
      let remaining = count;
      while (remaining > 0) {
        const currentChunk = Math.min(chunkSize, remaining);
        const prompt = `Generate ${currentChunk} unique multiple-choice questions for the quiz category: "${categoryName}". 
Each question must have exactly 4 options. Make sure the difficulty varies between EASY, MEDIUM, and HARD. Provide a clear explanation for the correct answer.
Make sure the questions are relevant to a civic engagement and community awareness platform.`;

        let chunkSuccess = false;
        let lastErrorMessage = "";
        for (const modelName of QUIZ_MODELS) {
          try {
            console.log(`[Quiz Generator] Attempting to generate ${currentChunk} questions using model: ${modelName}`);
            const response = await callWithRetry(() => ai.models.generateContent({
              model: modelName,
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
                responseSchema: questionSchema,
                temperature: 0.7,
              }
            }), 2, 2000); // 2 retries per model, 2s initial delay

            const responseText = response.text;
            if (responseText) {
              const generatedQuestions = JSON.parse(responseText);
              
              const questionDocs = generatedQuestions.map((q: any) => ({
                category: categoryName,
                question: q.question,
                options: q.options,
                correctAnswer: q.correctAnswer,
                difficulty: q.difficulty,
                explanation: q.explanation,
                aiGenerated: true,
                isActive: true
              }));

              await QuestionModel.insertMany(questionDocs);
              console.log(`Successfully inserted ${questionDocs.length} questions for ${categoryName} using model ${modelName}`);
              chunkSuccess = true;
              break; // successfully handled this chunk, break out of model loop
            }
          } catch (err: any) {
            lastErrorMessage = err?.message || String(err);
            const isQuota = lastErrorMessage.toLowerCase().includes('quota') || lastErrorMessage.toLowerCase().includes('429');
            if (isQuota) {
              console.warn(`[Quiz Generator] Model ${modelName} failed due to quota limit:`, lastErrorMessage);
            } else {
              console.error(`[Quiz Generator] Model ${modelName} failed for chunk:`, lastErrorMessage);
            }
            // Continue to the next model in the chain
          }
        }

        if (!chunkSuccess) {
          throw new Error(lastErrorMessage || "All AI models failed or returned empty content.");
        }

        remaining -= currentChunk;
        if (remaining > 0) {
          await delay(3000); // 3 second delay between chunks
        }
      }
    })();

    try {
      await Promise.race([generationPromise, timeoutPromise]);
    } finally {
      clearTimeout(timeoutId);
    }

    // Success! Update status
    await QuizCategoryModel.findOneAndUpdate(
      { name: categoryName },
      { isGenerating: false, generationError: "" }
    );

  } catch (err: any) {
    console.error(`[Quiz Generator] Generation failed for category ${categoryName}:`, err);
    try {
      const displayMsg = err?.message === "Something went wrong please try again later."
        ? "Something went wrong please try again later."
        : (err?.message?.includes("quota") || err?.message?.includes("RESOURCE_EXHAUSTED") || err?.message?.includes("429")
          ? "AI generation quota is fully exhausted. Please try again later."
          : `AI Question Generator failed: ${err?.message || "Unavailable"}. Please try again later.`);

      await QuizCategoryModel.findOneAndUpdate(
        { name: categoryName },
        { isGenerating: false, generationError: displayMsg }
      );
    } catch (dbErr) {
      console.error("Failed to update QuizCategory on generation error:", dbErr);
    }
  }
}
