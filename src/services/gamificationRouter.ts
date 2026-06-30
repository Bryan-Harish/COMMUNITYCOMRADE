import express from 'express';
import { 
  QuizCategoryModel, 
  QuestionModel, 
  QuizAttemptModel, 
  GamificationProfileModel,
  AchievementModel,
  BadgeModel,
  CommunityHeroAwardModel,
  HallOfFameModel,
  UserModel,
  IssueModel,
  ResolutionVerificationModel,
  OfficerProfileModel
} from '../db/models';
import { GamificationEngine } from './gamification';
import { isUsingMongo } from '../db/db';
import { generateQuizQuestions } from './ai/quizGenerator';
import { sanitizeText, isValidQuizCategoryName } from '../utils/validation.js';

export const gamificationRouter = express.Router();

gamificationRouter.get('/profile', async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    if (!isUsingMongo) return res.json({ success: true, data: { userId, xp: 0, communityImpactScore: 0, reputationLevel: 1, stats: {} } });
    
    let profile = await GamificationProfileModel.findOne({ userId }).populate('badges.badgeId').populate('achievements.achievementId');
    if (!profile) {
      profile = new GamificationProfileModel({ userId });
    }

    // Ensure defensive subdocument initialization
    if (!profile.stats) {
      profile.stats = {
        issuesReported: 0,
        issuesVerified: 0,
        resolutionsVerified: 0,
        evidenceUploaded: 0,
        quizzesCompleted: 0,
        correctAnswers: 0
      };
    } else {
      if (profile.stats.issuesReported === undefined) profile.stats.issuesReported = 0;
      if (profile.stats.issuesVerified === undefined) profile.stats.issuesVerified = 0;
      if (profile.stats.resolutionsVerified === undefined) profile.stats.resolutionsVerified = 0;
      if (profile.stats.evidenceUploaded === undefined) profile.stats.evidenceUploaded = 0;
      if (profile.stats.quizzesCompleted === undefined) profile.stats.quizzesCompleted = 0;
      if (profile.stats.correctAnswers === undefined) profile.stats.correctAnswers = 0;
    }

    // Dynamic retroactive synchronization of stats from real collection data
    const actualIssuesReported = await IssueModel.countDocuments({ reporterId: userId, status: { $nin: ['OPEN', 'MANUAL_REVIEW'] } });
    const actualResolutionsVerified = await ResolutionVerificationModel.countDocuments({ citizenUserId: userId });

    let profileUpdated = false;
    if (profile.stats.issuesReported !== actualIssuesReported) {
      profile.stats.issuesReported = actualIssuesReported;
      profileUpdated = true;
    }
    if (profile.stats.resolutionsVerified !== actualResolutionsVerified) {
      profile.stats.resolutionsVerified = actualResolutionsVerified;
      profileUpdated = true;
    }
    if (profile.stats.issuesVerified !== actualResolutionsVerified) {
      profile.stats.issuesVerified = actualResolutionsVerified;
      profileUpdated = true;
    }

    if (profileUpdated) {
      await GamificationEngine.evaluateAchievements(profile);
      await GamificationEngine.evaluateBadges(profile);
      // Reload the fully populated profile after changes
      profile = await GamificationProfileModel.findOne({ userId }).populate('badges.badgeId').populate('achievements.achievementId');
    }

    // Synchronize with UserModel scores
    const user = await UserModel.findById(userId);
    if (user) {
      let isChanged = false;
      if (user.impactScore > (profile.communityImpactScore || 0)) {
        profile.communityImpactScore = user.impactScore;
        isChanged = true;
      }
      if (user.leaderboardScore > (profile.xp || 0)) {
        profile.xp = user.leaderboardScore;
        isChanged = true;
      }
      if (user.leaderboardScore > (profile.lifetimeLeaderboardScore || 0)) {
        profile.lifetimeLeaderboardScore = user.leaderboardScore;
        isChanged = true;
      }
      if (user.monthlyLeaderboardScore > (profile.monthlyLeaderboardScore || 0)) {
        profile.monthlyLeaderboardScore = user.monthlyLeaderboardScore;
        isChanged = true;
      }

      // Ensure bidirectional synchronization: if gamification has higher scores, update UserModel
      let userChanged = false;
      if ((profile.communityImpactScore || 0) > user.impactScore) {
        user.impactScore = profile.communityImpactScore;
        userChanged = true;
      }
      if ((profile.xp || 0) > user.leaderboardScore) {
        user.leaderboardScore = profile.xp;
        userChanged = true;
      }
      if ((profile.monthlyLeaderboardScore || 0) > user.monthlyLeaderboardScore) {
        user.monthlyLeaderboardScore = profile.monthlyLeaderboardScore;
        userChanged = true;
      }

      if (userChanged) {
        await user.save();
      }

      if (isChanged) {
        // Recalculate reputation levels based on synced scores
        if (profile.xp >= 10000 && profile.communityImpactScore >= 800) {
          profile.reputationLevel = 6;
          profile.reputationName = 'Civic Champion';
        } else if (profile.xp >= 5000 && profile.communityImpactScore >= 400) {
          profile.reputationLevel = 5;
          profile.reputationName = 'Community Hero';
        } else if (profile.xp >= 2500 && profile.communityImpactScore >= 200) {
          profile.reputationLevel = 4;
          profile.reputationName = 'Community Leader';
        } else if (profile.xp >= 1000 && profile.communityImpactScore >= 100) {
          profile.reputationLevel = 3;
          profile.reputationName = 'Trusted Citizen';
        } else if (profile.xp >= 300 && profile.communityImpactScore >= 30) {
          profile.reputationLevel = 2;
          profile.reputationName = 'Active Citizen';
        } else {
          profile.reputationLevel = 1;
          profile.reputationName = 'New Citizen';
        }
      }
    }

    await profile.save();
    return res.json({ success: true, data: profile });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin endpoints
gamificationRouter.post('/admin/categories', async (req: any, res: any) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ success: false });
  try {
    const { name, description, difficulty, xpReward, isEmergencyOnly, isActive } = req.body;

    const cleanName = sanitizeText(name);
    const cleanDescription = sanitizeText(description);

    if (!cleanName || !isValidQuizCategoryName(cleanName)) {
      return res.status(400).json({ success: false, error: 'Category Name is required and must be under 100 characters.' });
    }

    const category = new QuizCategoryModel({
      name: cleanName,
      description: cleanDescription,
      difficulty: difficulty || 'MEDIUM',
      xpReward: Number(xpReward) || 50,
      isEmergencyOnly: !!isEmergencyOnly,
      isActive: isActive !== undefined ? !!isActive : true,
    });
    await category.save();

    // Trigger AI question generation in the background
    generateQuizQuestions(category.name, 100).catch(console.error);

    res.json({ success: true, data: category });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

gamificationRouter.get('/admin/categories', async (req: any, res: any) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ success: false });
  try {
    const categories = await QuizCategoryModel.find({}).lean();
    
    // Get question count for each category
    const categoriesWithCount = await Promise.all(categories.map(async (cat: any) => {
      const count = await QuestionModel.countDocuments({ category: cat.name });
      return { ...cat, questionCount: count };
    }));

    res.json({ success: true, data: categoriesWithCount });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

gamificationRouter.post('/admin/categories/:id/regenerate', async (req: any, res: any) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ success: false });
  try {
    const category = await QuizCategoryModel.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, error: 'Category not found' });

    // Trigger AI question generation in the background
    generateQuizQuestions(category.name, 100).catch(console.error);

    res.json({ success: true, message: 'Question generation started.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

gamificationRouter.patch('/admin/categories/:id/status', async (req: any, res: any) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ success: false });
  try {
    const category = await QuizCategoryModel.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, error: 'Category not found' });

    category.isActive = req.body.isActive;
    await category.save();

    res.json({ success: true, data: category });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

