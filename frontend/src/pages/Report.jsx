import { useLocation, useNavigate } from "react-router-dom";
import MainLayout from "../components/MainLayout";
import "./Report.css";

function Report() {
    const location = useLocation();
    const navigate = useNavigate();

    const report = location.state?.report;

    // =====================================================
    // NO REPORT
    // =====================================================

    if (!report) {
        return (
            <MainLayout>
                <div className="report-page">
                    <div className="report-container no-report">
                        <div className="no-report-icon">📋</div>

                        <h2>No Report Found</h2>

                        <p>
                            No injury analysis report is currently
                            available. Please upload a movement video
                            and perform an analysis first.
                        </p>

                        <button
                            type="button"
                            className="back-button"
                            onClick={() => navigate("/upload-video")}
                        >
                            Go to Video Analysis
                        </button>
                    </div>
                </div>
            </MainLayout>
        );
    }

    // =====================================================
    // SAFE DATA
    // =====================================================

    const biomechanics = report.biomechanics || {};
    const assessment = report.assessment || {};

    const athleteName =
        report.athlete ||
        report.full_name ||
        "Athlete";

    const riskLevel =
        assessment.risk_level ||
        "Not Available";

    const riskScore =
        assessment.risk_score ?? "N/A";

    const recommendation =
        report.recommendation ||
        "No recommendation available.";

    // =====================================================
    // SAFE NUMBER FORMATTER
    // =====================================================

    const formatAngle = (value) => {
        const number = Number(value);

        if (Number.isNaN(number)) {
            return "N/A";
        }

        return `${number.toFixed(2)}°`;
    };

    // =====================================================
    // STATUS
    // =====================================================

    const getStatus = (value, limit) => {
        const number = Number(value);

        if (Number.isNaN(number)) {
            return "Not Available";
        }

        return number < limit
            ? "Needs Attention"
            : "Normal";
    };

    // =====================================================
    // RISK CLASS
    // =====================================================

    const getRiskClass = (level) => {
        const normalizedLevel =
            String(level).toLowerCase();

        if (normalizedLevel.includes("high")) {
            return "risk-high";
        }

        if (normalizedLevel.includes("moderate")) {
            return "risk-moderate";
        }

        if (normalizedLevel.includes("low")) {
            return "risk-low";
        }

        return "risk-unknown";
    };

    // =====================================================
    // DOWNLOAD / PRINT
    // =====================================================

    const handleDownload = () => {
        window.print();
    };

    const handlePrint = () => {
        window.print();
    };

    // =====================================================
    // PAGE
    // =====================================================

    return (
        <MainLayout>
            <div className="report-page">

                {/* =================================================
                    REPORT HEADER
                ================================================= */}

                <div className="report-container">

                    <div className="report-header">

                        <div className="report-heading">

                            <span className="report-badge">
                                AI ANALYSIS
                            </span>

                            <h1>
                                Sports Injury Risk Analysis
                            </h1>

                            <p>
                                AI-powered biomechanical movement
                                assessment report.
                            </p>

                        </div>

                        <div className="report-date">

                            <span>
                                Report Date
                            </span>

                            <strong>
                                {new Date().toLocaleDateString()}
                            </strong>

                        </div>

                    </div>

                    {/* =================================================
                        ATHLETE + RISK
                    ================================================= */}

                    <div className="report-row">

                        {/* Athlete Information */}

                        <div className="report-box">

                            <div className="section-heading">

                                <span className="section-icon">
                                    👤
                                </span>

                                <div>
                                    <h3>
                                        Athlete Information
                                    </h3>

                                    <p>
                                        Registered athlete details
                                    </p>
                                </div>

                            </div>

                            <div className="info-list">

                                <div className="info-item">

                                    <span>
                                        Athlete Name
                                    </span>

                                    <strong>
                                        {athleteName}
                                    </strong>

                                </div>

                                <div className="info-item">

                                    <span>
                                        Analysis Date
                                    </span>

                                    <strong>
                                        {new Date().toLocaleDateString()}
                                    </strong>

                                </div>

                                <div className="info-item">

                                    <span>
                                        AI Engine
                                    </span>

                                    <strong>
                                        MediaPipe Pose
                                    </strong>

                                </div>

                            </div>

                        </div>

                        {/* Risk Evaluation */}

                        <div className="report-box risk-evaluation">

                            <div className="section-heading">

                                <span className="section-icon">
                                    ⚠️
                                </span>

                                <div>
                                    <h3>
                                        Risk Evaluation
                                    </h3>

                                    <p>
                                        Overall injury risk assessment
                                    </p>
                                </div>

                            </div>

                            <div className="risk-content">

                                <div
                                    className={`risk-level ${getRiskClass(
                                        riskLevel
                                    )}`}
                                >
                                    {riskLevel}
                                </div>

                                <div className="risk-score">

                                    <span>
                                        Risk Score
                                    </span>

                                    <strong>
                                        {riskScore}
                                    </strong>

                                </div>

                            </div>

                        </div>

                    </div>

                    {/* =================================================
                        BIOMECHANICAL ANALYSIS
                    ================================================= */}

                    <div className="section">

                        <div className="section-title">

                            <div>
                                <h2>
                                    Biomechanical Analysis
                                </h2>

                                <p>
                                    Joint movement measurements
                                    detected from the uploaded video.
                                </p>
                            </div>

                        </div>

                        <div className="table-wrapper">

                            <table>

                                <thead>

                                    <tr>
                                        <th>
                                            Joint
                                        </th>

                                        <th>
                                            Angle
                                        </th>

                                        <th>
                                            Status
                                        </th>
                                    </tr>

                                </thead>

                                <tbody>

                                    <tr>

                                        <td>
                                            Left Knee
                                        </td>

                                        <td>
                                            {formatAngle(
                                                biomechanics.left_knee_angle
                                            )}
                                        </td>

                                        <td>

                                            <span
                                                className={
                                                    getStatus(
                                                        biomechanics.left_knee_angle,
                                                        120
                                                    ) === "Normal"
                                                        ? "status-normal"
                                                        : "status-attention"
                                                }
                                            >
                                                {getStatus(
                                                    biomechanics.left_knee_angle,
                                                    120
                                                )}
                                            </span>

                                        </td>

                                    </tr>

                                    <tr>

                                        <td>
                                            Right Knee
                                        </td>

                                        <td>
                                            {formatAngle(
                                                biomechanics.right_knee_angle
                                            )}
                                        </td>

                                        <td>

                                            <span
                                                className={
                                                    getStatus(
                                                        biomechanics.right_knee_angle,
                                                        120
                                                    ) === "Normal"
                                                        ? "status-normal"
                                                        : "status-attention"
                                                }
                                            >
                                                {getStatus(
                                                    biomechanics.right_knee_angle,
                                                    120
                                                )}
                                            </span>

                                        </td>

                                    </tr>

                                    <tr>

                                        <td>
                                            Hip
                                        </td>

                                        <td>
                                            {formatAngle(
                                                biomechanics.hip_angle
                                            )}
                                        </td>

                                        <td>

                                            <span
                                                className={
                                                    getStatus(
                                                        biomechanics.hip_angle,
                                                        150
                                                    ) === "Normal"
                                                        ? "status-normal"
                                                        : "status-attention"
                                                }
                                            >
                                                {getStatus(
                                                    biomechanics.hip_angle,
                                                    150
                                                )}
                                            </span>

                                        </td>

                                    </tr>

                                    <tr>

                                        <td>
                                            Ankle
                                        </td>

                                        <td>
                                            {formatAngle(
                                                biomechanics.ankle_angle
                                            )}
                                        </td>

                                        <td>

                                            <span
                                                className={
                                                    getStatus(
                                                        biomechanics.ankle_angle,
                                                        120
                                                    ) === "Normal"
                                                        ? "status-normal"
                                                        : "status-attention"
                                                }
                                            >
                                                {getStatus(
                                                    biomechanics.ankle_angle,
                                                    120
                                                )}
                                            </span>

                                        </td>

                                    </tr>

                                    <tr>

                                        <td>
                                            Shoulder
                                        </td>

                                        <td>
                                            {formatAngle(
                                                biomechanics.shoulder_angle
                                            )}
                                        </td>

                                        <td>

                                            <span
                                                className={
                                                    getStatus(
                                                        biomechanics.shoulder_angle,
                                                        120
                                                    ) === "Normal"
                                                        ? "status-normal"
                                                        : "status-attention"
                                                }
                                            >
                                                {getStatus(
                                                    biomechanics.shoulder_angle,
                                                    120
                                                )}
                                            </span>

                                        </td>

                                    </tr>

                                </tbody>

                            </table>

                        </div>

                    </div>

                    {/* =================================================
                        RECOMMENDATION
                    ================================================= */}

                    <div className="section">

                        <div className="section-title">

                            <div>

                                <h2>
                                    Recommendation
                                </h2>

                                <p>
                                    Suggested action based on the
                                    analysis.
                                </p>

                            </div>

                        </div>

                        <div className="recommendation-box">

                            <div className="recommendation-icon">
                                💡
                            </div>

                            <div>

                                <h3>
                                    AI Recommendation
                                </h3>

                                <p>
                                    {recommendation}
                                </p>

                            </div>

                        </div>

                    </div>

                    {/* =================================================
                        ACTION BUTTONS
                    ================================================= */}

                    <div className="report-actions">

                        <button
                            type="button"
                            className="back-button"
                            onClick={() =>
                                navigate("/upload-video")
                            }
                        >
                            ← Back
                        </button>

                        <div className="action-right">

                            <button
                                type="button"
                                className="print-button"
                                onClick={handlePrint}
                            >
                                🖨️ Print Report
                            </button>

                            <button
                                type="button"
                                className="download-button"
                                onClick={handleDownload}
                            >
                                ⬇ Download PDF
                            </button>

                        </div>

                    </div>

                </div>

            </div>
        </MainLayout>
    );
}

export default Report;