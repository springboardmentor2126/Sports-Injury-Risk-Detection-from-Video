function formatValue(value) {
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toFixed(2) : String(value);
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : 'N/A';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function escapePdfText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrapText(text, maxLength = 92) {
  const rawText = String(text ?? '');
  if (rawText.length <= maxLength) {
    return [rawText];
  }

  const words = rawText.split(' ');
  const lines = [];
  let currentLine = '';

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length <= maxLength) {
      currentLine = candidate;
      return;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    if (word.length > maxLength) {
      lines.push(word.slice(0, maxLength));
      currentLine = word.slice(maxLength);
    } else {
      currentLine = word;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function normalizeRiskLevel(value) {
  const normalized = String(value || '').trim().toLowerCase();

  if (normalized === 'high') {
    return 'High Risk';
  }

  if (normalized === 'medium') {
    return 'Medium Risk';
  }

  return 'Low Risk';
}

function getValueAtPath(source, path, fallback = undefined) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return fallback;
  }

  return path.reduce((current, key) => {
    if (current && typeof current === 'object' && !Array.isArray(current) && Object.prototype.hasOwnProperty.call(current, key)) {
      return current[key];
    }

    return undefined;
  }, source) ?? fallback;
}

function resolveNumericValue(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return undefined;
    }

    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : undefined;
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return resolveNumericValue(getValueAtPath(value, ['average'], undefined))
      ?? resolveNumericValue(getValueAtPath(value, ['avg'], undefined))
      ?? resolveNumericValue(getValueAtPath(value, ['value'], undefined));
  }

  return undefined;
}

function getNumericReportValue(report, paths) {
  if (!report || typeof report !== 'object') {
    return undefined;
  }

  for (const path of paths) {
    const value = getValueAtPath(report, path, undefined);
    const numeric = resolveNumericValue(value);
    if (numeric !== undefined) {
      return numeric;
    }
  }

  return undefined;
}

function getMetricEntries(report) {
  const source = report?.analysis && typeof report.analysis === 'object' && !Array.isArray(report.analysis)
    ? report.analysis
    : report;

  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return [];
  }

  const metricDefinitions = [
    ['left_knee_angle', 'Left Knee Angle'],
    ['right_knee_angle', 'Right Knee Angle'],
    ['left_hip_angle', 'Left Hip Angle'],
    ['right_hip_angle', 'Right Hip Angle'],
    ['shoulder_alignment', 'Shoulder Alignment'],
    ['torso_lean', 'Torso Lean'],
    ['balance_score', 'Balance Score'],
    ['stride_length', 'Stride Length'],
    ['pose_quality_score', 'Pose Quality Score'],
  ];

  return metricDefinitions
    .map(([key, label]) => {
      const sourceHasKey = source && typeof source === 'object' && !Array.isArray(source) && Object.prototype.hasOwnProperty.call(source, key);
      const reportHasKey = report && typeof report === 'object' && !Array.isArray(report) && Object.prototype.hasOwnProperty.call(report, key);

      if (!sourceHasKey && !reportHasKey) {
        return null;
      }

      const value = sourceHasKey ? source[key] : report[key];

      if (value === undefined || value === '') {
        return {
          label,
          average: 'N/A',
          min: 'N/A',
          max: 'N/A',
          stdDev: 'N/A',
        };
      }

      const stats = value && typeof value === 'object' && !Array.isArray(value)
        ? {
            average: getValueAtPath(value, ['average'], undefined) ?? getValueAtPath(value, ['avg'], undefined),
            minimum: getValueAtPath(value, ['minimum'], undefined) ?? getValueAtPath(value, ['min'], undefined),
            maximum: getValueAtPath(value, ['maximum'], undefined) ?? getValueAtPath(value, ['max'], undefined),
            stdDev: getValueAtPath(value, ['std_dev'], undefined) ?? getValueAtPath(value, ['stdDev'], undefined) ?? getValueAtPath(value, ['standard_deviation'], undefined),
          }
        : null;

      if (stats && (stats.average !== undefined || stats.minimum !== undefined || stats.maximum !== undefined || stats.stdDev !== undefined)) {
        return {
          label,
          average: formatMetricValue(stats.average),
          min: formatMetricValue(stats.minimum),
          max: formatMetricValue(stats.maximum),
          stdDev: formatMetricValue(stats.stdDev),
        };
      }

      return {
        label,
        average: formatMetricValue(value),
        min: 'N/A',
        max: 'N/A',
        stdDev: 'N/A',
      };
    })
    .filter(Boolean);
}

