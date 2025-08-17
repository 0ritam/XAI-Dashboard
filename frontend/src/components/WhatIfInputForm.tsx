import React, { useState, useCallback, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { debounce } from 'lodash';
import {
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Box,
  FormControlLabel,
  Switch,
  Paper,
  Collapse,
  IconButton,
  Stack,
  Chip,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  TrendingUp,
  TrendingDown,
  Remove,
} from '@mui/icons-material';
import type { StudentInput } from '../types';
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

// Validation schema (same as StudentInputForm)
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

interface WhatIfInputFormProps {
  originalData: StudentInput;
  onDataChange: (data: StudentInput, changedFields: string[]) => void;
  isLoading: boolean;
  changedFields: string[];
}

const WhatIfInputForm: React.FC<WhatIfInputFormProps> = ({
  originalData,
  onDataChange,
  isLoading,
  changedFields,
}) => {
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    academic: true,
    engagement: false,
    assessment: false,
  });

  const {
    control,
    watch,
    formState: { errors },
    setValue,
    getValues,
  } = useForm<StudentInput>({
    resolver: yupResolver(validationSchema),
    defaultValues: originalData,
  });

  // Debounced function to handle data changes
  const debouncedOnChange = useCallback(
    debounce((data: StudentInput, changed: string[]) => {
      onDataChange(data, changed);
    }, 500),
    [onDataChange]
  );

  // Watch all form values
  const formData = watch();

  // Track changed fields
  useEffect(() => {
    const changed: string[] = [];
    Object.keys(formData).forEach(key => {
      if (formData[key as keyof StudentInput] !== originalData[key as keyof StudentInput]) {
        changed.push(key);
      }
    });
    debouncedOnChange(formData, changed);
  }, [formData, originalData, debouncedOnChange]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const resetField = (fieldName: keyof StudentInput) => {
    setValue(fieldName, originalData[fieldName]);
  };

  const getFieldChangeIcon = (fieldName: string) => {
    if (!changedFields.includes(fieldName)) return null;
    
    const currentValue = getValues(fieldName as keyof StudentInput);
    const originalValue = originalData[fieldName as keyof StudentInput];
    
    if (typeof currentValue === 'number' && typeof originalValue === 'number') {
      if (currentValue > originalValue) return <TrendingUp color="success" fontSize="small" />;
      if (currentValue < originalValue) return <TrendingDown color="error" fontSize="small" />;
    }
    return <Remove color="warning" fontSize="small" />;
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

  const FieldWrapper = ({ 
    fieldName, 
    children 
  }: { 
    fieldName: string; 
    children: React.ReactNode;
  }) => (
    <Box sx={{ position: 'relative' }}>
      {children}
      {changedFields.includes(fieldName) && (
        <Box
          sx={{
            position: 'absolute',
            top: -8,
            right: -8,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          {getFieldChangeIcon(fieldName)}
          <Chip
            size="small"
            label="Changed"
            color="primary"
            variant="outlined"
            sx={{ fontSize: '0.7rem', height: 20 }}
            onDelete={() => resetField(fieldName as keyof StudentInput)}
          />
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ opacity: isLoading ? 0.6 : 1, transition: 'opacity 0.3s' }}>
      <Stack spacing={3}>
        {/* Basic Information Section */}
        <Paper sx={{ p: 2, borderLeft: changedFields.some(f => ['id_student', 'code_module', 'code_presentation', 'gender', 'age_band', 'region'].includes(f)) ? '4px solid #2196f3' : 'none' }}>
          <SectionHeader 
            title="Basic Information" 
            section="basic" 
            description="Student demographics and course details"
          />
          <Collapse in={expandedSections.basic}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <FieldWrapper fieldName="id_student">
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
                </FieldWrapper>
                <FieldWrapper fieldName="code_module">
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
                </FieldWrapper>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <FieldWrapper fieldName="code_presentation">
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
                </FieldWrapper>
                <FieldWrapper fieldName="gender">
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
                </FieldWrapper>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <FieldWrapper fieldName="age_band">
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
                </FieldWrapper>
                <FieldWrapper fieldName="region">
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
                </FieldWrapper>
              </Box>
            </Box>
          </Collapse>
        </Paper>

        {/* Academic Information Section */}
        <Paper sx={{ p: 2, borderLeft: changedFields.some(f => ['highest_education', 'imd_band', 'disability', 'studied_credits', 'num_of_prev_attempts', 'completed_course', 'withdrawal_status'].includes(f)) ? '4px solid #4caf50' : 'none' }}>
          <SectionHeader 
            title="Academic Information" 
            section="academic" 
            description="Education background and course status"
          />
          <Collapse in={expandedSections.academic}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <FieldWrapper fieldName="highest_education">
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
                </FieldWrapper>
                <FieldWrapper fieldName="imd_band">
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
                </FieldWrapper>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <FieldWrapper fieldName="disability">
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
                </FieldWrapper>
                <FieldWrapper fieldName="studied_credits">
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
                </FieldWrapper>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <FieldWrapper fieldName="num_of_prev_attempts">
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
                </FieldWrapper>
                <Box sx={{ flex: '1 1 300px', minWidth: 300, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <FieldWrapper fieldName="completed_course">
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
                  </FieldWrapper>
                  <FieldWrapper fieldName="withdrawal_status">
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
                  </FieldWrapper>
                </Box>
              </Box>
            </Box>
          </Collapse>
        </Paper>

        {/* Engagement Metrics Section */}
        <Paper sx={{ p: 2, borderLeft: changedFields.some(f => ['total_clicks', 'avg_clicks_per_session', 'active_days', 'daily_engagement_rate'].includes(f)) ? '4px solid #ff9800' : 'none' }}>
          <SectionHeader 
            title="Engagement Metrics" 
            section="engagement" 
            description="Student interaction and participation data"
          />
          <Collapse in={expandedSections.engagement}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <FieldWrapper fieldName="total_clicks">
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
                </FieldWrapper>
                <FieldWrapper fieldName="avg_clicks_per_session">
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
                </FieldWrapper>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <FieldWrapper fieldName="active_days">
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
                </FieldWrapper>
                <FieldWrapper fieldName="daily_engagement_rate">
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
                </FieldWrapper>
              </Box>
            </Box>
          </Collapse>
        </Paper>

        {/* Assessment Performance Section */}
        <Paper sx={{ p: 2, borderLeft: changedFields.some(f => ['avg_assessment_score', 'score_consistency', 'total_assessments', 'banked_assessments'].includes(f)) ? '4px solid #9c27b0' : 'none' }}>
          <SectionHeader 
            title="Assessment Performance" 
            section="assessment" 
            description="Test scores and submission patterns"
          />
          <Collapse in={expandedSections.assessment}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <FieldWrapper fieldName="avg_assessment_score">
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
                </FieldWrapper>
                <FieldWrapper fieldName="score_consistency">
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
                </FieldWrapper>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <FieldWrapper fieldName="total_assessments">
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
                </FieldWrapper>
                <FieldWrapper fieldName="banked_assessments">
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
                </FieldWrapper>
              </Box>
            </Box>
          </Collapse>
        </Paper>
      </Stack>
    </Box>
  );
};

export default WhatIfInputForm;
