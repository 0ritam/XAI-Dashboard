import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Paper,
  Stack,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Warning,
  School,
} from '@mui/icons-material';
import type { PredictionResponse } from '../types';

interface PredictionCardProps {
  prediction: PredictionResponse;
  loading?: boolean;
}

const PredictionCard: React.FC<PredictionCardProps> = ({ prediction, loading = false }) => {
  const getPredictionIcon = (pred: string) => {
    switch (pred) {
      case 'Distinction':
        return <School sx={{ color: '#4caf50' }} />;
      case 'Pass':
        return <CheckCircle sx={{ color: '#2196f3' }} />;
      case 'Fail':
        return <Cancel sx={{ color: '#f44336' }} />;
      case 'Withdrawn':
        return <Warning sx={{ color: '#ff9800' }} />;
      default:
        return null;
    }
  };

  const getPredictionColor = (pred: string) => {
    switch (pred) {
      case 'Distinction':
        return '#4caf50';
      case 'Pass':
        return '#2196f3';
      case 'Fail':
        return '#f44336';
      case 'Withdrawn':
        return '#ff9800';
      default:
        return '#757575';
    }
  };

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  if (loading) {
    return (
      <Card sx={{ mt: 2, mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Predicting...</Typography>
          </Box>
          <LinearProgress sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Analyzing student data and generating prediction...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mt: 2, mb: 2, border: `2px solid ${getPredictionColor(prediction.prediction)}` }}>
      <CardContent>
        {/* Header with prediction result */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          {getPredictionIcon(prediction.prediction)}
          <Box sx={{ ml: 2 }}>
            <Typography variant="h5" component="div">
              Prediction: {prediction.prediction}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Student ID: {prediction.student_id}
            </Typography>
          </Box>
          <Box sx={{ ml: 'auto' }}>
            <Chip
              label={`${formatPercentage(prediction.confidence)} Confidence`}
              color="primary"
              variant="outlined"
              sx={{
                fontWeight: 'bold',
                backgroundColor: getPredictionColor(prediction.prediction),
                color: 'white',
                '& .MuiChip-label': { color: 'white' }
              }}
            />
          </Box>
        </Box>

        {/* Probability breakdown */}
        <Typography variant="h6" gutterBottom>
          Outcome Probabilities
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {Object.entries(prediction.probabilities).map(([outcome, probability]) => (
            <Paper key={outcome} sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                {getPredictionIcon(outcome)}
                <Typography variant="body1" sx={{ ml: 1, fontWeight: 'medium' }}>
                  {outcome}
                </Typography>
                <Typography variant="body2" sx={{ ml: 'auto', fontWeight: 'bold' }}>
                  {formatPercentage(probability)}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={probability * 100}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#e0e0e0',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: getPredictionColor(outcome),
                    borderRadius: 4,
                  },
                }}
              />
            </Paper>
          ))}
        </Box>

        {/* Summary */}
        <Box sx={{ mt: 3, p: 2, backgroundColor: '#f8f9fa', borderRadius: 1 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="body2" color="text.secondary">
              <strong>Model Confidence:</strong> {formatPercentage(prediction.confidence)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Most Likely:</strong> {prediction.prediction}
            </Typography>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PredictionCard;
