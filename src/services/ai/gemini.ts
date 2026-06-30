import { GoogleGenAI, Type } from "@google/genai";
import fs from "fs";
import path from "path";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Resilient multi-model list with automatic fallback
const MODELS = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];

export async function retryWithBackoffAndModelFallback<T>(
  fn: (modelName: string) => Promise<T>,
  retries = 2,
  delay = 400
): Promise<T> {
  let lastError: any = null;
  
  for (const modelName of MODELS) {
    let attempts = retries;
    let currentDelay = delay;
    
    while (attempts > 0) {
      try {
        return await fn(modelName);
      } catch (error: any) {
        lastError = error;
        const isQuotaError = String(error).toLowerCase().includes('quota') || String(error).toLowerCase().includes('429');
        if (isQuotaError) {
          console.warn(`[Gemini API] Quota limit/Rate limit for ${modelName} (attempts left: ${attempts - 1})`);
        } else {
          console.error(`Gemini API call failed with model ${modelName} (attempts left: ${attempts - 1}):`, error);
        }
        
        // Extract stringified representation of the error safely
        const errorText = String(error?.message || '');
        const errorDetails = error?.error ? JSON.stringify(error.error) : '';
        const errorMessage = `${errorText} ${errorDetails} ${error}`.toLowerCase();
        
        // Check if error is transient (e.g. 503, 429)
        const isTransient = error?.status === 503 || 
                            error?.status === 429 || 
                            error?.error?.code === 429 ||
                            error?.error?.code === 503 ||
                            errorMessage.includes('503') || 
                            errorMessage.includes('429') || 
                            errorMessage.includes('resource_exhausted') ||
                            errorMessage.includes('rate_limit') ||
                            errorMessage.includes('limit exceeded') ||
                            errorMessage.includes('unavailable') ||
                            errorMessage.includes('overloaded') ||
                            errorMessage.includes('high demand') ||
                            errorMessage.includes('temporary') ||
                            errorMessage.includes('try again');
                            
        if (!isTransient) {
          // If it's a structural or schema/key error, try next model immediately
          break;
        }
        
        // Fast-fail if it is a daily quota exhaustion (no use retrying the same model)
        const isDailyQuotaExceeded = errorMessage.includes('quota exceeded') || 
                                     errorMessage.includes('exceeded your current quota') ||
                                     errorMessage.includes('limit: 20') ||
                                     errorMessage.includes('limit: 15') ||
                                     errorMessage.includes('daily limit');
        if (isDailyQuotaExceeded) {
          console.warn(`Daily quota limit exceeded for model ${modelName}. Switching to next model immediately...`);
          break;
        }

        // Fast-fail if it is a rate limit or resource exhaustion (immediate switch to fallback model instead of waiting/retrying)
        const isRateLimited = errorMessage.includes('rate_limit') || 
                              errorMessage.includes('429') || 
                              errorMessage.includes('resource_exhausted') ||
                              errorMessage.includes('limit exceeded');
        if (isRateLimited) {
          console.warn(`Rate limit or resource exhaustion hit for model ${modelName}. Switching to next model immediately...`);
          break;
        }
        
        attempts--;
        if (attempts > 0) {
          console.warn(`Transient error on ${modelName}, retrying in ${currentDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, currentDelay));
          currentDelay *= 2;
        }
      }
    }
  }
  
  throw lastError || new Error("All Gemini models failed to generate content.");
}

async function getMediaInlineData(url: string, type: 'IMAGE' | 'VIDEO') {
  try {
    if (!url) return null;
    if (type !== 'IMAGE') {
      // Return null for non-images (videos) to prevent Gemini REST API 400 error.
      // Video presence is instead passed to the model via descriptive text in the prompt.
      return null;
    }
    let localPath = "";
    if (url.startsWith("/uploads/")) {
      localPath = path.join(process.cwd(), "public", url);
    } else if (url.includes("/uploads/")) {
      const parts = url.split("/uploads/");
      localPath = path.join(process.cwd(), "public/uploads", parts[1]);
    }
    
    if (localPath) {
      if (fs.existsSync(localPath)) {
        const data = fs.readFileSync(localPath);
        const ext = path.extname(localPath).toLowerCase();
        let mimeType = ext === ".png" ? "image/png" : "image/jpeg";
        return {
          inlineData: {
            data: data.toString("base64"),
            mimeType: mimeType
          }
        };
      } else {
        // If identified as a local upload but missing on disk, return null immediately.
        // Doing this avoids loopback deadlocks, 504 gateway timeouts, or SVG parsing errors.
        console.warn(`Local upload file not found on disk: ${localPath}. Skipping fetch.`);
        return null;
      }
    } else if (url.startsWith("http://") || url.startsWith("https://")) {
      // Add a safe timeout of 8 seconds to prevent hanging on slow/dead external URLs
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("svg") || contentType.includes("html") || contentType.includes("xml")) {
            console.warn(`Skipping fetch for URL ${url} due to unsupported content-type: ${contentType}`);
            return null;
          }
          const arrayBuffer = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const parsedUrl = new URL(url);
          const ext = path.extname(parsedUrl.pathname).toLowerCase();
          let mimeType = ext === ".png" ? "image/png" : "image/jpeg";
          return {
            inlineData: {
              data: buffer.toString("base64"),
              mimeType: mimeType
            }
          };
        }
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        console.error(`Fetch request aborted or failed for URL ${url}:`, fetchErr.message);
      }
    }
  } catch (err) {
    console.error("Failed to read media for Gemini:", err);
  }
  return null;
}

export async function analyzeIssue(issueData: any): Promise<any> {
    let videoNotes = "";
    if (issueData.media && Array.isArray(issueData.media)) {
        const videoCount = issueData.media.filter((m: any) => m.type === 'VIDEO').length;
        if (videoCount > 0) {
            videoNotes = `\n- The user uploaded ${videoCount} video evidence attachment(s) as proof. Please consider this as valid supporting evidence.`;
        }
    }

    const prompt = `
        You are a highly experienced Municipal Issue Analyst. Analyze the following municipal issue and return structured JSON output conforming exactly to the responseSchema.
        
        Issue Title: ${issueData.title}
        Issue Description: ${issueData.description}
        Address: ${issueData.address}
        Latitude: ${issueData.latitude}
        Longitude: ${issueData.longitude}${videoNotes}

        Please categorize the issue into one of these strict categories:
        - POTHOLE
        - GARBAGE
        - WATER_LEAKAGE
        - DRAINAGE
        - STREETLIGHT
        - ROAD_DAMAGE
        - TRAFFIC_SIGNAL
        - PUBLIC_SAFETY
        - OTHER

        Please determine the priority of the issue:
        - LOW
        - MEDIUM
        - HIGH
        - CRITICAL

        Please assign the issue to one of these municipal departments:
        - ROADS_DEPARTMENT
        - WATER_DEPARTMENT
        - ELECTRICAL_DEPARTMENT
        - SANITATION_DEPARTMENT
        - TRAFFIC_DEPARTMENT
        - MUNICIPAL_CORPORATION

        CRITICAL ASSESSMENT - PUBLIC VS PRIVATE PROPERTY:
        You must evaluate BOTH the text and any uploaded images/media to determine if the reported issue is on public property or private property.
        
        - Set isPublicProperty to true only if the issue occurs on public infrastructure (e.g., public roads, streetlights, municipal water mains, public sewer drains, public sidewalks, public parks, garbage dumped on public streets).
        - Set isPublicProperty to false if the issue occurs inside or belongs to private property (e.g., inside a residential house, apartment unit, kitchen, bathroom, backyard garden, private driveway, commercial store, private tap/faucet, private plumbing leak).
        - VISUAL EVIDENCE IS AUTHORITATIVE: If an image or video is uploaded, you must examine it carefully. If the image/video shows indoor domestic fixtures (such as a sink, kitchen faucet, household wall, bathroom tub, washing machine tap, or indoor ceiling leak), you MUST set isPublicProperty to false and publicPropertyConfidence to 0.90 or higher. Vague or misleading text like "water leak in 11th cross" (which could just refer to a house address on that street) MUST NOT override clear photographic evidence of an indoor, private domestic tap leak.

        Provide a concise, 1-sentence, polished human-style summary of the issue (aiSummary) (e.g. "Large pothole detected on municipal road causing traffic obstruction.").
        Provide detailed reasoning of your analysis (aiReasoning).
        
        Return confidence scores between 0.0 and 1.0 for each decision.
    `;

    // Extract any images/media in parallel
    const contents: any[] = [prompt];
    if (issueData.media && Array.isArray(issueData.media)) {
        const mediaPromises = issueData.media.map((item: any) => getMediaInlineData(item.url, item.type));
        const resolvedMedia = await Promise.all(mediaPromises);
        for (const inlineData of resolvedMedia) {
            if (inlineData) {
                contents.push(inlineData);
            }
        }
    }

    const response = await retryWithBackoffAndModelFallback((modelName) => ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    category: { type: Type.STRING },
                    priority: { type: Type.STRING },
                    department: { type: Type.STRING },
                    isPublicProperty: { type: Type.BOOLEAN },
                    aiSummary: { type: Type.STRING },
                    aiReasoning: { type: Type.STRING },
                    categoryConfidence: { type: Type.NUMBER },
                    priorityConfidence: { type: Type.NUMBER },
                    departmentConfidence: { type: Type.NUMBER },
                    publicPropertyConfidence: { type: Type.NUMBER },
                },
                required: [
                    "category", 
                    "priority", 
                    "department", 
                    "isPublicProperty", 
                    "aiSummary", 
                    "aiReasoning", 
                    "categoryConfidence", 
                    "priorityConfidence", 
                    "departmentConfidence", 
                    "publicPropertyConfidence"
                ],
            },
        },
    }));

    return JSON.parse(response.text!);
}

export async function compareWithCandidates(newIssue: any, candidates: any[]): Promise<any> {
    let videoNotes = "";
    if (newIssue.media && Array.isArray(newIssue.media)) {
        const videoCount = newIssue.media.filter((m: any) => m.type === 'VIDEO').length;
        if (videoCount > 0) {
            videoNotes = `\n- The new issue contains ${videoCount} video evidence attachment(s).`;
        }
    }

    const candidateDescriptions = candidates.map((c, idx) => `
Candidate #${idx + 1}:
- Issue Number: ${c.issueNumber || ''}
- Database ID: ${c.id || c._id}
- Title: ${c.title}
- Description: ${c.description}
- Category: ${c.category}
- Address: ${c.address}
- Coordinates: ${c.location?.coordinates?.[1] || ''}, ${c.location?.coordinates?.[0] || ''}
- Status: ${c.status}
`).join('\n\n');

    const prompt = `
        You are a highly detailed duplicate municipal issue detector. Compare the following NEW issue with the list of nearby EXISTING CANDIDATE issues.
        Determine if the NEW issue is a duplicate of one of the EXISTING issues.
        
        NEW Issue:
        - Title: ${newIssue.title}
        - Description: ${newIssue.description}
        - Address: ${newIssue.address}
        - Coordinates: ${newIssue.latitude}, ${newIssue.longitude}${videoNotes}
        
        EXISTING CANDIDATE ISSUES:
        ${candidateDescriptions}
        
        Compare details like similarity of the physical location, the visual description of the problem, and the title.
        If a duplicate is detected:
        - set duplicateDetected to true
        - provide the matching existingIssueId (use the EXACT Issue Number of the matching candidate, e.g. CC-YYYY-XXXXXX)
        - specify your duplicateConfidence (score between 0.0 and 1.0)
        - give a detailed reasoning explanation (reason)
        
        If no duplicate is detected, set duplicateDetected to false, duplicateConfidence to 0, existingIssueId to null, and explain why.
    `;

    // Extract any images/media of the new issue
    const contents: any[] = [prompt];
    if (newIssue.media && Array.isArray(newIssue.media)) {
        for (const item of newIssue.media) {
            const inlineData = await getMediaInlineData(item.url, item.type);
            if (inlineData) {
                contents.push(inlineData);
            }
        }
    }

    const response = await retryWithBackoffAndModelFallback((modelName) => ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    duplicateDetected: { type: Type.BOOLEAN },
                    duplicateConfidence: { type: Type.NUMBER },
                    existingIssueId: { type: Type.STRING },
                    reason: { type: Type.STRING },
                },
                required: ["duplicateDetected", "duplicateConfidence", "existingIssueId", "reason"],
            },
        },
    }));

    return JSON.parse(response.text!);
}

export async function validateResolution(issueData: any, resolutionData: any): Promise<any> {
    let videoNotes = "";
    if (issueData.media && Array.isArray(issueData.media)) {
        const videoCount = issueData.media.filter((m: any) => m.type === 'VIDEO').length;
        if (videoCount > 0) {
            videoNotes += `\n- Original issue "Before" media contains ${videoCount} video evidence attachment(s).`;
        }
    }
    if (resolutionData.media && Array.isArray(resolutionData.media)) {
        const videoCount = resolutionData.media.filter((m: any) => m.type === 'VIDEO').length;
        if (videoCount > 0) {
            videoNotes += `\n- Officer's "After" resolution media contains ${videoCount} video evidence attachment(s). Please note that a video is attached and confirm it as valid active work or proof of fix.`;
        }
    }

    let resolutionDocsDescription = "";
    if (resolutionData.media && Array.isArray(resolutionData.media)) {
        resolutionDocsDescription = resolutionData.media.map((m: any, idx: number) => {
            return `Document #${idx + 1}: Type: ${m.type}, URL/Path: ${m.url}`;
        }).join('\n');
    }

    const prompt = `
        You are a highly precise Municipal Resolution Audit Engine. Compare the original municipal issue report with the officer's resolution proof to verify if the issue has indeed been resolved.
        
        Original Issue Details:
        - Title: ${issueData.title}
        - Description: ${issueData.description}
        - Category: ${issueData.category}
        - Location: Latitude ${issueData.latitude}, Longitude ${issueData.longitude}
        - Address: ${issueData.address}

        Officer Resolution Details:
        - Notes: ${resolutionData.notes}
        - Location: Latitude ${resolutionData.resolutionLatitude}, Longitude ${resolutionData.resolutionLongitude}
        - Address: ${resolutionData.resolutionAddress}
        - Distance Delta: ${resolutionData.resolutionDistanceMeters.toFixed(1)} meters${videoNotes}
        - Submitted Resolution Evidence Documents (${resolutionData.media ? resolutionData.media.length : 0}):
${resolutionDocsDescription}

        Compare visual elements from the original issue media ("Before") and resolution media ("After") if provided. Check for identical background landmarks (e.g. houses, signs, trees, poles) to ensure it is the exact same physical location. Check if the repairs detailed in the officer's notes matches the visual state in the "After" image/video.
        
        =========================================
        MANDATORY DOCUMENT EVALUATION REQUIREMENT:
        - The officer has uploaded ${resolutionData.media ? resolutionData.media.length : 0} resolution document(s) as evidence.
        - You MUST explicitly evaluate and provide detailed feedback on ALL of these submitted documents (including both the image and the video if both are uploaded) in your "resolutionValidationReasoning" and "resolutionValidationSummary".
        - For images, evaluate the visual state and check for landmark consistency.
        - For videos, acknowledge the video file submission as a supplementary dynamic walkthrough/live proof, evaluating its validity in tandem with the image. Mention both the image and the video in your evaluation. Your final output reasoning MUST contain a clear statement analyzing each document individually and collectively.
        =========================================

        =========================================
        CRITICAL SECURITY AND WATERMARK AUDIT:
        - You MUST thoroughly scan and analyze the resolution "After" image/media for any signs of watermarks, company logos, stock photography text, or website source signatures.
        - Look for watermarks/copyright text (e.g. "Alamy", "Shutterstock", "Getty Images", "iStock", "Adobe Stock", "Dreamstime", "123RF", or standard "©", copyright symbols, diagonal transparent text, grid lines, or stock photo labels).
        - If ANY watermark, stock photo brand, grid line overlay, or internet source label is detected, you MUST conclude that the resolution is FRAUDULENT (the officer downloaded an image from the internet instead of performing actual on-site repairs).
        - Under this condition:
          * Set "resolutionLikelyValid" strictly to false.
          * Set "resolutionValidationConfidence" to a very high value (0.95 to 1.0) because the fraud watermark is clear-cut.
          * Set "resolutionValidationSummary" to: "Resolution rejected due to detected stock photo watermarks or internet source logos on the submitted image."
          * Set "resolutionValidationReasoning" to: "The submitted After image contains a clear internet/stock photo watermark (such as Alamy, Shutterstock, or generic copyright text), confirming that this is an offline stock photograph from the internet and does not represent an actual physical repair performed on-site."
        =========================================

        Return a structured JSON output conforming exactly to the responseSchema:
        - resolutionLikelyValid: Boolean (true if repairs are completed and level, matched surrounding context; false if it appears unaddressed, fake, or mismatched location)
        - resolutionValidationConfidence: Number (between 0.0 and 1.0)
        - resolutionValidationSummary: String (1-2 sentence description summarizing the comparison)
        - resolutionValidationReasoning: String (detailed paragraph explaining landmark correspondence, textures, visual elements, or location discrepancies)
    `;

    const contents: any[] = [prompt];
    
    // Add original issue media as "Before" media
    if (issueData.media && Array.isArray(issueData.media)) {
        for (const item of issueData.media) {
            const inlineData = await getMediaInlineData(item.url, item.type);
            if (inlineData) {
                contents.push(inlineData);
            }
        }
    }

    // Add resolution media as "After" media
    if (resolutionData.media && Array.isArray(resolutionData.media)) {
        for (const item of resolutionData.media) {
            const inlineData = await getMediaInlineData(item.url, item.type);
            if (inlineData) {
                contents.push(inlineData);
            }
        }
    }

    const response = await retryWithBackoffAndModelFallback((modelName) => ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    resolutionLikelyValid: { type: Type.BOOLEAN },
                    resolutionValidationConfidence: { type: Type.NUMBER },
                    resolutionValidationSummary: { type: Type.STRING },
                    resolutionValidationReasoning: { type: Type.STRING },
                },
                required: [
                    "resolutionLikelyValid",
                    "resolutionValidationConfidence",
                    "resolutionValidationSummary",
                    "resolutionValidationReasoning"
                ],
            },
        },
    }));

    return JSON.parse(response.text!);
}

