import React, { useState, useEffect } from 'react';
import PipelineApp from './src/pipeline-sim/App';
import TomasuloApp from './src/tomasulo-sim/App';

const App: React.FC = () => {
  const [activeSim, setActiveSim] = useState<'pipeline' | 'tomasulo' | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Toggle global body class for Tomasulo's vanilla CSS
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.add('light-mode');
    }
  }, [isDarkMode]);

  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  const renderTopRightControls = () => (
    <div className="fixed top-4 right-4 z-[9999] flex gap-3">
      <button
        onClick={() => setIsHelpOpen(true)}
        className={`p-2.5 rounded-full backdrop-blur-md shadow-lg transition-all duration-300 hover:scale-110
          ${isDarkMode ? 'bg-[#1E2A3B]/80 text-[#9AA8B8] border border-white/10 hover:text-white' : 'bg-[#FFFFFF]/80 text-slate-500 border border-black/10 hover:text-slate-900'}
        `}
        title="Help"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
      <button
        onClick={() => setIsDarkMode(!isDarkMode)}
        className={`p-2.5 rounded-full backdrop-blur-md shadow-lg transition-all duration-300 hover:scale-110
          ${isDarkMode ? 'bg-[#1E2A3B]/80 text-[#E8C9B9] border border-white/10' : 'bg-[#FFFFFF]/80 text-[#C97A7E] border border-black/10'}
        `}
        title="Toggle Theme"
      >
        {isDarkMode ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>
    </div>
  );

  const renderHelpModal = () => {
    if (!isHelpOpen) return null;
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsHelpOpen(false)}>
        <div 
          className={`relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl p-8 shadow-2xl ${isDarkMode ? 'bg-[#1A2421] text-[#E3EBE7] border border-[#E58368]/30' : 'bg-[#F1F5F0] text-[#273E37] border border-[#D96C4A]/30'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            className={`absolute top-6 right-6 p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
            onClick={() => setIsHelpOpen(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          
          <h2 className="text-3xl font-extrabold mb-6 tracking-tight">How to use ArchSim</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className={`text-xl font-bold mb-3 flex items-center gap-2 ${isDarkMode ? 'text-[#E58368]' : 'text-[#D96C4A]'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                Pipeline Simulator: In-Order Execution
              </h3>
              <p className={`text-sm leading-relaxed mb-4 ${isDarkMode ? 'text-[#8FA39A]' : 'text-[#758C83]'}`}>
                Welcome to the 5-Stage RISC Pipeline Simulator. This tool visualizes how instructions flow sequentially through Instruction Fetch (IF), Decode (ID), Execute (EX), Memory (MEM), and Write-Back (WB). It is perfect for understanding classical data hazards, stalls, and the impact of data forwarding.
              </p>
              <div className="bg-black/5 rounded-xl p-4 border border-black/5 dark:bg-white/5 dark:border-white/5 space-y-3">
                <p className="text-sm"><strong>1. Input Assembly:</strong> Locate the <strong>Assembly Input</strong> panel on the left. Type your standard RISC assembly instructions here (e.g., <code>ADD R1, R2, R3</code>), or click the <strong>Int RAW</strong> or <strong>MIPS Loop</strong> buttons to load example code.</p>
                <p className="text-sm"><strong>2. Hardware Configuration:</strong> Use the <strong>Configuration</strong> panel above the editor to toggle Data Forwarding (bypassing) and Structural Hazards on or off to see how the processor adapts.</p>
                <p className="text-sm"><strong>3. Execution & Analysis:</strong> The simulator evaluates your code instantly! Look at the <strong>Pipeline Grid</strong> on the right to see the Gantt chart. It dynamically maps the progression of each instruction and explicitly highlights data hazards and stall cycles in real-time.</p>
                <p className="text-sm"><strong>4. Detailed Timing:</strong> Scroll down to the <strong>Detailed Timing Analysis</strong> table to see the exact cycles where each instruction fetches, stalls, and writes back.</p>
              </div>
            </div>
            
            <div className={`h-px w-full ${isDarkMode ? 'bg-white/10' : 'bg-black/10'}`}></div>
            
            <div>
              <h3 className={`text-xl font-bold mb-3 flex items-center gap-2 ${isDarkMode ? 'text-[#F2C08A]' : 'text-[#E8A365]'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
                Tomasulo Simulator: Out-of-Order Execution
              </h3>
              <p className={`text-sm leading-relaxed mb-4 ${isDarkMode ? 'text-[#8FA39A]' : 'text-[#758C83]'}`}>
                The Tomasulo Algorithm Simulator is an advanced visualization of dynamic instruction scheduling. It demonstrates how modern superscalar processors utilize Register Renaming and Reservation Stations to execute instructions out of order while avoiding false data dependencies.
              </p>
              <div className="bg-black/5 rounded-xl p-4 border border-black/5 dark:bg-white/5 dark:border-white/5 space-y-3">
                <p className="text-sm"><strong>1. Global Configuration:</strong> Start by clicking the ⚙️ <strong>Gear icon</strong> next to the Program Code header. Here, you can define the execution latency for different operations (Addition, Multiplication, Division) and specify the exact number of Reservation Stations allocated to each Functional Unit.</p>
                <p className="text-sm"><strong>2. Load Instructions:</strong> Enter your assembly program into the <strong>Program Code</strong> text area.</p>
                <p className="text-sm"><strong>3. Initialize the System:</strong> Click the big 🚀 <strong>Load / Reset</strong> button. This locks in your configuration, parses the code, and initializes the Register Aliasing Table (RAT) and Common Data Bus (CDB).</p>
                <p className="text-sm"><strong>4. Step Through Execution:</strong> Once initialized, you'll see the simulation dashboard. Click ⏭️ <strong>Step</strong> to manually advance the clock cycle by cycle, or ▶️ <strong>Auto Run</strong> to watch the entire execution unfold automatically. Watch carefully as instructions are Issued to available Reservation Stations, wait for operands, Execute, and finally Write Result across the CDB.</p>
                <p className="text-sm"><strong>5. Deep Dive State:</strong> Use the left sidebar to switch between views. Monitor the <strong>Timeline Schedule</strong> to see exact cycle timings, check the <strong>Reservations</strong> view to see instructions waiting for operands (e.g., waiting on <code>ADD2</code>), and watch the <strong>Registers</strong> view to see dynamic aliasing in action.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const bgClasses = isDarkMode 
    ? 'bg-[#1A2421] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1A2421] via-[#23332E] to-black text-[#E3EBE7]' 
    : 'bg-[#F1F5F0] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#F1F5F0] via-[#FFFFFF] to-[#F1F5F0] text-[#273E37]';

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans overflow-x-hidden ${bgClasses}`}>
      
      {/* Decorative background blobs for all pages */}
      <div className={`fixed top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-50 pointer-events-none z-0 ${isDarkMode ? 'bg-blue-600/10' : 'bg-blue-400/20'}`}></div>
      <div className={`fixed bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-50 pointer-events-none z-0 ${isDarkMode ? 'bg-purple-600/10' : 'bg-purple-400/20'}`}></div>
      
      {renderTopRightControls()}
      {renderHelpModal()}

      {/* Main Container */}
      <div className="relative z-10 w-full">
        
        {/* Hub View */}
        {!activeSim && (
          <div className="flex flex-col items-center justify-center min-h-screen p-6">
            <div className="text-center mb-16 animate-fade-in-up">
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-4 relative inline-block">
                <div className={`absolute inset-0 blur-3xl opacity-30 animate-pulse ${isDarkMode ? 'bg-[#DCA4A7]' : 'bg-[#C97A7E]'}`}></div>
                <span className={`relative text-transparent bg-clip-text bg-gradient-to-r drop-shadow-sm animate-gradient-x ${isDarkMode ? 'from-[#DCA4A7] via-[#E8C9B9] to-[#DCA4A7]' : 'from-[#C97A7E] via-[#E3B5A4] to-[#C97A7E]'} bg-[length:200%_auto]`}>
                  ArchSim
                </span>
                <span className={`relative ${isDarkMode ? 'text-[#F4EFEA]' : 'text-[#1B2A41]'}`}> Hub</span>
              </h1>
              <p className={`text-lg md:text-xl font-medium max-w-2xl mx-auto ${isDarkMode ? 'text-[#8FA39A]' : 'text-[#758C83]'}`}>
                Interactive and dynamic visualization of advanced computer architecture concepts. Choose a simulation environment to begin.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl animate-fade-in-up">
              {/* Pipeline Simulator Card */}
              <button 
                onClick={() => setActiveSim('pipeline')}
                className={`group relative flex flex-col items-start p-8 md:p-10 text-left backdrop-blur-xl rounded-3xl cursor-pointer transition-all duration-500 ease-out hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.3)]
                  ${isDarkMode ? 'bg-[#23332E]/60 hover:bg-[#23332E] border border-slate-700/50 hover:border-[#E58368]/50' : 'bg-[#FFFFFF]/60 hover:bg-[#FFFFFF]/90 border border-slate-200 hover:border-[#D96C4A] shadow-xl'}`}
              >
                <div className={`p-4 rounded-2xl mb-6 shadow-inner transition-colors ${isDarkMode ? 'bg-[#1A2421] text-[#E58368] group-hover:bg-[#E58368]/10' : 'bg-[#F1F5F0] text-[#D96C4A] group-hover:bg-[#D96C4A]/10'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold mb-3 tracking-tight">Pipeline Sim</h2>
                <p className={`text-base font-medium leading-relaxed ${isDarkMode ? 'text-[#8FA39A]' : 'text-[#758C83]'}`}>
                  5-stage RISC pipeline visualization with data hazard detection, forwarding paths, and configurable latencies.
                </p>
                <div className={`mt-8 inline-flex items-center gap-2 font-bold text-sm transition-transform group-hover:translate-x-2 ${isDarkMode ? 'text-[#E58368]' : 'text-[#D96C4A]'}`}>
                  Launch Simulator <span>→</span>
                </div>
              </button>

              {/* Tomasulo Simulator Card */}
              <button 
                onClick={() => setActiveSim('tomasulo')}
                className={`group relative flex flex-col items-start p-8 md:p-10 text-left backdrop-blur-xl rounded-3xl cursor-pointer transition-all duration-500 ease-out hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(168,85,247,0.3)]
                  ${isDarkMode ? 'bg-[#23332E]/60 hover:bg-[#23332E] border border-slate-700/50 hover:border-[#F2C08A]/50' : 'bg-[#FFFFFF]/60 hover:bg-[#FFFFFF]/90 border border-slate-200 hover:border-[#E8A365] shadow-xl'}`}
              >
                <div className={`p-4 rounded-2xl mb-6 shadow-inner transition-colors ${isDarkMode ? 'bg-[#1A2421] text-[#F2C08A] group-hover:bg-[#F2C08A]/10' : 'bg-[#F1F5F0] text-[#E8A365] group-hover:bg-[#E8A365]/10'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold mb-3 tracking-tight">Tomasulo Sim</h2>
                <p className={`text-base font-medium leading-relaxed ${isDarkMode ? 'text-[#8FA39A]' : 'text-[#758C83]'}`}>
                  Dynamic scheduling algorithm with Reservation Stations, Register Renaming, and Common Data Bus broadcasting.
                </p>
                <div className={`mt-8 inline-flex items-center gap-2 font-bold text-sm transition-transform group-hover:translate-x-2 ${isDarkMode ? 'text-[#F2C08A]' : 'text-[#E8A365]'}`}>
                  Launch Simulator <span>→</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Simulator Views */}
        {activeSim && (
          <div className="p-4 md:p-8 pt-6">
            <button 
              onClick={() => setActiveSim(null)} 
              className={`mb-6 flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all shadow-sm w-fit ${isDarkMode ? 'bg-[#1E2A3B]/80 text-[#9AA8B8] hover:text-white hover:bg-white/10 border border-white/5' : 'bg-[#FFFFFF]/90 text-slate-600 hover:text-slate-900 hover:bg-black/5 border border-black/5'}`}
            >
              ← Back to Hub
            </button>
            
            {activeSim === 'pipeline' && <PipelineApp isDarkMode={isDarkMode} />}
            {activeSim === 'tomasulo' && <TomasuloApp isDarkMode={isDarkMode} />}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
