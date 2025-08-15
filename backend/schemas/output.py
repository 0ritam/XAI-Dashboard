from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
from enum import Enum

class PredictionResult(str, Enum):
    """Possible prediction outcomes"""
    DISTINCTION = "Distinction"
    PASS = "Pass"
    FAIL = "Fail"
    WITHDRAWN = "Withdrawn"

class PredictionResponse(BaseModel):
    """Response model for prediction endpoint"""
    
    prediction: PredictionResult = Field(..., description="Predicted student outcome")
    probabilities: Dict[str, float] = Field(..., description="Class probabilities")
    confidence: float = Field(..., description="Prediction confidence")
    student_id: int = Field(..., description="Student ID")

class HealthResponse(BaseModel):
    """Response model for health check endpoint"""
    
    status: str = Field(..., description="Service status")
    model_loaded: bool = Field(..., description="Whether ML model is loaded")
    version: str = Field(..., description="API version")
    timestamp: str = Field(..., description="Current timestamp")
    
    model_config = {"protected_namespaces": ()}

class ErrorResponse(BaseModel):
    """Response model for error cases"""
    
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    detail: Optional[str] = Field(default=None, description="Detailed error information")

class ExplanationResponse(BaseModel):
    """Response model for explanation endpoint"""
    
    student_id: int = Field(..., description="Student ID")
    prediction: PredictionResult = Field(..., description="Predicted outcome")
    shap_values: Dict[str, float] = Field(..., description="SHAP feature contributions")
    lime_explanation: Dict[str, Any] = Field(..., description="LIME explanation data")
    feature_importance: List[Dict[str, Any]] = Field(..., description="Feature importance ranking")

class BatchPredictionRequest(BaseModel):
    """Request model for batch predictions"""
    
    students: List[Dict[str, Any]] = Field(..., description="List of student data")
    include_explanations: bool = Field(default=False, description="Whether to include explanations")
    
class BatchPredictionResponse(BaseModel):
    """Response model for batch predictions"""
    
    predictions: List[PredictionResponse] = Field(..., description="List of predictions")
    explanations: Optional[List[ExplanationResponse]] = Field(default=None, description="List of explanations")
    total_processed: int = Field(..., description="Number of students processed")
    success_count: int = Field(..., description="Number of successful predictions")
    error_count: int = Field(..., description="Number of failed predictions")
