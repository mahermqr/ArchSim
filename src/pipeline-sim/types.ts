
export interface Instruction {
  id: number;
  raw: string;
  opcode: string;
  dest: string | null;
  src1: string | null;
  src2: string | null;
  label: string | null; // The label defined on this line (e.g. "Loop:")
  target: string | null; // The target of a branch (e.g. "Loop")
  lineNumber: number;
}

export interface LatencyConfig {
  integer: number;
  intMul: number;
  intDiv: number;
  memory: number; // Loads
  store: number;  // Stores
  fpAdd: number;
  fpMul: number;
  fpDiv: number;
  branch: number;
}

export interface PipelineConfig {
  latencies: LatencyConfig;
  forwarding: boolean;
  branchPrediction: 'taken' | 'not-taken'; // New field
  loopIterations: number;
}

export interface StageTiming {
  IF: number;
  ID: number;
  EX_START: number;
  EX_END: number;
  MEM: number;
  WB: number;
  stallCycles: number;
  dependency: string | null; // Which register caused the stall
}

export interface SimulationResult {
  instruction: Instruction;
  timing: StageTiming;
}
