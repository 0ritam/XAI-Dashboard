import React from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  Stack,
} from '@mui/material';
import {
  Psychology,
  TrendingUp,
  Assessment,
  School,
  Analytics,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import StudentInputForm from '../components/StudentInputForm';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Psychology />,
      title: 'AI Predictions',
      description: 'Get accurate predictions for student performance using advanced XGBoost models',
      color: '#2196f3',
    },
    {
      icon: <Analytics />,
      title: 'Explainable AI',
      description: 'Understand why predictions are made with SHAP and LIME explanations',
      color: '#4caf50',
    },
    {
      icon: <Assessment />,
      title: 'Real-time Analysis',
      description: 'Analyze student engagement patterns and academic performance instantly',
      color: '#ff9800',
    },
    {
      icon: <TrendingUp />,
      title: 'Performance Insights',
      description: 'Discover key factors that influence student success and failure',
      color: '#9c27b0',
    },
  ];

  const stats = [
    { label: 'Prediction Accuracy', value: '94.2%', icon: <TrendingUp /> },
    { label: 'Features Analyzed', value: '29', icon: <Assessment /> },
    { label: 'Model Type', value: 'XGBoost', icon: <Psychology /> },
    { label: 'Explanations', value: 'SHAP + LIME', icon: <Analytics /> },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header Section */}
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          XAI Student Performance Dashboard
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          Predict and explain student academic outcomes with explainable AI
        </Typography>
        
        {/* Stats Cards */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', mb: 4 }}>
          {stats.map((stat, index) => (
            <Card key={index} sx={{ minWidth: 200, textAlign: 'center' }}>
              <CardContent>
                <Avatar
                  sx={{
                    bgcolor: 'primary.main',
                    width: 56,
                    height: 56,
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  {stat.icon}
                </Avatar>
                <Typography variant="h4" component="div" gutterBottom>
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stat.label}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>

      {/* Features Section */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ textAlign: 'center', mb: 4 }}>
          Key Features
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          {features.map((feature, index) => (
            <Card key={index} sx={{ maxWidth: 280, transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
              <CardContent>
                <Avatar
                  sx={{
                    bgcolor: feature.color,
                    width: 48,
                    height: 48,
                    mb: 2,
                  }}
                >
                  {feature.icon}
                </Avatar>
                <Typography variant="h6" component="div" gutterBottom>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {feature.description}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>

      {/* Main Prediction Form */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h4" component="h2" gutterBottom>
            Student Performance Prediction
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Enter student information below to get predictions and explanations
          </Typography>
        </Box>
        <StudentInputForm />
      </Paper>

      {/* Quick Actions */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h5" component="h3" gutterBottom>
          Quick Actions
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<Analytics />}
            onClick={() => navigate('/what-if')}
            sx={{ minWidth: 200 }}
          >
            What-If Analysis
          </Button>
          <Button
            variant="outlined"
            startIcon={<Assessment />}
            onClick={() => window.open('http://localhost:8080/docs', '_blank')}
            sx={{ minWidth: 200 }}
          >
            API Documentation
          </Button>
          <Button
            variant="outlined"
            startIcon={<School />}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            sx={{ minWidth: 200 }}
          >
            Back to Top
          </Button>
        </Stack>
      </Box>

      {/* Information Footer */}
      <Paper sx={{ p: 3, backgroundColor: '#f5f5f5' }}>
        <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', md: 'row' } }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" gutterBottom>
              About the Model
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Our XGBoost model analyzes 29 different features including student demographics, 
              engagement patterns, and academic history to predict performance outcomes with 94.2% accuracy.
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Chip label="XGBoost" size="small" sx={{ mr: 1 }} />
              <Chip label="SHAP" size="small" sx={{ mr: 1 }} />
              <Chip label="LIME" size="small" sx={{ mr: 1 }} />
              <Chip label="29 Features" size="small" />
            </Box>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" gutterBottom>
              Explainable AI
            </Typography>
            <Typography variant="body2" color="text.secondary">
              We use SHAP (SHapley Additive exPlanations) and LIME (Local Interpretable Model-agnostic Explanations) 
              to provide clear insights into why the model made specific predictions.
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Chip label="Feature Importance" size="small" sx={{ mr: 1 }} />
              <Chip label="Local Explanations" size="small" sx={{ mr: 1 }} />
              <Chip label="Global Insights" size="small" />
            </Box>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default Dashboard;
