function formatLabel(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') {
    return 'Not available';
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : 'Not available';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

export function collectDisplayableAnalysisData(analysis) {
  const entries = [];

  if (analysis?.analysis && typeof analysis.analysis === 'object' && !Array.isArray(analysis.analysis)) {
    Object.entries(analysis.analysis).forEach(([key, value]) => {
      entries.push({ key, value });
    });
  }

  if (analysis?.injury_risk !== undefined && analysis?.injury_risk !== null && analysis.injury_risk !== '') {
    entries.push({ key: 'injury_risk', value: analysis.injury_risk });
  }

  if (Array.isArray(analysis?.recommendations) && analysis.recommendations.some((item) => item !== null && item !== undefined && String(item).trim() !== '')) {
    entries.push({ key: 'recommendations', value: analysis.recommendations });
  }

  if (analysis?.frames_processed !== undefined && analysis?.frames_processed !== null) {
    entries.push({ key: 'frames_processed', value: analysis.frames_processed });
  }

  if (analysis?.duration !== undefined && analysis?.duration !== null) {
    entries.push({ key: 'duration', value: analysis.duration });
  }

  if (analysis?.status !== undefined && analysis?.status !== null) {
    entries.push({ key: 'status', value: analysis.status });
  }

  return entries.map(({ key, value }) => ({
    label: formatLabel(key),
    value: formatValue(value),
  }));
}
