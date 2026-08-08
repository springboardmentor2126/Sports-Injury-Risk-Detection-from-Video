import os
from pathlib import Path
 
REPORTS_DIR = Path(__file__).parent.parent / "reports"
 
 
def delete_report_files(report) -> None:
    """
    Removes the generated PDF report from disk for a given Report ORM row.
    Safe to call even if the file is already gone.
    """
    if report is None:
        return
 
    if report.report_path:
        report_path = Path(report.report_path)
        if report_path.exists():
            os.remove(report_path)
    elif report.report_name:
        report_path = REPORTS_DIR / report.report_name
        if report_path.exists():
            os.remove(report_path)
 