function formatMetricValue(value) {
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toFixed(2) : String(value);
  }

  return formatValue(value);
}

function formatDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function getDisplayValue(value, fallback = 'N/A') {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toFixed(2) : String(value);
  }

  return String(value);
}

function createLine(fragments) {
  return { fragments };
}

function flattenContentLine(line) {
  if (typeof line === 'string') {
    return line;
  }

  if (line && Array.isArray(line.fragments)) {
    return line.fragments.map((fragment) => String(fragment.text)).join(' ').replace(/\s+/g, ' ').trim();
  }

  return '';
}

function wrapTextWithPrefix(text, prefix, maxLength = 92) {
  const wrappedLines = wrapText(text, maxLength - prefix.length);
  if (!wrappedLines.length) {
    return [prefix.trim()];
  }

  return [prefix + wrappedLines[0], ...wrappedLines.slice(1).map((line) => `   ${line}`)];
}

function getTextWidth(text, fontSize) {
  return String(text).length * fontSize * 0.55;
}

function getRecommendationText(recommendations) {
  if (!Array.isArray(recommendations)) {
    return [];
  }

  return recommendations
    .map((item) => {
      if (typeof item === 'string') {
        return item.replace(/¢/g, '').trim();
      }

      if (item && typeof item === 'object') {
        const title = typeof item.title === 'string' ? item.title.replace(/¢/g, '').trim() : '';
        const description = typeof item.description === 'string' ? item.description.replace(/¢/g, '').trim() : '';
        return title && description ? `${title}: ${description}` : title || description;
      }

      return '';
    })
    .filter(Boolean);
}

function getDetectedIssues(report) {
  const issues = report?.detected_issues;
  if (Array.isArray(issues) && issues.length) {
    return issues.map((item) => String(item).replace(/¢/g, '').trim()).filter(Boolean);
  }

  const movementQuality = report?.movement_quality ?? report?.analysis?.movement_quality;
  if (!movementQuality || typeof movementQuality !== 'object' || Array.isArray(movementQuality)) {
    return [];
  }

  const issueEntries = [];
  if (movementQuality.shoulder_imbalance === true) issueEntries.push('Shoulder alignment issue detected');
  if (movementQuality.excessive_torso_lean === true) issueEntries.push('Excessive torso lean detected');
  if (movementQuality.hip_drop === true) issueEntries.push('Hip drop detected');
  if (movementQuality.knee_valgus === true) issueEntries.push('Knee valgus detected');
  if (movementQuality.posture_instability === true) issueEntries.push('Posture instability detected');
  if (movementQuality.poor_squat_depth === true) issueEntries.push('Poor squat depth detected');

  return issueEntries;
}

function buildAnalysisSummaryLines(report) {
  const framesAnalyzed = report?.frames_processed ?? report?.analysis?.frames_processed ?? report?.metadata?.total_frames ?? report?.pose_data?.length ?? 'N/A';
  const poseFramesDetected = report?.pose_frames_detected ?? report?.analysis?.pose_frames_detected ?? report?.metadata?.pose_frames_detected ?? report?.pose_data?.length ?? 'N/A';
  const processingStatus = report?.status || report?.processing_status || 'Completed';

  return [
    `Pose frames detected: ${getDisplayValue(poseFramesDetected, 'N/A')}`,
    `Frames analyzed: ${getDisplayValue(framesAnalyzed, 'N/A')}`,
    `Processing status: ${getDisplayValue(processingStatus, 'N/A')}`,
  ];
}

