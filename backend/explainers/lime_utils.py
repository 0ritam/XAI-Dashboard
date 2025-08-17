import lime
import lime.lime_tabular
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import io
import base64
from typing import Dict, Any, List, Tuple, Callable
import logging

logger = logging.getLogger(__name__)

class LIMEExplainer:
    """LIME explainer for tabular data explanations"""
    
    def __init__(self, model, training_data: pd.DataFrame, feature_names: List[str], 
                 class_names: List[str], predict_fn: Callable = None):
        """
        Initialize LIME explainer for tabular data
        
        Args:
            model: Trained model
            training_data: Training data for reference
            feature_names: List of feature names
            class_names: List of class names
            predict_fn: Custom prediction function (optional)
        """
        self.model = model
        self.training_data = training_data
        
        # Only use features that actually exist in the training data
        available_features = [f for f in feature_names if f in training_data.columns and f != 'final_result']
        self.feature_names = available_features
        
        self.class_names = class_names
        self.predict_fn = predict_fn or self._default_predict_fn
        self.explainer = None
        self._initialize_explainer()
    
    def _default_predict_fn(self, X):
        """Default prediction function for the model"""
        return self.model.predict_proba(X)
    
    def _initialize_explainer(self):
        """Initialize LIME tabular explainer"""
        try:
            # Use training data without target column
            training_features = self.training_data[self.feature_names].values
            
            # Ensure all data is numeric
            training_features = training_features.astype(float)
            
            self.explainer = lime.lime_tabular.LimeTabularExplainer(
                training_features,
                feature_names=self.feature_names,
                class_names=self.class_names,
                mode='classification',
                discretize_continuous=True,
                random_state=42
            )
            logger.info("✅ LIME explainer initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize LIME explainer: {str(e)}")
            raise
    
    def explain_instance(self, input_data: pd.DataFrame, num_features: int = 10) -> Dict[str, Any]:
        """
        Generate LIME explanation for a single instance
        
        Args:
            input_data: Single row DataFrame with features
            num_features: Number of features to include in explanation
            
        Returns:
            Dictionary with LIME explanation data
        """
        try:
            # Ensure we have the right feature order and format
            if isinstance(input_data, pd.DataFrame):
                # Get features in the expected order
                available_features = [f for f in self.feature_names if f in input_data.columns]
                if len(available_features) < len(self.feature_names):
                    logger.warning(f"Missing features: {set(self.feature_names) - set(available_features)}")
                
                instance = input_data[available_features].values[0].astype(float)
            else:
                instance = np.array(input_data).astype(float)
            
            # Ensure instance has the right shape
            if len(instance) != len(self.feature_names):
                logger.warning(f"Feature count mismatch: got {len(instance)}, expected {len(self.feature_names)}")
                # Pad or truncate as needed
                if len(instance) < len(self.feature_names):
                    instance = np.pad(instance, (0, len(self.feature_names) - len(instance)), mode='constant')
                else:
                    instance = instance[:len(self.feature_names)]
            
            # Generate explanation
            explanation = self.explainer.explain_instance(
                instance, 
                self.predict_fn,
                num_features=min(num_features, len(self.feature_names))
            )
            
            # Extract feature weights safely
            feature_weights = {}
            try:
                for feature_info in explanation.as_list():
                    if isinstance(feature_info, tuple) and len(feature_info) == 2:
                        feature_idx, weight = feature_info
                        if isinstance(feature_idx, int) and 0 <= feature_idx < len(self.feature_names):
                            feature_name = self.feature_names[feature_idx]
                            feature_weights[feature_name] = float(weight)
                        elif isinstance(feature_idx, str):
                            feature_weights[feature_idx] = float(weight)
            except Exception as e:
                logger.error(f"Error extracting feature weights: {str(e)}")
                # Fallback: create dummy weights
                for i, fname in enumerate(self.feature_names[:num_features]):
                    feature_weights[fname] = 0.0
            
            # Get top features by absolute weight
            top_features = dict(sorted(
                feature_weights.items(), 
                key=lambda x: abs(x[1]), 
                reverse=True
            )[:5])
            
            # Get prediction info safely
            try:
                # Reshape instance for prediction if needed
                instance_for_pred = instance.reshape(1, -1)
                prediction_proba = self.predict_fn(instance_for_pred)[0]
                predicted_class_idx = np.argmax(prediction_proba)
                predicted_class = self.class_names[predicted_class_idx] if predicted_class_idx < len(self.class_names) else "Unknown"
                
                explanation_data = {
                    "feature_weights": feature_weights,
                    "top_features": top_features,
                    "predicted_class": predicted_class,
                    "prediction_probabilities": {
                        class_name: float(prob) 
                        for class_name, prob in zip(self.class_names, prediction_proba)
                        if len(self.class_names) == len(prediction_proba)
                    },
                    "intercept": float(explanation.intercept[predicted_class_idx]) if len(explanation.intercept) > predicted_class_idx else 0.0,
                    "local_prediction": float(explanation.local_pred[predicted_class_idx]) if len(explanation.local_pred) > predicted_class_idx else 0.0
                }
            except Exception as e:
                logger.error(f"Error in prediction processing: {str(e)}")
                explanation_data = {
                    "feature_weights": feature_weights,
                    "top_features": top_features,
                    "predicted_class": "Unknown",
                    "prediction_probabilities": {},
                    "intercept": 0.0,
                    "local_prediction": 0.0
                }
            
            logger.info(f"LIME explanation generated successfully")
            return explanation_data
            
        except Exception as e:
            logger.error(f"Failed to generate LIME explanation: {str(e)}")
            raise ValueError(f"LIME explanation failed: {str(e)}")
    
    def generate_explanation_plot(self, input_data: pd.DataFrame, num_features: int = 10) -> str:
        """
        Generate LIME explanation plot as base64 encoded image
        
        Args:
            input_data: Single row DataFrame with features
            num_features: Number of features to show in plot
            
        Returns:
            Base64 encoded image string
        """
        try:
            # Get input as numpy array
            instance = input_data[self.feature_names].values[0]
            
            # Generate explanation
            explanation = self.explainer.explain_instance(
                instance, 
                self.predict_fn,
                num_features=num_features
            )
            
            # Get explanation data
            exp_list = explanation.as_list()
            
            # Create plot
            fig, ax = plt.subplots(figsize=(10, 6))
            
            # Extract features and weights
            features = []
            weights = []
            for feature_info, weight in exp_list:
                features.append(str(feature_info))
                weights.append(weight)
            
            # Create horizontal bar plot
            colors = ['green' if w > 0 else 'red' for w in weights]
            bars = ax.barh(range(len(features)), weights, color=colors, alpha=0.7)
            
            ax.set_yticks(range(len(features)))
            ax.set_yticklabels(features, fontsize=10)
            ax.set_xlabel('Feature Weight (Impact on Prediction)')
            ax.set_title('LIME Local Explanation')
            ax.grid(axis='x', alpha=0.3)
            
            # Add value labels on bars
            for i, (bar, weight) in enumerate(zip(bars, weights)):
                ax.text(weight + (0.01 if weight > 0 else -0.01), i, 
                       f'{weight:.3f}', ha='left' if weight > 0 else 'right', 
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
            
            logger.info("LIME explanation plot generated successfully")
            return plot_base64
            
        except Exception as e:
            logger.error(f"Failed to generate LIME explanation plot: {str(e)}")
            return ""
    
    def generate_feature_importance_comparison(self, input_data: pd.DataFrame) -> str:
        """
        Generate a comparison plot of feature importance
        
        Args:
            input_data: Single row DataFrame with features
            
        Returns:
            Base64 encoded image string
        """
        try:
            # Get LIME explanation
            instance = input_data[self.feature_names].values[0]
            explanation = self.explainer.explain_instance(
                instance, self.predict_fn, num_features=len(self.feature_names)
            )
            
            # Get all feature weights
            all_weights = {name: 0.0 for name in self.feature_names}
            for feature_info, weight in explanation.as_list():
                feature_name = str(feature_info).split('=')[0].strip() if '=' in str(feature_info) else str(feature_info)
                if feature_name in all_weights:
                    all_weights[feature_name] = weight
            
            # Sort by absolute importance and take top 15
            sorted_features = sorted(all_weights.items(), key=lambda x: abs(x[1]), reverse=True)[:15]
            
            # Create plot
            fig, ax = plt.subplots(figsize=(12, 8))
            
            features, weights = zip(*sorted_features)
            colors = ['darkgreen' if w > 0 else 'darkred' for w in weights]
            
            bars = ax.barh(range(len(features)), weights, color=colors, alpha=0.8)
            ax.set_yticks(range(len(features)))
            ax.set_yticklabels(features, fontsize=10)
            ax.set_xlabel('LIME Feature Weight')
            ax.set_title('LIME Feature Importance (Top 15 Features)')
            ax.grid(axis='x', alpha=0.3)
            
            # Add value labels
            for i, (bar, weight) in enumerate(zip(bars, weights)):
                ax.text(weight + (0.01 if weight > 0 else -0.01), i, 
                       f'{weight:.3f}', ha='left' if weight > 0 else 'right', 
                       va='center', fontsize=8)
            
            plt.tight_layout()
            
            # Convert to base64
            buffer = io.BytesIO()
            plt.savefig(buffer, format='png', bbox_inches='tight', dpi=100)
            buffer.seek(0)
            plot_data = buffer.getvalue()
            buffer.close()
            plt.close()
            
            plot_base64 = base64.b64encode(plot_data).decode('utf-8')
            
            logger.info("LIME feature importance comparison generated successfully")
            return plot_base64
            
        except Exception as e:
            logger.error(f"Failed to generate LIME comparison plot: {str(e)}")
            return ""
