from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum

class Gender(str, Enum):
    """Gender enumeration"""
    MALE = "M"
    FEMALE = "F"

class AgeBand(str, Enum):
    """Age band enumeration"""
    YOUNG = "0-35"
    MIDDLE = "35-55"
    SENIOR = "55<="

class HighestEducation(str, Enum):
    """Highest education level enumeration"""
    NO_FORMAL = "No Formal quals"
    LOWER_THAN_A = "Lower Than A Level"
    A_LEVEL = "A Level or Equivalent"
    HE_QUALIFICATION = "HE Qualification"
    POST_GRADUATE = "Post Graduate Qualification"

class Region(str, Enum):
    """Region enumeration"""
    EAST_ANGLIAN = "East Anglian Region"
    EAST_MIDLANDS = "East Midlands Region"
    IRELAND = "Ireland"
    LONDON = "London Region"
    NORTH_REGION = "North Region"
    NORTH_WESTERN = "North Western Region"
    SCOTLAND = "Scotland"
    SOUTH_EAST = "South East Region"
    SOUTH_REGION = "South Region"
    SOUTH_WEST = "South West Region"
    WALES = "Wales"
    WEST_MIDLANDS = "West Midlands Region"
    YORKSHIRE = "Yorkshire Region"

class IMDBand(str, Enum):
    """IMD Band enumeration"""
    BAND_0_10 = "0-10%"
    BAND_10_20 = "10-20"
    BAND_20_30 = "20-30%"
    BAND_30_40 = "30-40%"
    BAND_40_50 = "40-50%"
    BAND_50_60 = "50-60%"
    BAND_60_70 = "60-70%"
    BAND_70_80 = "70-80%"
    BAND_80_90 = "80-90%"
    BAND_90_100 = "90-100%"

class Disability(str, Enum):
    """Disability enumeration"""
    YES = "Y"
    NO = "N"

class StudentInput(BaseModel):
    """
    Pydantic model for student input data validation.
    Contains all 29 features used by the XGBoost model.
    """
    
    # Course and Module Information
    code_module: str = Field(..., description="Course module code")
    code_presentation: str = Field(..., description="Course presentation code")
    id_student: int = Field(..., description="Student ID", gt=0)
    
    # Demographic Features
    gender: Gender = Field(..., description="Student gender")
    region: Region = Field(..., description="Student region")
    highest_education: HighestEducation = Field(..., description="Highest education level")
    imd_band: IMDBand = Field(..., description="Index of Multiple Deprivation band")
    age_band: AgeBand = Field(..., description="Age group")
    disability: Disability = Field(..., description="Disability status")
    
    # Academic Features
    num_of_prev_attempts: int = Field(default=0, description="Number of previous attempts", ge=0)
    studied_credits: int = Field(..., description="Number of credits studied", gt=0)
    
    # Course Completion
    completed_course: bool = Field(..., description="Whether course was completed")
    withdrawal_status: bool = Field(default=False, description="Withdrawal status")
    
    # Engagement Metrics
    total_clicks: float = Field(..., description="Total clicks in VLE", ge=0)
    avg_clicks_per_session: float = Field(..., description="Average clicks per session", ge=0)
    click_variability: float = Field(..., description="Variability in clicks", ge=0)
    total_sessions: int = Field(..., description="Total learning sessions", ge=0)
    active_days: int = Field(..., description="Number of active days", ge=0)
    engagement_duration: float = Field(..., description="Total engagement duration", ge=0)
    daily_engagement_rate: float = Field(..., description="Daily engagement rate", ge=0, le=1)
    
    # Access Patterns
    first_access_day: int = Field(..., description="First access day", ge=0)
    last_access_day: int = Field(..., description="Last access day", ge=0)
    
    # Assessment Features
    avg_assessment_score: float = Field(..., description="Average assessment score", ge=0, le=100)
    score_consistency: float = Field(..., description="Assessment score consistency", ge=0)
    total_assessments: int = Field(..., description="Total number of assessments", ge=0)
    first_submission: int = Field(..., description="First submission day", ge=0)
    last_submission: int = Field(..., description="Last submission day", ge=0)
    banked_assessments: int = Field(default=0, description="Number of banked assessments", ge=0)
    
    # Target (for reference, not used in prediction)
    final_result: Optional[str] = Field(default=None, description="Final result (for reference)")

    class Config:
        """Pydantic configuration"""
        json_schema_extra = {
            "example": {
                "code_module": "AAA",
                "code_presentation": "2013J",
                "id_student": 11391,
                "gender": "M",
                "region": "East Anglian Region",
                "highest_education": "HE Qualification",
                "imd_band": "90-100%",
                "age_band": "55<=",
                "disability": "N",
                "num_of_prev_attempts": 0,
                "studied_credits": 240,
                "completed_course": True,
                "withdrawal_status": False,
                "total_clicks": 1500.5,
                "avg_clicks_per_session": 25.3,
                "click_variability": 15.2,
                "total_sessions": 60,
                "active_days": 45,
                "engagement_duration": 120.5,
                "daily_engagement_rate": 0.75,
                "first_access_day": 5,
                "last_access_day": 180,
                "avg_assessment_score": 75.5,
                "score_consistency": 5.2,
                "total_assessments": 8,
                "first_submission": 15,
                "last_submission": 170,
                "banked_assessments": 2
            }
        }
