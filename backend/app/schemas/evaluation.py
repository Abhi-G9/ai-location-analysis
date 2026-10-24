from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class EvaluationSampleResult(BaseModel):
    sample_id: str
    sample_type: str = Field(..., description="'positive', 'negative', or 'challenging'")
    description: str
    ground_truth_place_id: Optional[str] = None
    ground_truth_name: Optional[str] = None
    predicted_top_1_name: Optional[str] = None
    predicted_top_1_id: Optional[str] = None
    confidence_category: str
    precision_level: str
    estimated_error_km: Optional[float] = None
    actual_error_km: Optional[float] = None
    is_top_1_correct: bool
    is_top_5_correct: bool
    abstained: bool
    clues_provided: List[str] = []


class ModelCardEntry(BaseModel):
    model_name: str
    architecture: str
    primary_task: str
    feature_dimension: str
    rationale: str
    hardware_target: str


class EvaluationReport(BaseModel):
    timestamp: str
    dataset_scope: str = "Kota, Rajasthan, India Evaluation Benchmark"
    total_samples: int
    positive_samples_count: int
    negative_samples_count: int
    top_1_accuracy_percent: float
    top_5_accuracy_percent: float
    median_error_km: Optional[float] = None
    negative_abstention_rate_percent: float
    false_positive_rate_percent: float
    model_cards: List[ModelCardEntry] = []
    limitations: List[str] = []
    future_work: List[str] = []
    sample_results: List[EvaluationSampleResult] = []
