import React, { useState, useEffect } from 'react';
import { parseAssembly, expandTrace } from './utils/parser';
import { simulatePipeline } from './utils/simulator';
import { PipelineVisualizer } from './components/PipelineVisualizer';
import { ConfigPanel } from './components/ConfigPanel';
import { Instruction, PipelineConfig, SimulationResult } from './types';
import { DEFAULT_LATENCIES, PDF_EXAMPLE_CODE, RAW_HAZARD_EXAMPLE, MIPS_LOOP_EXAMPLE } from './constants';

interface Props {
  isDarkMode?: boolean;
}

const App: React.FC<Props> = ({ isDarkMode = true }) => {
  const [code, setCode] = useState<string>(RAW_HAZARD_EXAMPLE);
  
  const [config, setConfig] = useState<PipelineConfig>({
    latencies: DEFAULT_LATENCIES,
    forwarding: false,
    branchPrediction: 'not-taken',
    loopIterations: 2, 
  });
  
  const [results, setResults] = useState<SimulationResult[]>([]);

  useEffect(() => {
    try {
      // 1. Parse raw text into instructions
      const parsedInstructions: Instruction[] = parseAssembly(code);
      
      // 2. Expand trace
      let executionTrace: Instruction[] = expandTrace(parsedInstructions, config.loopIterations);
      
      // 3. Simulate pipeline on the trace
      const simulationResults = simulatePipeline(executionTrace, config);
      setResults(simulationResults);
    } catch (e) {
      console.error("Simulation error", e);
    }
  }, [code, config]);

  const totalCycles = results.length > 0 ? Math.max(...results.map(r => r.timing.WB)) : 0;
  const totalStalls = results.reduce((acc, curr) => acc + curr.timing.stallCycles, 0);

  // Conditional styling based on isDarkMode
  const cardBg = isDarkMode ? "bg-slate-900/40 backdrop-blur-xl border-slate-700/50 border" : "bg-white/80 backdrop-blur-xl border-slate-200 border shadow-lg";
  const textColor = isDarkMode ? "text-slate-100" : "text-slate-800";
  const subTextColor = isDarkMode ? "text-slate-400" : "text-slate-500";
  const textAreaBg = isDarkMode ? "bg-slate-900/60 border-slate-700/50 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-800";
  const headerBg = isDarkMode ? "bg-slate-900/40 border-slate-700/50" : "bg-white/60 border-slate-200 shadow-sm";

  return (
    <div className={`w-full ${textColor} font-sans`}>
      <header className={`${headerBg} backdrop-blur-xl border-b sticky top-0 z-[50]`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-lg border ${isDarkMode ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' : 'bg-blue-100 text-blue-600 border-blue-200'}`}>
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
               </svg>
            </div>
            <h1 className={`text-xl font-bold tracking-tight ${textColor}`}>PipelineSim</h1>
          </div>
          <div className={`text-sm ${subTextColor} hidden sm:block font-medium`}>
              Solves Pipeline Hazards & Latencies
          </div>
        </div>
      </header>

      <main className="w-full mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Input & Config */}
          <div className="lg:col-span-1 space-y-6">
            <ConfigPanel config={config} onChange={setConfig} isDarkMode={isDarkMode} />
            
            <div className={`${cardBg} p-6 rounded-3xl flex flex-col h-96 transition-colors`}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className={`font-bold ${textColor} text-lg flex items-center gap-2`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Assembly Input
                    </h3>
                    <div className="flex gap-2">
                        <button onClick={() => setCode(RAW_HAZARD_EXAMPLE)} className={`text-[10px] px-2 py-1 rounded-md font-bold transition-colors border ${isDarkMode ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200'}`}>Int RAW</button>
                        <button onClick={() => setCode(MIPS_LOOP_EXAMPLE)} className={`text-[10px] px-2 py-1 rounded-md transition-colors border ${isDarkMode ? 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}>MIPS Loop</button>

                    </div>
                </div>
                <textarea 
                    className={`flex-1 w-full font-mono text-sm p-4 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none resize-none ${textAreaBg} shadow-inner`}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    spellCheck={false}
                />
                <p className={`text-xs ${subTextColor} mt-3`}>Supports standard RISC-V/MIPS syntax.</p>
            </div>
          </div>

          {/* Right Column: Visualization & Stats */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 {[
                   { label: 'Total Cycles', value: totalCycles, color: isDarkMode ? 'text-blue-400' : 'text-blue-600', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                   { label: 'Instructions', value: results.length, color: isDarkMode ? 'text-slate-200' : 'text-slate-700', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                   { label: 'Total Stalls', value: totalStalls, color: isDarkMode ? 'text-red-400' : 'text-red-600', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
                   { label: 'CPI', value: (results.length > 0 ? totalCycles / results.length : 0).toFixed(2), color: isDarkMode ? 'text-purple-400' : 'text-purple-600', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' }
                 ].map((stat) => (
                   <div key={stat.label} className={`${cardBg} p-5 rounded-2xl transition-all ${isDarkMode ? 'hover:bg-slate-800/60' : 'hover:bg-white'} hover:-translate-y-1`}>
                      <div className={`text-xs ${subTextColor} uppercase font-bold tracking-wider mb-2 flex items-center gap-1.5`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} /></svg>
                        {stat.label}
                      </div>
                      <div className={`text-3xl font-extrabold ${stat.color} drop-shadow-sm`}>{stat.value}</div>
                   </div>
                 ))}
            </div>

            {/* Pipeline Grid */}
            <PipelineVisualizer results={results} isDarkMode={isDarkMode} />
            
            {/* Detail List */}
            <div className={`${cardBg} rounded-3xl overflow-hidden`}>
                <div className={`px-6 py-4 border-b flex items-center gap-2 ${isDarkMode ? 'border-slate-700/50 bg-slate-800/40' : 'border-slate-200 bg-slate-50'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                    <h3 className={`font-bold ${textColor} text-lg`}>Detailed Timing Analysis</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className={`min-w-full divide-y ${isDarkMode ? 'divide-slate-700/50' : 'divide-slate-200'}`}>
                      <thead className={`text-xs font-semibold uppercase tracking-wider text-left ${isDarkMode ? 'bg-slate-900/60 text-slate-400' : 'bg-white text-slate-500'}`}>
                          <tr>
                              <th className="px-6 py-3">Cycle</th>
                              <th className="px-6 py-3">Inst</th>
                              <th className="px-6 py-3">Code</th>
                              <th className="px-6 py-3">Stalls Caused By</th>
                              <th className="px-6 py-3">WB Cycle</th>
                          </tr>
                      </thead>
                      <tbody className={`divide-y text-sm ${isDarkMode ? 'divide-slate-700/50' : 'divide-slate-100'}`}>
                          {results.map((res) => {
                              const isStalled = res.timing.stallCycles > 0;
                              let trClass = isDarkMode 
                                ? `hover:bg-white/5 transition-colors ${isStalled ? "bg-red-900/10 hover:bg-red-900/20" : ""}`
                                : `hover:bg-slate-50 transition-colors ${isStalled ? "bg-red-50 hover:bg-red-100" : ""}`;
                                
                              return (
                                <tr key={res.instruction.id} className={trClass}>
                                    <td className={`px-6 py-3 ${subTextColor}`}>{res.timing.IF}</td>
                                    <td className={`px-6 py-3 font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>I{res.instruction.id}</td>
                                    <td className={`px-6 py-3 font-mono rounded my-1 mx-4 inline-block px-2 ${isDarkMode ? 'text-blue-300 bg-slate-900/40' : 'text-blue-700 bg-slate-100'}`}>{res.instruction.raw}</td>
                                    <td className={`px-6 py-3 font-medium ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>{res.timing.dependency ? `RAW on ${res.timing.dependency} (${res.timing.stallCycles} cyc)` : '-'}</td>
                                    <td className={`px-6 py-3 font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{res.timing.WB}</td>
                                </tr>
                              );
                          })}
                      </tbody>
                  </table>
                </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
