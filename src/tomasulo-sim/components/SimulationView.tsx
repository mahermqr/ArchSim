
import React, { useState, useMemo } from 'react';
import { InstructionStatus, RSEntry, SimulatorState, RatEntry } from '../types';

// --- Metrics Dashboard ---
export const DashboardMetrics: React.FC<{ state: SimulatorState | null }> = ({ state }) => {
    const cycle = state?.cycle || 0;
    const pc = state?.pc || 0;
    const finishedCount = state?.status.filter(s => s.execEnd !== null && !s.flushed).length || 0;
    
    // Count only instructions that have a valid issue cycle (successfully issued) and not flushed
    const issuedCount = state?.status.filter(s => s.issue !== null && !s.flushed).length || 0;
    
    const activeUnits = state?.rs.filter(r => r.busy).length || 0;
    
    // Simple CPI calculation
    const cpi = finishedCount > 0 ? (cycle / finishedCount).toFixed(2) : "0.00";

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full">
            <div className="bg-[#1E2A3B]/80 border border-white/5 p-4 rounded-2xl shadow-lg flex flex-col justify-between">
                <div className="text-[10px] md:text-xs uppercase font-bold text-[#9AA8B8] mb-1">Current Cycle</div>
                <div className="text-xl md:text-2xl font-extrabold text-white">{cycle}</div>
                <div className="w-full h-1 bg-black/20 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-[#DCA4A7] rounded-full" style={{ width: `${(cycle % 100)}%` }}></div>
                </div>
            </div>
            <div className="bg-[#1E2A3B]/80 border border-white/5 p-4 rounded-2xl shadow-lg flex flex-col justify-between">
                <div className="text-[10px] md:text-xs uppercase font-bold text-[#9AA8B8] mb-1">Program Counter</div>
                <div className="text-xl md:text-2xl font-extrabold text-[#DCA4A7]">{pc}</div>
            </div>
            <div className="bg-[#1E2A3B]/80 border border-white/5 p-4 rounded-2xl shadow-lg flex flex-col justify-between">
                <div className="text-[10px] md:text-xs uppercase font-bold text-[#9AA8B8] mb-1">Instr Issued</div>
                <div className="text-xl md:text-2xl font-extrabold text-[#C97A7E]">{issuedCount}</div>
            </div>
            <div className="bg-[#1E2A3B]/80 border border-white/5 p-4 rounded-2xl shadow-lg flex flex-col justify-between">
                <div className="text-[10px] md:text-xs uppercase font-bold text-[#9AA8B8] mb-1">CPI</div>
                <div className="text-xl md:text-2xl font-extrabold text-[#E3B5A4]">{cpi}</div>
            </div>
            <div className="bg-[#1E2A3B]/80 border border-white/5 p-4 rounded-2xl shadow-lg flex flex-col justify-between">
                <div className="text-[10px] md:text-xs uppercase font-bold text-[#9AA8B8] mb-1">Active Units</div>
                <div className="text-xl md:text-2xl font-extrabold text-white">{activeUnits}</div>
                <div className="w-full h-1 bg-black/20 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min(activeUnits * 10, 100)}%` }}></div>
                </div>
            </div>
        </div>
    );
}

