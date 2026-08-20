import React from 'react';
import { SimulationResult } from '../types';

interface Props {
  results: SimulationResult[];
  isDarkMode?: boolean;
}

const CELL_SIZE = 30;
const HEADER_WIDTH = 200;
const ROW_HEIGHT = 40;

const getStageColors = () => ({
  IF: '#7A8B99', 
  ID: '#9AA8B8', 
  EX: '#E3B5A4', 
  MEM: '#C97A7E', 
  WB: '#DCA4A7', 
  STALL: '#ef4444', 
});

export const PipelineVisualizer: React.FC<Props> = ({ results, isDarkMode = true }) => {
  if (results.length === 0) return null;

  const STAGE_COLORS = getStageColors();
  const maxCycle = Math.max(...results.map(r => r.timing.WB)) + 2;
  const width = HEADER_WIDTH + maxCycle * CELL_SIZE;
  const height = (results.length + 1) * ROW_HEIGHT;
  
  const textColor = isDarkMode ? '#F4EFEA' : '#1B2A41';
  const gridLineColor = isDarkMode ? '#1E2A3B' : '#e2e8f0';
  const subTextColor = isDarkMode ? '#9AA8B8' : '#7A8B99';
  
  const containerBg = isDarkMode ? "bg-[#1E2A3B]/80 border-white/5 shadow-xl" : "bg-[#FFFFFF]/80 border-black/5 shadow-xl";
  const headerBg = isDarkMode ? "bg-[#131B2A]/40 border-white/5" : "bg-white/50 border-black/5";
  const legendBg = isDarkMode ? "bg-[#131B2A]/60 border-white/5 text-[#9AA8B8]" : "bg-white/50 border-black/5 text-[#7A8B99]";

  const renderBlock = (xStart: number, y: number, label: string, color: string, isStall = false) => (
    <g>
      <rect
        x={HEADER_WIDTH + (xStart - 1) * CELL_SIZE}
        y={y - 15}
        width={CELL_SIZE - 2}
        height={20}
        fill={isStall ? 'none' : color}
        stroke={isStall ? color : 'none'}
        strokeWidth={isStall ? 1.5 : 0}
        strokeDasharray={isStall ? "4 2" : "none"}
        rx={10}
      />
      <text 
        x={HEADER_WIDTH + (xStart - 1) * CELL_SIZE + (isStall ? 5 : 8)} 
        y={y - 1} 
        fill={isStall ? color : 'white'}
        fontSize={isStall ? 10 : 11}
        fontWeight="bold"
      >
        {label}
      </text>
    </g>
  );

  return (
    <div className={`overflow-x-auto rounded-3xl backdrop-blur-xl border transition-colors duration-300 ${containerBg}`}>
      <div className={`px-6 py-4 border-b flex items-center gap-2 ${headerBg}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-3 1a1 1 0 10-2 0v3a1 1 0 102 0V8zM8 9a1 1 0 00-2 0v2a1 1 0 102 0V9z" clipRule="evenodd" />
        </svg>
        <h3 className={`font-bold text-lg ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Pipeline Gantt Chart</h3>
      </div>
      <div className="min-w-max p-6">
        <svg width={width} height={height} className="font-mono text-xs">
          {/* Header Row */}
          <g>
            <text x={10} y={25} className="font-bold uppercase tracking-wider text-[10px]" fill={subTextColor}>Instruction</text>
            {Array.from({ length: maxCycle }).map((_, i) => (
              <text key={i} x={HEADER_WIDTH + i * CELL_SIZE + 10} y={25} fill={subTextColor} className="font-bold">
                {i + 1}
              </text>
            ))}
            <line x1={0} y1={35} x2={width} y2={35} stroke={gridLineColor} />
          </g>

          {/* Rows */}
          {results.map((res, idx) => {
            const y = (idx + 1) * ROW_HEIGHT + 25;
            const t = res.timing;

            // Gap calculations for stalls/latency
            const ifDuration = t.ID - t.IF;
            const idDuration = t.EX_START - t.ID;
            const exDuration = t.EX_END - t.EX_START + 1;
            const memDuration = t.WB - t.MEM;

            return (
               <g key={res.instruction.id}>
                {/* Instruction Text */}
                <text x={10} y={y} fill={textColor} className="text-sm font-medium">
                  {res.instruction.raw}
                </text>

                {/* IF */}
                {Array.from({ length: ifDuration }).map((_, i) => {
                    const isFirst = i === 0;
                    return renderBlock(t.IF + i, y, isFirst ? 'IF' : 'S', isFirst ? STAGE_COLORS.IF : STAGE_COLORS.STALL, !isFirst);
                })}

                {/* ID */}
                {Array.from({ length: idDuration }).map((_, i) => {
                    const isFirst = i === 0;
                    return renderBlock(t.ID + i, y, isFirst ? 'ID' : 'S', isFirst ? STAGE_COLORS.ID : STAGE_COLORS.STALL, !isFirst);
                })}

                {/* EX */}
                {Array.from({ length: exDuration }).map((_, i) => {
                    const isFirst = i === 0;
                    return renderBlock(t.EX_START + i, y, isFirst ? 'EX' : 'S', isFirst ? STAGE_COLORS.EX : STAGE_COLORS.STALL, !isFirst);
                })}

                {/* MEM */}
                {Array.from({ length: memDuration }).map((_, i) => {
                    const isFirst = i === 0;
                    return renderBlock(t.MEM + i, y, isFirst ? 'M' : 'S', isFirst ? STAGE_COLORS.MEM : STAGE_COLORS.STALL, !isFirst);
                })}

                {/* WB */}
                {renderBlock(t.WB, y, 'WB', STAGE_COLORS.WB)}
                
                {/* Line */}
                <line x1={0} y1={y + 15} x2={width} y2={y + 15} stroke={gridLineColor} strokeDasharray="2 4" />
              </g>
            );
          })}
        </svg>
      </div>
      
      {/* Legend */}
      <div className={`flex flex-wrap gap-6 px-6 py-4 border-t text-xs font-medium ${legendBg}`}>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded shadow-sm" style={{background: STAGE_COLORS.IF}}></div> Fetch</div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded shadow-sm" style={{background: STAGE_COLORS.ID}}></div> Decode</div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded shadow-sm" style={{background: STAGE_COLORS.EX}}></div> Execute</div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded shadow-sm" style={{background: STAGE_COLORS.MEM}}></div> Memory</div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded shadow-sm" style={{background: STAGE_COLORS.WB}}></div> Writeback</div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded border-2 border-red-500 border-dashed" ></div> Stall (Busy/Backpressure)</div>
      </div>
    </div>
  );
};
