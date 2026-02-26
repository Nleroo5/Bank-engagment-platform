import type jsPDF from 'jspdf';

type RGB = [number, number, number];

// ── Color palette matching UI components ──
const GRAY_200: RGB = [229, 231, 235];
const GRAY_400: RGB = [156, 163, 175];
const GREEN_600: RGB = [22, 163, 74];
const AMBER_500: RGB = [245, 158, 11];
const ORANGE_500: RGB = [249, 115, 22];
const RED_500: RGB = [239, 68, 68];
const WHITE: RGB = [255, 255, 255];
const BRAND_BLUE: RGB = [0, 61, 165];

// Category colors matching src/components/charts/CategoryScoresChart.tsx
const CATEGORY_COLORS: Record<string, RGB> = {
  Communication: [59, 130, 246],
  Leadership: [139, 92, 246],
  Culture: [16, 185, 129],
  Accountability: [245, 158, 11],
  Execution: [239, 68, 68],
  Associate: [20, 184, 166],
  'Team Dynamics': [236, 72, 153],
};
const DEFAULT_CAT_COLOR: RGB = [107, 114, 128];

// Performance levels matching src/components/charts/EngagementGauge.tsx
const PERF_LEVELS = [
  { min: 80, color: GREEN_600, label: 'Excellent' },
  { min: 60, color: AMBER_500, label: 'Good' },
  { min: 40, color: ORANGE_500, label: 'Fair' },
  { min: 0, color: RED_500, label: 'Needs Improvement' },
];

function getPerf(pct: number): { min: number; color: RGB; label: string } {
  const found = PERF_LEVELS.find((l) => pct >= l.min);
  return found ?? { min: 0, color: RED_500, label: 'Needs Improvement' };
}

// Heatmap tiers matching src/components/charts/HeatmapChart.tsx scoreToHex
const HEATMAP_TIERS: Array<{ min: number; color: RGB; textWhite: boolean }> = [
  { min: 80, color: [22, 163, 74], textWhite: true },
  { min: 70, color: [74, 222, 128], textWhite: false },
  { min: 60, color: [187, 247, 208], textWhite: false },
  { min: 50, color: [253, 230, 138], textWhite: false },
  { min: 40, color: [251, 191, 36], textWhite: true },
  { min: 0, color: [248, 113, 113], textWhite: true },
];

export function getHeatmapColor(score: number, scaleMax: number): { fill: RGB; textWhite: boolean } {
  const pct = (score / scaleMax) * 100;
  const found = HEATMAP_TIERS.find((t) => pct >= t.min);
  const tier = found ?? { color: [248, 113, 113] as RGB, textWhite: true };
  return { fill: tier.color, textWhite: tier.textWhite };
}

// ── Drawing Primitives ──

function fillPolygon(doc: jsPDF, points: Array<[number, number]>, color: RGB) {
  if (points.length < 3) return;
  doc.setFillColor(color[0], color[1], color[2]);
  doc.setDrawColor(color[0], color[1], color[2]);
  const moves: Array<[number, number]> = [];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    moves.push([curr[0] - prev[0], curr[1] - prev[1]]);
  }
  const start = points[0]!;
  doc.lines(moves, start[0], start[1], [1, 1], 'F', true);
}

/**
 * Draw a thick arc band (donut segment) from startAngle to endAngle.
 * Angles in radians — 0=right, π/2=up, π=left.
 * In PDF y-inverted coords: cy - r*sin(angle) goes UP on screen.
 */
function drawArcBand(
  doc: jsPDF,
  cx: number, cy: number,
  outerR: number, innerR: number,
  startAngle: number, endAngle: number,
  color: RGB, steps = 48
) {
  if (Math.abs(endAngle - startAngle) < 0.005) return;
  const pts: Array<[number, number]> = [];
  // Outer arc: startAngle → endAngle
  for (let i = 0; i <= steps; i++) {
    const a = startAngle + (endAngle - startAngle) * (i / steps);
    pts.push([cx + outerR * Math.cos(a), cy - outerR * Math.sin(a)]);
  }
  // Inner arc: endAngle → startAngle (reverse)
  for (let i = steps; i >= 0; i--) {
    const a = startAngle + (endAngle - startAngle) * (i / steps);
    pts.push([cx + innerR * Math.cos(a), cy - innerR * Math.sin(a)]);
  }
  fillPolygon(doc, pts, color);
}

