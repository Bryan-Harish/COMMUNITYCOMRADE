import { IssueModel } from '../../db/models.js';
import * as GeminiService from './gemini.js';
import * as DuplicateService from './duplicates.js';

export async function processIssueAnalysis(issue: any): Promise<any> {
    try {
        // Step 1: Perform main Gemini Analysis
        const analysis = await GeminiService.analyzeIssue(issue);
        
        // Step 2: Perform Duplicate Detection
        const duplicateResult = await DuplicateService.checkDuplicates(issue);
        
        // Step 3: Check Public Property Rule
        let aiAnalysisStatus = 'COMPLETED';
        if (analysis.isPublicProperty === false) {
            aiAnalysisStatus = 'MANUAL_REVIEW';
        }

        return {
            ...analysis,
            ...duplicateResult,
            aiAnalysisStatus,
            analysisTimestamp: new Date(),
            analysisVersion: '1.0'
        };
    } catch (error) {
        console.error('AI Analysis failed:', error);
        return {
            aiAnalysisStatus: 'FAILED',
            analysisTimestamp: new Date(),
            analysisVersion: '1.0',
            // Default fallbacks according to specification:
            // Category: UNCATEGORIZED, Priority: MEDIUM, Department: UNASSIGNED, AI Analysis Status: FAILED
            category: 'UNCATEGORIZED',
            priority: 'MEDIUM',
            department: 'UNASSIGNED',
            isPublicProperty: true,
            aiSummary: 'Fallback applied. AI analysis failed to run.',
            aiReasoning: 'Gemini service returned a temporary error. Defaulting to manual triage.',
            duplicateDetected: false,
            duplicateConfidence: 0,
            existingIssueId: null,
            reason: 'AI comparison failed, defaulting.'
        };
    }
}
