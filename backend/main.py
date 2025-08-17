import os
import logging
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, Any, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse

# Environment configuration
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
ALLOWED_ORIGINS = [
    "http://localhost:3000",  # React dev server (Create React App)
    "http://localhost:5173",  # Vite dev server
    FRONTEND_URL,  # Custom frontend URL
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

# Import schemas
from schemas.input import StudentInput
from schemas.output import (
    PredictionResponse, 
    ExplanationResponse, 
    HealthResponse, 
    ErrorResponse,
    BatchPredictionRequest,
    BatchPredictionResponse
)

# Import explainers
from explainers.shap_utils import SHAPExplainer
from explainers.lime_utils import LIMEExplainer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Global variables for model components
ml_models = {}

class ModelManager:
    """Manages ML model loading and predictions"""
    
    def __init__(self):
        self.model = None
        self.target_encoder = None
        self.label_encoders = None
        self.feature_names = None
        self.is_loaded = False
        self.shap_explainer = None
        self.lime_explainer = None
        self.training_data = None
    
    def load_models(self):
        """Load all model artifacts at startup"""
        try:
            models_path = "../notebooks/model_artifacts"
            
            # Load XGBoost model
            model_path = os.path.join(models_path, "xgboost_best_model.pkl")
            self.model = joblib.load(model_path)
            logger.info(f"✅ XGBoost model loaded from {model_path}")
            
            # Load target encoder
            target_encoder_path = os.path.join(models_path, "target_encoder.pkl")
            self.target_encoder = joblib.load(target_encoder_path)
            logger.info(f"✅ Target encoder loaded from {target_encoder_path}")
            
            # Load label encoders dictionary
            le_dict_path = os.path.join(models_path, "le_dict.pkl")
            self.label_encoders = joblib.load(le_dict_path)
            logger.info(f"✅ Label encoders loaded from {le_dict_path}")
            
            # Load feature names
            feature_names_path = os.path.join(models_path, "feature_names.pkl")
            self.feature_names = joblib.load(feature_names_path)
            logger.info(f"✅ Feature names loaded: {len(self.feature_names)} features")
            
            self.is_loaded = True
            logger.info("🎉 All models loaded successfully!")
            
            # Initialize explainers
            self._initialize_explainers()
            
        except Exception as e:
            logger.error(f"❌ Failed to load models: {str(e)}")
            raise RuntimeError(f"Model loading failed: {str(e)}")
    
    def _initialize_explainers(self):
        """Initialize SHAP and LIME explainers"""
        try:
            # Load sample training data for LIME
            import pandas as pd
            
            # Create sample data using only the features the model expects
            model_expected_features = [
                'gender', 'age_band', 'highest_education', 'disability', 'region', 
                'total_clicks', 'avg_clicks_per_session', 'active_days', 'daily_engagement_rate', 
                'avg_assessment_score', 'total_assessments', 'studied_credits', 'completed_course', 
                'total_sessions', 'engagement_duration'
            ]
            
            sample_data = {
                'gender': ['M'] * 50 + ['F'] * 50,
                'age_band': ['35-55'] * 100,
                'highest_education': ['HE Qualification'] * 100,
                'disability': ['N'] * 100,
                'region': ['East Anglian Region'] * 100,
                'total_clicks': list(np.random.normal(1000, 300, 100)),
                'avg_clicks_per_session': list(np.random.normal(25, 5, 100)),
                'active_days': list(np.random.randint(30, 70, 100)),
                'daily_engagement_rate': list(np.random.uniform(0.3, 0.9, 100)),
                'avg_assessment_score': list(np.random.normal(70, 15, 100)),
                'total_assessments': list(np.random.randint(5, 12, 100)),
                'studied_credits': [60] * 100,
                'completed_course': [True] * 100,
                'total_sessions': list(np.random.randint(20, 80, 100)),
                'engagement_duration': list(np.random.normal(120, 30, 100)),
                'final_result': ['Pass'] * 100
            }
            
            self.training_data = pd.DataFrame(sample_data)
            
            # Preprocess training data
            processed_training_data = self.preprocess_input_batch(self.training_data)
            
            # Initialize SHAP explainer
            self.shap_explainer = SHAPExplainer(self.model, self.feature_names)
            logger.info("✅ SHAP explainer initialized")
            
            # Initialize LIME explainer
            class_names = list(self.target_encoder.classes_)
            self.lime_explainer = LIMEExplainer(
                self.model, 
                processed_training_data,
                self.feature_names,
                class_names
            )
            logger.info("✅ LIME explainer initialized")
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to initialize explainers: {str(e)}")
            # Don't fail the whole startup if explainers fail
            self.shap_explainer = None
            self.lime_explainer = None
    
    def preprocess_input(self, student_data: StudentInput) -> pd.DataFrame:
        """Preprocess student input for model prediction"""
        try:
            # Convert Pydantic model to dictionary with proper enum handling
            data_dict = student_data.model_dump(by_alias=True)
            
            # Ensure enum values are converted to their string values
            for key, value in data_dict.items():
                if hasattr(value, 'value'):
                    data_dict[key] = value.value
                elif isinstance(value, str) and value.startswith(('Gender.', 'Region.', 'HighestEducation.', 'AgeBand.', 'IMDBand.', 'Disability.')):
                    # Handle cases where enum string representation is passed
                    enum_mapping = {
                        'Gender.MALE': 'M', 'Gender.FEMALE': 'F',
                        'Region.EAST_ANGLIAN': 'East Anglian Region',
                        'HighestEducation.HE_QUALIFICATION': 'HE Qualification',
                        'AgeBand.MIDDLE': '35-55', 'AgeBand.YOUNG': '0-35', 'AgeBand.SENIOR': '55<=',
                        'IMDBand.BAND_90_100': '90-100%',
                        'Disability.NO': 'N', 'Disability.YES': 'Y'
                    }
                    data_dict[key] = enum_mapping.get(value, value)
            
            # Remove target variable if present
            if 'final_result' in data_dict:
                del data_dict['final_result']
            
            # Create DataFrame
            df = pd.DataFrame([data_dict])
            
            # Apply label encoders to categorical features (excluding code_module and code_presentation)
            categorical_features = [
                'gender', 'region', 'highest_education', 'age_band', 'disability'
            ]
            
            for feature in categorical_features:
                if feature in df.columns and feature in self.label_encoders:
                    le = self.label_encoders[feature]
                    try:
                        df[feature] = le.transform(df[feature])
                    except ValueError as e:
                        logger.warning(f"Unknown category for {feature}: {df[feature].iloc[0]}")
                        # For unknown categories, use the most common class (index 0)
                        df[feature] = 0
                elif feature in df.columns:
                    # If no label encoder exists, map common values or use defaults
                    logger.warning(f"No label encoder found for {feature}, using intelligent mapping")
                    if feature == 'imd_band':
                        # Map percentage bands to indices
                        imd_value = str(df[feature].iloc[0])
                        if '90-100' in imd_value:
                            df[feature] = 9
                        elif '80-90' in imd_value:
                            df[feature] = 8
                        elif '70-80' in imd_value:
                            df[feature] = 7
                        elif '60-70' in imd_value:
                            df[feature] = 6
                        elif '50-60' in imd_value:
                            df[feature] = 5
                        elif '40-50' in imd_value:
                            df[feature] = 4
                        elif '30-40' in imd_value:
                            df[feature] = 3
                        elif '20-30' in imd_value:
                            df[feature] = 2
                        elif '10-20' in imd_value:
                            df[feature] = 1
                        else:
                            df[feature] = 0  # 0-10% or unknown
                    else:
                        # For other features, use consistent encoding
                        df[feature] = df[feature].astype(str).apply(lambda x: hash(x) % 100)
            
            # Convert boolean columns to int
            bool_columns = ['completed_course', 'withdrawal_status', 'disability']
            for col in bool_columns:
                if col in df.columns:
                    df[col] = df[col].astype(int)
            
            # Ensure column order matches training data exactly
            # Based on the error message, the model expects these 15 features in this exact order:
            model_expected_features = [
                'gender', 'age_band', 'highest_education', 'disability', 'region', 
                'total_clicks', 'avg_clicks_per_session', 'active_days', 'daily_engagement_rate', 
                'avg_assessment_score', 'total_assessments', 'studied_credits', 'completed_course', 
                'total_sessions', 'engagement_duration'
            ]
            
            available_features = []
            for feature in model_expected_features:
                if feature in df.columns:
                    available_features.append(feature)
                else:
                    logger.warning(f"Required model feature {feature} not found in input data")
            
            df = df[available_features]
            
            # Final check: ensure ALL columns are numeric for XGBoost
            for col in df.columns:
                if df[col].dtype == 'object':
                    logger.warning(f"Converting remaining object column {col} to numeric")
                    df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
            
            logger.info(f"Preprocessed data shape: {df.shape}")
            logger.info(f"Data types: {df.dtypes.to_dict()}")
            return df
            
        except Exception as e:
            logger.error(f"Preprocessing failed: {str(e)}")
            raise ValueError(f"Data preprocessing failed: {str(e)}")
    
    def preprocess_input_batch(self, data: pd.DataFrame) -> pd.DataFrame:
        """Preprocess batch input data for explainers"""
        try:
            df = data.copy()
            
            # Apply label encoders to categorical features
            categorical_features = [
                'code_module', 'code_presentation', 'gender', 'region', 
                'highest_education', 'imd_band', 'age_band', 'disability'
            ]
            
            for feature in categorical_features:
                if feature in df.columns and feature in self.label_encoders:
                    le = self.label_encoders[feature]
                    try:
                        df[feature] = le.transform(df[feature])
                    except ValueError:
                        # Handle unknown categories by replacing with first known class
                        for i, value in enumerate(df[feature]):
                            if value not in le.classes_:
                                df.loc[i, feature] = le.classes_[0]
                        df[feature] = le.transform(df[feature])
                elif feature in df.columns:
                    # If no encoder exists, convert using hash encoding
                    logger.warning(f"No label encoder found for {feature}, using hash encoding")
                    df[feature] = df[feature].astype(str).apply(lambda x: hash(x) % 1000000)
            
            # Convert boolean columns to int
            bool_columns = ['completed_course', 'withdrawal_status', 'disability']
            for col in bool_columns:
                if col in df.columns:
                    if df[col].dtype == 'bool':
                        df[col] = df[col].astype(int)
                    elif df[col].dtype == 'object':
                        # Handle string boolean values
                        df[col] = df[col].map({'Y': 1, 'N': 0, True: 1, False: 0, 'True': 1, 'False': 0})
            
            # Ensure all numeric columns are properly typed
            numeric_columns = [col for col in df.columns if col not in categorical_features + bool_columns]
            for col in numeric_columns:
                if col in df.columns:
                    df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
            
            # Get only the columns that the model expects
            model_expected_features = [
                'gender', 'age_band', 'highest_education', 'disability', 'region', 
                'total_clicks', 'avg_clicks_per_session', 'active_days', 'daily_engagement_rate', 
                'avg_assessment_score', 'total_assessments', 'studied_credits', 'completed_course', 
                'total_sessions', 'engagement_duration'
            ]
            
            available_features = []
            for feature in model_expected_features:
                if feature in df.columns:
                    available_features.append(feature)
                else:
                    logger.warning(f"Required model feature {feature} not found in data, skipping")
            
            # Return only available features
            df = df[available_features]
            
            return df
            
        except Exception as e:
            logger.error(f"Batch preprocessing failed: {str(e)}")
            raise ValueError(f"Batch preprocessing failed: {str(e)}")
    
    def predict(self, processed_data: pd.DataFrame) -> Dict[str, Any]:
        """Make prediction using the loaded model"""
        try:
            # Get prediction probabilities
            probabilities = self.model.predict_proba(processed_data)[0]
            
            # Get class labels
            class_labels = self.target_encoder.classes_
            
            # Create probability dictionary
            prob_dict = {label: float(prob) for label, prob in zip(class_labels, probabilities)}
            
            # Get predicted class
            predicted_class_idx = np.argmax(probabilities)
            predicted_class = class_labels[predicted_class_idx]
            confidence = float(probabilities[predicted_class_idx])
            
            return {
                "prediction": predicted_class,
                "probabilities": prob_dict,
                "confidence": confidence
            }
            
        except Exception as e:
            logger.error(f"Prediction failed: {str(e)}")
            raise ValueError(f"Model prediction failed: {str(e)}")

# Initialize model manager
model_manager = ModelManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    logger.info("🚀 Starting XAI Student Performance API...")
    try:
        model_manager.load_models()
        logger.info("✅ Startup completed successfully")
    except Exception as e:
        logger.error(f"❌ Startup failed: {str(e)}")
        raise
    
    yield
    
    # Shutdown
    logger.info("👋 Shutting down XAI Student Performance API...")

# Create FastAPI app with lifespan events
app = FastAPI(
    title="XAI Student Performance Predictor",
    description="Explainable AI API for predicting student academic performance",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware with environment-based configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Dependency to check if models are loaded
def verify_models_loaded():
    """Dependency to ensure models are loaded before processing requests"""
    if not model_manager.is_loaded:
        raise HTTPException(
            status_code=503,
            detail="Models not loaded. Service unavailable."
        )
    return model_manager

# API Endpoints

@app.get("/", response_class=HTMLResponse)
async def root():
    """Root endpoint with styled API information"""
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>XAI Student Performance Predictor API</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
            }
            
            .container {
                text-align: center;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                padding: 3rem;
                border-radius: 20px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                max-width: 600px;
                width: 90%;
            }
            
            .logo {
                font-size: 3rem;
                margin-bottom: 1rem;
            }
            
            h1 {
                font-size: 2.5rem;
                margin-bottom: 1rem;
                background: linear-gradient(45deg, #fff, #f0f0f0);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            
            .subtitle {
                font-size: 1.2rem;
                margin-bottom: 2rem;
                opacity: 0.9;
            }
            
            .status {
                display: inline-block;
                background: #10b981;
                color: white;
                padding: 0.5rem 1rem;
                border-radius: 50px;
                font-weight: bold;
                margin-bottom: 2rem;
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.7; }
                100% { opacity: 1; }
            }
            
            .links {
                display: flex;
                gap: 1rem;
                justify-content: center;
                flex-wrap: wrap;
                margin-top: 2rem;
            }
            
            .link {
                background: rgba(255, 255, 255, 0.2);
                color: white;
                text-decoration: none;
                padding: 0.8rem 1.5rem;
                border-radius: 10px;
                border: 1px solid rgba(255, 255, 255, 0.3);
                transition: all 0.3s ease;
                font-weight: 500;
            }
            
            .link:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
            }
            
            .features {
                margin-top: 2rem;
                text-align: left;
            }
            
            .feature {
                display: flex;
                align-items: center;
                margin: 0.5rem 0;
                opacity: 0.9;
            }
            
            .feature-icon {
                margin-right: 0.5rem;
                font-size: 1.2rem;
            }
            
            .version {
                position: absolute;
                top: 1rem;
                right: 1rem;
                background: rgba(255, 255, 255, 0.2);
                padding: 0.3rem 0.8rem;
                border-radius: 15px;
                font-size: 0.9rem;
            }
        </style>
    </head>
    <body>
        <div class="version">v1.0.0</div>
        <div class="container">
            <div class="logo">🤖</div>
            <h1>XAI Student Performance Predictor</h1>
            <p class="subtitle">Explainable AI API for Educational Analytics</p>
            
            <div class="status">🟢 API Online</div>
            
            <div class="features">
                <div class="feature">
                    <span class="feature-icon">📊</span>
                    <span>Predict student outcomes with 29 features</span>
                </div>
                <div class="feature">
                    <span class="feature-icon">🔍</span>
                    <span>SHAP & LIME explainability</span>
                </div>
                <div class="feature">
                    <span class="feature-icon">⚡</span>
                    <span>Real-time predictions</span>
                </div>
                <div class="feature">
                    <span class="feature-icon">🎯</span>
                    <span>XGBoost ML model</span>
                </div>
            </div>
            
            <div class="links">
                <a href="/docs" class="link">📚 API Documentation</a>
                <a href="/health" class="link">💚 Health Check</a>
                <a href="/redoc" class="link">📖 ReDoc</a>
            </div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content, status_code=200)

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy" if model_manager.is_loaded else "unhealthy",
        model_loaded=model_manager.is_loaded,
        version="1.0.0",
        timestamp=datetime.utcnow().isoformat() + "Z"
    )

