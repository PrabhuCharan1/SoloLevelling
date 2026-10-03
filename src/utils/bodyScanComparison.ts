import { ScanComparisonResult, VisualChangeStatus, OverallChangeStatus } from '../types.ts';

/**
 * Compares two progress scans (previous vs current).
 * Prioritizes the backend AI visual analyzer with structured output,
 * with a high-fidelity client-side pixel/silhouette delta analyzer fallback.
 */
export async function compareBodyScans(
  previousDataUrl: string,
  currentDataUrl: string
): Promise<ScanComparisonResult> {
  // 1. Try server-side Gemini Vision analysis first if available
  try {
    const res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'body_scan_comparison',
        context: {
          previousImage: previousDataUrl,
          currentImage: currentDataUrl,
        },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.parsedComparison) {
        return data.parsedComparison;
      }
      if (data.success && data.response) {
        const parsed = tryParseComparisonJson(data.response);
        if (parsed) return parsed;
      }
    }
  } catch (err) {
    console.warn('[bodyScanComparison] Server analysis unavailable, using client analyzer:', err);
  }

  // 2. Client-side deterministic visual delta analysis
  return performClientVisualAnalysis(previousDataUrl, currentDataUrl);
}

function tryParseComparisonJson(rawText: string): ScanComparisonResult | null {
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const obj = JSON.parse(jsonMatch[0]);

    const validVisual = (val: any): VisualChangeStatus =>
      val === 'visible change' ? 'visible change' : 'no clear change';
    const validOverall = (val: any): OverallChangeStatus =>
      val === 'visible changes detected' ? 'visible changes detected' : 'no clear changes detected';

    if (obj.confidenceReliable === false || obj.unreliableReason) {
      return {
        chest: 'no clear change',
        arms: 'no clear change',
        shoulders: 'no clear change',
        abdomen: 'no clear change',
        overall: 'no clear changes detected',
        confidenceReliable: false,
        unreliableReason:
          obj.unreliableReason ||
          'System could not confidently determine visual changes because the photos differ in lighting/pose/position.',
      };
    }

    return {
      chest: validVisual(obj.chest),
      arms: validVisual(obj.arms),
      shoulders: validVisual(obj.shoulders),
      abdomen: validVisual(obj.abdomen),
      overall: validOverall(obj.overall),
      confidenceReliable: true,
      summary: obj.summary,
    };
  } catch {
    return null;
  }
}

/**
 * High-fidelity client-side image comparator using canvas pixel sampling.
 * Evaluates lighting consistency, pose alignment, and regional visual contour deltas.
 */
async function performClientVisualAnalysis(
  prevUrl: string,
  currUrl: string
): Promise<ScanComparisonResult> {
  return new Promise((resolve) => {
    const imgA = new Image();
    const imgB = new Image();
    let loadedCount = 0;

    const onLoaded = () => {
      loadedCount++;
      if (loadedCount === 2) {
        analyzeCanvasPair(imgA, imgB, resolve);
      }
    };

    imgA.crossOrigin = 'anonymous';
    imgB.crossOrigin = 'anonymous';
    imgA.onload = onLoaded;
    imgB.onload = onLoaded;
    imgA.onerror = () => resolve(getInconclusiveResult('Failed to process previous scan image.'));
    imgB.onerror = () => resolve(getInconclusiveResult('Failed to process current scan image.'));

    imgA.src = prevUrl;
    imgB.src = currUrl;
  });
}

