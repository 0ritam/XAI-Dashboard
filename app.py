import pandas as pd
import os

# Function to load OULAD data from CSV files
# Using raw strings to handle backslashes in Windows file paths
# This function assumes the CSV files are located in the specified directory
# and that the directory structure matches the expected format.

def load_oulad_data(data_path):
    """Load all OULAD CSV files into pandas DataFrames"""

    # Core tables - using raw strings
    courses = pd.read_csv(rf"{data_path}\courses.csv")
    assessments = pd.read_csv(rf"{data_path}\assessments.csv")
    vle = pd.read_csv(rf"{data_path}\vle.csv")

    # Student data
    student_info = pd.read_csv(rf"{data_path}\studentInfo.csv")
    student_registration = pd.read_csv(rf"{data_path}\studentRegistration.csv")
    student_assessment = pd.read_csv(rf"{data_path}\studentAssessment.csv")
    student_vle = pd.read_csv(rf"{data_path}\studentVle.csv")

    return {
        'courses': courses,
        'assessments': assessments,
        'vle': vle,
        'student_info': student_info,
        'student_registration': student_registration,
        'student_assessment': student_assessment,
        'student_vle': student_vle
    }

# Load the data - use raw string for path
oulad_data = load_oulad_data(r"C:\Users\Ritam\Projects\XAIDashboard\dataset")

#2.Data Exploration