function buildMinimalPdf(pages) {
  const pageEntries = Array.isArray(pages) ? pages : [pages];
  const lineHeight = 16;
  const contentObjectStart = 3 + pageEntries.length;
  const font1ObjectId = 3 + pageEntries.length * 2;
  const font2ObjectId = 4 + pageEntries.length * 2;

  const pageStreams = pageEntries.map((page) => {
    const streamParts = ['BT'];
    const topY = 760;

    page.lines.forEach((line, index) => {
      const y = topY - index * lineHeight;
      const fragments =
        typeof line === 'string'
          ? [{ x: 72, text: String(line), fontSize: 10, fontName: '/F1' }]
          : line.fragments.map((fragment) => ({
              x: fragment.x ?? 72,
              text: String(fragment.text),
              fontSize: fragment.fontSize ?? 10,
              fontName: fragment.fontName ?? '/F1',
              underline: fragment.underline === true,
            }));

      fragments.forEach((fragment) => {
        streamParts.push(`${fragment.fontName} ${fragment.fontSize} Tf`);
        streamParts.push(`1 0 0 1 ${fragment.x} ${y} Tm`);
        streamParts.push(`(${escapePdfText(fragment.text)}) Tj`);

        if (fragment.underline) {
          const underlineWidth = getTextWidth(fragment.text, fragment.fontSize);
          streamParts.push('ET');
          streamParts.push('0.5 w');
          streamParts.push(`${fragment.x} ${y - 2} m`);
          streamParts.push(`${fragment.x + underlineWidth} ${y - 2} l`);
          streamParts.push('S');
          streamParts.push('BT');
        }
      });
    });

    if (page.footer) {
      streamParts.push('/F1 9 Tf');
      streamParts.push(`1 0 0 1 72 30 Tm`);
      streamParts.push(`(${escapePdfText(page.footer)}) Tj`);
    }

    streamParts.push('ET');
    return streamParts.join('\n');
  });

  const streamLengthValues = pageStreams.map((stream) => stream.length);
  const objects = [];
  let pdf = '%PDF-1.4\n';

  const addObject = (body) => {
    const offset = pdf.length;
    objects.push(offset);
    pdf += `${objects.length} 0 obj\n${body}\nendobj\n`;
  };

  addObject('<< /Type /Catalog /Pages 2 0 R >>');
  addObject(`<< /Type /Pages /Kids [${pageEntries.map((_, index) => `${index + 3} 0 R`).join(' ')}] /Count ${pageEntries.length} >>`);

  pageEntries.forEach((_, index) => {
    const contentObjectId = contentObjectStart + index;
    addObject(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentObjectId} 0 R /Resources << /Font << /F1 ${font1ObjectId} 0 R /F2 ${font2ObjectId} 0 R >> >> >>`);
  });

  pageEntries.forEach((_, index) => {
    const contentObjectId = contentObjectStart + index;
    addObject(`<< /Length ${streamLengthValues[index]} >>\nstream\n${pageStreams[index]}\nendstream`);
  });

  addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

  const xrefOffset = pdf.length;
  pdf += 'xref\n';
  pdf += `0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';

  objects.forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });

  pdf += 'trailer\n';
  pdf += `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n`;
  pdf += '%%EOF\n';

  return pdf;
}

function buildAthleteDetailsLines(report, athleteName, videoName) {
  const displayAthlete = getDisplayValue(athleteName, 'N/A');
  const displayVideo = getDisplayValue(videoName, 'N/A');
  const duration = getDisplayValue(report?.duration ?? report?.metadata?.duration ?? report?.analysis?.duration, 'N/A');
  const framesProcessed = getDisplayValue(
    report?.frames_processed ?? report?.analysis?.frames_processed ?? report?.metadata?.total_frames ?? report?.pose_data?.length,
    'N/A',
  );
  const processingStatus = getDisplayValue(report?.status ?? report?.processing_status ?? 'Completed', 'N/A');

  return [
    createLine([
      { x: 72, text: 'Athlete Name:', fontSize: 10 },
      { x: 170, text: displayAthlete, fontSize: 10 },
      { x: 360, text: 'Video Name:', fontSize: 10 },
      { x: 430, text: displayVideo, fontSize: 10 },
    ]),
    createLine([
      { x: 72, text: 'Video Duration:', fontSize: 10 },
      { x: 170, text: duration, fontSize: 10 },
      { x: 360, text: 'Frames Processed:', fontSize: 10 },
      { x: 450, text: framesProcessed, fontSize: 10 },
    ]),
    createLine([
      { x: 72, text: 'Processing Status:', fontSize: 10 },
      { x: 170, text: processingStatus, fontSize: 10 },
    ]),
  ];
}