gamificationRouter.get('/categories', async (req: any, res: any) => {
  try {
    if (req.user.role === 'DEPARTMENT_OFFICER') {
      return res.status(403).json({ success: false, error: 'Officers are not permitted to access quiz categories.' });
    }
    const userId = req.user.userId;
    const categories = await QuizCategoryModel.find({ isActive: true });
    
    // Check which categories have been attempted by this user within the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const attempts = await QuizAttemptModel.find({ 
      userId,
      startedAt: { $gte: twentyFourHoursAgo },
      completedAt: { $ne: null }
    }).select('category');
    
    const attemptedCategories = new Set(attempts.map(a => a.category));

    const data = categories.map(cat => ({
      ...cat.toObject(),
      isAttempted: attemptedCategories.has(cat.name)
    }));

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Quiz Execution
gamificationRouter.post('/quizzes/start', async (req: any, res: any) => {
  try {
    if (req.user.role === 'DEPARTMENT_OFFICER') {
      return res.status(403).json({ success: false, error: 'Officers are not permitted to take quizzes.' });
    }
    const { category } = req.body;
    const userId = req.user.userId;

    // 1. Prevent re-attempting same category within the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existingAttempt = await QuizAttemptModel.findOne({ 
      userId, 
      category,
      startedAt: { $gte: twentyFourHoursAgo },
      completedAt: { $ne: null }
    });
    
    if (existingAttempt) {
      return res.status(400).json({ success: false, error: 'You have already attempted the quiz in this section within the last 24 hours.' });
    }

    let profile = await GamificationProfileModel.findOne({ userId });
    if (!profile) profile = new GamificationProfileModel({ userId });
    
    const todayStr = new Date().toISOString().split('T')[0];
    if (profile.quizUsageLimit.lastAttemptDate === todayStr && profile.quizUsageLimit.attemptsCount >= 5) {
      return res.status(429).json({ success: false, error: 'Daily limit of 5 quizzes reached.' });
    }

    if (profile.quizUsageLimit.lastAttemptDate !== todayStr) {
      profile.quizUsageLimit.lastAttemptDate = todayStr;
      profile.quizUsageLimit.attemptsCount = 0;
    }
    profile.quizUsageLimit.attemptsCount += 1;
    await profile.save();

    // Fetch 10 random questions
    const questions = await QuestionModel.aggregate([
      { $match: { category, isActive: true } },
      { $sample: { size: 10 } }
    ]);

    if (questions.length === 0) return res.status(404).json({ success: false, error: 'No questions available.' });

    // Background check for replenishment
    QuestionModel.countDocuments({ category, isActive: true }).then(count => {
      if (count < 50) {
        console.log(`Question pool for ${category} fell below 50 (current: ${count}). Triggering auto-replenishment.`);
        generateQuizQuestions(category, 100).catch(console.error);
      }
    }).catch(console.error);

    const attempt = new QuizAttemptModel({
      userId,
      category,
      questions: questions.map(q => q._id)
    });
    await attempt.save();

    // Do NOT mask correct answers anymore, so the frontend can show correct/incorrect upon answering!
    res.json({ success: true, data: { sessionId: attempt._id, questions } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Cancel/Quit active quiz session
gamificationRouter.post('/quizzes/cancel', async (req: any, res: any) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user.userId;

    const attempt = await QuizAttemptModel.findOne({ _id: sessionId, userId });
    if (attempt) {
      if (!attempt.completedAt) {
        await QuizAttemptModel.deleteOne({ _id: sessionId });

        // Decrement daily count since it didn't complete
        const profile = await GamificationProfileModel.findOne({ userId });
        if (profile && profile.quizUsageLimit && profile.quizUsageLimit.attemptsCount > 0) {
          profile.quizUsageLimit.attemptsCount -= 1;
          await profile.save();
        }
      }
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

gamificationRouter.post('/quizzes/submit', async (req: any, res: any) => {
  try {
    if (req.user.role === 'DEPARTMENT_OFFICER') {
      return res.status(403).json({ success: false, error: 'Officers are not permitted to submit quizzes.' });
    }
    const { sessionId, answers } = req.body;
    const attempt = await QuizAttemptModel.findById(sessionId);
    if (!attempt || attempt.completedAt) return res.status(400).json({ success: false, error: 'Invalid or completed session.' });

    let correct = 0;
    let incorrect = 0;
    const evaluatedAnswers = [];

    const safeAnswers = Array.isArray(answers) ? answers : [];

    for (const ans of safeAnswers) {
      const q = await QuestionModel.findById(ans.questionId);
      if (q) {
        const selectedOptionIndex = typeof ans.selectedOptionIndex === 'number' ? ans.selectedOptionIndex : -1;
        const timeSpentSeconds = typeof ans.timeSpentSeconds === 'number' ? ans.timeSpentSeconds : 10;
        
        const isCorrect = q.correctAnswer === selectedOptionIndex;
        if (isCorrect) correct++;
        else incorrect++;
        
        evaluatedAnswers.push({
          questionId: q._id,
          selectedOptionIndex,
          timeSpentSeconds,
          isCorrect
        });
      }
    }

    attempt.answers = evaluatedAnswers;
    attempt.correctAnswers = correct;
    attempt.incorrectAnswers = incorrect;
    attempt.score = correct;
    attempt.completedAt = new Date();
    
    const started = attempt.startedAt ? new Date(attempt.startedAt) : new Date();
    attempt.duration = (attempt.completedAt.getTime() - started.getTime()) / 1000;
    await attempt.save();

    await GamificationEngine.handleEvent(req.user.userId, 'QUIZ_COMPLETED', { correctAnswers: correct });

    res.json({ success: true, data: attempt });
  } catch (err: any) {
    console.error('Quiz submission error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Leaderboards
gamificationRouter.get('/leaderboard/monthly', async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const currentUser = await UserModel.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const ward = currentUser.registeredWard;
    if (!ward) {
      return res.json({ success: true, data: [] });
    }
    
    // Find top 5 users in the ward sorted by monthlyLeaderboardScore
    const usersInWard = await UserModel.find({ registeredWard: ward, role: 'CITIZEN' })
      .sort({ monthlyLeaderboardScore: -1 })
      .limit(5);

    const data = [];
    for (const u of usersInWard) {
      let profile = await GamificationProfileModel.findOne({ userId: u._id });
      data.push({
        _id: profile?._id || u._id,
        userId: {
          _id: u._id,
          firstName: u.firstName,
          lastName: u.lastName,
          registeredWard: u.registeredWard
        },
        reputationName: profile?.reputationName || 'New Citizen',
        monthlyLeaderboardScore: profile?.monthlyLeaderboardScore !== undefined ? profile.monthlyLeaderboardScore : (u.monthlyLeaderboardScore || 0),
        lifetimeLeaderboardScore: profile?.lifetimeLeaderboardScore !== undefined ? profile.lifetimeLeaderboardScore : (u.leaderboardScore || 0),
        xp: profile?.xp !== undefined ? profile.xp : (u.leaderboardScore || 0)
      });
    }

    // Sort descending by monthlyLeaderboardScore
    data.sort((a, b) => b.monthlyLeaderboardScore - a.monthlyLeaderboardScore);

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

gamificationRouter.get('/leaderboard/lifetime', async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const currentUser = await UserModel.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const ward = currentUser.registeredWard;
    if (!ward) {
      return res.json({ success: true, data: [] });
    }

    // Find top 5 users in the ward sorted by leaderboardScore (lifetime score)
    const usersInWard = await UserModel.find({ registeredWard: ward, role: 'CITIZEN' })
      .sort({ leaderboardScore: -1 })
      .limit(5);

    const data = [];
    for (const u of usersInWard) {
      let profile = await GamificationProfileModel.findOne({ userId: u._id });
      data.push({
        _id: profile?._id || u._id,
        userId: {
          _id: u._id,
          firstName: u.firstName,
          lastName: u.lastName,
          registeredWard: u.registeredWard
        },
        reputationName: profile?.reputationName || 'New Citizen',
        monthlyLeaderboardScore: profile?.monthlyLeaderboardScore !== undefined ? profile.monthlyLeaderboardScore : (u.monthlyLeaderboardScore || 0),
        lifetimeLeaderboardScore: profile?.lifetimeLeaderboardScore !== undefined ? profile.lifetimeLeaderboardScore : (u.leaderboardScore || 0),
        xp: profile?.xp !== undefined ? profile.xp : (u.leaderboardScore || 0)
      });
    }

    // Sort descending by lifetimeLeaderboardScore
    data.sort((a, b) => b.lifetimeLeaderboardScore - a.lifetimeLeaderboardScore);

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

gamificationRouter.get('/leaderboard/officers', async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const currentUser = await UserModel.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const scope = req.query.scope || 'ward'; // 'ward', 'district', 'state'
    let filter: any = { role: 'DEPARTMENT_OFFICER', status: 'ACTIVE_OFFICER' };

    if (scope === 'ward') {
      filter.registeredWard = currentUser.registeredWard;
    } else if (scope === 'district') {
      filter.registeredDistrict = currentUser.registeredDistrict;
    } else if (scope === 'state') {
      filter.registeredState = currentUser.registeredState;
    }

    const officers = await UserModel.find(filter);
    
    const data = [];
    for (const off of officers) {
      const profile = await OfficerProfileModel.findOne({ userId: off._id } as any);
      
      // Count issues assigned to this officer
      const assignedCount = await IssueModel.countDocuments({
        assignedOfficerId: off._id
      });

      // Count resolved/closed issues
      const resolvedCount = await IssueModel.countDocuments({
        assignedOfficerId: off._id,
        status: { $in: ['COMMUNITY_VERIFIED', 'CLOSED'] }
      });

      data.push({
        _id: off._id,
        firstName: off.firstName,
        lastName: off.lastName,
        registeredWard: off.registeredWard,
        registeredDistrict: off.registeredDistrict,
        registeredState: off.registeredState,
        departmentName: profile?.departmentName || 'UNASSIGNED',
        employeeId: profile?.employeeId || 'N/A',
        assignedCount,
        resolvedCount,
        impactScore: off.impactScore || 0
      });
    }

    // Sort by resolvedCount descending, and then by impactScore descending
    data.sort((a, b) => {
      if (b.resolvedCount !== a.resolvedCount) {
        return b.resolvedCount - a.resolvedCount;
      }
      return b.impactScore - a.impactScore;
    });

    res.json({ success: true, data });
  } catch (err: any) {
    console.error('Error fetching officer leaderboard:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

gamificationRouter.get('/halloffame', async (req: any, res: any) => {
  try {
    const heroes = await HallOfFameModel.find({}).populate('userId', 'firstName lastName').sort({ awardMonth: -1 });
    res.json({ success: true, data: heroes });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
