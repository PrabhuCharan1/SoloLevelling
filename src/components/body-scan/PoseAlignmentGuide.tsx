import React from 'react';

interface PoseAlignmentGuideProps {
  opacity?: number;
  showLabels?: boolean;
}

export const PoseAlignmentGuide: React.FC<PoseAlignmentGuideProps> = ({
  opacity = 0.85,
  showLabels = true,
}) => {
  return (
    <div
      className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center select-none overflow-hidden"
      style={{ opacity }}
    >
      {/* HUD Corner Tech Brackets */}
      <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-cyan-400" />
      <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-cyan-400" />
      <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-cyan-400" />
      <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-cyan-400" />

      {/* Center Laser Symmetry Line */}
      <div className="absolute top-6 bottom-6 left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-transparent via-cyan-400/50 to-transparent dashed" />

      {/* SVG Alignment Silhouette Wireframe */}
      <svg
        viewBox="0 0 200 300"
        className="w-full h-full max-w-sm max-h-[80vh] px-4 stroke-cyan-400 fill-none"
        style={{ strokeWidth: 1.25, strokeDasharray: '4 3' }}
      >
        {/* Head & Neck Oval */}
        <ellipse cx="100" cy="52" rx="24" ry="32" stroke="rgba(0, 240, 255, 0.7)" />
        <line x1="100" y1="20" x2="100" y2="84" stroke="rgba(0, 240, 255, 0.4)" strokeWidth="0.8" />
        <line x1="76" y1="52" x2="124" y2="52" stroke="rgba(0, 240, 255, 0.4)" strokeWidth="0.8" />

        {/* Neck */}
        <path d="M 92 84 L 92 98 M 108 84 L 108 98" stroke="rgba(0, 240, 255, 0.6)" />

        {/* Shoulders Guideline */}
        <path
          d="M 45 106 Q 70 98 100 98 Q 130 98 155 106"
          stroke="rgba(0, 240, 255, 0.85)"
          strokeWidth="1.8"
          strokeDasharray="none"
        />

        {/* Torso & Chest Contour */}
        <path
          d="M 54 112 Q 58 140 62 165 Q 64 195 68 220 M 146 112 Q 142 140 138 165 Q 136 195 132 220"
          stroke="rgba(0, 240, 255, 0.7)"
        />

        {/* Chest Level Guideline */}
        <line
          x1="60"
          y1="135"
          x2="140"
          y2="135"
          stroke="rgba(0, 240, 255, 0.5)"
          strokeWidth="1"
        />

        {/* Abdomen / Waist Level Guideline */}
        <line
          x1="66"
          y1="180"
          x2="134"
          y2="180"
          stroke="rgba(0, 240, 255, 0.5)"
          strokeWidth="1"
        />

        {/* Lateral Arm Position Guidelines */}
        <path
          d="M 38 116 Q 34 160 32 210 M 162 116 Q 166 160 168 210"
          stroke="rgba(0, 240, 255, 0.55)"
        />

        {/* Hip Baseline */}
        <line
          x1="68"
          y1="220"
          x2="132"
          y2="220"
          stroke="rgba(0, 240, 255, 0.6)"
          strokeWidth="1.2"
        />

        {/* Feet / Floor Placement Horizon */}
        <line
          x1="30"
          y1="285"
          x2="170"
          y2="285"
          stroke="rgba(0, 240, 255, 0.75)"
          strokeWidth="1.5"
          strokeDasharray="none"
        />
      </svg>

      {/* Alignment HUD Prompts */}
      {showLabels && (
        <div className="absolute bottom-16 inset-x-4 flex flex-col items-center gap-1.5 text-center">
          <div className="px-3 py-1 rounded bg-black/75 border border-cyan-500/50 backdrop-blur-sm">
            <p className="font-hud text-[11px] font-bold text-cyan-300 tracking-widest uppercase">
              STANDARDIZED POSE // ALIGN WITH WIREFRAME
            </p>
          </div>
          <p className="font-mono text-[9px] text-slate-300 tracking-wider bg-black/60 px-2.5 py-0.5 rounded">
            HEAD AT TOP • SHOULDERS BALANCED • CENTERED
          </p>
        </div>
      )}
    </div>
  );
};
