import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DEFAULT_CONFIG, INITIAL_ASM } from './constants';
import { Config, SimulatorState } from './types';
import { parseASM, TomasuloSimulator, mapSnapshotToState } from './services/tomasulo';
import { ConfigPanel } from './components/Configuration.tsx';
import { 
    DashboardMetrics, 
    ScheduleView, 
    ReservationStationsView, 
    RegisterStatusView, 
    MemoryView, 
    CDBView,
    InstructionQueueView,
    FunctionUnitsView
} from './components/SimulationView.tsx';

type Tab = 'function-units' | 'reservation-stations' | 'registers' | 'schedule' | 'memory' | 'cdb' | 'instructions';

const App: React.FC = () => {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [asmText, setAsmText] = useState(INITIAL_ASM);
  const [initialRegs, setInitialRegs] = useState<Record<string, number>>({'R1': 20, 'F0': 2.5, 'F2': 3.5});
  
  const [simState, setSimState] = useState<SimulatorState | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(100); 
  const [activeTab, setActiveTab] = useState<Tab>('schedule');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  
    const [isDarkMode, setIsDarkMode] = useState<boolean>(true); // For this component specifically

  const simulatorRef = useRef<TomasuloSimulator | null>(null);
  const instructions = useMemo(() => parseASM(asmText), [asmText]);

  const handleStart = () => {
    const sim = new TomasuloSimulator(config);
    Object.entries(initialRegs).forEach(([key, val]) => {
        if (key.startsWith('R')) {
            const idx = parseInt(key.slice(1));
            if (!isNaN(idx) && idx < 32) sim.regFile[idx].value = val as number;
        } else if (key.startsWith('F')) {
            const idx = parseInt(key.slice(1));
            if (!isNaN(idx) && idx < 32) sim.fpRegFile[idx].value = val as number;
        }
    });
    sim.memory[0] = 10; sim.memory[2] = 20; sim.memory[4] = 30;
    sim.loadProgram(instructions);
    
    simulatorRef.current = sim;
    setSimState(mapSnapshotToState(sim._snapshot(), sim, instructions));
    setIsPlaying(false);
    setActiveTab('schedule');
  };

  const handleStep = () => {
    if (simulatorRef.current && !simState?.finished) {
        simulatorRef.current.step();
        const snap = simulatorRef.current._snapshot();
        setSimState(mapSnapshotToState(snap, simulatorRef.current, instructions));
        // don\'t clear messages on step to preserve chat history
    }
  };

  const handleReset = () => {
    simulatorRef.current = null;
    setSimState(null);
    setIsPlaying(false);
  };



  useEffect(() => {
    let interval: number;
    if (isPlaying && simState && !simState.finished) {
      interval = window.setInterval(() => {
        handleStep();
      }, speed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, simState, speed]);

  useEffect(() => {
      if(simState?.finished) setIsPlaying(false);
  }, [simState?.finished]);

  // Color variables for Rosewood/Navy theme
  const textColor = isDarkMode ? "text-[#F4EFEA]" : "text-[#1B2A41]";
  const subTextColor = isDarkMode ? "text-[#9AA8B8]" : "text-[#7A8B99]";
  const cardBg = isDarkMode ? "bg-[#1E2A3B]/80 border-white/5 border backdrop-blur-xl" : "bg-[#FFFFFF]/80 border-black/5 border backdrop-blur-xl";
  const brandBg = isDarkMode ? "bg-[#DCA4A7] hover:bg-[#C97A7E]" : "bg-[#C97A7E] hover:bg-[#DCA4A7]";

  return (
    <div className={`w-full max-w-7xl mx-auto p-4 md:p-8 font-sans ${textColor}`}>
      
      {/* Header */}
      <header className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-2">Tomasulo Simulator</h1>
            <div className={`flex items-center gap-2 text-sm font-medium ${subTextColor}`}>
                <span>⚡</span> Interactive Dynamic Scheduling Simulator
            </div>
        </div>
        
        {simState && <DashboardMetrics state={simState} />}
      </header>

      {/* Main Content Area */}
      
      {/* Configuration & Inputs (Visible when not running) */}
      {!simState && (
        <div className={`max-w-3xl mx-auto flex flex-col space-y-6 ${cardBg} p-6 md:p-8 rounded-3xl shadow-xl animate-fade-in-up`}>
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-[#DCA4A7]">Program Code</h2>
                <button 
                    onClick={() => setIsConfigOpen(true)}
                    className={`p-2 rounded-xl transition-all hover:scale-110 ${isDarkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'}`}
                    title="Hardware Configuration"
                >
                    <span className="text-xl">⚙️</span>
                </button>
            </div>
            
            <textarea 
                className={`w-full h-64 p-4 rounded-xl font-mono text-sm border focus:ring-2 focus:ring-[#DCA4A7] outline-none resize-none ${isDarkMode ? 'bg-[#131B2A] text-white border-white/10' : 'bg-[#FDF8F5] text-black border-black/10'}`}
                value={asmText}
                onChange={(e) => setAsmText(e.target.value)}
                placeholder="Enter assembly code..."
                spellCheck={false}
            />
            
            <button 
              className={`w-full py-4 rounded-xl font-bold text-white transition-all transform hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2 ${brandBg}`}
              onClick={handleStart}
            >
                <span>🚀</span> Load / Reset
            </button>
        </div>
      )}

      {/* Configuration Modal */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsConfigOpen(false)}>
            <div 
                className={`relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl p-8 shadow-2xl ${isDarkMode ? 'bg-[#1A2421] text-[#E3EBE7] border border-[#E58368]/30' : 'bg-[#F1F5F0] text-[#273E37] border border-[#D96C4A]/30'}`}
                onClick={(e) => e.stopPropagation()}
            >
                <button 
                    className={`absolute top-6 right-6 p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
                    onClick={() => setIsConfigOpen(false)}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <h2 className="text-2xl font-extrabold mb-6 flex items-center gap-3">
                    <span>⚙️</span> Hardware Configuration
                </h2>
                <ConfigPanel 
                    config={config} 
                    onConfigChange={setConfig} 
                    initialRegs={initialRegs}
                    onInitRegsChange={setInitialRegs}
                />
            </div>
        </div>
      )}

      {/* Simulation Controls (Visible when running) */}
      {simState && (
         <div className={`${cardBg} p-6 rounded-2xl mb-8 shadow-lg flex flex-wrap items-center justify-between gap-6 animate-fade-in-up`}>
             <div className="flex items-center gap-4 flex-wrap">
                 <button className={`px-5 py-2.5 rounded-lg font-bold text-white transition-all transform active:scale-95 ${isDarkMode ? 'bg-green-600 hover:bg-green-500 disabled:bg-gray-600' : 'bg-green-500 hover:bg-green-600 disabled:bg-gray-400'}`} onClick={handleStep} disabled={isPlaying || simState.finished}>
                     ⏭️ Step
                 </button>
                 <button className={`px-5 py-2.5 rounded-lg font-bold text-white transition-all transform active:scale-95 ${isDarkMode ? 'bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600' : 'bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400'}`} onClick={() => setIsPlaying(!isPlaying)} disabled={simState.finished}>
                     {isPlaying ? '⏸️ Pause' : '▶️ Auto Run'}
                 </button>
                 <button className={`px-5 py-2.5 rounded-lg font-bold text-white transition-all transform active:scale-95 ${isDarkMode ? 'bg-red-600 hover:bg-red-500' : 'bg-red-500 hover:bg-red-600'}`} onClick={handleReset}>
                     🔄 Reset
                 </button>
             </div>
             
             <div className={`flex items-center gap-4 px-4 py-2 rounded-xl ${isDarkMode ? 'bg-[#131B2A]/50' : 'bg-black/5'}`}>
                <span className={`text-sm font-bold ${subTextColor}`}>Speed</span>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">Slow</span>
                    <input 
                        type="range" 
                        min="50" 
                        max="2000" 
                        step="50"
                        className="w-24 h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-[#DCA4A7]"
                        value={2050 - speed} 
                        onChange={(e) => setSpeed(2050 - parseInt(e.target.value))}
                        title={`Delay: ${speed}ms`}
                    />
                    <span className="text-xs text-gray-500">Fast</span>
                </div>
             </div>

             <div className={`font-bold px-4 py-2 rounded-xl ${simState.finished ? 'text-green-500 bg-green-500/10' : subTextColor}`}>
                {simState.finished ? 'Simulation Completed 🎉' : 'Running...'}
             </div>
         </div>
      )}

      {/* Visualization Tabs */}
      {simState && (
          <div className={`${cardBg} rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[600px] animate-fade-in-up`}>
              <div className={`md:w-64 flex flex-col md:border-r border-b md:border-b-0 p-4 gap-2 ${isDarkMode ? 'bg-[#131B2A]/50 border-white/5' : 'bg-black/5 border-black/5'}`}>
                  {[
                      { id: 'schedule', label: 'Timeline Schedule' },
                      { id: 'function-units', label: 'Function Units' },
                      { id: 'reservation-stations', label: 'Reservations' },
                      { id: 'registers', label: 'Registers' },
                      { id: 'memory', label: 'Memory' },
                      { id: 'cdb', label: 'Common Data Bus' },
                      { id: 'instructions', label: 'Instruction Queue' }
                  ].map((tab) => (
                      <button 
                        key={tab.id}
                        className={`text-left px-4 py-3 rounded-xl font-medium transition-all duration-300 ${activeTab === tab.id ? (isDarkMode ? 'bg-[#DCA4A7] text-white shadow-md' : 'bg-[#C97A7E] text-white shadow-md') : (isDarkMode ? 'text-[#9AA8B8] hover:bg-white/5 hover:text-white' : 'text-[#7A8B99] hover:bg-black/5 hover:text-black')}`}
                        onClick={() => setActiveTab(tab.id as Tab)}
                      >
                          {tab.label}
                      </button>
                  ))}
              </div>

              <div className="flex-1 p-6 md:p-8 overflow-y-auto">
                  {activeTab === 'schedule' && <ScheduleView status={simState.status} instructions={instructions} cycle={simState.cycle} />}
                  
                  {activeTab === 'function-units' && <FunctionUnitsView rs={simState.rs} status={simState.status} />}
                  {activeTab === 'reservation-stations' && <ReservationStationsView rs={simState.rs} />}
                  {activeTab === 'registers' && <RegisterStatusView rat={simState.rat} />}
                  {activeTab === 'memory' && <MemoryView memory={simState.memory} />}
                  {activeTab === 'cdb' && <CDBView cdb={simState.cdb} />}
                  {activeTab === 'instructions' && <InstructionQueueView instructions={instructions} pc={simState.pc} />}
              </div>
          </div>
      )}
    </div>
  );
};

export default App;