export async function generateDiscussionSummary(issue: any, messages: any[]): Promise<any> {
    const prompt = `You are an expert AI community coordinator. Generate an executive discussion summary for the public issue: "${issue.title}".
Category: ${issue.category}
Current Status: ${issue.status}
Description: ${issue.description}

Here is the conversation thread for this issue:
${messages.map((m: any) => `[${m.createdAt}] ${m.userName} (${m.userRole} / ${m.messageType}): "${m.message}"`).join('\n')}

Analyze the messages and output a JSON response matching the requested schema.`;

    const response = await retryWithBackoffAndModelFallback((modelName) => ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
            systemInstruction: "You are an objective community service analyst. Focus on summarizing discussions between citizens and officers neutrally, identifying main friction points, milestones, and what steps come next. Always return valid JSON directly without markdown wrappers.",
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING, description: "A high-level summary of the discussion" },
                    keyConcerns: { 
                        type: Type.ARRAY, 
                        items: { type: Type.STRING },
                        description: "List of key concerns raised by the citizens"
                    },
                    latestProgress: { type: Type.STRING, description: "Description of the latest progress on the issue" },
                    pendingActions: { 
                        type: Type.ARRAY, 
                        items: { type: Type.STRING },
                        description: "List of pending actions required"
                    }
                },
                required: ["summary", "latestProgress", "keyConcerns", "pendingActions"]
            }
        }
    }));

    return JSON.parse(response.text!.trim());
}


