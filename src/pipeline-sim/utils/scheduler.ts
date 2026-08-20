import { Instruction, PipelineConfig } from '../types';

/**
 * Renames registers to resolve WAR and WAW hazards, simulating an infinite register file (SSA-like).
 * Essential for effective Out-of-Order scheduling simulation.
 */
export const renameRegisters = (instructions: Instruction[]): Instruction[] => {
  const latestVersion: Record<string, number> = {};
  
  // Helper to get next version
  const newVersion = (reg: string) => {
    if (['$zero', 'zero', 'x0'].includes(reg)) return reg;
    const v = (latestVersion[reg] || 0) + 1;
    latestVersion[reg] = v;
    return `${reg}_v${v}`;
  };

  // Helper to get current version
  const currentVersion = (reg: string) => {
    if (['$zero', 'zero', 'x0'].includes(reg)) return reg;
    return latestVersion[reg] ? `${reg}_v${latestVersion[reg]}` : reg;
  };

  return instructions.map(inst => {
    // Read operands use current version
    const src1 = inst.src1 ? currentVersion(inst.src1) : null;
    const src2 = inst.src2 ? currentVersion(inst.src2) : null;
    
    // Dest operand creates new version
    const dest = inst.dest ? newVersion(inst.dest) : null;

    // Preserve raw string but update fields for logic
    // We update 'raw' slightly to visualize the renaming
    let newRaw = inst.raw;
    if (inst.src1 && src1 && src1 !== inst.src1) newRaw += ` [${src1}]`;
    
    return {
      ...inst,
      src1,
      src2,
      dest,
    };
  });
};

/**
 * Reorders instructions using List Scheduling to minimize stalls.
 * Respects RAW dependencies. Assumes WAR/WAW resolved by renaming if applied first.
 */
export const scheduleTrace = (instructions: Instruction[], latencies: PipelineConfig['latencies']): Instruction[] => {
  // 1. Build Dependency Graph
  const successors: Map<number, number[]> = new Map();
  const predecessors: Map<number, number[]> = new Map();
  const inDegree: Map<number, number> = new Map();
  const nodes = new Map<number, Instruction>();

  instructions.forEach(inst => {
    successors.set(inst.id, []);
    predecessors.set(inst.id, []);
    inDegree.set(inst.id, 0);
    nodes.set(inst.id, inst);
  });

  // Scoreboard to track who produces what register
  // Since we assume renaming (SSA), each reg is produced exactly once
  const producers: Record<string, number> = {};

  instructions.forEach(inst => {
    // Check RAW dependencies
    [inst.src1, inst.src2].forEach(src => {
        if (src && producers[src] !== undefined) {
            const prodId = producers[src];
            // Add edge prod -> inst
            successors.get(prodId)?.push(inst.id);
            predecessors.get(inst.id)?.push(prodId);
            inDegree.set(inst.id, (inDegree.get(inst.id) || 0) + 1);
        }
    });

    if (inst.dest) {
        producers[inst.dest] = inst.id;
    }
  });

  // 2. List Scheduling
  const readyList: Instruction[] = [];
  // Initialize ready list (in-degree 0)
  instructions.forEach(inst => {
    if ((inDegree.get(inst.id) || 0) === 0) {
        readyList.push(inst);
    }
  });

  const scheduled: Instruction[] = [];
  
  while (readyList.length > 0) {
    // Sort readyList by original ID to keep logical flow if possible
    readyList.sort((a, b) => a.id - b.id);
    
    const node = readyList.shift()!;
    scheduled.push(node);

    // Update neighbors
    const neighbors = successors.get(node.id) || [];
    neighbors.forEach(succId => {
        const d = (inDegree.get(succId) || 0) - 1;
        inDegree.set(succId, d);
        if (d === 0) {
            readyList.push(nodes.get(succId)!);
        }
    });
  }

  return scheduled;
};
