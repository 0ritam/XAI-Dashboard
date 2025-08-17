// Types for the XAI Student Performance Predictor

export interface StudentInput {
  id_student: number;
  code_module: string;
  code_presentation: string;
  gender: 'M' | 'F';
  region: string;
  highest_education: string;
  imd_band: string;
  age_band: string;
  num_of_prev_attempts: number;
  studied_credits: number;
  disability: 'Y' | 'N';
  completed_course: boolean;
  withdrawal_status: boolean;
  total_clicks: number;
  avg_clicks_per_session: number;
  click_variability: number;
  total_sessions: number;
  first_access_day: number;
  last_access_day: number;
  active_days: number;
  engagement_duration: number;
  daily_engagement_rate: number;
  avg_assessment_score: number;
  score_consistency: number;
  total_assessments: number;
  first_submission: number;
  last_submission: number;
  banked_assessments: number;
}

export interface PredictionResponse {
  prediction: 'Distinction' | 'Pass' | 'Fail' | 'Withdrawn';
  probabilities: Record<string, number>;
  confidence: number;
  student_id: number;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  direction: 'positive' | 'negative';
  shap_value: number;
  lime_value: number;
}

export interface ExplanationResponse {
  student_id: number;
  prediction: 'Distinction' | 'Pass' | 'Fail' | 'Withdrawn';
  shap_values: Record<string, number>;
  lime_explanation: {
    shap: Record<string, number>;
    lime: {
      top_features: Record<string, number>;
      intercept: number;
      local_prediction: number;
    };
    plots: {
      shap: Record<string, string>;
      lime: Record<string, string>;
    };
  };
  feature_importance: FeatureImportance[];
}

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  version: string;
  timestamp: string;
}

// Form field options based on the notebook data
export const GENDER_OPTIONS = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' }
];

export const AGE_BAND_OPTIONS = [
  { value: '0-35', label: '0-35 years' },
  { value: '35-55', label: '35-55 years' },
  { value: '55<=', label: '55+ years' }
];

export const REGION_OPTIONS = [
  { value: 'East Anglian Region', label: 'East Anglian Region' },
  { value: 'Scotland', label: 'Scotland' },
  { value: 'North Region', label: 'North Region' },
  { value: 'South East Region', label: 'South East Region' },
  { value: 'London Region', label: 'London Region' },
  { value: 'South West Region', label: 'South West Region' },
  { value: 'Wales', label: 'Wales' },
  { value: 'West Midlands Region', label: 'West Midlands Region' },
  { value: 'East Midlands Region', label: 'East Midlands Region' },
  { value: 'Yorkshire Region', label: 'Yorkshire Region' },
  { value: 'North Western Region', label: 'North Western Region' },
  { value: 'South Region', label: 'South Region' },
  { value: 'Ireland', label: 'Ireland' }
];

export const EDUCATION_OPTIONS = [
  { value: 'Lower Than A Level', label: 'Lower Than A Level' },
  { value: 'A Level or Equivalent', label: 'A Level or Equivalent' },
  { value: 'HE Qualification', label: 'HE Qualification' },
  { value: 'Post Graduate Qualification', label: 'Post Graduate Qualification' }
];

export const IMD_BAND_OPTIONS = [
  { value: '0-10%', label: '0-10%' },
  { value: '10-20%', label: '10-20%' },
  { value: '20-30%', label: '20-30%' },
  { value: '30-40%', label: '30-40%' },
  { value: '40-50%', label: '40-50%' },
  { value: '50-60%', label: '50-60%' },
  { value: '60-70%', label: '60-70%' },
  { value: '70-80%', label: '70-80%' },
  { value: '80-90%', label: '80-90%' },
  { value: '90-100%', label: '90-100%' }
];

export const DISABILITY_OPTIONS = [
  { value: 'Y', label: 'Yes' },
  { value: 'N', label: 'No' }
];

export const CODE_MODULE_OPTIONS = [
  { value: 'AAA', label: 'AAA' },
  { value: 'BBB', label: 'BBB' },
  { value: 'CCC', label: 'CCC' },
  { value: 'DDD', label: 'DDD' },
  { value: 'EEE', label: 'EEE' },
  { value: 'FFF', label: 'FFF' },
  { value: 'GGG', label: 'GGG' }
];

export const CODE_PRESENTATION_OPTIONS = [
  { value: '2013B', label: '2013B' },
  { value: '2013J', label: '2013J' },
  { value: '2014B', label: '2014B' },
  { value: '2014J', label: '2014J' }
];

// Field ranges based on typical data ranges
export const FIELD_RANGES = {
  total_clicks: { min: 0, max: 500, step: 10 },
  avg_clicks_per_session: { min: 0, max: 100, step: 1 },
  click_variability: { min: 0, max: 50, step: 0.5 },
  total_sessions: { min: 0, max: 50, step: 1 },
  first_access_day: { min: -30, max: 30, step: 1 },
  last_access_day: { min: 0, max: 270, step: 1 },
  active_days: { min: 0, max: 180, step: 1 },
  engagement_duration: { min: 0, max: 500, step: 5 },
  daily_engagement_rate: { min: 0, max: 1, step: 0.01 },
  avg_assessment_score: { min: 0, max: 100, step: 1 },
  score_consistency: { min: 0, max: 1, step: 0.01 },
  total_assessments: { min: 0, max: 20, step: 1 },
  first_submission: { min: -30, max: 30, step: 1 },
  last_submission: { min: 0, max: 270, step: 1 },
  banked_assessments: { min: 0, max: 10, step: 1 },
  studied_credits: { min: 30, max: 240, step: 30 },
  num_of_prev_attempts: { min: 0, max: 6, step: 1 }
};