@app.get("/guidelines")
async def get_pass_guidelines():
    """Get guidelines for achieving Pass predictions"""
    return {
        "guidelines": {
            "high_priority_factors": {
                "completed_course": "Must be True/1 (87.94% model importance)",
                "total_clicks": "Aim for > 3000 clicks (high engagement)", 
                "studied_credits": "60-240 credits (reasonable study load)"
            },
            "engagement_metrics": {
                "avg_clicks_per_session": "> 30",
                "active_days": "> 60",
                "daily_engagement_rate": "> 0.6", 
                "engagement_duration": "> 200 minutes"
            },
            "academic_performance": {
                "avg_assessment_score": "> 70",
                "total_assessments": "> 3"
            },
            "demographics_that_help": {
                "age_band": "35-55 (mature students perform better)",
                "highest_education": "HE Qualification or higher",
                "disability": "N (no disability)"
            },
            "example_pass_profile": {
                "gender": "M",
                "region": "South East Region",
                "highest_education": "HE Qualification",
                "imd_band": "70-80%",
                "age_band": "35-55", 
                "disability": "N",
                "num_of_prev_attempts": 0,
                "studied_credits": 120,
                "total_clicks": 4500,
                "avg_clicks_per_session": 45,
                "active_days": 75,
                "daily_engagement_rate": 0.75,
                "avg_assessment_score": 78,
                "total_assessments": 4,
                "completed_course": True,
                "total_sessions": 85,
                "engagement_duration": 350,
                "withdrawal_status": False,
                "click_variability": 10.0,
                "first_access_day": 5,
                "last_access_day": 180,
                "score_consistency": 5.0,
                "first_submission": 15,
                "last_submission": 170,
                "banked_assessments": 0
            }
        }
    }

