import json
import os


class ReportGenerator:

    @staticmethod
    def save_report(result):

        os.makedirs("reports", exist_ok=True)

        filename = "reports/report.json"

        with open(filename, "w") as file:
            json.dump(result, file, indent=4)

        return filename