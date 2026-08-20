
import { Instruction } from '../types';

// Regex helpers
const REGEX_LABEL = /^([a-zA-Z0-9_]+):/; 
// Matches $t0, x1, f1, zero, ra, etc. 
const REGEX_REG = /(\$[a-zA-Z0-9]+|[a-zA-Z][a-zA-Z0-9]*)/g;

export const parseAssembly = (code: string): Instruction[] => {
  const lines = code.split('\n');
  const instructions: Instruction[] = [];
  let idCounter = 1;
  let pendingLabel: string | null = null;

  lines.forEach((line, index) => {
    let cleanLine = line.trim();
    if (!cleanLine || cleanLine.startsWith(';') || cleanLine.startsWith('#')) return;

    // Extract Label if present
    const labelMatch = cleanLine.match(REGEX_LABEL);
    let currentLabel = pendingLabel;
    if (labelMatch) {
      currentLabel = labelMatch[1];
      cleanLine = cleanLine.replace(REGEX_LABEL, '').trim();
      pendingLabel = null; // Consumed
    }

    // If line is empty after removing label, it was just a label line
    if (!cleanLine) {
      pendingLabel = currentLabel;
      return;
    }

    // Remove comments again just in case
    cleanLine = cleanLine.split(';')[0].split('#')[0].trim();

    const parts = cleanLine.replace(/,/g, ' ').split(/\s+/);
    const opcode = parts[0].toLowerCase();
    
    // Extract registers using regex from the rest of the string
    const argsString = cleanLine.substring(opcode.length);
    const registers = argsString.match(REGEX_REG) || [];

    let dest: string | null = null;
    let src1: string | null = null;
    let src2: string | null = null;
    let target: string | null = null;

    // Heuristics for MIPS/RISC-V parsing
    const isStore = ['sd', 'sw', 'fsd', 'fsw', 's.d'].includes(opcode);
    const isBranch = ['beq', 'bne', 'bnz', 'beqz', 'bnez', 'blt', 'bge', 'bgt', 'ble', 'j', 'jal'].includes(opcode);
    const isLi = opcode === 'li';

    if (isStore) {
      // Store: sd x1, 0(x2) -> src1=x1, src2=x2
      src1 = registers[0] || null;
      src2 = registers[1] || null;
    } else if (isBranch) {
      // Branch targets are usually the last argument
      // e.g. bne $t1, $zero, Loop
      // registers: [$t1, $zero, Loop]
      // target is Loop.
      
      const lastArg = parts[parts.length - 1]; // Use split parts to get the raw string of the last arg (label)
      target = lastArg;

      if (registers.length > 0) src1 = registers[0];
      if (registers.length > 1 && registers[1] !== target) src2 = registers[1];
      
      // Clean up target if it looks like a register in the regex match but is logically the target
      // (The REGEX_REG captures 'Loop' as a register candidate)
    } else if (isLi) {
      // li $t0, 10 -> dest=$t0
      dest = registers[0] || null;
    } else {
      // Normal: add x1, x2, x3 -> dest=x1, src1=x2, src2=x3
      // Load: ld x1, 0(x2) -> dest=x1, src1=x2
      if (registers.length > 0) dest = registers[0];
      if (registers.length > 1) src1 = registers[1];
      if (registers.length > 2) src2 = registers[2];
    }

    instructions.push({
      id: idCounter++,
      raw: cleanLine, // Keep just the instruction part for display
      opcode,
      dest,
      src1,
      src2,
      label: currentLabel,
      target,
      lineNumber: index + 1,
    });
  });

  return instructions;
};

/**
 * Expands a linear list of instructions into a trace by simulating loop iterations.
 * @param instructions Original parsed instructions
 * @param iterations Number of times the loop should execute
 */
export const expandTrace = (instructions: Instruction[], iterations: number): Instruction[] => {
  if (iterations <= 1) return instructions;

  // 1. Identify the Loop
  // Heuristic: Find the LAST backward branch.
  let loopBranchIdx = -1;
  let loopTargetLabel = "";

  for (let i = instructions.length - 1; i >= 0; i--) {
    const inst = instructions[i];
    if (inst.target) {
      // Check if this target is a label defined *before* this instruction
      const targetIdx = instructions.findIndex(curr => curr.label === inst.target);
      if (targetIdx !== -1 && targetIdx < i) {
        loopBranchIdx = i;
        loopTargetLabel = inst.target;
        break; // Found the last backward branch
      }
    }
  }

  if (loopBranchIdx === -1) return instructions; // No loop found

  const loopStartIdx = instructions.findIndex(i => i.label === loopTargetLabel);
  
  const prologue = instructions.slice(0, loopStartIdx);
  const body = instructions.slice(loopStartIdx, loopBranchIdx); // Excludes the branch
  const branch = instructions[loopBranchIdx];
  const epilogue = instructions.slice(loopBranchIdx + 1);

  const expanded: Instruction[] = [];
  
  // Helper to clone and re-ID
  let idCounter = 1;
  const add = (inst: Instruction) => {
    expanded.push({ ...inst, id: idCounter++ });
  };

  // Add Prologue
  prologue.forEach(add);

  // Add Loop Iterations
  for (let iter = 0; iter < iterations; iter++) {
    // Add Body
    body.forEach(add);
    // Add Branch (once per iteration)
    add(branch);
  }

  // Add Epilogue
  epilogue.forEach(add);

  return expanded;
};