@app.post("/predict", response_model=PredictionResponse)
async def predict_student_performance(
    student_data: StudentInput,
    model_mgr: ModelManager = Depends(verify_models_loaded)
):
    """
    Predict student academic performance based on input features.
    
    Returns prediction class and probabilities for all possible outcomes.
    """
    try:
        logger.info(f"Processing prediction for student ID: {student_data.id_student}")
        
        # Preprocess input data
        processed_data = model_mgr.preprocess_input(student_data)
        
        # Make prediction
        prediction_result = model_mgr.predict(processed_data)
        
        # Create response
        response = PredictionResponse(
            prediction=prediction_result["prediction"],
            probabilities=prediction_result["probabilities"],
            confidence=prediction_result["confidence"],
            student_id=student_data.id_student
        )
        
        logger.info(f"Prediction completed for student {student_data.id_student}: {prediction_result['prediction']}")
        return response
        
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error during prediction: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during prediction")

@app.post("/explain", response_model=ExplanationResponse)
async def explain_prediction(
    student_data: StudentInput,
    model_mgr: ModelManager = Depends(verify_models_loaded)
):
    """
    Generate explanations for student performance prediction using SHAP and LIME.
    
    Returns detailed explanations with feature contributions and visualizations.
    """
    try:
        logger.info(f"Processing explanation for student ID: {student_data.id_student}")
        
        # Check if explainers are available
        if not model_mgr.shap_explainer or not model_mgr.lime_explainer:
            raise HTTPException(
                status_code=503, 
                detail="Explainers not initialized. Please restart the service."
            )
        
        # Preprocess input data
        processed_data = model_mgr.preprocess_input(student_data)
        
        # Make prediction first
        prediction_result = model_mgr.predict(processed_data)
        
        # Generate SHAP explanation
        shap_explanation = {}
        shap_plots = {}
        try:
            shap_result = model_mgr.shap_explainer.explain_instance(processed_data)
            shap_explanation = shap_result["top_features"]
            
            # Generate SHAP plots
            waterfall_plot = model_mgr.shap_explainer.generate_waterfall_plot(processed_data)
            if waterfall_plot:
                shap_plots["waterfall"] = waterfall_plot
                
            importance_plot = model_mgr.shap_explainer.generate_feature_importance_plot(processed_data)
            if importance_plot:
                shap_plots["importance"] = importance_plot
                
        except Exception as e:
            logger.warning(f"SHAP explanation failed: {str(e)}")
            shap_explanation = {"error": "SHAP explanation unavailable"}
        
        # Generate LIME explanation
        lime_explanation = {}
        lime_plots = {}
        try:
            lime_result = model_mgr.lime_explainer.explain_instance(processed_data)
            lime_explanation = {
                "top_features": lime_result["top_features"],
                "intercept": lime_result["intercept"],
                "local_prediction": lime_result["local_prediction"]
            }
            
            # Generate LIME plots
            explanation_plot = model_mgr.lime_explainer.generate_explanation_plot(processed_data)
            if explanation_plot:
                lime_plots["explanation"] = explanation_plot
                
        except Exception as e:
            logger.warning(f"LIME explanation failed: {str(e)}")
            lime_explanation = {"error": "LIME explanation unavailable"}
        
        # Create feature importance ranking
        feature_importance = []
        all_features = {}
        
        # Combine SHAP and LIME features
        if isinstance(shap_explanation, dict) and "error" not in shap_explanation:
            for feature, value in shap_explanation.items():
                all_features[feature] = {"shap": value, "lime": 0}
        
        if isinstance(lime_explanation, dict) and "error" not in lime_explanation:
            lime_features = lime_explanation.get("top_features", {})
            for feature, value in lime_features.items():
                if feature in all_features:
                    all_features[feature]["lime"] = value
                else:
                    all_features[feature] = {"shap": 0, "lime": value}
        
        # Create ranked feature importance
        for feature, values in all_features.items():
            avg_importance = (abs(values["shap"]) + abs(values["lime"])) / 2
            direction = "positive" if (values["shap"] + values["lime"]) > 0 else "negative"
            
            feature_importance.append({
                "feature": feature,
                "importance": avg_importance,
                "direction": direction,
                "shap_value": values["shap"],
                "lime_value": values["lime"]
            })
        
        # Sort by importance
        feature_importance.sort(key=lambda x: x["importance"], reverse=True)
        
        # Combine all explanation data
        combined_explanation = {
            "shap": shap_explanation,
            "lime": lime_explanation,
            "plots": {
                "shap": shap_plots,
                "lime": lime_plots
            }
        }
        
        # Create response
        response = ExplanationResponse(
            student_id=student_data.id_student,
            prediction=prediction_result["prediction"],
            shap_values=shap_explanation if isinstance(shap_explanation, dict) and "error" not in shap_explanation else {},
            lime_explanation=combined_explanation,
            feature_importance=feature_importance[:10]  # Top 10 features
        )
        
        logger.info(f"Explanation completed for student {student_data.id_student}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during explanation: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during explanation")