/**
 * Draw a filled pie slice from center (cx, cy).
 */
function drawPieSlice(
  doc: jsPDF,
  cx: number, cy: number, radius: number,
  startAngle: number, endAngle: number,
  color: RGB, steps = 48
) {
  if (Math.abs(endAngle - startAngle) < 0.005) return;
  const pts: Array<[number, number]> = [[cx, cy]];
  for (let i = 0; i <= steps; i++) {
    const a = startAngle + (endAngle - startAngle) * (i / steps);
    pts.push([cx + radius * Math.cos(a), cy - radius * Math.sin(a)]);
  }
  fillPolygon(doc, pts, color);
}

// ══════════════════════════════════════════════════════════════════════════════
// Exported Chart Functions
// Each returns the new yPosition after drawing.
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Draw engagement gauge (half-donut) + engagement distribution pie side-by-side.
 * Matches UI: EngagementGauge + EngagementDonutChart
 */
export function drawEngagementVisual(
  doc: jsPDF, startY: number,
  score: number, maxScore: number,
  distribution: { highlyEngaged: number; moderatelyEngaged: number; disengaged: number }
): number {
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 1000) / 10 : 0;
  const perf = getPerf(percentage);

  // Section header
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text('Engagement Overview', 20, startY);
  startY += 8;

  // ── Left: Gauge ──
  const gaugeCx = 52;
  const gaugeCy = startY + 28;
  const outerR = 26;
  const innerR = 15;

  // Background arc (full semicircle)
  drawArcBand(doc, gaugeCx, gaugeCy, outerR, innerR, 0, Math.PI, GRAY_200);

  // Score arc (fills from left toward right)
  if (percentage > 0) {
    const scoreEndAngle = Math.PI * (1 - percentage / 100);
    drawArcBand(doc, gaugeCx, gaugeCy, outerR, innerR, scoreEndAngle, Math.PI, perf.color);
  }

  // Score text in center
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...perf.color);
  doc.text(score.toFixed(1), gaugeCx, gaugeCy - 1, { align: 'center' });

  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY_400);
  doc.text(`out of ${maxScore}.0`, gaugeCx, gaugeCy + 4, { align: 'center' });

  // Performance label below gauge
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...perf.color);
  doc.text(perf.label, gaugeCx, gaugeCy + 11, { align: 'center' });

  doc.setFontSize(7);
  doc.setTextColor(...GRAY_400);
  doc.text(`(${percentage}%)`, gaugeCx, gaugeCy + 16, { align: 'center' });

  // Scale markers
  doc.setFontSize(5);
  doc.setTextColor(...GRAY_400);
  doc.text('0%', gaugeCx - outerR - 1, gaugeCy + 3, { align: 'center' });
  doc.text('100%', gaugeCx + outerR + 1, gaugeCy + 3, { align: 'center' });

  // ── Right: Engagement Distribution Pie ──
  const total = distribution.highlyEngaged + distribution.moderatelyEngaged + distribution.disengaged;

  if (total > 0) {
    const pieCx = 140;
    const pieCy = startY + 22;
    const pieR = 18;
    const holeR = 9;

    const segments: Array<{ value: number; color: RGB; label: string }> = [
      { value: distribution.highlyEngaged, color: GREEN_600, label: 'Highly Engaged' },
      { value: distribution.moderatelyEngaged, color: AMBER_500, label: 'Moderately Engaged' },
      { value: distribution.disengaged, color: RED_500, label: 'Disengaged' },
    ];

    let currentAngle = Math.PI / 2; // Start from top
    for (const seg of segments) {
      if (seg.value === 0) continue;
      const sliceAngle = (seg.value / total) * 2 * Math.PI;
      drawPieSlice(doc, pieCx, pieCy, pieR, currentAngle, currentAngle - sliceAngle, seg.color);
      currentAngle -= sliceAngle;
    }

    // White center (donut hole)
    doc.setFillColor(...WHITE);
    doc.circle(pieCx, pieCy, holeR, 'F');

    // Total count in center
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(55, 65, 81);
    doc.text(total.toString(), pieCx, pieCy, { align: 'center' });
    doc.setFontSize(5);
    doc.setFont('helvetica', 'normal');
    doc.text('total', pieCx, pieCy + 4, { align: 'center' });

    // Legend (right of pie)
    let legendY = pieCy - 10;
    for (const seg of segments) {
      if (seg.value === 0) continue;
      const pct = Math.round((seg.value / total) * 1000) / 10;
      doc.setFillColor(...seg.color);
      doc.rect(pieCx + pieR + 5, legendY - 2, 3, 3, 'F');
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      doc.text(`${seg.label}: ${seg.value} (${pct}%)`, pieCx + pieR + 10, legendY);
      legendY += 5;
    }
  }

  doc.setTextColor(0, 0, 0);
  return startY + 50;
}