// --- Schedule View (Exam Style) ---
export const ScheduleView: React.FC<{ status: InstructionStatus[], instructions: any[], cycle: number }> = ({ status, instructions, cycle }) => {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'id', direction: 'asc' });
  const [filterText, setFilterText] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const getOpTag = (op: string) => {
      const o = op.toUpperCase();
      if (['BNEZ', 'BEQZ', 'BNE', 'BEQ'].includes(o)) return '[BR] ';
      if (['FADD.D', 'FMUL.D', 'FDIV.D', 'FLD', 'FSD'].includes(o) || o.startsWith('F')) return '[FP] ';
      return '[INT] ';
  };

  const getRowClass = (s: InstructionStatus) => {
      if (s.flushed) return 'log-row stage-flushed';
      
      // Priority: Issue -> WriteResult -> Exec -> Stall
      if (s.issue === cycle) return 'log-row stage-issue fade-in';
      if (s.writeResult === cycle) return 'log-row stage-cdb pulse';
      
      const isExec = s.execStart !== null && (s.execEnd === null || cycle <= s.execEnd) && cycle >= s.execStart;
      if (isExec) return 'log-row stage-ex';

      const isStalled = s.stallReasons?.some(r => r.cycle === cycle);
      if (isStalled) return 'log-row stage-stall';
      
      return 'log-row';
  };

  const formatStalls = (reasons?: { cycle: number; reason: string }[]) => {
      if (!reasons || reasons.length === 0) return '—';
      
      const grouped: string[] = [];
      let start = reasons[0];
      let prev = reasons[0];
      
      for (let i = 1; i < reasons.length; i++) {
          const current = reasons[i];
          if (current.cycle === prev.cycle + 1 && current.reason === prev.reason) {
              prev = current;
          } else {
              grouped.push(start.cycle === prev.cycle ? `${start.cycle}: ${start.reason}` : `${start.cycle}-${prev.cycle}: ${start.reason}`);
              start = current;
              prev = current;
          }
      }
      grouped.push(start.cycle === prev.cycle ? `${start.cycle}: ${start.reason}` : `${start.cycle}-${prev.cycle}: ${start.reason}`);
      
      return grouped.join('; ');
  };

  const handleSort = (key: string) => {
    setSortConfig(current => ({
        key,
        direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const processedStatus = useMemo(() => {
    let result = [...status];

    // Filter Status
    if (filterStatus === 'FLUSHED') {
        result = result.filter(s => s.flushed);
    } else if (filterStatus === 'COMPLETED') {
        result = result.filter(s => s.writeResult !== null && !s.flushed);
    } else if (filterStatus === 'ACTIVE') {
        result = result.filter(s => !s.flushed && s.writeResult === null);
    }

    // Filter Text
    if (filterText) {
        const lower = filterText.toLowerCase();
        result = result.filter(s => {
            const inst = instructions.find(i => i.id === s.staticId);
            return inst && inst.text.toLowerCase().includes(lower);
        });
    }

    // Sort
    result.sort((a, b) => {
        const dir = sortConfig.direction === 'asc' ? 1 : -1;
        
        if (sortConfig.key === 'id') return (a.id - b.id) * dir;
        
        if (sortConfig.key === 'instruction') {
             const iA = instructions.find(i => i.id === a.staticId);
             const iB = instructions.find(i => i.id === b.staticId);
             const tA = iA ? iA.text : '';
             const tB = iB ? iB.text : '';
             return tA.localeCompare(tB) * dir;
        }

        const getValue = (s: InstructionStatus, k: string) => {
            switch(k) {
                case 'issue': return s.issue;
                case 'exec': return s.execStart; // Sort by start time
                case 'cdb': return s.writeResult;
                case 'stalls': return s.stallReasons?.length || 0;
                default: return 0;
            }
        };

        const valA = getValue(a, sortConfig.key);
        const valB = getValue(b, sortConfig.key);

        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1; // Nulls last
        if (valB === null || valB === undefined) return -1;
        
        return (valA < valB ? -1 : 1) * dir;
    });

    return result;
  }, [status, instructions, filterText, filterStatus, sortConfig]);

  const renderSortHeader = (label: string, key: string, hint: string) => (
      <span 
        className={`sort-header ${sortConfig.key === key ? 'active' : ''}`} 
        onClick={() => handleSort(key)}
        data-hint={hint}
      >
        {label} 
        <span className="sort-icon">
            {sortConfig.key === key ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </span>
  );

  return (
    <div className="viz-panel overflow-x-auto w-full">
      <div className="section-header">
        <h3 data-hint="Chronological view of each issued instance.">Instruction Table</h3>
      </div>

      <div className="table-controls">
          <input 
            type="text" 
            className="search-input"
            placeholder="Search instructions (e.g., 'ADD', 'R1')..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
          <select 
            className="status-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active / In-Flight</option>
              <option value="COMPLETED">Completed</option>
              <option value="FLUSHED">Flushed</option>
          </select>
      </div>
      
      <div id="instrlog" className="instrlog">
        <div className="log-row header">
            {renderSortHeader("Id", "id", "Dynamic id of the issued instruction instance")}
            {renderSortHeader("Instruction", "instruction", "Static instruction text with type badge")}
            {renderSortHeader("Issue", "issue", "Cycle the instruction issued into a reservation station")}
            {renderSortHeader("EX / mem", "exec", "Execution cycles (start-end)")}
            {renderSortHeader("CDB", "cdb", "Cycles where result rode the CDB")}
            {renderSortHeader("Stalls", "stalls", "Why the instruction waited")}
        </div>

        {processedStatus.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--gray)', fontStyle: 'italic' }}>
                No instructions match filters.
            </div>
        ) : processedStatus.map((s) => {
            // Find static instruction text using staticId
            const inst = instructions.find(i => i.id === s.staticId);
            if (!inst) return null;
            
            const tag = getOpTag(inst.op);
            const rowClass = getRowClass(s);
            
            const exRange = (s.execStart !== null) 
                ? (s.execEnd !== null && s.execStart !== s.execEnd ? `${s.execStart}-${s.execEnd}` : `${s.execStart}`)
                : '-';

            // Stores and Branches do not utilize CDB for register writeback in this model visualization
            const noCdbOps = ['FSD', 'BNEZ', 'ST', 'SW', 'BEQZ', 'BEQ', 'BNE'];
            const cdbText = noCdbOps.includes(inst.op) ? '-' : (s.writeResult ?? '-');
            
            const stallsText = s.flushed ? 'FLUSHED' : formatStalls(s.stallReasons);

            return (
                <div key={s.id} className={rowClass} style={s.flushed ? { opacity: 0.5, textDecoration: 'line-through' } : {}}>
                    <span className="id">{s.id}</span>
                    <span className="instr">{tag}{inst.text}</span>
                    <span className="issue">{s.issue ?? '-'}</span>
                    <span className="ex">{exRange}</span>
                    <span className={`cdb ${s.writeResult && !noCdbOps.includes(inst.op) ? 'cdb-write' : ''}`}>{cdbText}</span>
                    <span className="stalls" title={stallsText}>{stallsText}</span>
                </div>
            );
        })}
      </div>
    </div>
  );
};

// --- Function Units (Executing Only) ---
export const FunctionUnitsView: React.FC<{ rs: RSEntry[], status: InstructionStatus[] }> = ({ rs, status }) => {
    // Show active units using card style
    const busyUnits = rs.filter(r => r.busy);

    if (busyUnits.length === 0) {
        return (
            <div className="viz-panel overflow-x-auto w-full">
                 <h3><span>🏗️</span> Function Units</h3>
                 <div className="queue-item empty">No active function units</div>
            </div>
        )
    }

    return (
        <div className="viz-panel overflow-x-auto w-full">
            <h3><span>🏗️</span> Function Units</h3>
            <div className="function-unit-grid">
                {busyUnits.map(unit => {
                    const isExecuting = status.find(s => s.id === unit.instructionId)?.execStart !== null;
                    return (
                        <div key={unit.id} className={`function-unit-card ${isExecuting ? 'executing' : 'busy'}`}>
                            <div className="function-unit-header">
                                <div className="function-unit-name">{unit.id}</div>
                                <div className={`function-unit-status ${isExecuting ? 'status-executing' : 'status-busy'}`}>
                                    {isExecuting ? 'EXECUTING' : 'BUSY'}
                                </div>
                            </div>
                            <div className="function-unit-fields">
                                <div className="field">
                                    <div className="field-label">Op</div>
                                    <div className="field-value">{unit.op}</div>
                                </div>
                                <div className="field">
                                    <div className="field-label">Time Left</div>
                                    <div className="field-value">{unit.timeLeft}</div>
                                </div>
                                <div className="field">
                                    <div className="field-label">Vj</div>
                                    <div className="field-value">{unit.vj || '-'}</div>
                                </div>
                                <div className="field">
                                    <div className="field-label">Vk</div>
                                    <div className="field-value">{unit.vk || '-'}</div>
                                </div>
                                <div className="field">
                                    <div className="field-label">Qj</div>
                                    <div className="field-value">{unit.qj || '-'}</div>
                                </div>
                                <div className="field">
                                    <div className="field-label">Qk</div>
                                    <div className="field-value">{unit.qk || '-'}</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- Reservation Stations / Queues View ---
export const ReservationStationsView: React.FC<{ rs: RSEntry[] }> = ({ rs }) => {
    // Group by type to mimic "Queues"
    const groups = {
        'Integer': rs.filter(r => r.type === 'INT'),
        'FP Add': rs.filter(r => r.type === 'FP_ADD'),
        'FP Mul': rs.filter(r => r.type === 'FP_MUL'),
        'Load': rs.filter(r => r.type === 'LOAD'),
        'Store': rs.filter(r => r.type === 'STORE'),
    };

    return (
        <div className="viz-panel overflow-x-auto w-full">
            <h3><span>📋</span> Reservation Station Queues</h3>
            {Object.entries(groups).map(([name, entries]) => (
                <div key={name} className="queue-panel">
                    <div className="queue-header">
                        <div className="queue-title">{name} Queue</div>
                        <div className="queue-size">{entries.filter(e=>e.busy).length}/{entries.length}</div>
                    </div>
                    {entries.map(entry => (
                        <div key={entry.id} className={`queue-item ${entry.busy ? 'waiting' : 'empty'}`}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 'bold' }}>{entry.id}</span>
                                <span>{entry.busy ? entry.op : 'Free'}</span>
                            </div>
                            {entry.busy && (
                                <div style={{ fontSize: '0.85em', color: 'var(--gray)', marginTop: '5px' }}>
                                    {entry.qj ? `Wait Qj: ${entry.qj}` : `Vj: ${entry.vj}`} | {entry.qk ? `Wait Qk: ${entry.qk}` : `Vk: ${entry.vk}`}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

// --- Registers View ---
export const RegisterStatusView: React.FC<{ rat: Record<string, RatEntry> }> = ({ rat }) => {
    const ratEntries = Object.values(rat) as RatEntry[];
    const rRegs = ratEntries.filter(r => r.reg.startsWith('R')).sort((a,b) => parseInt(a.reg.slice(1)) - parseInt(b.reg.slice(1)));
    const fRegs = ratEntries.filter(r => r.reg.startsWith('F')).sort((a,b) => parseInt(a.reg.slice(1)) - parseInt(b.reg.slice(1)));

    return (
        <div className="viz-panel overflow-x-auto w-full">
             <h3><span>📊</span> Register File</h3>
             
             <h4 style={{ color: 'var(--gray)', marginBottom: '10px' }}>Integer Registers</h4>
             <div className="register-display" style={{ marginBottom: '20px' }}>
                 {rRegs.slice(0, 16).map(r => (
                     <div key={r.reg} className={`register-cell ${r.tag ? 'waiting' : ''}`}>
                         <div className="register-name">{r.reg}</div>
                         <div className="register-value">{r.value}</div>
                         {r.tag && <div className="register-dependency">Wait: {r.tag}</div>}
                     </div>
                 ))}
             </div>

             <h4 style={{ color: 'var(--gray)', marginBottom: '10px' }}>FP Registers</h4>
             <div className="register-display">
                 {fRegs.slice(0, 16).map(r => (
                     <div key={r.reg} className={`register-cell ${r.tag ? 'waiting' : ''}`}>
                         <div className="register-name">{r.reg}</div>
                         <div className="register-value">{r.value}</div>
                         {r.tag && <div className="register-dependency">Wait: {r.tag}</div>}
                     </div>
                 ))}
             </div>
        </div>
    );
};

// --- Memory View ---
export const MemoryView: React.FC<{ memory: number[] }> = ({ memory }) => {
    return (
        <div className="viz-panel overflow-x-auto w-full">
             <h3><span>💾</span> Memory Contents</h3>
             <div className="register-display">
                 {memory.map((val, idx) => (
                    <div key={`mem-${idx}`} className="register-cell">
                        <div className="register-name">@{idx}</div>
                        <div className="register-value">{val}</div>
                    </div>
                 ))}
             </div>
        </div>
    );
};

// --- CDB View ---
export const CDBView: React.FC<{ cdb: { tag: string, value: string } | null }> = ({ cdb }) => {
    if (!cdb) {
        return (
            <div className="viz-panel overflow-x-auto w-full">
                <h3><span>🚌</span> Common Data Bus</h3>
                <div style={{ color: 'var(--gray)', fontStyle: 'italic', padding: '20px', textAlign: 'center' }}>CDB Inactive</div>
            </div>
        );
    }
    return (
        <div className="viz-panel overflow-x-auto w-full">
            <h3><span>🚌</span> Common Data Bus</h3>
             <div className="function-unit-card executing" style={{ borderLeft: '4px solid var(--success)', animation: 'none' }}>
                 <div className="function-unit-header">
                     <div className="function-unit-name">Broadcast Active</div>
                     <div className="function-unit-status status-executing">ACTIVE</div>
                 </div>
                 <div style={{ fontFamily: 'Cascadia Code, monospace', fontSize: '1.2rem', textAlign: 'center', padding: '10px' }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{cdb.tag}</span>
                    <span style={{ margin: '0 10px' }}>➔</span>
                    <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>{cdb.value}</span>
                 </div>
             </div>
        </div>
    );
}

// --- Instructions Queue View ---
export const InstructionQueueView: React.FC<{ instructions: any[], pc: number }> = ({ instructions, pc }) => {
    return (
        <div className="viz-panel overflow-x-auto w-full">
            <h3><span>📈</span> Instruction Queue</h3>
            {instructions.map((inst, idx) => {
                // Static PC visualization might differ from dynamic.
                // Simple highlight of current Static PC
                let status = 'waiting';
                if (idx < pc) status = 'issued'; // Roughly
                if (idx === pc) status = 'next';
                
                return (
                    <div key={inst.id} style={{ 
                        padding: '12px', 
                        marginBottom: '8px', 
                        background: idx === pc ? 'rgba(37, 99, 235, 0.2)' : 'rgba(30, 41, 59, 0.4)',
                        borderLeft: idx === pc ? '4px solid var(--primary)' : '4px solid transparent',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between'
                    }}>
                        <span style={{ fontFamily: 'Cascadia Code, monospace' }}>{inst.text}</span>
                        <span style={{ textTransform: 'uppercase', fontSize: '0.8rem', opacity: 0.7 }}>{status}</span>
                    </div>
                )
            })}
        </div>
    )
}


