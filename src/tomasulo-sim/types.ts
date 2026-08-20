
export enum InstructionType {
  ADD = 'ADD',
  SUB = 'SUB',
  MUL = 'MUL',
  DIV = 'DIV',
  LD = 'LD',
  LW = 'LW',
  ST = 'ST',
  SW = 'SW',
  FLD = 'FLD',
  FSD = 'FSD',
  ADDI = 'ADDI',
  BNEZ = 'BNEZ',
  SLTU = 'SLTU',
  FADD = 'FADD.D',
  FSUB = 'FSUB.D',
  FMUL = 'FMUL.D',
  FDIV = 'FDIV.D',
  NOP = 'NOP'
}

export interface Instruction {
  id: number;
  text: string;
  op: string; 
  dest?: string;
  src1?: string;
  src2?: string;
  immediate?: number;
  base?: string; 
  target?: number; 
}

export interface InstructionStatus {
  id: number; // Dynamic ID
  staticId: number; // Reference to static program index
  issue: number | null;
  execStart: number | null;
  execEnd: number | null;
  writeResult: number | null;
  stallReasons?: { cycle: number; reason: string }[];
  flushed?: boolean;
}

export interface Config {
  latencies: Record<string, number>;
  rsCounts: {
    INT: number;
    FP_ADD: number;
    FP_MUL: number;
    LOAD: number;
    STORE: number;
  };
  unitCounts: {
    INT: number;
    FP_ADD: number;
    FP_MUL: number;
    MEM: number;
  };
  pipelined: {
    INT: boolean;
    FP_ADD: boolean;
    FP_MUL: boolean;
  };
  issueWidth: number;
  loopMode: boolean;
  loopIterations: number;
  branchPredictor: 'STALL' | 'TAKEN' | 'NOT_TAKEN';
}

export interface RSEntry {
  id: string;
  type: string;
  busy: boolean;
  op: string | null;
  vj: string | null;
  vk: string | null;
  qj: string | null;
  qk: string | null;
  dest: string | null;
  addr: number | null; 
  timeLeft: number;
  instructionId: number | null;
  executing: boolean;
}

export interface RatEntry {
  reg: string;
  tag: string | null;
  value: string;
}

export interface SimulatorState {
  cycle: number;
  pc: number;
  instructions: Instruction[];
  status: InstructionStatus[];
  rs: RSEntry[];
  rat: Record<string, RatEntry>;
  memory: number[];
  cdb: { tag: string; value: string } | null;
  history: SimulatorState[];
  finished: boolean;
}

