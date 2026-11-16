import type {
  AccessibilityFlag,
  GradeThresholds,
  PipelineRulesConfig,
  ScoreBreakdown,
  UxGrade,
} from '../types/ux';

/**
 * Classifies a numeric score (0-100) into Excellent, Good, Fair, or Poor
 * using configurable grade thresholds.
 */
export function calculateGrade(score: number, grades: GradeThresholds): UxGrade {
  if (score >= grades.excellent) return 'Excellent';
  if (score >= grades.good) return 'Good';
  if (score >= grades.fair) return 'Fair';
  return 'Poor';
}

/**
 * Step 4: Scores a valid UX record out of 100 using the configurable formula:
 * (ux_rating / 5) * ratingWeight
 * + (min(featuresCount, 5) / 5) * featuresWeight
 * + (accessibility_flag === 'Yes' ? accessibilityWeight : 0)
 * + (min(languagesCount, 5) / 5) * languagesWeight
 */
export function scoreRecord(
  params: {
    ux_rating: number;
    featuresCount: number;
    accessibility_flag: AccessibilityFlag;
    languagesCount: number;
  },
  config: PipelineRulesConfig
): { ux_score: number; score_breakdown: ScoreBreakdown; grade: UxGrade } {
  const { weights, grades } = config;

  const ratingScore = (params.ux_rating / 5) * weights.ratingWeight;
  const featuresScore = (Math.min(params.featuresCount, 5) / 5) * weights.featuresWeight;
  const accessibilityScore =
    params.accessibility_flag === 'Yes' ? weights.accessibilityWeight : 0;
  const languagesScore = (Math.min(params.languagesCount, 5) / 5) * weights.languagesWeight;

  const rawTotal = ratingScore + featuresScore + accessibilityScore + languagesScore;
  const round1 = (n: number) => Math.round(n * 10) / 10;

  const totalScore = round1(rawTotal);
  const breakdown: ScoreBreakdown = {
    ratingScore: round1(ratingScore),
    featuresScore: round1(featuresScore),
    accessibilityScore: round1(accessibilityScore),
    languagesScore: round1(languagesScore),
    totalScore,
  };

  return {
    ux_score: totalScore,
    score_breakdown: breakdown,
    grade: calculateGrade(totalScore, grades),
  };
}
