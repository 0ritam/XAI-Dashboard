"""
Prediction API endpoints for XAI Student Performance Predictor.

This module contains the core prediction logic that is integrated into the main FastAPI app.
The actual prediction functionality is now handled by the ModelManager class in main.py.
"""

import logging
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends
import pandas as pd
import numpy as np

from schemas.input import StudentInput
from schemas.output import PredictionResponse, BatchPredictionRequest, BatchPredictionResponse

logger = logging.getLogger(__name__)

# This router can be included in the main app if needed for modular structure
router = APIRouter(prefix="/api/v1", tags=["predictions"])

def validate_prediction_input(student_data: StudentInput) -> Dict[str, Any]:
    """
    Validate and prepare student input data for prediction.
    
    Args:
        student_data: Validated Pydantic model with student features
        
    Returns:
        Dictionary with validation results and processed data
        
    Raises:
        ValueError: If validation fails
    """
    try:
        # Check for required fields
        required_numeric_fields = [
            'total_clicks', 'avg_clicks_per_session', 'total_sessions',
            'active_days', 'engagement_duration', 'avg_assessment_score'
        ]
        
        data_dict = student_data.model_dump()
        
        # Validate numeric ranges
        if data_dict['avg_assessment_score'] < 0 or data_dict['avg_assessment_score'] > 100:
            raise ValueError("Average assessment score must be between 0 and 100")
            
        if data_dict['daily_engagement_rate'] < 0 or data_dict['daily_engagement_rate'] > 1:
            raise ValueError("Daily engagement rate must be between 0 and 1")
            
        if data_dict['total_clicks'] < 0:
            raise ValueError("Total clicks cannot be negative")
            
        # Check logical consistency
        if data_dict['first_access_day'] > data_dict['last_access_day']:
            raise ValueError("First access day cannot be after last access day")
            
        if data_dict['first_submission'] > data_dict['last_submission'] and data_dict['total_assessments'] > 0:
            raise ValueError("First submission cannot be after last submission")
        
        logger.info(f"Input validation passed for student {data_dict['id_student']}")
        return {"valid": True, "data": data_dict}
        
    except Exception as e:
        logger.error(f"Input validation failed: {str(e)}")
        raise ValueError(f"Input validation failed: {str(e)}")

def format_prediction_response(
    prediction_result: Dict[str, Any], 
    student_id: int
) -> PredictionResponse:
    """
    Format prediction results into standardized response.
    
    Args:
        prediction_result: Raw prediction results from model
        student_id: Student identifier
        
    Returns:
        Formatted PredictionResponse object
    """
    try:
        return PredictionResponse(
            prediction=prediction_result["prediction"],
            probabilities=prediction_result["probabilities"],
            confidence=prediction_result["confidence"],
            student_id=student_id
        )
    except KeyError as e:
        raise ValueError(f"Missing required field in prediction result: {e}")

# Additional utility functions for batch processing and data validation
def prepare_batch_data(students_data: List[Dict[str, Any]]) -> pd.DataFrame:
    """
    Prepare batch data for prediction.
    
    Args:
        students_data: List of student data dictionaries
        
    Returns:
        Processed pandas DataFrame ready for batch prediction
    """
    try:
        # Convert to DataFrame
        df = pd.DataFrame(students_data)
        
        # Validate each student record
        for idx, row in df.iterrows():
            student_input = StudentInput(**row.to_dict())
            validate_prediction_input(student_input)
        
        logger.info(f"Batch data prepared: {len(df)} students")
        return df
        
    except Exception as e:
        logger.error(f"Batch data preparation failed: {str(e)}")
        raise ValueError(f"Batch data preparation failed: {str(e)}")

def calculate_prediction_confidence(probabilities: Dict[str, float]) -> float:
    """
    Calculate confidence score for prediction.
    
    Args:
        probabilities: Dictionary of class probabilities
        
    Returns:
        Confidence score (0-1)
    """
    max_prob = max(probabilities.values())
    
    # Alternative confidence measures could be implemented here
    # For now, using maximum probability as confidence
    return max_prob

def get_prediction_summary(predictions: List[PredictionResponse]) -> Dict[str, Any]:
    """
    Generate summary statistics for batch predictions.
    
    Args:
        predictions: List of prediction responses
        
    Returns:
        Summary statistics dictionary
    """
    if not predictions:
        return {"total": 0, "distribution": {}, "avg_confidence": 0}
    
    # Count predictions by class
    distribution = {}
    total_confidence = 0
    
    for pred in predictions:
        class_name = pred.prediction
        distribution[class_name] = distribution.get(class_name, 0) + 1
        total_confidence += pred.confidence
    
    avg_confidence = total_confidence / len(predictions)
    
    return {
        "total": len(predictions),
        "distribution": distribution,
        "avg_confidence": round(avg_confidence, 3),
        "confidence_threshold": 0.7  # Could be configurable
    }