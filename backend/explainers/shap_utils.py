import shap
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import io
import base64
from typing import Dict, Any, List, Tuple
import logging

logger = logging.getLogger(__name__)

class SHAPExplainer:
    """SHAP explainer for XGBoost model explanations"""
    
    def __init__(self, model, feature_names: List[str]):
        """
        Initialize SHAP explainer with XGBoost model
        
        Args:
            model: Trained XGBoost model
            feature_names: List of feature names
        """
        self.model = model
        self.feature_names = feature_names
        self.explainer = None
        self._initialize_explainer()
    
    def _initialize_explainer(self):
        """Initialize SHAP TreeExplainer for XGBoost"""
        try:
            self.explainer = shap.TreeExplainer(self.model)
            logger.info("✅ SHAP TreeExplainer initialized successfully")
        except Exception as e:
            logger.error(f"❌ Failed to initialize SHAP explainer: {str(e)}")
            raise
    
    def explain_instance(self, input_data: pd.DataFrame) -> Dict[str, Any]:
        """
        Generate SHAP explanation for a single instance
        
        Args:
            input_data: Single row DataFrame with features
            
        Returns:
            Dictionary with SHAP values and explanation data
        """
        try:
            # Get SHAP values
            shap_values = self.explainer.shap_values(input_data)
            
            # If multi-class, get values for the predicted class
            if len(shap_values.shape) == 3:  # Multi-class case
                prediction = self.model.predict(input_data)[0]
                predicted_class_idx = np.argmax(self.model.predict_proba(input_data)[0])
                shap_values = shap_values[0, :, predicted_class_idx]
            else:
                shap_values = shap_values[0]
            
            # Create feature importance dictionary
            feature_importance = {}
            for i, feature in enumerate(self.feature_names[:-1]):  # Exclude target
                feature_importance[feature] = float(shap_values[i])
            
            # Get top 5 most important features by absolute value
            top_features = dict(sorted(
                feature_importance.items(), 
                key=lambda x: abs(x[1]), 
                reverse=True
            )[:5])
            
            # Calculate base value (expected value)
            base_value = float(self.explainer.expected_value)
            if hasattr(self.explainer.expected_value, '__len__'):
                base_value = float(self.explainer.expected_value[predicted_class_idx])
            
            explanation = {
                "base_value": base_value,
                "feature_contributions": feature_importance,
                "top_features": top_features,
                "prediction_impact": float(np.sum(shap_values))
            }
            
            logger.info(f"SHAP explanation generated for instance")
            return explanation
            
        except Exception as e:
            logger.error(f"Failed to generate SHAP explanation: {str(e)}")
            raise ValueError(f"SHAP explanation failed: {str(e)}")
    
    def generate_waterfall_plot(self, input_data: pd.DataFrame, max_display: int = 10) -> str:
        """
        Generate SHAP waterfall plot as base64 encoded image
        
        Args:
            input_data: Single row DataFrame with features
            max_display: Maximum number of features to display
            
        Returns:
            Base64 encoded image string
        """
        try:
            # Get SHAP values
            shap_values = self.explainer.shap_values(input_data)
            
            if len(shap_values.shape) == 3:  # Multi-class
                predicted_class_idx = np.argmax(self.model.predict_proba(input_data)[0])
                shap_values = shap_values[0, :, predicted_class_idx]
            else:
                shap_values = shap_values[0]
            
            # Create explanation object for waterfall plot
            expected_value = self.explainer.expected_value
            if hasattr(expected_value, '__len__'):
                expected_value = expected_value[predicted_class_idx]
            
            # Create the plot
            fig, ax = plt.subplots(figsize=(10, 6))
            
            # Create SHAP explanation object
            explanation = shap.Explanation(
                values=shap_values,
                base_values=expected_value,
                data=input_data.values[0],
                feature_names=self.feature_names[:-1]
            )
            
            # Generate waterfall plot
            shap.plots.waterfall(explanation, max_display=max_display, show=False)
            
            # Convert to base64
            buffer = io.BytesIO()
            plt.savefig(buffer, format='png', bbox_inches='tight', dpi=100)
            buffer.seek(0)
            plot_data = buffer.getvalue()
            buffer.close()
            plt.close()
            
            # Encode as base64
            plot_base64 = base64.b64encode(plot_data).decode('utf-8')
            
            logger.info("SHAP waterfall plot generated successfully")
            return plot_base64
            
        except Exception as e:
            logger.error(f"Failed to generate SHAP waterfall plot: {str(e)}")
            return ""
    
    def generate_feature_importance_plot(self, input_data: pd.DataFrame) -> str:
        """
        Generate SHAP feature importance bar plot
        
        Args:
            input_data: Single row DataFrame with features
            
        Returns:
            Base64 encoded image string
        """
        try:
            # Get SHAP values
            shap_values = self.explainer.shap_values(input_data)
            
            if len(shap_values.shape) == 3:  # Multi-class
                predicted_class_idx = np.argmax(self.model.predict_proba(input_data)[0])
                shap_values = shap_values[0, :, predicted_class_idx]
            else:
                shap_values = shap_values[0]
            
            # Get top 10 features by absolute importance
            feature_importance = [(name, value) for name, value in 
                                zip(self.feature_names[:-1], shap_values)]
            feature_importance.sort(key=lambda x: abs(x[1]), reverse=True)
            top_features = feature_importance[:10]
            
            # Create plot
            fig, ax = plt.subplots(figsize=(10, 6))
            features, values = zip(*top_features)
            colors = ['green' if v > 0 else 'red' for v in values]
            
            bars = ax.barh(range(len(features)), values, color=colors, alpha=0.7)
            ax.set_yticks(range(len(features)))
            ax.set_yticklabels(features)
            ax.set_xlabel('SHAP Value (Impact on Prediction)')
            ax.set_title('Top 10 Feature Contributions (SHAP)')
            ax.grid(axis='x', alpha=0.3)
            
            # Add value labels on bars
            for i, (bar, value) in enumerate(zip(bars, values)):
                ax.text(value + (0.01 if value > 0 else -0.01), i, 
                       f'{value:.3f}', ha='left' if value > 0 else 'right', 
                       va='center', fontsize=9)
            
            plt.tight_layout()
            
            # Convert to base64
            buffer = io.BytesIO()
            plt.savefig(buffer, format='png', bbox_inches='tight', dpi=100)
            buffer.seek(0)
            plot_data = buffer.getvalue()
            buffer.close()
            plt.close()
            
            plot_base64 = base64.b64encode(plot_data).decode('utf-8')
            
            logger.info("SHAP feature importance plot generated successfully")
            return plot_base64
            
        except Exception as e:
            logger.error(f"Failed to generate SHAP feature importance plot: {str(e)}")
            return ""
