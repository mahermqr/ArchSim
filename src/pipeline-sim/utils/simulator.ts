import { Instruction, LatencyConfig, PipelineConfig, SimulationResult } from '../types';

const getLatency = (opcode: string, config: LatencyConfig): number => {
  const op = opcode.toLowerCase();
  
  // Floating Point
  if (op.startsWith('fadd') || op.startsWith('fsub') || op === 'add.d' || op === 'sub.d' || op === 'add.s' || op === 'sub.s') return config.fpAdd;
  if (op.startsWith('fmul') || op === 'mul.d' || op === 'mul.s') return config.fpMul;
  if (op.startsWith('fdiv') || op === 'div.d' || op === 'div.s') return config.fpDiv;
  
  // Integer Multiply/Divide
  if (op === 'mul' || op === 'mult' || op === 'multu') return config.intMul;
  if (op === 'div' || op === 'divu' || op === 'rem') return config.intDiv;

  // Store 
  if (['sd', 'sw', 'fsd', 'fsw', 's.d'].some(o => op.startsWith(o))) return config.store;

  // Load 
  if (['ld', 'lw', 'fld', 'flw', 'l.d'].some(o => op.startsWith(o))) return config.memory;
  
  // Branch
  if (op.startsWith('b') || op === 'j' || op === 'jal' || op === 'jr') return config.branch;
  
  // Default Integer
  return config.integer; 
};

