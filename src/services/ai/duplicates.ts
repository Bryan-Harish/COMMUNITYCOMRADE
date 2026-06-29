import { IssueModel } from '../../db/models.js';
import { isUsingMongo, DbService } from '../../db/db.js';
import { compareWithCandidates } from './gemini.js';

function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

export async function checkDuplicates(issue: any): Promise<any> {
    let candidateIssues: any[] = [];
    
    if (isUsingMongo) {
        try {
            candidateIssues = await (IssueModel as any).find({
                status: { $nin: ['CLOSED', 'REJECTED'] },
                location: {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: [issue.longitude, issue.latitude]
                        },
                        $maxDistance: 200
                    }
                }
            });
        } catch (err) {
            console.error('Mongo geo query failed, falling back to manual filtering:', err);
            // Fallback to fetching all and filtering manually to prevent failure
            const allIssues = await DbService.getIssues({});
            candidateIssues = allIssues.filter((i: any) => {
                if (['CLOSED', 'REJECTED'].includes(i.status)) return false;
                if (i.location && i.location.coordinates) {
                    const [lon, lat] = i.location.coordinates;
                    const d = getHaversineDistance(issue.latitude, issue.longitude, lat, lon);
                    return d <= 0.2; // 200 meters
                }
                return false;
            });
        }
    } else {
        const allIssues = await DbService.getIssues({});
        candidateIssues = allIssues.filter((i: any) => {
            if (['CLOSED', 'REJECTED'].includes(i.status)) return false;
            if (i.location && i.location.coordinates) {
                const [lon, lat] = i.location.coordinates;
                const d = getHaversineDistance(issue.latitude, issue.longitude, lat, lon);
                return d <= 0.2; // 200 meters
            }
            return false;
        });
    }

    // Exclude the issue itself if it's already saved (e.g. on updates, though we analyze prior to save)
    candidateIssues = candidateIssues.filter((c: any) => c.issueNumber !== issue.issueNumber && c.id !== issue.id);

    if (candidateIssues.length === 0) {
        return { duplicateDetected: false, duplicateConfidence: 0, existingIssueId: null, reason: 'No nearby issues found within 200 meters.' };
    }

    try {
        // Compare with nearby issues using Gemini
        const result = await compareWithCandidates(issue, candidateIssues);
        return result;
    } catch (error) {
        console.error('Failed to compare duplicates using Gemini:', error);
        return { duplicateDetected: false, duplicateConfidence: 0, existingIssueId: null, reason: 'Gemini comparison failed, falling back.' };
    }
}