function buildRiskSummaryLines(report, detectedIssues, poseQualityScore) {
  const riskScore = getNumericReportValue(report, [
    ['risk_score'],
    ['riskScore'],
  ]);
  const riskScoreText = riskScore === undefined ? 'N/A' : `${riskScore.toFixed(2)}/100`;
  const riskLevel = normalizeRiskLevel(report?.injury_risk || report?.risk_level);
  const issuesCount = detectedIssues.length;
  const balanceScore = getNumericReportValue(report, [
    ['analysis', 'average_balance_score'],
    ['analysis', 'balance_score'],
    ['balance_score'],
  ]);
  const balanceText = balanceScore === undefined ? 'N/A' : balanceScore.toFixed(2);
  const poseQualityText = poseQualityScore === undefined ? 'N/A' : poseQualityScore.toFixed(2);

  return [
    createLine([{ x: 72, text: 'Risk Score:', fontSize: 10 }, { x: 150, text: riskScoreText, fontSize: 18 }, { x: 360, text: 'Risk Level:', fontSize: 10 }, { x: 430, text: riskLevel, fontSize: 14 }]),
    '',
    createLine([{ x: 72, text: 'Balance Score', fontSize: 10 }, { x: 170, text: balanceText, fontSize: 12 }, { x: 360, text: 'Pose Quality Score', fontSize: 10 }, { x: 470, text: poseQualityText, fontSize: 12 }]),
    createLine([{ x: 72, text: 'Issues Detected', fontSize: 10 }, { x: 170, text: String(issuesCount), fontSize: 12 }]),
  ];
}

function buildMovementMetricsLines(metricEntries) {
  if (!metricEntries.length) {
    return ['No movement metrics available.'];
  }

  const headerLine = createLine([
    { x: 72, text: 'Metric', fontSize: 10 },
    { x: 220, text: 'Average', fontSize: 10 },
    { x: 320, text: 'Minimum', fontSize: 10 },
    { x: 420, text: 'Maximum', fontSize: 10 },
    { x: 520, text: 'Std Dev', fontSize: 10 },
  ]);

  const rows = metricEntries.map((entry) =>
    createLine([
      { x: 72, text: entry.label, fontSize: 10 },
      { x: 220, text: entry.average, fontSize: 10 },
      { x: 320, text: entry.min, fontSize: 10 },
      { x: 420, text: entry.max, fontSize: 10 },
      { x: 520, text: entry.stdDev, fontSize: 10 },
    ]),
  );

  return [headerLine, ...rows];
}

function buildIssueLines(detectedIssues) {
  if (!detectedIssues.length) {
    return ['No movement issues detected.'];
  }

  return detectedIssues.flatMap((issue, index) => wrapTextWithPrefix(issue, `${index + 1}. `, 92));
}

function buildRecommendationLines(recommendations) {
  if (!recommendations.length) {
    return ['No recommendations available.'];
  }

  return recommendations.flatMap((recommendation, index) => wrapTextWithPrefix(recommendation, `${index + 1}. `, 92));
}

