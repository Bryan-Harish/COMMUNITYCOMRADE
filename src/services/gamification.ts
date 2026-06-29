import { 
  GamificationProfileModel, 
  QuizCategoryModel, 
  QuestionModel, 
  QuizAttemptModel, 
  AchievementModel, 
  BadgeModel,
  CommunityHeroAwardModel,
  HallOfFameModel,
  UserModel
} from '../db/models';
import { isUsingMongo } from '../db/db';

export const GamificationEngine = {
  async handleEvent(userId: string, eventType: string, payload: any = {}) {
    if (!isUsingMongo) return; // Fallback for local JSON if needed, but Gamification is complex, sticking to Mongo primarily

    try {
      let profile = await GamificationProfileModel.findOne({ userId });
      if (!profile) {
        // Create if missing
        profile = new GamificationProfileModel({ userId });
        await profile.save();
      }

      // Defensive initialization of stats subdocument and arrays to avoid legacy document crashes
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

      if (!profile.achievements) profile.achievements = [];
      if (!profile.badges) profile.badges = [];
      if (!profile.quizUsageLimit) {
        profile.quizUsageLimit = {
          lastAttemptDate: "",
          attemptsCount: 0
        };
      }

      let xpGained = 0;
      let cisGained = 0;

      // Handle Event Types
      switch (eventType) {
        case 'QUIZ_COMPLETED':
          xpGained += 10; // Participation
          xpGained += (payload.correctAnswers || 0) * 20; // +20 per correct answer
          cisGained += 5; // Minimal CIS for learning
          
          profile.stats.quizzesCompleted += 1;
          profile.stats.correctAnswers += (payload.correctAnswers || 0);
          break;

        case 'ISSUE_REPORTED':
          xpGained += 25;
          cisGained += 10;
          profile.stats.issuesReported += 1;
          break;

        case 'ISSUE_VERIFIED':
          xpGained += 10;
          cisGained += 5;
          profile.stats.issuesVerified += 1;
          break;

        case 'RESOLUTION_VERIFIED':
          xpGained += 15;
          cisGained += 15;
          profile.stats.resolutionsVerified += 1;
          profile.stats.issuesVerified += 1;
          break;

        case 'HELPFUL_EVIDENCE_UPLOADED':
          xpGained += 20;
          cisGained += 5;
          profile.stats.evidenceUploaded += 1;
          break;

        case 'COMMUNITY_HERO_AWARDED':
          xpGained += 100;
          break;
      }

      // Update Points
      profile.xp += xpGained;
      profile.monthlyLeaderboardScore += xpGained;
      profile.lifetimeLeaderboardScore += xpGained;
      profile.communityImpactScore += cisGained;

      // Update Reputation Level (DO NOT MODIFY VOTE WEIGHT OR ISSUE LIFECYCLE)
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

      await profile.save();

      // Synchronize with UserModel scores
      const user = await UserModel.findById(userId);
      if (user) {
        user.impactScore = profile.communityImpactScore;
        user.leaderboardScore = profile.xp;
        user.monthlyLeaderboardScore = profile.monthlyLeaderboardScore;
        await user.save();
      }

      await this.evaluateAchievements(profile);
      await this.evaluateBadges(profile);

    } catch (e) {
      console.error('Error handling gamification event', e);
    }
  },

  async ensureSeeded() {
    try {
      const achievementCount = await AchievementModel.countDocuments({});
      if (achievementCount === 0) {
        const defaultAchievements = [
          {
            name: "Civic Reporter",
            description: "Report your first neighborhood infrastructure issue.",
            code: "FIRST_REPORT",
            xpReward: 25
          },
          {
            name: "Civic Eyewitness",
            description: "Submit your first verification vote for an issue resolution.",
            code: "FIRST_VERIFICATION",
            xpReward: 30
          },
          {
            name: "Quiz Beginner",
            description: "Complete your first civic learning quiz.",
            code: "QUIZ_BEGINNER",
            xpReward: 20
          },
          {
            name: "Quiz Master",
            description: "Complete 10 civic learning quizzes.",
            code: "QUIZ_MASTER",
            xpReward: 50
          },
          {
            name: "Top Verifier",
            description: "Submit 50 verification votes for issue resolutions.",
            code: "TOP_VERIFIER",
            xpReward: 100
          }
        ];
        await AchievementModel.insertMany(defaultAchievements);
        console.log('🌱 [Gamification] Seeded default achievements.');
      }

      const badgeCount = await BadgeModel.countDocuments({});
      
      // Update any existing 'Verified Citizen' badges to 'Active Verifier'
      await BadgeModel.updateMany(
        { name: "Verified Citizen" },
        { 
          $set: { 
            name: "Active Verifier", 
            description: "Successfully verified base identity.",
            icon: "ShieldCheck",
            tier: 1
          } 
        }
      );

      if (badgeCount === 0) {
        const defaultBadges = [
          {
            name: "Active Verifier",
            description: "Successfully verified base identity.",
            icon: "ShieldCheck",
            tier: 1
          },
          {
            name: "Community Verifier",
            description: "Maintain a verification accuracy rate above 90% with at least 25 verifications logged.",
            icon: "CheckSquare",
            tier: 2
          },
          {
            name: "Quiz Champion",
            description: "Unlocked when the citizen completes 20 or more quizzes.",
            icon: "Award",
            tier: 2
          },
          {
            name: "Issue Resolver",
            description: "Successfully cooperate to resolve 20+ neighborhood infrastructure reports.",
            icon: "Wrench",
            tier: 2
          },
          {
            name: "Knowledge Ambassador",
            description: "Unlocked after earning perfect scores on all available Quiz Categories.",
            icon: "BookOpen",
            tier: 3
          },
          {
            name: "Community Hero",
            description: "Earned by finishing in the Top 3 of the Monthly Leaderboard.",
            icon: "Trophy",
            tier: 3
          },
          {
            name: "Top Verifier",
            description: "Unlocked when the citizen verifies 100 or more civic issues.",
            icon: "Medal",
            tier: 3
          }
        ];
        await BadgeModel.insertMany(defaultBadges);
        console.log('🌱 [Gamification] Seeded default badges.');
      }
    } catch (err) {
      console.error('Error seeding gamification presets:', err);
    }
  },

  async evaluateAchievements(profile: any) {
    if (!isUsingMongo) return;
    try {
      await this.ensureSeeded();
      const achievements = await AchievementModel.find({});
      const earned = (profile.achievements || [])
        .filter((a: any) => a && a.achievementId)
        .map((a: any) => a.achievementId.toString());

      for (const ach of achievements) {
        if (earned.includes(ach._id.toString())) continue;
        
        let unlock = false;
        switch (ach.code) {
          case 'FIRST_REPORT':
            if (profile.stats?.issuesReported >= 1) unlock = true;
            break;
          case 'FIRST_VERIFICATION':
            if (profile.stats?.issuesVerified >= 1) unlock = true;
            break;
          case 'QUIZ_BEGINNER':
            if (profile.stats?.quizzesCompleted >= 1) unlock = true;
            break;
          case 'QUIZ_MASTER':
            if (profile.stats?.quizzesCompleted >= 10) unlock = true;
            break;
          case 'TOP_VERIFIER':
            if (profile.stats?.issuesVerified >= 50) unlock = true;
            break;
        }

        if (unlock) {
          if (!profile.achievements) profile.achievements = [];
          profile.achievements.push({ achievementId: ach._id });
          profile.xp += ach.xpReward;
          profile.monthlyLeaderboardScore += ach.xpReward;
          profile.lifetimeLeaderboardScore += ach.xpReward;
        }
      }
      await profile.save();
    } catch (e) {
      console.error('Error evaluating achievements', e);
    }
  },

  async evaluateBadges(profile: any) {
    if (!isUsingMongo) return;
    try {
      await this.ensureSeeded();
      const badges = await BadgeModel.find({});
      const earned = (profile.badges || [])
        .filter((b: any) => b && b.badgeId)
        .map((b: any) => b.badgeId.toString());

      for (const badge of badges) {
        if (earned.includes(badge._id.toString())) continue;

        let unlock = false;
        if (badge.name === 'Active Verifier') unlock = true;
        if (badge.name === 'Quiz Champion' && profile.stats?.quizzesCompleted >= 20) unlock = true;
        if (badge.name === 'Top Verifier' && profile.stats?.issuesVerified >= 100) unlock = true;
        if (badge.name === 'Community Verifier' && profile.stats?.issuesVerified >= 5) unlock = true;
        if (badge.name === 'Issue Resolver' && (profile.stats?.issuesReported >= 5 || profile.stats?.resolutionsVerified >= 5)) unlock = true;

        if (unlock) {
          if (!profile.badges) profile.badges = [];
          profile.badges.push({ badgeId: badge._id });
        }
      }
      await profile.save();
    } catch (e) {
      console.error('Error evaluating badges', e);
    }
  }
};
