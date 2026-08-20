
import { Config, InstructionType } from './types';

export const DEFAULT_CONFIG: Config = {
  latencies: {
    'ADD': 2,
    'SUB': 2,
    'MUL': 10,
    'DIV': 20,
    'LD': 2,
    'ST': 1,
    'LW': 2,
    'SW': 1,
    'FLD': 2,
    'FSD': 1,
    'FADD.D': 10,
    'FMUL.D': 18,
    'FDIV.D': 20,
    'ADDI': 1,
    'SLTU': 1,
    'BNEZ': 1,
  },
  rsCounts: {
    INT: 3,
    FP_ADD: 2,
    FP_MUL: 2,
    LOAD: 3,
    STORE: 3,
  },
  unitCounts: {
    INT: 1,
    FP_ADD: 1,
    FP_MUL: 1,
    MEM: 1
  },
  pipelined: {
    INT: false,
    FP_ADD: false,
    FP_MUL: false
  },
  issueWidth: 1,
  loopMode: true,
  loopIterations: 3,
  branchPredictor: 'STALL'
};

export const INITIAL_ASM = `FLD F2, 0(R1)
FMUL.D F4, F2, F0
FLD F6, 0(R2)
FADD.D F6, F4, F6
FSD F6, 0(R2)
ADDI R1, R1, 8
ADDI R2, R2, 8
SLTU R3, R1, R4
BNEZ R3, 0`;