import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Tabs,
  Tab,
  Paper,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
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
import type { ExplanationResponse, FeatureImportance } from '../types';

interface ExplanationChartProps {
  explanation: ExplanationResponse | null;
  loading?: boolean;
  error?: string | null;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`explanation-tabpanel-${index}`}
      aria-labelledby={`explanation-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const ExplanationChart: React.FC<ExplanationChartProps> = ({ 
  explanation, 
  loading = false, 
  error = null 
}) => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Prepare data for SHAP chart
  const prepareSHAPData = () => {
    if (!explanation?.shap_values) return [];
    
    return Object.entries(explanation.shap_values)
      .map(([feature, value]) => ({
        feature: feature.replace(/_/g, ' ').toUpperCase(),
        value: Number(value),
        absValue: Math.abs(Number(value)),
      }))
      .sort((a, b) => b.absValue - a.absValue)
      .slice(0, 10); // Top 10 features
  };

  // Prepare data for LIME chart
  const prepareLIMEData = () => {
    if (!explanation?.lime_explanation?.lime?.top_features) return [];
    
    return Object.entries(explanation.lime_explanation.lime.top_features)
      .map(([feature, value]) => ({
        feature: feature.replace(/_/g, ' ').toUpperCase(),
        value: Number(value),
        absValue: Math.abs(Number(value)),
      }))
      .sort((a, b) => b.absValue - a.absValue)
      .slice(0, 10); // Top 10 features
  };

  // Prepare feature importance data
  const prepareFeatureImportanceData = () => {
    if (!explanation?.feature_importance) return [];
    
    return explanation.feature_importance
      .slice(0, 10) // Top 10 features
      .map((item: FeatureImportance) => ({
        feature: item.feature.replace(/_/g, ' ').toUpperCase(),
        importance: item.importance,
        direction: item.direction,
        shap_value: item.shap_value,
        lime_value: item.lime_value,
      }));
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Paper sx={{ p: 2, maxWidth: 300 }}>
          <Typography variant="subtitle2" gutterBottom>
            {label}
          </Typography>
          <Typography variant="body2">
            <strong>Impact:</strong> {payload[0].value.toFixed(4)}
          </Typography>
          {data.direction && (
            <Chip
              label={data.direction}
              size="small"
              color={data.direction === 'positive' ? 'success' : 'error'}
              sx={{ mt: 1 }}
            />
          )}
        </Paper>
      );
    }
    return null;
  };

  // Get bar color based on value
  const getBarColor = (value: number) => {
    return value >= 0 ? '#4caf50' : '#f44336';
  };

  if (loading) {
    return (
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
            <CircularProgress sx={{ mr: 2 }} />
            <Typography variant="h6">Generating Explanations...</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Analyzing feature contributions with SHAP and LIME...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6">Explanation Error</Typography>
            <Typography variant="body2">{error}</Typography>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!explanation) {
    return null;
  }

  const shapData = prepareSHAPData();
  const limeData = prepareLIMEData();
  const featureImportanceData = prepareFeatureImportanceData();

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Prediction Explanations
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Understanding why the model made this prediction for Student {explanation.student_id}
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="explanation tabs">
            <Tab label="Feature Importance" />
            <Tab label="SHAP Values" />
            <Tab label="LIME Analysis" />
          </Tabs>
        </Box>

        {/* Feature Importance Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Top Feature Contributions
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Combined SHAP and LIME analysis showing the most important features
              </Typography>
            </Box>
            <Box>
              {featureImportanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={featureImportanceData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
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
                    <Bar dataKey="importance" radius={[4, 4, 0, 0]}>
                      {featureImportanceData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.direction === 'positive' ? '#4caf50' : '#f44336'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Alert severity="info">No feature importance data available</Alert>
              )}
            </Box>
          </Box>
        </TabPanel>

        {/* SHAP Values Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                SHAP Feature Contributions
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                SHAP values show how each feature pushes the prediction above or below the expected value
              </Typography>
            </Box>
            <Box>
              {shapData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={shapData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
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
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {shapData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getBarColor(entry.value)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Alert severity="warning">SHAP explanations not available</Alert>
              )}
            </Box>
          </Box>
        </TabPanel>

        {/* LIME Analysis Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                LIME Local Explanation
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                LIME explains individual predictions by learning locally around the prediction
              </Typography>
            </Box>
            {explanation.lime_explanation?.lime?.intercept !== undefined && (
              <Box>
                <Paper sx={{ p: 2, mb: 2, backgroundColor: '#f5f5f5' }}>
                  <Typography variant="body2">
                    <strong>Base Prediction:</strong> {explanation.lime_explanation.lime.intercept.toFixed(4)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Local Prediction:</strong> {explanation.lime_explanation.lime.local_prediction.toFixed(4)}
                  </Typography>
                </Paper>
              </Box>
            )}
            <Box>
              {limeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={limeData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
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
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {limeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getBarColor(entry.value)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Alert severity="warning">LIME explanations not available</Alert>
              )}
            </Box>
          </Box>
        </TabPanel>
      </CardContent>
    </Card>
  );
};

export default ExplanationChart;
