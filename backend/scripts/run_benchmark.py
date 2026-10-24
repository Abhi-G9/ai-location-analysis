"""
Systematic Benchmark Evaluation Runner
Measures Top-1 accuracy, Top-5 accuracy, False Positive rate, and Abstention rate
on positive, challenging, and negative samples using genuine reference models.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.app.services.evaluation_service import run_benchmark_evaluation

def main():
    report = run_benchmark_evaluation()
    print("\n=======================================================")
    print("      AI LOCATION ANALYSIS — BENCHMARK EVALUATION      ")
    print("=======================================================")
    print(f"Total Test Samples evaluated: {report['total_samples']}")
    print(f"Positive & Challenging Cases:  {report['positive_samples_count']}")
    print(f"Negative (Non-Place) Cases:    {report['negative_samples_count']}")
    print("-------------------------------------------------------")
    print(f"Top-1 Accuracy:                {report['top_1_accuracy_percent']:.1f}%")
    print(f"Top-5 Accuracy:                {report['top_5_accuracy_percent']:.1f}%")
    print(f"Abstention Rate on Negatives:  {report['negative_abstention_rate_percent']:.1f}%")
    print(f"False Location Rate:           {report['false_positive_rate_percent']:.1f}%")
    med_err = report.get('median_error_km')
    print(f"Median Geographic Error:       {med_err:.2f} km" if med_err is not None else "Median Geographic Error:       N/A")
    print("-------------------------------------------------------")
    print("Detailed Sample Breakdown:")
    for s in report['sample_results']:
        stype = s['sample_type'].upper()
        sid = s['sample_id']
        pred = s.get('predicted_top_1_name') or "Abstained / None"
        conf = s['confidence_category']
        corr = s['is_top_1_correct']
        abstained = s['abstained']
        print(f"  [{stype:11}] {sid:28} | Pred: {pred[:28]:28} | Conf: {conf:20} | Correct: {str(corr):5} | Abstained: {abstained}")
    print("=======================================================\n")

if __name__ == "__main__":
    main()