function buildContentLines(report, athleteName, videoName) {
  const recommendations = getRecommendationText(report?.recommendations ?? []);
  const detectedIssues = getDetectedIssues(report);
  const metricEntries = getMetricEntries(report);
  const poseQuality = getNumericReportValue(report, [
    ['analysis', 'pose_quality_score'],
    ['pose_quality_score'],
  ]);

  return [
    createLine([{ x: 72, text: 'Sports Injury Risk Assessment Report', fontSize: 18 }]),
    createLine([{ x: 72, text: 'AI-Powered Athlete Movement & Injury Risk Analysis', fontSize: 12 }]),
    '',
    createLine([{ x: 72, text: 'Athlete Information', fontSize: 12, fontName: '/F2', underline: true }]),
    ...buildAthleteDetailsLines(report, athleteName, videoName),
    '',
    createLine([{ x: 72, text: 'Risk Summary', fontSize: 12, fontName: '/F2', underline: true }]),
    ...buildRiskSummaryLines(report, detectedIssues, poseQuality),
    '',
    createLine([{ x: 72, text: 'Movement Metrics', fontSize: 12, fontName: '/F2', underline: true }]),
    ...buildMovementMetricsLines(metricEntries),
    '',
    createLine([{ x: 72, text: 'Detected Issues', fontSize: 12, fontName: '/F2', underline: true }]),
    ...buildIssueLines(detectedIssues),
    '',
    createLine([{ x: 72, text: 'Recommendations', fontSize: 12, fontName: '/F2', underline: true }]),
    ...buildRecommendationLines(recommendations),
    '',
    createLine([{ x: 72, text: 'Analysis Summary', fontSize: 12, fontName: '/F2', underline: true }]),
    ...buildAnalysisSummaryLines(report),
  ];
}

function buildPdfPages(contentLines, pageSize = 38) {
  const pages = [];
  const lines = contentLines.filter((line) => line !== undefined && line !== null);
  let currentPage = [];

  lines.forEach((line) => {
    currentPage.push(line);
    if (currentPage.length >= pageSize) {
      pages.push({ lines: currentPage, footer: '' });
      currentPage = [];
    }
  });

  if (currentPage.length) {
    pages.push({ lines: currentPage, footer: '' });
  }

  const totalPages = pages.length || 1;

  return pages.map((page, index) => ({
    lines: page.lines,
    footer: `Page ${index + 1} of ${totalPages}`,
  }));
}

export function buildReportPdfData(report, athleteName, videoName) {
  const recommendations = getRecommendationText(report?.recommendations ?? []);
  const detectedIssues = getDetectedIssues(report);
  const metricEntries = getMetricEntries(report);
  const riskLevel = normalizeRiskLevel(report?.injury_risk || report?.risk_level);
  const contentLines = buildContentLines(report, athleteName, videoName);
  const pages = buildPdfPages(contentLines);
  const content = contentLines.map(flattenContentLine).filter(Boolean).join('\n').trim();

  return {
    filename: 'Injury_Risk_Report.pdf',
    content,
    sections: [
      {
        title: 'Athlete Information',
        lines: buildAthleteDetailsLines(report, athleteName, videoName).map(flattenContentLine),
      },
      {
        title: 'Risk Summary',
        lines: [
          `Risk Score: ${
            report?.risk_score ?? report?.riskScore ?? 'N/A'
          }`,
          `Risk Level: ${riskLevel}`,
        ],
      },
      {
        title: 'Movement Metrics',
        lines: buildMovementMetricsLines(metricEntries).map(flattenContentLine),
      },
      {
        title: 'Detected Issues',
        lines: detectedIssues.length ? detectedIssues.map((issue) => `• ${issue}`) : ['No movement issues detected.'],
      },
      {
        title: 'Recommendations',
        lines: recommendations.length ? recommendations.map((recommendation) => `• ${recommendation}`) : ['No recommendations available.'],
      },
      {
        title: 'Analysis Summary',
        lines: buildAnalysisSummaryLines(report),
      },
    ],
    pages,
  };
}

export function downloadReportPdf(report, athleteName, videoName) {
  const pdfData = buildReportPdfData(report, athleteName, videoName);
  const pdfContent = buildMinimalPdf(pdfData.pages);
  const blob = new Blob([pdfContent], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = pdfData.filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

export { buildMinimalPdf };
