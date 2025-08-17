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
            # Ensure input_data is a DataFrame and get values as numpy array
            if isinstance(input_data, pd.DataFrame):
                data_array = input_data.values
            else:
                data_array = np.array(input_data).reshape(1, -1)
            
            # Get SHAP values
            shap_values = self.explainer.shap_values(data_array)
            
            # Handle different SHAP value formats
            if isinstance(shap_values, list):
                # Multi-class case - shap_values is a list of arrays
                prediction_proba = self.model.predict_proba(data_array)[0]
                predicted_class_idx = np.argmax(prediction_proba)
                shap_values = shap_values[predicted_class_idx][0]  # Get values for predicted class
            else:
                # Binary or regression case
                if len(shap_values.shape) > 1:
                    shap_values = shap_values[0]  # Get first (and only) instance
            
            # Get feature names (excluding target if present)
            feature_names = input_data.columns.tolist() if hasattr(input_data, 'columns') else self.feature_names
            if len(feature_names) > len(shap_values):
                feature_names = feature_names[:len(shap_values)]
            
            # Create feature importance dictionary
            feature_importance = {}
            for i, feature in enumerate(feature_names):
                if i < len(shap_values):
                    feature_importance[feature] = float(shap_values[i])
            
            # Get top 5 most important features by absolute value
            top_features = dict(sorted(
                feature_importance.items(), 
                key=lambda x: abs(x[1]), 
                reverse=True
            )[:5])
            
            # Calculate base value (expected value)
            expected_value = self.explainer.expected_value
            if isinstance(expected_value, (list, np.ndarray)):
                if len(expected_value) > 1:
                    # Multi-class case
                    prediction_proba = self.model.predict_proba(data_array)[0]
                    predicted_class_idx = np.argmax(prediction_proba)
                    base_value = float(expected_value[predicted_class_idx])
                else:
                    base_value = float(expected_value[0])
            else:
                base_value = float(expected_value)
            
            explanation = {
                "base_value": base_value,
                "feature_contributions": feature_importance,
                "top_features": top_features,
                "prediction_impact": float(np.sum(shap_values))
            }
            
            logger.info(f"SHAP explanation generated successfully")
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
            # Ensure input_data is a DataFrame and get values as numpy array
            if isinstance(input_data, pd.DataFrame):
                data_array = input_data.values
            else:
                data_array = np.array(input_data).reshape(1, -1)
            
            # Get SHAP values
            shap_values = self.explainer.shap_values(data_array)
            
            # Handle different SHAP value formats
            if isinstance(shap_values, list):
                # Multi-class case
                prediction_proba = self.model.predict_proba(data_array)[0]
                predicted_class_idx = np.argmax(prediction_proba)
                shap_values = shap_values[predicted_class_idx][0]
                expected_value = self.explainer.expected_value[predicted_class_idx]
            else:
                # Binary or regression case
                if len(shap_values.shape) > 1:
                    shap_values = shap_values[0]
                expected_value = self.explainer.expected_value
                if isinstance(expected_value, (list, np.ndarray)):
                    expected_value = expected_value[0] if len(expected_value) > 0 else 0
            
            # Get feature names
            feature_names = input_data.columns.tolist() if hasattr(input_data, 'columns') else self.feature_names
            if len(feature_names) > len(shap_values):
                feature_names = feature_names[:len(shap_values)]
            
            # Create the plot
            fig, ax = plt.subplots(figsize=(10, 6))
            
            # Calculate cumulative values for waterfall
            base_value = float(expected_value)
            feature_contributions = [(name, float(val)) for name, val in zip(feature_names, shap_values)]
            
            # Sort by absolute value and take top features
            sorted_features = sorted(feature_contributions, key=lambda x: abs(x[1]), reverse=True)[:max_display]
            
            # Create waterfall data
            x_pos = np.arange(len(sorted_features) + 2)  # +2 for base and final
            values = [base_value] + [contrib for _, contrib in sorted_features] + [base_value + sum(shap_values)]
            labels = ['Base'] + [name for name, _ in sorted_features] + ['Prediction']
            
            # Create the waterfall chart
            colors = ['gray'] + ['green' if val > 0 else 'red' for _, val in sorted_features] + ['blue']
            
            for i in range(len(values)):
                if i == 0 or i == len(values) - 1:
                    # Base and final prediction
                    ax.bar(x_pos[i], values[i], color=colors[i], alpha=0.7)
                else:
                    # Feature contributions
                    start_val = values[0] + sum([v for _, v in sorted_features[:i-1]])
                    ax.bar(x_pos[i], sorted_features[i-1][1], bottom=start_val, color=colors[i], alpha=0.7)
            
            ax.set_xticks(x_pos)
            ax.set_xticklabels(labels, rotation=45, ha='right')
            ax.set_ylabel('Prediction Value')
            ax.set_title('SHAP Waterfall Plot - Feature Contributions')
            ax.grid(True, alpha=0.3)
            
            plt.tight_layout()
            
            # Convert to base64
            buffer = io.BytesIO()
            plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight')
            buffer.seek(0)
            image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            plt.close(fig)
            
            logger.info("SHAP waterfall plot generated successfully")
            return image_base64
            
        except Exception as e:
            logger.error(f"Failed to generate waterfall plot: {str(e)}")
            return ""
            
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