/**
 * Draw horizontal bar chart for category scores.
 * Matches UI: CategoryScoresChart (horizontal bars with category colors).
 */
export function drawCategoryBars(
  doc: jsPDF, startY: number,
  categories: Array<{
    categoryName: string;
    averagePercentage: number;
    categoryWeight: number;
  }>
): number {
  const leftMargin = 50;
  const barMaxWidth = 100;
  const barHeight = 5;
  const barSpacing = 8.5;

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text('Category Scores', 20, startY);
  startY += 10;

  categories.forEach((cat, idx) => {
    const y = startY + idx * barSpacing;
    const pct = cat.averagePercentage;
    const barWidth = (pct / 100) * barMaxWidth;
    const color = CATEGORY_COLORS[cat.categoryName] ?? DEFAULT_CAT_COLOR;

    // Category label (right-aligned before bar)
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);
    const label = cat.categoryName.length > 16
      ? cat.categoryName.slice(0, 15) + '..'
      : cat.categoryName;
    doc.text(label, leftMargin - 3, y + barHeight / 2 + 1, { align: 'right' });

    // Background bar
    doc.setFillColor(...GRAY_200);
    doc.roundedRect(leftMargin, y, barMaxWidth, barHeight, 1, 1, 'F');

    // Score bar
    if (barWidth > 0) {
      doc.setFillColor(...color);
      doc.roundedRect(leftMargin, y, Math.max(barWidth, 2), barHeight, 1, 1, 'F');
    }

    // Percentage + weight text
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...color);
    doc.text(
      `${pct.toFixed(1)}% (x${cat.categoryWeight})`,
      leftMargin + barMaxWidth + 3,
      y + barHeight / 2 + 1
    );
  });

  doc.setTextColor(0, 0, 0);
  return startY + categories.length * barSpacing + 5;
}

/**
 * Draw stacked horizontal bars for response distribution (Likert scale).
 * Matches UI: DivergingBarChart.
 */
