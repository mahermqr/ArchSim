
import React, { useState } from 'react';
import { Config, InstructionType } from '../types';

interface ConfigPanelProps {
  config: Config;
  onConfigChange: (c: Config) => void;
  onInitRegsChange: (regs: Record<string, number>) => void;
  initialRegs: Record<string, number>;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, onConfigChange, onInitRegsChange, initialRegs }) => {
  const [activeTab, setActiveTab] = useState<'config' | 'init'>('config');

  const updateLatency = (ops: InstructionType[], val: number) => {
    const newLatencies = { ...config.latencies };
    ops.forEach(op => newLatencies[op] = val);
    onConfigChange({ ...config, latencies: newLatencies });
  };

  const updateRS = (key: keyof Config['rsCounts'], val: number) => {
    onConfigChange({ ...config, rsCounts: { ...config.rsCounts, [key]: val } });
  };
  
  const updateUnitCount = (key: keyof Config['unitCounts'], val: number) => {
    onConfigChange({ ...config, unitCounts: { ...config.unitCounts, [key]: val } });
  };

  const updatePipelined = (key: keyof Config['pipelined'], val: boolean) => {
      onConfigChange({ ...config, pipelined: { ...config.pipelined, [key]: val } });
  };

  const updateReg = (key: string, val: number) => {
      onInitRegsChange({ ...initialRegs, [key]: val });
  };

  const cardStyle = {
      background: 'rgba(255,255,255,0.05)',
      borderRadius: '8px',
      padding: '16px',
      border: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '12px'
  };

  const headerStyle = {
      color: 'var(--primary)',
      fontWeight: 'bold',
      fontSize: '1.1rem',
      marginBottom: '4px',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      paddingBottom: '8px'
  };

  const subHeaderStyle = {
      color: 'var(--gray)',
      fontSize: '0.8rem',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
      marginTop: '8px',
      marginBottom: '4px'
  };

  return (
    <div className="config-panel">
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
          <button 
            onClick={() => setActiveTab('config')}
            className={`tab ${activeTab === 'config' ? 'active' : ''}`}
          >
            Simulator Configuration
          </button>
          <button 
            onClick={() => setActiveTab('init')}
            className={`tab ${activeTab === 'init' ? 'active' : ''}`}
          >
            Initial Registers
          </button>
      </div>

      {activeTab === 'config' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
           
           {/* Integer Unit */}
           <div style={cardStyle}>
               <div style={headerStyle}>Integer Unit</div>
               
               <div style={subHeaderStyle}>Latencies</div>
               <label>
                   ADD / SUB
                   <input type="number" min="1"
                       value={config.latencies[InstructionType.ADD]} 
                       onChange={(e) => updateLatency([InstructionType.ADD, InstructionType.SUB], parseInt(e.target.value))} />
               </label>
               <label>
                   ADDI / SLTU
                   <input type="number" min="1"
                       value={config.latencies[InstructionType.ADDI]} 
                       onChange={(e) => updateLatency([InstructionType.ADDI, InstructionType.SLTU], parseInt(e.target.value))} />
               </label>

               <div style={subHeaderStyle}>Resources</div>
               <label>
                   Integer RS
                   <input type="number" min="1"
                       value={config.rsCounts.INT} 
                       onChange={(e) => updateRS('INT', parseInt(e.target.value))} />
               </label>
               <label>
                   Integer units
                   <input type="number" min="1"
                       value={config.unitCounts.INT}
                       onChange={(e) => updateUnitCount('INT', parseInt(e.target.value))} />
               </label>

               <div style={subHeaderStyle}>Behavior</div>
               <label style={{ justifyContent: 'flex-start', gap: '10px' }}>
                   <input type="checkbox" style={{ width: 'auto' }}
                       checked={config.pipelined.INT}
                       onChange={(e) => updatePipelined('INT', e.target.checked)} />
                   Pipelined
               </label>
           </div>

           {/* FP Add Unit */}
           <div style={cardStyle}>
               <div style={headerStyle}>FP Add Unit</div>
               
               <div style={subHeaderStyle}>Latency</div>
               <label>
                   FADD.D
                   <input type="number" min="1"
                       value={config.latencies[InstructionType.FADD]} 
                       onChange={(e) => updateLatency([InstructionType.FADD], parseInt(e.target.value))} />
               </label>

               <div style={subHeaderStyle}>Resources</div>
               <label>
                   FP Add RS
                   <input type="number" min="1"
                       value={config.rsCounts.FP_ADD} 
                       onChange={(e) => updateRS('FP_ADD', parseInt(e.target.value))} />
               </label>
               <label>
                   FP Add units
                   <input type="number" min="1"
                       value={config.unitCounts.FP_ADD}
                       onChange={(e) => updateUnitCount('FP_ADD', parseInt(e.target.value))} />
               </label>

               <div style={subHeaderStyle}>Behavior</div>
               <label style={{ justifyContent: 'flex-start', gap: '10px' }}>
                   <input type="checkbox" style={{ width: 'auto' }}
                       checked={config.pipelined.FP_ADD}
                       onChange={(e) => updatePipelined('FP_ADD', e.target.checked)} />
                   Pipelined
               </label>
           </div>

           {/* FP Multiply / Divide */}
           <div style={cardStyle}>
               <div style={headerStyle}>FP Multiply / Divide</div>
               
               <div style={subHeaderStyle}>Latencies</div>
               <label>
                   FMUL.D
                   <input type="number" min="1"
                       value={config.latencies[InstructionType.FMUL]} 
                       onChange={(e) => updateLatency([InstructionType.FMUL], parseInt(e.target.value))} />
               </label>
               <label>
                   FDIV.D
                   <input type="number" min="1"
                       value={config.latencies[InstructionType.FDIV]} 
                       onChange={(e) => updateLatency([InstructionType.FDIV], parseInt(e.target.value))} />
               </label>

               <div style={subHeaderStyle}>Resources</div>
               <label>
                   FP Mul/DIV RS
                   <input type="number" min="1"
                       value={config.rsCounts.FP_MUL} 
                       onChange={(e) => updateRS('FP_MUL', parseInt(e.target.value))} />
               </label>
               <label>
                   FP Mul/Div units
                   <input type="number" min="1"
                       value={config.unitCounts.FP_MUL}
                       onChange={(e) => updateUnitCount('FP_MUL', parseInt(e.target.value))} />
               </label>

               <div style={subHeaderStyle}>Behavior</div>
               <label style={{ justifyContent: 'flex-start', gap: '10px' }}>
                   <input type="checkbox" style={{ width: 'auto' }}
                       checked={config.pipelined.FP_MUL}
                       onChange={(e) => updatePipelined('FP_MUL', e.target.checked)} />
                   Pipelined
               </label>
           </div>

           {/* Memory Unit */}
           <div style={cardStyle}>
               <div style={headerStyle}>Memory Unit</div>
               
               <div style={subHeaderStyle}>Latencies</div>
               <label>
                   LD
                   <input type="number" min="1"
                       value={config.latencies[InstructionType.LD]} 
                       onChange={(e) => updateLatency([InstructionType.LD], parseInt(e.target.value))} />
               </label>
               <label>
                   ST
                   <input type="number" min="1"
                       value={config.latencies[InstructionType.ST]} 
                       onChange={(e) => updateLatency([InstructionType.ST], parseInt(e.target.value))} />
               </label>

               <div style={subHeaderStyle}>Resources</div>
               <label>
                   Load buffers
                   <input type="number" min="1"
                       value={config.rsCounts.LOAD} 
                       onChange={(e) => updateRS('LOAD', parseInt(e.target.value))} />
               </label>
               <label>
                   Store buffers
                   <input type="number" min="1"
                       value={config.rsCounts.STORE} 
                       onChange={(e) => updateRS('STORE', parseInt(e.target.value))} />
               </label>
               <label>
                   Load/Store units
                   <input type="number" min="1"
                       value={config.unitCounts.MEM}
                       onChange={(e) => updateUnitCount('MEM', parseInt(e.target.value))} />
               </label>
           </div>

           {/* Branch Unit */}
           <div style={cardStyle}>
               <div style={headerStyle}>Branch Unit</div>
               
               <div style={subHeaderStyle}>Latency</div>
               <label>
                   BNEZ
                   <input type="number" min="1"
                       value={config.latencies[InstructionType.BNEZ]} 
                       onChange={(e) => updateLatency([InstructionType.BNEZ], parseInt(e.target.value))} />
               </label>

               <div style={subHeaderStyle}>Prediction</div>
               <label style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '5px' }}>
                   Branch Strategy
                   <select 
                     value={config.branchPredictor}
                     onChange={(e) => onConfigChange({ ...config, branchPredictor: e.target.value as any })}
                   >
                     <option value="STALL">Stall until resolved (Default)</option>
                     <option value="TAKEN">Predict Taken (Speculative)</option>
                     <option value="NOT_TAKEN">Predict Not Taken (Speculative)</option>
                   </select>
               </label>
           </div>

           {/* Global Pipeline */}
           <div style={cardStyle}>
               <div style={headerStyle}>Global Pipeline</div>
               
               <div style={subHeaderStyle}>Controls</div>
               <label>
                   Issue width
                   <input type="number" min="1"
                       value={config.issueWidth} 
                       onChange={(e) => onConfigChange({ ...config, issueWidth: parseInt(e.target.value) })} />
               </label>
               {/* 
               <label style={{ justifyContent: 'flex-start', gap: '10px' }}>
                   <input type="checkbox" style={{ width: 'auto' }}
                       disabled={true}
                       checked={config.loopMode}
                       onChange={(e) => onConfigChange({ ...config, loopMode: e.target.checked })} />
                   Loop mode (dynamic ids)
               </label>
               <label>
                   Loop iterations
                   <input type="number" min="1" disabled={true}
                       value={config.loopIterations}
                       onChange={(e) => onConfigChange({ ...config, loopIterations: parseInt(e.target.value) })} />
               </label>
               */}
           </div>

        </div>
      ) : (
        <div style={{ display: 'grid', gap: '30px' }}>
            <div>
               <h3 style={{ color: 'var(--primary)', marginBottom: '15px' }}>Integer Registers (R0-R15)</h3>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '10px' }}>
                   {Array.from({length: 16}).map((_, i) => (
                       <div key={`R${i}`}>
                           <span style={{ fontSize: '0.8rem', color: 'var(--gray)', display: 'block', marginBottom: '4px' }}>R{i}</span>
                           <input 
                               type="number" 
                               style={{ padding: '8px' }}
                               value={initialRegs[`R${i}`] || 0}
                               onChange={(e) => updateReg(`R${i}`, parseInt(e.target.value))}
                           />
                       </div>
                   ))}
               </div>
            </div>
            <div>
               <h3 style={{ color: 'var(--primary)', marginBottom: '15px' }}>Floating Point Registers (F0-F15)</h3>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '10px' }}>
                   {Array.from({length: 16}).map((_, i) => (
                       <div key={`F${i}`}>
                           <span style={{ fontSize: '0.8rem', color: 'var(--gray)', display: 'block', marginBottom: '4px' }}>F{i}</span>
                           <input 
                               type="number" 
                               style={{ padding: '8px' }}
                               value={initialRegs[`F${i}`] || 0}
                               onChange={(e) => updateReg(`F${i}`, parseInt(e.target.value))}
                           />
                       </div>
                   ))}
               </div>
            </div>
        </div>
      )}
    </div>
  );
};
