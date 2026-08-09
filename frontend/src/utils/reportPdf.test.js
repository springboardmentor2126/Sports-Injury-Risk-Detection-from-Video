import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReportPdfData } from './reportPdf.js';

test('buildReportPdfData includes the current athlete report details', () => {
  const report = {
    injury_risk: 'high',
    risk_score: 88.5,
    recommendations: [{ title: 'Rest', description: 'Take a recovery day.' }],
    detected_issues: ['Knee valgus'],
    analysis: {
      left_knee_angle: { average: 90, minimum: 80, maximum: 100 },
      shoulder_alignment: { average: 2.2, minimum: 1.0, maximum: 3.0 },
    },
  };

  const data = buildReportPdfData(report, 'Maya Chen', 'Warmup Session');

  assert.equal(data.filename, 'Injury_Risk_Report.pdf');
  assert.ok(data.sections.some((section) => section.title === 'Athlete Information'));
  assert.ok(data.sections.some((section) => section.title === 'Risk Summary'));
  assert.ok(data.sections.some((section) => section.title === 'Movement Metrics'));
  assert.ok(data.sections.some((section) => section.title === 'Recommendations'));
  assert.ok(data.content.includes('Athlete Name: Maya Chen'));
  assert.ok(data.content.includes('Video Name: Warmup Session'));
  assert.ok(!data.content.includes('Analysis Date:'));
  assert.ok(data.content.includes('Risk Score: 88.50/100'));
  assert.ok(data.content.includes('Risk Level: High Risk'));
  assert.ok(data.content.includes('Left Knee Angle'));
  assert.ok(data.content.includes('Rest'));
});

test('buildReportPdfData keeps missing values explicit and includes summary sections', () => {
  const report = {
    injury_risk: 'medium',
    risk_score: 87.04,
    recommendations: [{ title: 'Improve Upright Posture', description: 'Strengthen core muscles.' }],
    detected_issues: ['Shoulder alignment issue detected', 'Knee valgus detected'],
    status: 'completed',
    frames_processed: 240,
    analysis: {
      balance_score: 0,
      pose_quality_score: 78.5,
      left_knee_angle: { average: 90, minimum: 80, maximum: 100, std_dev: 5 },
      right_knee_angle: 92,
      left_hip_angle: { average: 100, minimum: 90, maximum: 110, std_dev: 8 },
    },
  };

  const data = buildReportPdfData(report, 'Maya Chen', 'Warmup Session');

  assert.ok(data.content.includes('Sports Injury Risk Assessment Report'));
  assert.ok(data.content.includes('Risk Score: 87.04/100'));
  assert.ok(data.content.includes('Risk Level: Medium Risk'));
  assert.ok(data.content.includes('Balance Score'));
  assert.ok(data.content.includes('Pose Quality Score'));
  assert.ok(!data.content.includes('Stability Score'));
  assert.ok(!data.content.includes('Analysis Date:'));
  assert.ok(data.content.includes('N/A'));
  assert.ok(data.sections.some((section) => section.title === 'Detected Issues'));
  assert.ok(data.sections.some((section) => section.title === 'Recommendations'));
  assert.ok(data.sections.some((section) => section.title === 'Analysis Summary'));
});
