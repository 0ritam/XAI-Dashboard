import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Box,
  Button,
  FormControlLabel,
  Switch,
  Paper,
  Alert,
  Collapse,
  IconButton,
  Stack,
} from '@mui/material';
import {
  Send as SendIcon,
  Psychology as ExplainIcon,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import type { StudentInput, PredictionResponse, ExplanationResponse } from '../types';
import {
  GENDER_OPTIONS,
  AGE_BAND_OPTIONS,
  REGION_OPTIONS,
  EDUCATION_OPTIONS,
  IMD_BAND_OPTIONS,
  DISABILITY_OPTIONS,
  CODE_MODULE_OPTIONS,
  CODE_PRESENTATION_OPTIONS,
  FIELD_RANGES,
} from '../types';
import { apiService } from '../api';
import PredictionCard from './PredictionCard';
import ExplanationChart from './ExplanationChart';

// Validation schema
const validationSchema = yup.object({
  id_student: yup.number().required('Student ID is required').min(1, 'Student ID must be positive'),
  code_module: yup.string().required('Code module is required'),
  code_presentation: yup.string().required('Code presentation is required'),
  gender: yup.string().oneOf(['M', 'F']).required('Gender is required'),
  region: yup.string().required('Region is required'),
  highest_education: yup.string().required('Highest education is required'),
  imd_band: yup.string().required('IMD band is required'),
  age_band: yup.string().required('Age band is required'),
  num_of_prev_attempts: yup.number().min(0).max(10).required('Previous attempts is required'),
  studied_credits: yup.number().min(30).max(240).required('Studied credits is required'),
  disability: yup.string().oneOf(['Y', 'N']).required('Disability status is required'),
  completed_course: yup.boolean().required('Course completion status is required'),
  withdrawal_status: yup.boolean().required('Withdrawal status is required'),
  total_clicks: yup.number().min(0).required('Total clicks is required'),
  avg_clicks_per_session: yup.number().min(0).required('Average clicks per session is required'),
  click_variability: yup.number().min(0).required('Click variability is required'),
  total_sessions: yup.number().min(0).required('Total sessions is required'),
  first_access_day: yup.number().required('First access day is required'),
  last_access_day: yup.number().min(0).required('Last access day is required'),
  active_days: yup.number().min(0).required('Active days is required'),
  engagement_duration: yup.number().min(0).required('Engagement duration is required'),
  daily_engagement_rate: yup.number().min(0).max(1).required('Daily engagement rate is required'),
  avg_assessment_score: yup.number().min(0).max(100).required('Average assessment score is required'),
  score_consistency: yup.number().min(0).max(1).required('Score consistency is required'),
  total_assessments: yup.number().min(0).required('Total assessments is required'),
  first_submission: yup.number().required('First submission day is required'),
  last_submission: yup.number().min(0).required('Last submission day is required'),
  banked_assessments: yup.number().min(0).required('Banked assessments is required'),
});

const StudentInputForm: React.FC = () => {
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [explanation, setExplanation] = useState<ExplanationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    academic: true,
    engagement: false,
    assessment: false,
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    getValues,
    reset,
  } = useForm<StudentInput>({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      id_student: 12345,
      code_module: 'AAA',
      code_presentation: '2013J',
      gender: 'M',
      region: 'East Anglian Region',
      highest_education: 'HE Qualification',
      imd_band: '90-100%',
      age_band: '35-55',
      num_of_prev_attempts: 0,
      studied_credits: 60,
      disability: 'N',
      completed_course: true,
      withdrawal_status: false,
      total_clicks: 150,
      avg_clicks_per_session: 25,
      click_variability: 12,
      total_sessions: 8,
      first_access_day: 5,
      last_access_day: 45,
      active_days: 25,
      engagement_duration: 120,
      daily_engagement_rate: 0.75,
      avg_assessment_score: 85,
      score_consistency: 0.8,
      total_assessments: 4,
      first_submission: 10,
      last_submission: 40,
      banked_assessments: 1,
    },
  });

  const onSubmit = async (data: StudentInput) => {
    setIsLoading(true);
    setError(null);
    setPrediction(null);
    setExplanation(null);

    try {
      const result = await apiService.predictStudentPerformance(data);
      setPrediction(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prediction failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExplain = async () => {
    if (!prediction) return;

    setIsExplaining(true);
    setError(null);

    try {
      const studentData = getValues();
      const result = await apiService.explainPrediction(studentData);
      setExplanation(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Explanation failed');
    } finally {
      setIsExplaining(false);
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const SectionHeader = ({ 
    title, 
    section, 
    description 
  }: { 
    title: string; 
    section: keyof typeof expandedSections;
    description: string;
  }) => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
        p: 1,
        borderRadius: 1,
        '&:hover': { backgroundColor: '#f5f5f5' },
      }}
      onClick={() => toggleSection(section)}
    >
      <Typography variant="h6" sx={{ flexGrow: 1 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
        {description}
      </Typography>
      <IconButton size="small">
        {expandedSections[section] ? <ExpandLess /> : <ExpandMore />}
      </IconButton>
    </Box>
  );

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
        Student Performance Predictor
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          Fill in the student information below to predict their academic performance. 
          Use the sliders and dropdowns to adjust values, then click "Predict" to see the results.
        </Typography>
      </Alert>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={3}>
          {/* Basic Information Section */}
          <Box>
            <Paper sx={{ p: 2 }}>
              <SectionHeader 
                title="Basic Information" 
                section="basic" 
                description="Student demographics and course details"
              />
              <Collapse in={expandedSections.basic}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                      <Controller
                        name="id_student"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="Student ID"
                            type="number"
                            fullWidth
                            error={!!errors.id_student}
                            helperText={errors.id_student?.message}
                          />
                        )}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                      <Controller
                        name="code_module"
                        control={control}
                        render={({ field }) => (
                          <FormControl fullWidth error={!!errors.code_module}>
                            <InputLabel>Code Module</InputLabel>
                            <Select {...field} label="Code Module">
                              {CODE_MODULE_OPTIONS.map(option => (
                                <MenuItem key={option.value} value={option.value}>
                                  {option.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                      <Controller
                        name="code_presentation"
                        control={control}
                        render={({ field }) => (
                          <FormControl fullWidth error={!!errors.code_presentation}>
                            <InputLabel>Code Presentation</InputLabel>
                            <Select {...field} label="Code Presentation">
                              {CODE_PRESENTATION_OPTIONS.map(option => (
                                <MenuItem key={option.value} value={option.value}>
                                  {option.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                      <Controller
                        name="gender"
                        control={control}
                        render={({ field }) => (
                          <FormControl fullWidth error={!!errors.gender}>
                            <InputLabel>Gender</InputLabel>
                            <Select {...field} label="Gender">
                              {GENDER_OPTIONS.map(option => (
                                <MenuItem key={option.value} value={option.value}>
                                  {option.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                      <Controller
                        name="age_band"
                        control={control}
                        render={({ field }) => (
                          <FormControl fullWidth error={!!errors.age_band}>
                            <InputLabel>Age Band</InputLabel>
                            <Select {...field} label="Age Band">
                              {AGE_BAND_OPTIONS.map(option => (
                                <MenuItem key={option.value} value={option.value}>
                                  {option.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                      <Controller
                        name="region"
                        control={control}
                        render={({ field }) => (
                          <FormControl fullWidth error={!!errors.region}>
                            <InputLabel>Region</InputLabel>
                            <Select {...field} label="Region">
                              {REGION_OPTIONS.map(option => (
                                <MenuItem key={option.value} value={option.value}>
                                  {option.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      />
                    </Box>
                  </Box>
                </Box>
              </Collapse>
            </Paper>
          </Box>

          {/* Academic Information Section */}
          <Box>
            <Paper sx={{ p: 2 }}>
              <SectionHeader 
                title="Academic Information" 
                section="academic" 
                description="Education background and course status"
              />
              <Collapse in={expandedSections.academic}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                      <Controller
                        name="highest_education"
                        control={control}
                        render={({ field }) => (
                          <FormControl fullWidth error={!!errors.highest_education}>
                            <InputLabel>Highest Education</InputLabel>
                            <Select {...field} label="Highest Education">
                              {EDUCATION_OPTIONS.map(option => (
                                <MenuItem key={option.value} value={option.value}>
                                  {option.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                      <Controller
                        name="imd_band"
                        control={control}
                        render={({ field }) => (
                          <FormControl fullWidth error={!!errors.imd_band}>
                            <InputLabel>IMD Band</InputLabel>
                            <Select {...field} label="IMD Band">
                              {IMD_BAND_OPTIONS.map(option => (
                                <MenuItem key={option.value} value={option.value}>
                                  {option.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                      <Controller
                        name="disability"
                        control={control}
                        render={({ field }) => (
                          <FormControl fullWidth error={!!errors.disability}>
                            <InputLabel>Disability</InputLabel>
                            <Select {...field} label="Disability">
                              {DISABILITY_OPTIONS.map(option => (
                                <MenuItem key={option.value} value={option.value}>
                                  {option.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                      <Controller
                        name="studied_credits"
                        control={control}
                        render={({ field }) => (
                          <Box>
                            <Typography gutterBottom>
                              Studied Credits: {field.value}
                            </Typography>
                            <Slider
                              {...field}
                              min={FIELD_RANGES.studied_credits.min}
                              max={FIELD_RANGES.studied_credits.max}
                              step={FIELD_RANGES.studied_credits.step}
                              marks
                              valueLabelDisplay="auto"
                            />
                          </Box>
                        )}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                      <Controller
                        name="num_of_prev_attempts"
                        control={control}
                        render={({ field }) => (
                          <Box>
                            <Typography gutterBottom>
                              Previous Attempts: {field.value}
                            </Typography>
                            <Slider
                              {...field}
                              min={FIELD_RANGES.num_of_prev_attempts.min}
                              max={FIELD_RANGES.num_of_prev_attempts.max}
                              step={FIELD_RANGES.num_of_prev_attempts.step}
                              marks
                              valueLabelDisplay="auto"
                            />
                          </Box>
                        )}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 300px', minWidth: 300, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Controller
                        name="completed_course"
                        control={control}
                        render={({ field }) => (
                          <FormControlLabel
                            control={<Switch {...field} checked={field.value} />}
                            label="Completed Course"
                          />
                        )}
                      />
                      <Controller
                        name="withdrawal_status"
                        control={control}
                        render={({ field }) => (
                          <FormControlLabel
                            control={<Switch {...field} checked={field.value} />}
                            label="Withdrawal Status"
                          />
                        )}
                      />
                    </Box>
                  </Box>
                </Box>
              </Collapse>
            </Paper>
          </Box>

          {/* Engagement Metrics Section */}
          <Box>
            <Paper sx={{ p: 2 }}>
              <SectionHeader 
                title="Engagement Metrics" 
                section="engagement" 
                description="Student interaction and participation data"
              />
              <Collapse in={expandedSections.engagement}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                      <Controller
                        name="total_clicks"
                        control={control}
                        render={({ field }) => (
                          <Box>
                            <Typography gutterBottom>
                              Total Clicks: {field.value}
                            </Typography>
                            <Slider
                              {...field}
                              min={FIELD_RANGES.total_clicks.min}
                              max={FIELD_RANGES.total_clicks.max}
                              step={FIELD_RANGES.total_clicks.step}
                              valueLabelDisplay="auto"
                            />
                          </Box>
                        )}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                      <Controller
                        name="avg_clicks_per_session"
                        control={control}
                        render={({ field }) => (
                          <Box>
                            <Typography gutterBottom>
                              Avg Clicks/Session: {field.value}
                            </Typography>
                            <Slider
                              {...field}
                              min={FIELD_RANGES.avg_clicks_per_session.min}
                              max={FIELD_RANGES.avg_clicks_per_session.max}
                              step={FIELD_RANGES.avg_clicks_per_session.step}
                              valueLabelDisplay="auto"
                            />
                          </Box>
                        )}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                      <Controller
                        name="active_days"
                        control={control}
                        render={({ field }) => (
                          <Box>
                            <Typography gutterBottom>
                              Active Days: {field.value}
                            </Typography>
                            <Slider
                              {...field}
                              min={FIELD_RANGES.active_days.min}
                              max={FIELD_RANGES.active_days.max}
                              step={FIELD_RANGES.active_days.step}
                              valueLabelDisplay="auto"
                            />
                          </Box>
                        )}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                      <Controller
                        name="daily_engagement_rate"
                        control={control}
                        render={({ field }) => (
                          <Box>
                            <Typography gutterBottom>
                              Daily Engagement Rate: {(field.value * 100).toFixed(1)}%
                            </Typography>
                            <Slider
                              {...field}
                              min={FIELD_RANGES.daily_engagement_rate.min}
                              max={FIELD_RANGES.daily_engagement_rate.max}
                              step={FIELD_RANGES.daily_engagement_rate.step}
                              valueLabelDisplay="auto"
                              valueLabelFormat={(value) => `${(value * 100).toFixed(1)}%`}
                            />
                          </Box>
                        )}
                      />
                    </Box>
                  </Box>
                </Box>
              </Collapse>
            </Paper>
          </Box>

          {/* Assessment Performance Section */}
          <Box>
            <Paper sx={{ p: 2 }}>
              <SectionHeader 
                title="Assessment Performance" 
                section="assessment" 
                description="Test scores and submission patterns"
              />
              <Collapse in={expandedSections.assessment}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                      <Controller
                        name="avg_assessment_score"
                        control={control}
                        render={({ field }) => (
                          <Box>
                            <Typography gutterBottom>
                              Avg Assessment Score: {field.value}%
                            </Typography>
                            <Slider
                              {...field}
                              min={FIELD_RANGES.avg_assessment_score.min}
                              max={FIELD_RANGES.avg_assessment_score.max}
                              step={FIELD_RANGES.avg_assessment_score.step}
                              valueLabelDisplay="auto"
                              valueLabelFormat={(value) => `${value}%`}
                            />
                          </Box>
                        )}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                      <Controller
                        name="score_consistency"
                        control={control}
                        render={({ field }) => (
                          <Box>
                            <Typography gutterBottom>
                              Score Consistency: {(field.value * 100).toFixed(1)}%
                            </Typography>
                            <Slider
                              {...field}
                              min={FIELD_RANGES.score_consistency.min}
                              max={FIELD_RANGES.score_consistency.max}
                              step={FIELD_RANGES.score_consistency.step}
                              valueLabelDisplay="auto"
                              valueLabelFormat={(value) => `${(value * 100).toFixed(1)}%`}
                            />
                          </Box>
                        )}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                      <Controller
                        name="total_assessments"
                        control={control}
                        render={({ field }) => (
                          <Box>
                            <Typography gutterBottom>
                              Total Assessments: {field.value}
                            </Typography>
                            <Slider
                              {...field}
                              min={FIELD_RANGES.total_assessments.min}
                              max={FIELD_RANGES.total_assessments.max}
                              step={FIELD_RANGES.total_assessments.step}
                              marks
                              valueLabelDisplay="auto"
                            />
                          </Box>
                        )}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                      <Controller
                        name="banked_assessments"
                        control={control}
                        render={({ field }) => (
                          <Box>
                            <Typography gutterBottom>
                              Banked Assessments: {field.value}
                            </Typography>
                            <Slider
                              {...field}
                              min={FIELD_RANGES.banked_assessments.min}
                              max={FIELD_RANGES.banked_assessments.max}
                              step={FIELD_RANGES.banked_assessments.step}
                              marks
                              valueLabelDisplay="auto"
                            />
                          </Box>
                        )}
                      />
                    </Box>
                  </Box>
                </Box>
              </Collapse>
            </Paper>
          </Box>

          {/* Submit Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 2 }}>
            <LoadingButton
              type="submit"
              variant="contained"
              size="large"
              loading={isLoading}
              startIcon={<SendIcon />}
              sx={{ minWidth: 200 }}
            >
              {isLoading ? 'Predicting...' : 'Predict Performance'}
            </LoadingButton>
            
            {prediction && (
              <LoadingButton
                variant="outlined"
                size="large"
                loading={isExplaining}
                startIcon={<ExplainIcon />}
                onClick={handleExplain}
                sx={{ minWidth: 200 }}
              >
                {isExplaining ? 'Explaining...' : 'Explain Prediction'}
              </LoadingButton>
            )}
            
            <Button
              variant="text"
              size="large"
              onClick={() => {
                reset();
                setPrediction(null);
                setExplanation(null);
                setError(null);
              }}
            >
              Reset Form
            </Button>
          </Box>
        </Stack>
      </form>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {/* Results */}
      {prediction && (
        <PredictionCard prediction={prediction} loading={isLoading} />
      )}

      {explanation && (
        <ExplanationChart 
          explanation={explanation} 
          loading={isExplaining} 
          error={error}
        />
      )}
    </Box>
  );
};

export default StudentInputForm;