@app.post("/batch-predict", response_model=BatchPredictionResponse)
async def batch_predict_student_performance(
    batch_request: BatchPredictionRequest,
    model_mgr: ModelManager = Depends(verify_models_loaded)
):
    """
    Batch predict student academic performance for multiple students.
    
    Accepts a list of student data and returns predictions for all.
    Optionally includes explanations if requested.
    """
    try:
        logger.info(f"Processing batch prediction for {len(batch_request.students)} students")
        
        predictions = []
        explanations = []
        success_count = 0
        error_count = 0
        
        for i, student_dict in enumerate(batch_request.students):
            try:
                # Convert dict to StudentInput object
                student_data = StudentInput(**student_dict)
                
                # Preprocess input data
                processed_data = model_mgr.preprocess_input(student_data)
                
                # Make prediction
                prediction_result = model_mgr.predict(processed_data)
                
                # Create prediction response
                prediction_response = PredictionResponse(
                    prediction=prediction_result["prediction"],
                    probabilities=prediction_result["probabilities"],
                    confidence=prediction_result["confidence"],
                    student_id=student_data.id_student
                )
                predictions.append(prediction_response)
                
                # Generate explanation if requested
                if batch_request.include_explanations:
                    try:
                        # Check if explainers are available
                        if model_mgr.shap_explainer and model_mgr.lime_explainer:
                            # Generate SHAP explanation
                            shap_explanation = {}
                            shap_plots = {}
                            try:
                                shap_result = model_mgr.shap_explainer.explain_instance(processed_data)
                                shap_explanation = shap_result["top_features"]
                            except Exception as e:
                                logger.warning(f"SHAP explanation failed for student {i}: {str(e)}")
                                shap_explanation = {"error": "SHAP explanation unavailable"}
                            
                            # Generate LIME explanation
                            lime_explanation = {}
                            try:
                                lime_result = model_mgr.lime_explainer.explain_instance(processed_data)
                                lime_explanation = {
                                    "top_features": lime_result["top_features"],
                                    "intercept": lime_result["intercept"],
                                    "local_prediction": lime_result["local_prediction"]
                                }
                            except Exception as e:
                                logger.warning(f"LIME explanation failed for student {i}: {str(e)}")
                                lime_explanation = {"error": "LIME explanation unavailable"}
                            
                            # Create feature importance ranking
                            feature_importance = []
                            all_features = {}
                            
                            # Combine SHAP and LIME features
                            if isinstance(shap_explanation, dict) and "error" not in shap_explanation:
                                for feature, value in shap_explanation.items():
                                    all_features[feature] = {"shap": value, "lime": 0}
                            
                            if isinstance(lime_explanation, dict) and "error" not in lime_explanation:
                                lime_features = lime_explanation.get("top_features", {})
                                for feature, value in lime_features.items():
                                    if feature in all_features:
                                        all_features[feature]["lime"] = value
                                    else:
                                        all_features[feature] = {"shap": 0, "lime": value}
                            
                            # Create ranked feature importance
                            for feature, values in all_features.items():
                                avg_importance = (abs(values["shap"]) + abs(values["lime"])) / 2
                                direction = "positive" if (values["shap"] + values["lime"]) > 0 else "negative"
                                
                                feature_importance.append({
                                    "feature": feature,
                                    "importance": avg_importance,
                                    "direction": direction,
                                    "shap_value": values["shap"],
                                    "lime_value": values["lime"]
                                })
                            
                            # Sort by importance
                            feature_importance.sort(key=lambda x: x["importance"], reverse=True)
                            
                            # Combine all explanation data
                            combined_explanation = {
                                "shap": shap_explanation,
                                "lime": lime_explanation,
                                "plots": {"shap": {}, "lime": {}}  # Skip plots for batch to reduce response size
                            }
                            
                            # Create explanation response
                            explanation_response = ExplanationResponse(
                                student_id=student_data.id_student,
                                prediction=prediction_result["prediction"],
                                shap_values=shap_explanation if isinstance(shap_explanation, dict) and "error" not in shap_explanation else {},
                                lime_explanation=combined_explanation,
                                feature_importance=feature_importance[:10]  # Top 10 features
                            )
                            explanations.append(explanation_response)
                        else:
                            logger.warning(f"Explainers not available for student {i}")
                    except Exception as e:
                        logger.warning(f"Failed to generate explanation for student {i}: {str(e)}")
                
                success_count += 1
                logger.debug(f"Successfully processed student {i}: {prediction_result['prediction']}")
                
            except Exception as e:
                logger.error(f"Failed to process student {i}: {str(e)}")
                error_count += 1
                # Continue processing other students
                continue
        
        # Create batch response
        response = BatchPredictionResponse(
            predictions=predictions,
            explanations=explanations if batch_request.include_explanations else None,
            total_processed=len(batch_request.students),
            success_count=success_count,
            error_count=error_count
        )
        
        logger.info(f"Batch prediction completed: {success_count} success, {error_count} errors")
        return response
        
    except Exception as e:
        logger.error(f"Unexpected error during batch prediction: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during batch prediction")

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom HTTP exception handler"""
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=exc.__class__.__name__,
            message=str(exc.detail),
            detail=None
        ).model_dump()
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """General exception handler"""
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="InternalServerError",
            message="An unexpected error occurred",
            detail=str(exc) if app.debug else None
        ).model_dump()
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
