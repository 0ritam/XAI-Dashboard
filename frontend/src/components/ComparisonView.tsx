import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Chip,
  Stack,
  LinearProgress,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Cancel,
  Warning,
  School,
  ArrowForward,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { PredictionResponse, ExplanationResponse } from '../types';

interface ComparisonViewProps {
  originalPrediction: PredictionResponse | null;
  modifiedPrediction: PredictionResponse | null;
  originalExplanation: ExplanationResponse | null;
  modifiedExplanation: ExplanationResponse | null;
  changedFields: string[];
  isLoading: boolean;
}

const ComparisonView: React.FC<ComparisonViewProps> = ({
  originalPrediction,
  modifiedPrediction,
  originalExplanation,
  modifiedExplanation,
  changedFields,
  isLoading,
}) => {
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

  // Prepare comparison data for SHAP chart
  const getComparisonData = () => {
    if (!originalExplanation?.shap_values || !modifiedExplanation?.shap_values) return [];

    const data: any[] = [];
    const originalShap = originalExplanation.shap_values;
    const modifiedShap = modifiedExplanation.shap_values;

    // Get all unique features
    const allFeatures = new Set([...Object.keys(originalShap), ...Object.keys(modifiedShap)]);

    allFeatures.forEach(feature => {
      const originalValue = originalShap[feature] || 0;
      const modifiedValue = modifiedShap[feature] || 0;
      const change = modifiedValue - originalValue;
      
      data.push({
        feature: feature.replace(/_/g, ' ').toUpperCase(),
        original: Number(originalValue),
        modified: Number(modifiedValue),
        change: Number(change),
        isChanged: changedFields.includes(feature),
      });
    });

    // Sort by absolute change value, show top 10
    return data
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 10);
  };

  const comparisonData = getComparisonData();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Paper sx={{ p: 2, maxWidth: 300 }}>
          <Typography variant="subtitle2" gutterBottom>
            {label}
          </Typography>
          <Typography variant="body2">
            <strong>Original:</strong> {data.original.toFixed(4)}
          </Typography>
          <Typography variant="body2">
            <strong>Modified:</strong> {data.modified.toFixed(4)}
          </Typography>
          <Typography variant="body2" color={data.change >= 0 ? 'success.main' : 'error.main'}>
            <strong>Change:</strong> {data.change >= 0 ? '+' : ''}{data.change.toFixed(4)}
          </Typography>
          {data.isChanged && (
            <Chip
              label="User Modified"
              size="small"
              color="primary"
              sx={{ mt: 1 }}
            />
          )}
        </Paper>
      );
    }
    return null;
  };

  if (!originalPrediction && !modifiedPrediction) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Start making changes to see predictions and comparisons
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={3}>
      {/* Prediction Comparison */}
      {originalPrediction && modifiedPrediction && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Prediction Comparison
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {/* Original Prediction */}
            <Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
              <Card sx={{ border: `2px solid ${getPredictionColor(originalPrediction.prediction)}` }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {getPredictionIcon(originalPrediction.prediction)}
                    <Box sx={{ ml: 2 }}>
                      <Typography variant="h6">Original</Typography>
                      <Typography variant="h5" color={getPredictionColor(originalPrediction.prediction)}>
                        {originalPrediction.prediction}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Confidence: {formatPercentage(originalPrediction.confidence)}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Stack spacing={1}>
                    {Object.entries(originalPrediction.probabilities).map(([outcome, probability]) => (
                      <Box key={outcome}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2">{outcome}</Typography>
                          <Typography variant="body2">{formatPercentage(probability)}</Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={probability * 100}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: '#e0e0e0',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: getPredictionColor(outcome),
                              borderRadius: 3,
                            },
                          }}
                        />
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Box>

            {/* Arrow */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 100 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <ArrowForward fontSize="large" color="primary" />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {changedFields.length} changes
                </Typography>
              </Box>
            </Box>

            {/* Modified Prediction */}
            <Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
              <Card sx={{ 
                border: `2px solid ${getPredictionColor(modifiedPrediction.prediction)}`,
                opacity: isLoading ? 0.6 : 1,
                transition: 'opacity 0.3s'
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {getPredictionIcon(modifiedPrediction.prediction)}
                    <Box sx={{ ml: 2 }}>
                      <Typography variant="h6">Modified</Typography>
                      <Typography variant="h5" color={getPredictionColor(modifiedPrediction.prediction)}>
                        {modifiedPrediction.prediction}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Confidence: {formatPercentage(modifiedPrediction.confidence)}
                      </Typography>
                    </Box>
                    {originalPrediction.prediction !== modifiedPrediction.prediction && (
                      <Chip
                        label="Changed!"
                        color="warning"
                        size="small"
                        sx={{ ml: 'auto' }}
                      />
                    )}
                  </Box>
                  
                  <Stack spacing={1}>
                    {Object.entries(modifiedPrediction.probabilities).map(([outcome, probability]) => {
                      const originalProb = originalPrediction.probabilities[outcome] || 0;
                      const change = probability - originalProb;
                      
                      return (
                        <Box key={outcome}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2">{outcome}</Typography>
                              {Math.abs(change) > 0.01 && (
                                <>
                                  {change > 0 ? (
                                    <TrendingUp fontSize="small" color="success" />
                                  ) : (
                                    <TrendingDown fontSize="small" color="error" />
                                  )}
                                  <Typography 
                                    variant="caption" 
                                    color={change > 0 ? 'success.main' : 'error.main'}
                                  >
                                    {change > 0 ? '+' : ''}{formatPercentage(change)}
                                  </Typography>
                                </>
                              )}
                            </Box>
                            <Typography variant="body2">{formatPercentage(probability)}</Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={probability * 100}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: '#e0e0e0',
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: getPredictionColor(outcome),
                                borderRadius: 3,
                              },
                            }}
                          />
                        </Box>
                      );
                    })}
                  </Stack>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </Paper>
      )}

      {/* SHAP Comparison Chart */}
      {comparisonData.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Feature Impact Comparison
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Changes in SHAP values show how modifications affect feature importance
          </Typography>
          
          <Box sx={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="feature" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="change" radius={[4, 4, 0, 0]}>
                  {comparisonData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.isChanged ? '#ff9800' : (entry.change >= 0 ? '#4caf50' : '#f44336')}
                      opacity={entry.isChanged ? 1 : 0.7}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
          
          <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip
              icon={<TrendingUp />}
              label="Positive Impact"
              sx={{ backgroundColor: '#4caf50', color: 'white' }}
              size="small"
            />
            <Chip
              icon={<TrendingDown />}
              label="Negative Impact"
              sx={{ backgroundColor: '#f44336', color: 'white' }}
              size="small"
            />
            <Chip
              label="User Modified Feature"
              sx={{ backgroundColor: '#ff9800', color: 'white' }}
              size="small"
            />
          </Box>
        </Paper>
      )}

      {/* Changed Fields Summary */}
      {changedFields.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Modified Fields ({changedFields.length})
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {changedFields.map(field => (
              <Chip
                key={field}
                label={field.replace(/_/g, ' ')}
                variant="outlined"
                color="primary"
                size="small"
              />
            ))}
          </Box>
        </Paper>
      )}
    </Stack>
  );
};

export default ComparisonView;