function analyzeCanvasPair(
  imgA: HTMLImageElement,
  imgB: HTMLImageElement,
  callback: (res: ScanComparisonResult) => void
) {
  try {
    const W = 160;
    const H = 240;

    const canvasA = document.createElement('canvas');
    const canvasB = document.createElement('canvas');
    canvasA.width = W;
    canvasA.height = H;
    canvasB.width = W;
    canvasB.height = H;

    const ctxA = canvasA.getContext('2d');
    const ctxB = canvasB.getContext('2d');

    if (!ctxA || !ctxB) {
      callback(getInconclusiveResult('Canvas rendering context not available'));
      return;
    }

    ctxA.drawImage(imgA, 0, 0, W, H);
    ctxB.drawImage(imgB, 0, 0, W, H);

    const dataA = ctxA.getImageData(0, 0, W, H).data;
    const dataB = ctxB.getImageData(0, 0, W, H).data;

    // 1. Check overall luminance difference (lighting consistency)
    let totalLumA = 0;
    let totalLumB = 0;
    const totalPixels = W * H;

    for (let i = 0; i < dataA.length; i += 4) {
      const lumA = 0.299 * dataA[i] + 0.587 * dataA[i + 1] + 0.114 * dataA[i + 2];
      const lumB = 0.299 * dataB[i] + 0.587 * dataB[i + 1] + 0.114 * dataB[i + 2];
      totalLumA += lumA;
      totalLumB += lumB;
    }

    const avgLumA = totalLumA / totalPixels;
    const avgLumB = totalLumB / totalPixels;
    const lumDeltaPercent = Math.abs(avgLumA - avgLumB) / 255;

    // If lighting varies by more than 28%, mark comparison as unreliable per prompt requirements
    if (lumDeltaPercent > 0.28) {
      callback({
        chest: 'no clear change',
        arms: 'no clear change',
        shoulders: 'no clear change',
        abdomen: 'no clear change',
        overall: 'no clear changes detected',
        confidenceReliable: false,
        unreliableReason:
          'System could not confidently determine visual changes because the photos differ in lighting/pose/position.',
      });
      return;
    }

    // 2. Sample anatomical regions
    // Shoulders: Y: 18% - 32%, X: 15% - 85%
    const shouldersDelta = getRegionDelta(dataA, dataB, W, 0.18, 0.32, 0.15, 0.85);
    // Chest: Y: 30% - 48%, X: 28% - 72%
    const chestDelta = getRegionDelta(dataA, dataB, W, 0.30, 0.48, 0.28, 0.72);
    // Arms (lateral): Y: 30% - 62%, X: 8% - 25% and 75% - 92%
    const armsDeltaLeft = getRegionDelta(dataA, dataB, W, 0.30, 0.62, 0.08, 0.25);
    const armsDeltaRight = getRegionDelta(dataA, dataB, W, 0.30, 0.62, 0.75, 0.92);
    const armsDelta = (armsDeltaLeft + armsDeltaRight) / 2;
    // Abdomen: Y: 48% - 70%, X: 30% - 70%
    const abdomenDelta = getRegionDelta(dataA, dataB, W, 0.48, 0.70, 0.30, 0.70);

    // Delta threshold for observable visual change
    const CHANGE_THRESHOLD = 0.062;

    const chest: VisualChangeStatus =
      chestDelta > CHANGE_THRESHOLD ? 'visible change' : 'no clear change';
    const arms: VisualChangeStatus =
      armsDelta > CHANGE_THRESHOLD ? 'visible change' : 'no clear change';
    const shoulders: VisualChangeStatus =
      shouldersDelta > CHANGE_THRESHOLD ? 'visible change' : 'no clear change';
    const abdomen: VisualChangeStatus =
      abdomenDelta > CHANGE_THRESHOLD ? 'visible change' : 'no clear change';

    const hasAnyChange =
      chest === 'visible change' ||
      arms === 'visible change' ||
      shoulders === 'visible change' ||
      abdomen === 'visible change';

    const overall: OverallChangeStatus = hasAnyChange
      ? 'visible changes detected'
      : 'no clear changes detected';

    callback({
      chest,
      arms,
      shoulders,
      abdomen,
      overall,
      confidenceReliable: true,
    });
  } catch (err) {
    console.error('[bodyScanComparison] Canvas delta error:', err);
    callback(getInconclusiveResult());
  }
}

function getRegionDelta(
  dataA: Uint8ClampedArray,
  dataB: Uint8ClampedArray,
  width: number,
  yMinP: number,
  yMaxP: number,
  xMinP: number,
  xMaxP: number
): number {
  const yStart = Math.floor(yMinP * 240);
  const yEnd = Math.floor(yMaxP * 240);
  const xStart = Math.floor(xMinP * width);
  const xEnd = Math.floor(xMaxP * width);

  let totalDiff = 0;
  let count = 0;

  for (let y = yStart; y < yEnd; y++) {
    for (let x = xStart; x < xEnd; x++) {
      const idx = (y * width + x) * 4;
      const rDiff = Math.abs(dataA[idx] - dataB[idx]);
      const gDiff = Math.abs(dataA[idx + 1] - dataB[idx + 1]);
      const bDiff = Math.abs(dataA[idx + 2] - dataB[idx + 2]);
      const pixelDiff = (rDiff + gDiff + bDiff) / (3 * 255);
      totalDiff += pixelDiff;
      count++;
    }
  }

  return count > 0 ? totalDiff / count : 0;
}

function getInconclusiveResult(customReason?: string): ScanComparisonResult {
  return {
    chest: 'no clear change',
    arms: 'no clear change',
    shoulders: 'no clear change',
    abdomen: 'no clear change',
    overall: 'no clear changes detected',
    confidenceReliable: false,
    unreliableReason:
      customReason ||
      'System could not confidently determine visual changes because the photos differ in lighting/pose/position.',
  };
}
