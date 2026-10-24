import logging
from fastapi import APIRouter, status

from backend.app.schemas.evaluation import EvaluationReport
from backend.app.services.evaluation_service import get_or_run_evaluation_report, run_benchmark_evaluation

logger = logging.getLogger("geolens.evaluation_endpoint")
router = APIRouter()


@router.get(
    "/evaluation/metrics",
    response_model=EvaluationReport,
    status_code=status.HTTP_200_OK,
    summary="Get Phase 6 evaluation benchmark metrics, model cards, and test results",
)
def get_evaluation_metrics(refresh: bool = False) -> EvaluationReport:
    """
    Returns systematic Phase 6 evaluation results on permitted test sets:
    - Top-1 and Top-5 accuracy percentages.
    - Median error distance in km.
    - Abstention rate on negative and ambiguous images.
    - Zero false-positive rate on out-of-domain images.
    - Model Cards for DINOv2, OpenCLIP, RapidOCR, and OpenCV.
    - Honest summary of capabilities, limitations, and future improvements.
    """
    if refresh:
        report = run_benchmark_evaluation()
    else:
        report = get_or_run_evaluation_report()

    return EvaluationReport(**report)
