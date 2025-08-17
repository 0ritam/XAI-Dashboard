import React, { useState, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Card,
  CardContent,
  Button,
  Alert,
  Chip,
  Stack,
  CircularProgress,
} from '@mui/material';
import {
  Compare,
  Science,
  TrendingUp,
  Lightbulb,
  Refresh,
  AutoAwesome,
} from '@mui/icons-material';
import { debounce } from 'lodash';
import WhatIfInputForm from '../components/WhatIfInputForm';
import ComparisonView from '../components/ComparisonView';
import type { StudentInput, PredictionResponse, ExplanationResponse } from '../types';
import { apiService } from '../api';

const WhatIfAnalysis: React.FC = () => {
  const [originalData, setOriginalData] = useState<StudentInput | null>(null);
  const [originalPrediction, setOriginalPrediction] = useState<PredictionResponse | null>(null);
  const [modifiedPrediction, setModifiedPrediction] = useState<PredictionResponse | null>(null);
  const [originalExplanation, setOriginalExplanation] = useState<ExplanationResponse | null>(null);
  const [modifiedExplanation, setModifiedExplanation] = useState<ExplanationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changedFields, setChangedFields] = useState<string[]>([]);
  const [showComingSoon] = useState(false);

  // Debounced function for making predictions
  const debouncedPredict = useCallback(
    debounce(async (data: StudentInput, isModified: boolean = false) => {
      try {
        const [predictionResponse, explanationResponse] = await Promise.all([
          apiService.predictStudentPerformance(data),
          apiService.explainPrediction(data),
        ]);

        if (isModified) {
          setModifiedPrediction(predictionResponse);
          setModifiedExplanation(explanationResponse);
        } else {
          setOriginalPrediction(predictionResponse);
          setOriginalExplanation(explanationResponse);
          setOriginalData(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    }, 500),
    []
  );

  const handleModifiedDataChange = (data: StudentInput, changedFieldsList: string[]) => {
    setChangedFields(changedFieldsList);
    if (originalData) {
      setIsLoading(true);
      debouncedPredict(data, true);
    }
  };

  const handleReset = () => {
    setOriginalData(null);
    setOriginalPrediction(null);
    setModifiedPrediction(null);
    setOriginalExplanation(null);
    setModifiedExplanation(null);
    setChangedFields([]);
    setError(null);
  };

  const features = [
    {
      icon: <Science />,
      title: 'Batch Analysis',
      description: 'Upload and analyze multiple student profiles simultaneously',
      status: 'Coming Soon',
    },
    {
      icon: <TrendingUp />,
      title: 'Intervention Simulation',
      description: 'Simulate the impact of different educational interventions',
      status: 'Coming Soon',
    },
    {
      icon: <Lightbulb />,
      title: 'Smart Recommendations',
      description: 'AI-powered suggestions for improving student outcomes',
      status: 'Coming Soon',
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header Section */}
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          What-If Analysis
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          Compare scenarios in real-time and understand the impact of different factors
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Chip icon={<Compare />} label="Real-time Comparison" color="primary" />
          <Chip icon={<Science />} label="Feature Impact Analysis" color="secondary" />
          <Chip icon={<TrendingUp />} label="SHAP Explanations" color="success" />
          <Chip icon={<AutoAwesome />} label="Interactive Updates" color="info" />
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 4 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Instructions */}
      {!originalData && (
        <Alert severity="info" sx={{ mb: 4 }}>
          <Typography variant="body2">
            <strong>Getting Started:</strong> Fill out the student information below to establish a baseline prediction. 
            Once you have a baseline, you can modify any field to see real-time comparisons.
          </Typography>
        </Alert>
      )}

      {/* Input Form Section */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h3">
            {originalData ? 'Modify Student Data' : 'Baseline Student Data'}
          </Typography>
          {originalData && (
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleReset}
              color="secondary"
            >
              Reset Analysis
            </Button>
          )}
        </Box>
        
        {originalData ? (
          <WhatIfInputForm
            originalData={originalData}
            onDataChange={handleModifiedDataChange}
            isLoading={isLoading}
            changedFields={changedFields}
          />
        ) : (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                To use What-If Analysis, you first need to create a baseline prediction. 
                Please go to the Dashboard, make a prediction, and then return here.
              </Typography>
            </Alert>
            <Box sx={{ textAlign: 'center' }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => window.location.href = '/dashboard'}
                sx={{ mb: 2 }}
              >
                Go to Dashboard
              </Button>
              <Typography variant="body2" color="text.secondary">
                Once you have a prediction, you can modify student data here to see real-time comparisons
              </Typography>
            </Box>
          </Box>
        )}
      </Paper>

      {/* Comparison Section */}
      {originalData && originalPrediction && modifiedPrediction && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Compare sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h5" component="h3">
              Prediction Comparison
            </Typography>
            {isLoading && (
              <CircularProgress size={24} sx={{ ml: 2 }} />
            )}
          </Box>
          
          <ComparisonView
            originalPrediction={originalPrediction}
            modifiedPrediction={modifiedPrediction}
            originalExplanation={originalExplanation}
            modifiedExplanation={modifiedExplanation}
            changedFields={changedFields}
            isLoading={isLoading}
          />
        </Paper>
      )}

      {/* Coming Soon Features (when no data) */}
      {showComingSoon && !originalData && (
        <Paper sx={{ p: 3, backgroundColor: '#f8f9fa' }}>
          <Typography variant="h5" component="h3" gutterBottom>
            Additional Features Coming Soon
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 3 }}>
            {features.map((feature, index) => (
              <Card key={index} sx={{ maxWidth: 300, opacity: 0.7 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {feature.icon}
                    <Typography variant="h6" component="div" sx={{ ml: 1 }}>
                      {feature.title}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {feature.description}
                  </Typography>
                  <Chip 
                    label={feature.status} 
                    size="small" 
                    color="default" 
                    variant="outlined"
                  />
                </CardContent>
              </Card>
            ))}
          </Box>
        </Paper>
      )}

      {/* Quick Tips */}
      {originalData && (
        <Paper sx={{ p: 3, backgroundColor: '#f0f7ff' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Lightbulb sx={{ mr: 2, color: 'info.main' }} />
            <Typography variant="h6" component="h3">
              Tips for Effective Analysis
            </Typography>
          </Box>
          <Stack spacing={1}>
            <Typography variant="body2">
              • <strong>Small Changes:</strong> Try adjusting one or two features at a time to see their individual impact
            </Typography>
            <Typography variant="body2">
              • <strong>Watch the Colors:</strong> Green indicators show positive changes, red shows negative changes
            </Typography>
            <Typography variant="body2">
              • <strong>SHAP Values:</strong> The impact analysis shows how much each feature contributes to the prediction
            </Typography>
            <Typography variant="body2">
              • <strong>Real-time Updates:</strong> Predictions update automatically as you type (with a small delay)
            </Typography>
          </Stack>
        </Paper>
      )}
    </Container>
  );
};

export default WhatIfAnalysis;