export function drawResponseDistributionBars(
  doc: jsPDF, startY: number,
  data: Array<{ categoryName: string; total: number; distribution: Record<string, number> }>,
  scaleMax: number
): number {
  const leftMargin = 50;
  const barMaxWidth = 95;
  const barHeight = 6;
  const barSpacing = 9.5;

  const isLikert3 = scaleMax === 3;
  const colors: RGB[] = isLikert3
    ? [[220, 38, 38], [245, 158, 11], [22, 163, 74]]
    : [[220, 38, 38], [248, 113, 113], [156, 163, 175], [74, 222, 128], [22, 163, 74]];

  const labels = isLikert3
    ? ['Rarely', 'Sometimes', 'Frequently']
    : ['SD', 'D', 'N', 'A', 'SA'];

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text('Response Distribution', 20, startY);
  startY += 8;

  // Legend row
  let legendX = leftMargin;
  labels.forEach((label, i) => {
    const c = colors[i] ?? [107, 114, 128] as RGB;
    doc.setFillColor(c[0], c[1], c[2]);
    doc.rect(legendX, startY - 2, 3, 3, 'F');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    doc.text(label, legendX + 4, startY);
    legendX += doc.getTextWidth(label) + 9;
  });
  startY += 6;

  data.forEach((cat, idx) => {
    const y = startY + idx * barSpacing;

    // Category label
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);
    const label = cat.categoryName.length > 16
      ? cat.categoryName.slice(0, 15) + '..'
      : cat.categoryName;
    doc.text(label, leftMargin - 3, y + barHeight / 2 + 1, { align: 'right' });

    // Background bar
    doc.setFillColor(...GRAY_200);
    doc.rect(leftMargin, y, barMaxWidth, barHeight, 'F');

    // Stacked segments
    let xOffset = leftMargin;
    for (let i = 1; i <= scaleMax; i++) {
      const count = cat.distribution[String(i)] || 0;
      if (count === 0 || cat.total === 0) continue;
      const segWidth = (count / cat.total) * barMaxWidth;
      if (segWidth > 0.3) {
        const sc = colors[i - 1] ?? [107, 114, 128] as RGB;
        doc.setFillColor(sc[0], sc[1], sc[2]);
        doc.rect(xOffset, y, segWidth, barHeight, 'F');
      }
      xOffset += segWidth;
    }

    // Border
    doc.setDrawColor(...GRAY_200);
    doc.setLineWidth(0.2);
    doc.rect(leftMargin, y, barMaxWidth, barHeight, 'S');
  });

  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  return startY + data.length * barSpacing + 5;
}

/**
 * Draw horizontal bar charts for demographics distributions.
 * Matches UI: DemographicDonutGrid / DemographicsDetailSection bar charts.
 * Replaces flat tables with visual bars per field.
 */
export function drawDemographicBars(
  doc: jsPDF, startY: number,
  distributions: Array<{
    label: string;
    total: number;
    distribution: Array<{ value: string; count: number; percentage: number }>;
  }>,
  addPage: () => void
): number {
  let y = startY;
  const leftMargin = 50;
  const barMaxWidth = 90;
  const barHeight = 4;
  const valueSpacing = 6.5;

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text('Respondent Demographics', 20, y);
  y += 10;

  const fieldsWithData = distributions.filter((d) => d.distribution.length > 0);

  for (const dist of fieldsWithData) {
    const itemCount = Math.min(dist.distribution.length, 8);
    const blockHeight = 14 + itemCount * valueSpacing + 5;

    if (y + blockHeight > 270) {
      addPage();
      y = 20;
    }

    // Field label
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(dist.label, 20, y);

    // Count subtitle
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY_400);
    doc.text(`n = ${dist.total}`, 20 + doc.getTextWidth(dist.label) + 4, y);
    y += 7;

    const items = dist.distribution.slice(0, 8);
    const maxPct = Math.max(...items.map((i) => i.percentage), 1);

    items.forEach((item, idx) => {
      const barY = y + idx * valueSpacing;
      const barWidth = (item.percentage / maxPct) * barMaxWidth;

      // Value label (truncated)
      const label = item.value.length > 18 ? item.value.slice(0, 17) + '..' : item.value;
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(55, 65, 81);
      doc.text(label, leftMargin - 3, barY + barHeight / 2 + 1, { align: 'right' });

      // Bar
      doc.setFillColor(...BRAND_BLUE);
      if (barWidth > 0) {
        doc.roundedRect(leftMargin, barY, Math.max(barWidth, 1), barHeight, 0.7, 0.7, 'F');
      }

      // Count + percentage
      doc.setFontSize(6);
      doc.setTextColor(107, 114, 128);
      doc.text(
        `${item.count} (${item.percentage}%)`,
        leftMargin + barMaxWidth + 3,
        barY + barHeight / 2 + 1
      );
    });

    if (dist.distribution.length > 8) {
      const moreY = y + items.length * valueSpacing;
      doc.setFontSize(5.5);
      doc.setTextColor(...GRAY_400);
      doc.text(`+ ${dist.distribution.length - 8} more`, leftMargin, moreY + 2);
    }

    y += itemCount * valueSpacing + 7;
  }

  doc.setTextColor(0, 0, 0);
  return y;
}