export const simulatePipeline = (instructions: Instruction[], config: PipelineConfig): SimulationResult[] => {
  const results: SimulationResult[] = [];
  
  // Register Scoreboard: maps register name to the cycle it is AVAILABLE
  const registerAvailability: Record<string, number> = {};

  instructions.forEach((inst, index) => {
    const latency = getLatency(inst.opcode, config.latencies);
    const isStore = ['sd', 'sw', 'fsd', 'fsw', 's.d'].some(o => inst.opcode.toLowerCase().startsWith(o));
    const isLoad = ['ld', 'lw', 'fld', 'flw', 'l.d'].some(o => inst.opcode.toLowerCase().startsWith(o));
    const isBranch = ['beq', 'bne', 'bnz', 'beqz', 'bnez', 'blt', 'bge', 'bgt', 'ble', 'j', 'jal', 'jr'].includes(inst.opcode.toLowerCase());
    
    // Previous instruction timing
    const prev = index > 0 ? results[index - 1].timing : null;

    // --- 1. Fetch Stage & Branch Prediction ---
    
    let IF_Start = 1;
    if (prev) {
      const prevInst = results[index - 1].instruction;
      const prevIsBranch = ['beq', 'bne', 'bnz', 'beqz', 'bnez', 'blt', 'bge', 'bgt', 'ble', 'j', 'jal', 'jr'].includes(prevInst.opcode.toLowerCase());
      
      // Basic Sequence
      let nextCycle = prev.IF + 1;
      
      // Structural Backpressure: Align F with previous D start
      nextCycle = Math.max(nextCycle, prev.ID);

      // Branch Prediction Logic
      if (prevIsBranch) {
        // Determine if branch was actually taken by looking at line numbers
        // If the current instruction is NOT the immediate next line number, a jump occurred.
        const actuallyTaken = inst.lineNumber !== prevInst.lineNumber + 1;
        
        // Did we guess right?
        const prediction = config.branchPrediction || 'not-taken';
        const predictionCorrect = (prediction === 'taken' && actuallyTaken) || (prediction === 'not-taken' && !actuallyTaken);

        if (!predictionCorrect) {
          // Misprediction Penalty: Fetch must wait until Branch resolves in EX
          nextCycle = Math.max(nextCycle, prev.EX_END + 1);
        }
        // If prediction correct, we proceed at 'nextCycle' (zero penalty)
      }

      IF_Start = nextCycle;
    }
    
    const IF_Duration = 1;
    const IF_End = IF_Start + IF_Duration - 1;

    // --- 2. Decode Stage ---
    // Start condition:
    // 1. After Fetch (IF_End + 1).
    // 2. Structural: Decode unit free (prev ID_End + 1? No, prev ID start + 1 for pipeline).
    let ID_Start = IF_End + 1;
    if (prev) {
        // Must wait for previous instruction to leave ID (conceptually enters EX)
        // Stricter rule: ID_Start >= prev.ID + 1. 
        // If prev stalled in ID, it occupies ID until prev.ID_End.
        ID_Start = Math.max(ID_Start, prev.ID + 1); 
        // Also wait for prev to clear structural hazard if it stalled
        ID_Start = Math.max(ID_Start, prev.EX_START); 
    }

    // --- 3. Execute Stage & Hazards ---
    const ID_Duration = 1; // Minimum
    let EX_Earliest = ID_Start + ID_Duration;
    
    // Structural for EX
    let EX_Start = EX_Earliest;
    if (prev) {
        EX_Start = Math.max(EX_Start, prev.EX_END + 1); // Wait for EX unit
    }

    // Data Hazards (RAW)
    // Applies to ALL instructions, including Branches (they need operands to compare)
    let hazardReady = 0;
    let stallReason: string | null = null;
    
    const checkDependency = (reg: string | null) => {
      if (!reg) return;
      const normalizedReg = reg.toLowerCase();
      if (['$zero', 'zero', 'x0'].includes(normalizedReg)) return;

      if (registerAvailability[normalizedReg] !== undefined) {
        const avail = registerAvailability[normalizedReg];
        // The operand must be ready BEFORE the cycle we start EX.
        // So EX_Start must be >= avail.
        if (avail > hazardReady) {
            hazardReady = avail;
            stallReason = reg;
        }
      }
    };

    checkDependency(inst.src1);
    checkDependency(inst.src2);

    if (hazardReady > EX_Start) {
        EX_Start = hazardReady;
    }

    // Calculate Backpressure impact on ID
    // If EX starts late, ID occupied longer
    const ID_End = EX_Start - 1;
    
    // Calculate EX Duration & MEM Entry
    let EX_Duration = Math.max(1, latency);
    if (isLoad || isStore) EX_Duration = 1; // Address calc usually 1
    
    const EX_End = EX_Start + EX_Duration - 1;

    // --- 4. Memory Stage ---
    let MEM_Start = EX_End + 1;
    if (prev) {
        // Structural: Wait for MEM unit
        MEM_Start = Math.max(MEM_Start, prev.MEM + 1); 
        // If prev was a long load, we wait for it to clear MEM (or WB start)
        MEM_Start = Math.max(MEM_Start, prev.WB); 
    }

    // MEM Duration
    let MEM_Duration = 1;
    if (isLoad) {
        MEM_Duration = config.latencies.memory; 
    } else if (isStore) {
        MEM_Duration = config.latencies.store; 
    }

    const MEM_End = MEM_Start + MEM_Duration - 1;

    // --- 5. Writeback Stage ---
    let WB_Start = MEM_End + 1;
    if (prev) {
        // Stores don't write to register file, so they don't block/wait for WB port
        if (!isStore) {
             WB_Start = Math.max(WB_Start, prev.WB + 1);
        }
    }
    
    const WB_Duration = 1;
    const WB_End = WB_Start + WB_Duration - 1;

    // --- 6. Scoreboard Update ---
    if (inst.dest && !['$zero', 'zero', 'x0'].includes(inst.dest.toLowerCase()) && !isBranch && !isStore) {
        let availableAt;
        if (config.forwarding) {
            if (isLoad) {
                // Forwarding from Load must wait until MEM is done
                availableAt = MEM_End + 1;
            } else {
                // Forwarding from ALU results available after EX
                availableAt = EX_End + 1;
            }
        } else {
            // Forwarding OFF: "Execute with Write"
            // Result available at start of WB stage
            availableAt = WB_Start;
        }
        registerAvailability[inst.dest.toLowerCase()] = availableAt;
    }

    results.push({
      instruction: inst,
      timing: {
        IF: IF_Start,
        ID: ID_Start,
        EX_START: EX_Start,
        EX_END: EX_End,
        MEM: MEM_Start,
        WB: WB_Start,
        stallCycles: (ID_End - ID_Start), // Stalls in ID
        dependency: stallReason
      }
    });
  });

  return results;
};
