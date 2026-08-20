
import { 
  Config, 
  Instruction, 
  SimulatorState,
  InstructionStatus,
  RSEntry,
  RatEntry
} from '../types';

// --- TomasuloSimulator Class (Ported and adapted to TS) ---

export class TomasuloSimulator {
  cfg: any;
  regFile: { value: number; tag: string | null }[];
  fpRegFile: { value: number; tag: string | null }[];
  RAT: (string | null)[];
  RATf: (string | null)[];
  memory: number[];
  RS: any[];
  BranchUnit: any;
  IntUnit: any;
  FPAddUnit: any;
  MulUnit: any;
  LoadBuf: any[];
  StoreBuf: any[];
  CDB: { tag: string; value: number; instrId: number } | null;
  pendingCDB: any[];
  activeExec: any[];
  program: any[];
  PC: number;
  cycle: number;
  pipeline: { IF: any; ID: any; IS: any; EX: any; WB: any };
  nextTag: number;
  nextIssueSeq: number;
  
  // Dynamic Instruction Tracking
  nextInstrId: number; 
  instrLog: Record<number, any>; // Key is dynamic ID

  branchPending: boolean;
  branchInstrId: number | null;
  branchInstrSeq: number | null;
  checkpoint: any | null; // For speculation recovery

  loopMode: boolean;
  loopIterations: number;
  loopTakenCount: number;
  loopStopRequested: boolean;
  
  snapshots: any[];

  constructor(config: Config) {
    this.cfg = {
      issueWidth: config.issueWidth || 1,
      numIntRS: config.rsCounts.INT,
      numFpAddRS: config.rsCounts.FP_ADD,
      numMulRS: config.rsCounts.FP_MUL,
      numLoadBuf: config.rsCounts.LOAD,
      numStoreBuf: config.rsCounts.STORE,
      latencies: config.latencies,
      pipelined: config.pipelined || { INT: false, FP_ADD: false, FP_MUL: false },
      branchPredictor: config.branchPredictor || 'STALL',
      loopMode: config.loopMode ?? false,
      loopIterations: config.loopIterations ?? 1,
      debug: false
    };

    this.regFile = Array.from({ length: 32 }, () => ({ value: 0, tag: null }));
    this.fpRegFile = Array.from({ length: 32 }, () => ({ value: 0, tag: null }));
    this.RAT = Array.from({ length: 32 }, () => null);
    this.RATf = Array.from({ length: 32 }, () => null);
    this.memory = new Array(256).fill(0);

    this.RS = [];
    for (let i = 0; i < this.cfg.numIntRS; i++) this.RS.push(this._newRS(`Int${i + 1}`, 'INT'));
    for (let i = 0; i < this.cfg.numFpAddRS; i++) this.RS.push(this._newRS(`FpAdd${i + 1}`, 'FPADD'));
    for (let i = 0; i < this.cfg.numMulRS; i++) this.RS.push(this._newRS(`Mul${i + 1}`, 'MUL'));

    this.BranchUnit = { 
        busy: false, op: 'BNEZ', instrId: null, 
        Vj: null, Qj: null, VjReady: null, 
        executing: false, remaining: 0, done: false, target: null,
        predictedTaken: false 
    };
    
    this.IntUnit = { busy: false, entry: null, instrId: null, pipelined: this.cfg.pipelined.INT, entries: [] };
    this.FPAddUnit = { busy: false, entry: null, instrId: null, pipelined: this.cfg.pipelined.FP_ADD, entries: [] };
    this.MulUnit = { busy: false, entry: null, instrId: null, pipelined: this.cfg.pipelined.FP_MUL, entries: [] };

    this.LoadBuf = [];
    for (let i = 0; i < this.cfg.numLoadBuf; i++) this.LoadBuf.push(this._newLoadBuf(`L${i + 1}`));
    this.StoreBuf = [];
    for (let i = 0; i < this.cfg.numStoreBuf; i++) this.StoreBuf.push(this._newStoreBuf(`S${i + 1}`));

    this.CDB = null;
    this.pendingCDB = [];
    this.activeExec = [];
    this.program = [];
    this.PC = 0;
    this.cycle = 0;
    this.pipeline = { IF: null, ID: null, IS: null, EX: null, WB: null };
    this.nextTag = 1;
    this.nextIssueSeq = 1;
    this.nextInstrId = 0;
    this.instrLog = {};

    this.branchPending = false;
    this.branchInstrId = null;
    this.branchInstrSeq = null;
    this.checkpoint = null;
    
    this.loopMode = this.cfg.loopMode;
    this.loopIterations = this.cfg.loopIterations;
    this.loopTakenCount = 0;
    this.loopStopRequested = false;
    this.snapshots = [];
  }

  // --- Methods from the provided logic ---

  _newRS(name: string, unit: string | null = null) {
    return { name, unit, busy: false, op: null, Vj: null, Vk: null, Qj: null, Qk: null, VjReady: null, VkReady: null, dest: null, instrId: null, remaining: 0, executing: false, done: false, releaseCycle: null, issueSeq: null };
  }

  _newLoadBuf(name: string) {
    return { name, busy: false, op: 'LD', address: null, Vaddr: null, Qaddr: null, VaddrReady: null, dest: null, instrId: null, remaining: 0, executing: false, done: false, issueSeq: null };
  }

  _newStoreBuf(name: string) {
    return { name, busy: false, op: 'ST', address: null, Vaddr: null, Qaddr: null, VaddrReady: null, Vdata: null, Qdata: null, VdataReady: null, instrId: null, executing: false, done: false, issueSeq: null };
  }

  regIndex(r: string | number) {
    if (typeof r === 'number') return r;
    if (!r) return 0; 
    return parseInt(r.replace(/R/i, ''), 10);
  }

  fpRegIndex(r: string | number) {
    if (typeof r === 'number') return r;
    if (!r) return 0;
    return parseInt(r.replace(/F/i, ''), 10);
  }

  newTag() {
    return `T${this.nextTag++}`;
  }

  _latencyForOp(op: string) {
    return this.cfg.latencies[op] || 1;
  }

  _saveCheckpoint() {
      // Snapshot architectural state for recovery
      this.checkpoint = JSON.parse(JSON.stringify({
          RAT: this.RAT,
          RATf: this.RATf,
          regFile: this.regFile,
          fpRegFile: this.fpRegFile,
          PC: this.PC
      }));
  }

  _restoreCheckpoint() {
      if (!this.checkpoint) return;
      this.RAT = this.checkpoint.RAT;
      this.RATf = this.checkpoint.RATf;
      this.regFile = this.checkpoint.regFile;
      this.fpRegFile = this.checkpoint.fpRegFile;
      // PC is restored via logic in _resolveBranch based on correctness
      this.checkpoint = null;
  }

  _tryIssue(instr: any, dynamicId: number) {
    // Initialize log entry
    this.instrLog[dynamicId] = { 
        staticId: instr.id, 
        issue: null, 
        exStart: null, 
        wb: null, 
        exEnd: null, 
        cdbCycles: [], 
        stallReasons: [],
        flushed: false
    };
    
    const log = this.instrLog[dynamicId];
    if (instr.op === 'NOP') {
      log.issue = this.cycle; log.exStart = null; log.wb = this.cycle; return true;
    }

    // Branch
    if (instr.op === 'BNEZ') {
      const seq = this.nextIssueSeq++;
      if (this.BranchUnit.instrId !== null) { log.stallReasons.push({ cycle: this.cycle, reason: 'Branch busy' }); return false; }
      
      this.BranchUnit.op = 'BNEZ'; this.BranchUnit.instrId = dynamicId; this.BranchUnit.done = false; this.BranchUnit.executing = false;
      const s1 = this.regIndex(instr.src1);
      if (this.RAT[s1]) { this.BranchUnit.Qj = this.RAT[s1]; this.BranchUnit.Vj = null; this.BranchUnit.VjReady = null; } 
      else { this.BranchUnit.Qj = null; this.BranchUnit.Vj = this.regFile[s1].value; this.BranchUnit.VjReady = this.cycle; }
      this.BranchUnit.target = instr.target;
      this.BranchUnit.issueSeq = seq;
      
      // Prediction Logic
      const predictor = this.cfg.branchPredictor;
      let predictedTaken = false;
      
      if (predictor === 'TAKEN') predictedTaken = true;
      else if (predictor === 'NOT_TAKEN') predictedTaken = false;
      // If STALL, we treat it as Not Taken for PC purposes but block younger in `step()`
      
      this.BranchUnit.predictedTaken = predictedTaken;
      this.branchPending = true; this.branchInstrId = dynamicId; this.branchInstrSeq = seq;
      
      if (predictor !== 'STALL') {
          // Speculative Mode: Save Checkpoint
          this._saveCheckpoint();
          // Update PC Speculatively
          if (predictedTaken) {
              // Note: The loop outside does `this.PC++`, so we must account for that or set PC such that next is target.
              // Logic in step(): `this.PC++; issued++;`
              // If we set `this.PC = target`, next iter uses target.
              this.PC = instr.target;
              // But wait, the `step` loop increments PC after `_tryIssue` returns.
              // If we set PC here, we must decrement it by 1 so the loop increment lands on target?
              // Or better, we return true, and the loop does PC++.
              // If we want next instr to be `target`, we set `this.PC = target - 1`.
              this.PC = instr.target - 1; 
          }
      }

      log.issue = this.cycle; return true;
    }

    // FP Load
    if (instr.op === 'FLD') {
      const seq = this.nextIssueSeq++;
      const buf = this.LoadBuf.find(b => !b.busy);
      if (!buf) { log.stallReasons.push({ cycle: this.cycle, reason: 'LoadBuf full' }); return false; }
      const tag = this.newTag(); const baseIdx = this.regIndex(instr.base);
      buf.busy = true; buf.address = instr.imm; buf.instrId = dynamicId; buf.dest = tag; buf.done = false; buf.executing = false;
      buf.op = instr.op; // Ensure correct Op is stored for latency lookup
      buf.issueSeq = seq;
      if (this.RAT[baseIdx]) { buf.Qaddr = this.RAT[baseIdx]; buf.Vaddr = null; buf.VaddrReady = null; }
      else { buf.Qaddr = null; buf.Vaddr = this.regFile[baseIdx].value + instr.imm; buf.VaddrReady = this.cycle; }
      const dstIdx = this.fpRegIndex(instr.dst);
      this.RATf[dstIdx] = tag; this.fpRegFile[dstIdx].tag = tag;
      log.issue = this.cycle; return true;
    }

    // FP Store
    if (instr.op === 'FSD') {
      const seq = this.nextIssueSeq++;
      const buf = this.StoreBuf.find(b => !b.busy);
      if (!buf) { log.stallReasons.push({ cycle: this.cycle, reason: 'StoreBuf full' }); return false; }
      buf.busy = true; buf.instrId = dynamicId; buf.done = false; buf.executing = false; buf.address = instr.imm;
      buf.op = instr.op; // Ensure correct Op is stored for latency lookup
      buf.issueSeq = seq;
      const baseIdx = this.regIndex(instr.base);
      if (this.RAT[baseIdx]) { buf.Qaddr = this.RAT[baseIdx]; buf.Vaddr = null; buf.VaddrReady = null; }
      else { buf.Qaddr = null; buf.Vaddr = this.regFile[baseIdx].value + instr.imm; buf.VaddrReady = this.cycle; }
      const srcIdx = this.fpRegIndex(instr.src);
      if (this.RATf[srcIdx]) { buf.Qdata = this.RATf[srcIdx]; buf.Vdata = null; buf.VdataReady = null; }
      else { buf.Qdata = null; buf.Vdata = this.fpRegFile[srcIdx].value; buf.VdataReady = this.cycle; }
      log.issue = this.cycle; return true;
    }

    // Integer Load
    if (instr.op === 'LD' || instr.op === 'LW') {
      const seq = this.nextIssueSeq++;
      const buf = this.LoadBuf.find(b => !b.busy);
      if (!buf) { log.stallReasons.push({ cycle: this.cycle, reason: 'LoadBuf full' }); return false; }
      const tag = this.newTag(); const baseIdx = this.regIndex(instr.base);
      buf.busy = true; buf.address = instr.imm; buf.instrId = dynamicId; buf.dest = tag; buf.done = false; buf.executing = false;
      buf.op = instr.op; // Ensure correct Op is stored for latency lookup
      buf.issueSeq = seq;
      if (this.RAT[baseIdx]) { buf.Qaddr = this.RAT[baseIdx]; buf.Vaddr = null; buf.VaddrReady = null; }
      else { buf.Qaddr = null; buf.Vaddr = this.regFile[baseIdx].value + instr.imm; buf.VaddrReady = this.cycle; }
      const dstIdx = this.regIndex(instr.dst); this.RAT[dstIdx] = tag; this.regFile[dstIdx].tag = tag;
      log.issue = this.cycle; return true;
    }

    // Integer Store
    if (instr.op === 'ST' || instr.op === 'SW') {
      const seq = this.nextIssueSeq++;
      const buf = this.StoreBuf.find(b => !b.busy);
      if (!buf) { log.stallReasons.push({ cycle: this.cycle, reason: 'StoreBuf full' }); return false; }
      buf.busy = true; buf.instrId = dynamicId; buf.done = false; buf.executing = false; buf.address = instr.imm;
      buf.op = instr.op; // Ensure correct Op is stored for latency lookup
      buf.issueSeq = seq;
      const baseIdx = this.regIndex(instr.base);
      if (this.RAT[baseIdx]) { buf.Qaddr = this.RAT[baseIdx]; buf.Vaddr = null; buf.VaddrReady = null; }
      else { buf.Qaddr = null; buf.Vaddr = this.regFile[baseIdx].value + instr.imm; buf.VaddrReady = this.cycle; }
      const srcIdx = this.regIndex(instr.src);
      if (this.RAT[srcIdx]) { buf.Qdata = this.RAT[srcIdx]; buf.Vdata = null; buf.VdataReady = null; }
      else { buf.Qdata = null; buf.Vdata = this.regFile[srcIdx].value; buf.VdataReady = this.cycle; }
      log.issue = this.cycle; return true;
    }

    // Arithmetic
    const op = instr.op;
    let desiredUnit = 'INT';
    if (op === 'FADD.D') desiredUnit = 'FPADD';
    else if (op === 'FMUL.D' || op === 'FDIV.D') desiredUnit = 'MUL';
    else if (['MUL','DIV'].includes(op)) desiredUnit = 'MUL';
    else if (['ADD','SUB','ADDI','SLTU'].includes(op)) desiredUnit = 'INT';

    const freeRS = this.RS.find(r => !r.busy && r.unit === desiredUnit);
    if (!freeRS) { log.stallReasons.push({ cycle: this.cycle, reason: 'RS full' }); return false; }
    
    const seq = this.nextIssueSeq++;
    freeRS.busy = true; freeRS.op = instr.op; freeRS.instrId = dynamicId; freeRS.done = false; freeRS.executing = false;
    freeRS.issueSeq = seq;

    const isFP = (desiredUnit === 'FPADD' || desiredUnit === 'MUL') && (op.includes('F') || op.includes('.D'));
    
    // Src1
    if (isFP) {
      const s1 = this.fpRegIndex(instr.src1);
      if (this.RATf[s1]) { freeRS.Qj = this.RATf[s1]; freeRS.Vj = null; freeRS.VjReady = null; }
      else { freeRS.Vj = this.fpRegFile[s1].value; freeRS.Qj = null; freeRS.VjReady = this.cycle; }
    } else {
      const s1 = this.regIndex(instr.src1);
      if (this.RAT[s1]) { freeRS.Qj = this.RAT[s1]; freeRS.Vj = null; freeRS.VjReady = null; }
      else { freeRS.Vj = this.regFile[s1].value; freeRS.Qj = null; freeRS.VjReady = this.cycle; }
    }

    // Src2 or Imm
    if (instr.op === 'ADDI') {
      freeRS.Qk = null; freeRS.Vk = instr.imm; freeRS.VkReady = this.cycle;
    } else if (isFP) {
      const s2 = this.fpRegIndex(instr.src2);
      if (this.RATf[s2]) { freeRS.Qk = this.RATf[s2]; freeRS.Vk = null; freeRS.VkReady = null; }
      else { freeRS.Vk = this.fpRegFile[s2].value; freeRS.Qk = null; freeRS.VkReady = this.cycle; }
    } else {
      const s2 = this.regIndex(instr.src2);
      if (this.RAT[s2]) { freeRS.Qk = this.RAT[s2]; freeRS.Vk = null; freeRS.VkReady = null; }
      else { freeRS.Vk = this.regFile[s2].value; freeRS.Qk = null; freeRS.VkReady = this.cycle; }
    }

    // Dest
    const tag = this.newTag(); freeRS.dest = tag; 
    if (isFP) {
      const dstIdx = this.fpRegIndex(instr.dst); this.RATf[dstIdx] = tag; this.fpRegFile[dstIdx].tag = tag;
    } else {
      const dstIdx = this.regIndex(instr.dst); this.RAT[dstIdx] = tag; this.regFile[dstIdx].tag = tag;
    }
    log.issue = this.cycle; return true;
  }

  _writeToCDB(chosen: any) {
    const e = chosen.entry;
    if (chosen.type === 'RS') {
      const vj = e.Vj, vk = e.Vk;
      let val = 0;
      // Simple ALU (simulation only, value correctness depends on this)
      if (e.op === 'ADD') val = vj + vk;
      else if (e.op === 'SUB') val = vj - vk;
      else if (e.op === 'MUL') val = vj * vk;
      else if (e.op === 'DIV') val = Math.trunc(vj / (vk || 1));
      else if (e.op === 'ADDI') val = vj + (vk || 0);
      else if (e.op === 'SLTU') val = ((vj >>> 0) < (vk >>> 0)) ? 1 : 0;
      else if (e.op === 'FADD.D') val = (vj || 0) + (vk || 0);
      else if (e.op === 'FMUL.D') val = (vj || 0) * (vk || 0);
      else if (e.op === 'FDIV.D') val = Math.trunc((vj || 0) / (vk || 1));
      
      this.CDB = { tag: e.dest, value: val, instrId: e.instrId };
      // Note: RS was likely already released when execution started. 
      // But we need to ensure we don't hold references if logic changed.
      // activeExec entry is what matters here.
      
      if (this.instrLog[this.CDB.instrId]) {
          this.instrLog[this.CDB.instrId].cdbCycles.push(this.cycle);
          this.instrLog[this.CDB.instrId].wb = this.cycle;
      }
    } else if (chosen.type === 'LB') {
      const addr = e.Vaddr;
      const val = this.memory[addr] || 0;
      this.CDB = { tag: e.dest, value: val, instrId: e.instrId };
      // LoadBuf busy was managed separately
      e.busy = false; e.done = false; e.address = e.Vaddr = e.Qaddr = e.dest = e.instrId = null; e.remaining = 0;
      if (this.instrLog[this.CDB.instrId]) {
          this.instrLog[this.CDB.instrId].cdbCycles.push(this.cycle);
          this.instrLog[this.CDB.instrId].wb = this.cycle;
      }
    } else if (chosen.type === 'SB') {
      // Stores don't write CDB usually, but handled here for completeness if config changes
    }
  }

  _broadcastCDB(cdb: any) {
    for (let i = 0; i < this.RAT.length; i++) {
      if (this.RAT[i] === cdb.tag) { this.regFile[i].value = cdb.value; this.regFile[i].tag = null; this.RAT[i] = null; }
    }
    for (let i = 0; i < this.RATf.length; i++) {
      if (this.RATf[i] === cdb.tag) { this.fpRegFile[i].value = cdb.value; this.fpRegFile[i].tag = null; this.RATf[i] = null; }
    }
    for (const r of this.RS) {
      if (r.busy) {
        if (r.Qj === cdb.tag) { r.Vj = cdb.value; r.Qj = null; r.VjReady = this.cycle + 1; }
        if (r.Qk === cdb.tag) { r.Vk = cdb.value; r.Qk = null; r.VkReady = this.cycle + 1; }
      }
    }
    for (const b of this.LoadBuf) {
      if (b.busy && b.Qaddr === cdb.tag) { b.Vaddr = cdb.value + (b.address || 0); b.Qaddr = null; b.VaddrReady = this.cycle + 1; }
    }
    for (const s of this.StoreBuf) {
      if (s.busy) {
        if (s.Qaddr === cdb.tag) { s.Vaddr = cdb.value + (s.address || 0); s.Qaddr = null; s.VaddrReady = this.cycle + 1; }
        if (s.Qdata === cdb.tag) { s.Vdata = cdb.value; s.Qdata = null; s.VdataReady = this.cycle + 1; }
      }
    }
    if (this.BranchUnit && this.BranchUnit.instrId != null) {
      if (this.BranchUnit.Qj === cdb.tag) { this.BranchUnit.Vj = cdb.value; this.BranchUnit.Qj = null; this.BranchUnit.VjReady = this.cycle + 1; }
    }
  }

  _flushYounger(branchSeq: number) {
      // Clear RS
      for (const r of this.RS) {
          if (r.busy && r.issueSeq > branchSeq) {
              if (this.instrLog[r.instrId]) this.instrLog[r.instrId].flushed = true;
              Object.assign(r, this._newRS(r.name, r.unit)); // Reset
          }
      }
      // Clear Buffers
      for (const b of this.LoadBuf) {
          if (b.busy && b.issueSeq > branchSeq) {
              if (this.instrLog[b.instrId]) this.instrLog[b.instrId].flushed = true;
              Object.assign(b, this._newLoadBuf(b.name));
          }
      }
      for (const s of this.StoreBuf) {
          if (s.busy && s.issueSeq > branchSeq) {
              if (this.instrLog[s.instrId]) this.instrLog[s.instrId].flushed = true;
              Object.assign(s, this._newStoreBuf(s.name));
          }
      }
      // Clear Active Execution and Pending CDB
      this.activeExec = this.activeExec.filter(e => {
          if (e.issueSeq > branchSeq) {
              if (this.instrLog[e.instrId]) this.instrLog[e.instrId].flushed = true;
              return false; 
          }
          return true;
      });
      this.pendingCDB = this.pendingCDB.filter(p => {
          if (p.entry.issueSeq > branchSeq) {
               if (this.instrLog[p.entry.instrId]) this.instrLog[p.entry.instrId].flushed = true;
               return false;
          }
          return true;
      });

      // Restore Architectural State
      this._restoreCheckpoint();
  }

  _resolveBranch(cycle: number) {
    this.BranchUnit.done = true; this.BranchUnit.executing = false;
    this.instrLog[this.BranchUnit.instrId].wb = cycle;
    this.instrLog[this.BranchUnit.instrId].exEnd = cycle;
    
    const taken = !!this.BranchUnit.Vj; // If operand != 0, Taken
    const predicted = this.BranchUnit.predictedTaken;
    const branchSeq = this.BranchUnit.issueSeq;

    if (taken !== predicted) {
        // Misprediction!
        this._flushYounger(branchSeq);
        // Correct PC
        if (taken) {
            this.PC = this.BranchUnit.target;
        } else {
            // If we predicted Taken, we jumped. PC is now wrong.
            // We need to restore PC to fall-through.
            // But checkpoint has PC *at issue*. PC at issue was the Branch Instruction index.
            // So fallthrough is Branch index + 1.
            // Checkpoint PC stored was likely the PC of the branch instruction itself (since it was current PC).
            // Let's rely on checkpointed PC + 1.
            const savedPC = this.checkpoint ? this.checkpoint.PC : (this.PC); 
            // Wait, checkpoint is already null if we just restored it in flush.
            // Actually _restoreCheckpoint sets it to null.
            // But we need the value.
            // Wait, I call _restoreCheckpoint inside _flushYounger.
            // So PC is reset to the branch instruction index.
            // We want fallthrough, so we need PC + 1.
            // But if we predicted NOT taken, we just incremented.
            // If taken, we set PC = target.
            
            // Re-logic:
            // _restoreCheckpoint restores this.PC to whatever it was at Issue (which is the Branch Instruction Index).
            // If ACTUAL is TAKEN: we want PC = Target.
            // If ACTUAL is NOT TAKEN: we want PC = BranchIdx + 1.
            
            // _flushYounger calls _restoreCheckpoint.
            // After flush, this.PC is BranchIdx.
            // So:
            if (taken) this.PC = this.BranchUnit.target;
            else this.PC = this.PC + 1;
        }
    } else {
        // Correct Prediction
        if (taken) {
            // If prediction was TAKEN and it IS TAKEN:
            // PC is already at Target (done at issue).
            // Just check loop counters.
            if (this.loopMode && this.BranchUnit.target < this.program.length) {
                this.loopTakenCount++;
                if (this.loopIterations && this.loopTakenCount >= this.loopIterations) {
                    this.loopStopRequested = true;
                    // Force stop next fetch if we exceeded loop count
                    // Note: If we already fetched instructions from the start of the loop (because we predicted taken),
                    // we might need to flush them if we decide to stop looping NOW?
                    // But standard loop limit logic usually means "don't take the branch next time".
                    // Here we assume infinite loop until simulation stop.
                    // If we just hit limit, force PC to end.
                    this.PC = this.program.length;
                    // And flush? If we predicted taken, we have garbage in pipeline.
                    // Yes, if we want to stop, and we predicted Taken, we essentially mispredicted the "Stop" condition.
                    // But simpler: just stop fetching.
                }
            }
        }
        // If prediction NOT TAKEN and IS NOT TAKEN: PC is correct (fallthrough).
        
        // Clear checkpoint if it exists (since prediction was correct, we don't need to revert)
        this.checkpoint = null;
    }
    
    this.branchPending = false; this.branchInstrId = null; this.branchInstrSeq = null;
    this.BranchUnit.busy = false; this.BranchUnit.done = false; this.BranchUnit.op = null; this.BranchUnit.Vj = null; this.BranchUnit.Qj = null; this.BranchUnit.target = null; this.BranchUnit.remaining = 0; this.BranchUnit.executing = false; this.BranchUnit.instrId = null; this.BranchUnit.VjReady = null; this.BranchUnit.predictedTaken = false;
  }

  _snapshot() {
    return {
      cycle: this.cycle,
      PC: this.PC,
      RAT: [...this.RAT],
      RATf: [...this.RATf],
      fpRegFile: this.fpRegFile.map(r => ({ value: r.value, tag: r.tag })),
      regFile: this.regFile.map(r => ({ value: r.value, tag: r.tag })),
      RS: this.RS.map(r => ({ ...r })),
      LoadBuf: this.LoadBuf.map(b => ({ ...b })),
      StoreBuf: this.StoreBuf.map(s => ({ ...s })),
      CDB: this.CDB,
      instrLog: JSON.parse(JSON.stringify(this.instrLog))
    };
  }

  loadProgram(instructions: Instruction[]) {
    this.program = instructions.map((instr, idx) => ({
      id: idx,
      op: instr.op,
      dst: instr.dest,
      src1: instr.src1,
      src2: instr.src2,
      base: instr.src1, 
      src: instr.dest,  
      imm: instr.immediate,
      target: 0, 
      text: instr.text
    }));
    
    this.program.forEach(p => {
        if (p.op === 'BNEZ') {
            const parts = p.text.replace(/,/g, ' ').split(/\s+/);
            const target = parseInt(parts[2]);
            if (!isNaN(target)) p.target = target;
        }
    });

    this.PC = 0;
    this.nextInstrId = 0;
    this.instrLog = {};
  }

  step() {
    this.cycle++;
    this.CDB = null;
    
    const shouldStallYounger = (seq: number) => {
        // If predictor is STALL, we block execution of younger instructions.
        if (this.cfg.branchPredictor === 'STALL') {
             return this.branchPending && this.branchInstrSeq != null && seq > this.branchInstrSeq!;
        }
        // If predicting, we allow execution (speculation).
        return false;
    };

    // Release RS (delayed release logic)
    for (const r of this.RS) {
      if (r.releaseCycle && r.releaseCycle <= this.cycle) {
        // Reset RS slot
        Object.assign(r, { 
            name: r.name, unit: r.unit, 
            busy: false, op: null, Vj: null, Vk: null, Qj: null, Qk: null, 
            VjReady: null, VkReady: null, dest: null, instrId: null, 
            issueSeq: null, remaining: 0, executing: false, done: false, 
            releaseCycle: null 
        });
      }
    }

    // Schedule Functional Units (Start of cycle)
    const scheduleUnit = (unitName: string, unitObj: any) => {
        const canSchedule = unitObj.pipelined || !unitObj.busy;
        if (!canSchedule) return;

        const ready = this.RS.filter(r => r.unit === unitName && r.busy && !r.executing && !r.done && r.Qj == null && r.Qk == null && (r.VjReady === null || r.VjReady <= this.cycle) && (r.VkReady === null || r.VkReady <= this.cycle) && !shouldStallYounger(r.issueSeq));
        
        if (ready.length > 0) {
             ready.sort((a: any, b: any) => a.instrId - b.instrId);
             const r = ready[0];
             const lat = this._latencyForOp(r.op);
             const execEntry = { ...r, executing: true, done: false, remaining: lat };
             
             if (this.instrLog[r.instrId]) {
                this.instrLog[r.instrId].exStart = this.instrLog[r.instrId].exStart ?? this.cycle;
             }
             
             // Handle 0 latency (unlikely but safe)
             if (lat === 0) {
                 execEntry.remaining = 0;
                 execEntry.done = true;
                 if (this.instrLog[r.instrId]) this.instrLog[r.instrId].exEnd = this.cycle;
                 if (!this.pendingCDB.find(p => p.entry && p.entry.instrId === r.instrId)) {
                    this.pendingCDB.push({ type: 'RS', entry: execEntry, desiredCycle: this.cycle + 1 });
                 }
             }
             
             this.activeExec.push(execEntry);
             
             if (unitObj.pipelined) {
                 unitObj.entries.push(r.instrId);
             } else {
                 unitObj.busy = true; unitObj.entry = execEntry; unitObj.instrId = r.instrId;
             }
             
             r.executing = true; 
             // Mark for release NEXT cycle (1 cycle structural hazard on RS reuse)
             r.releaseCycle = this.cycle + 1;
        }
    };

    scheduleUnit('INT', this.IntUnit);
    scheduleUnit('FPADD', this.FPAddUnit);
    scheduleUnit('MUL', this.MulUnit);

    // Progress active exec
    for (const ex of [...this.activeExec]) {
      if (ex.remaining > 0) ex.remaining--;
      
      if (ex.remaining === 0 && !ex.done) {
        ex.done = true; ex.executing = false;
        if (this.instrLog[ex.instrId]) this.instrLog[ex.instrId].exEnd = this.cycle;
        
        if (!this.pendingCDB.find(p => p.entry && p.entry.instrId === ex.instrId)) {
          this.pendingCDB.push({ type: 'RS', entry: ex, desiredCycle: this.cycle + 1 });
        }
        
        // Free functional unit
        const freeUnit = (unit: any, id: number) => {
            if (unit.pipelined) {
                 const idx = unit.entries.indexOf(id);
                 if (idx >= 0) unit.entries.splice(idx, 1);
            } else {
                 if (unit.instrId === id) { unit.busy = false; unit.entry = null; unit.instrId = null; }
            }
        };

        if (ex.unit === 'INT') freeUnit(this.IntUnit, ex.instrId);
        if (ex.unit === 'FPADD') freeUnit(this.FPAddUnit, ex.instrId);
        if (ex.unit === 'MUL') freeUnit(this.MulUnit, ex.instrId);
        
        this.activeExec = this.activeExec.filter(e => e.instrId !== ex.instrId);
      }
    }

    // LoadBuf - Start then Progress
    for (const b of this.LoadBuf) {
      if (b.busy && !b.done && b.Qaddr == null && !b.executing) {
        if (!shouldStallYounger(b.issueSeq)) {
            if (b.VaddrReady !== null && b.VaddrReady <= this.cycle) {
              b.executing = true;
              if (this.instrLog[b.instrId]) this.instrLog[b.instrId].exStart = this.instrLog[b.instrId].exStart ?? this.cycle;
              const lat = this._latencyForOp(b.op || 'LD');
              b.remaining = lat;
            }
        }
      }
      
      if (b.busy && b.executing) {
          if (b.remaining > 0) b.remaining--;
          if (b.remaining === 0 && !b.done) {
            b.done = true;
            if (this.instrLog[b.instrId]) this.instrLog[b.instrId].exEnd = this.cycle;
            if (!this.pendingCDB.find(p => p.entry && p.entry.instrId === b.instrId)) 
                this.pendingCDB.push({ type: 'LB', entry: b, desiredCycle: this.cycle + 1 });
          }
      }
    }

    // StoreBuf - Start then Progress
    for (const s of this.StoreBuf) {
      if (s.busy && !s.executing && !s.done && s.Qaddr == null && s.Qdata == null) {
        if (!shouldStallYounger(s.issueSeq)) {
            if (s.VaddrReady !== null && s.VaddrReady <= this.cycle && s.VdataReady !== null && s.VdataReady <= this.cycle) {
              s.executing = true;
              if (this.instrLog[s.instrId]) this.instrLog[s.instrId].exStart = this.instrLog[s.instrId].exStart ?? this.cycle;
              const lat = this._latencyForOp(s.op || 'ST');
              s.remaining = lat;
            }
        }
      }
      
      if (s.busy && s.executing) {
          if (s.remaining > 0) s.remaining--;
          if (s.remaining === 0 && !s.done) {
            s.done = true;
            if (this.instrLog[s.instrId]) {
                this.instrLog[s.instrId].wb = this.cycle;
                this.instrLog[s.instrId].exEnd = this.cycle;
            }
            if (s.Vaddr != null && s.Vdata != null) { this.memory[s.Vaddr] = s.Vdata; }
            s.busy = false; s.done = false; s.address = s.Vaddr = s.Qaddr = s.Vdata = s.Qdata = s.instrId = null; s.remaining = 0; s.executing = false;
          }
      }
    }

    // Branch Unit - Start then Progress
    if (this.BranchUnit && this.BranchUnit.instrId != null) {
      if (!this.BranchUnit.executing && !this.BranchUnit.done && this.BranchUnit.Qj == null) {
        if (this.BranchUnit.VjReady !== null && this.BranchUnit.VjReady <= this.cycle) {
          this.BranchUnit.executing = true;
          this.BranchUnit.busy = true;
          if (this.instrLog[this.BranchUnit.instrId]) this.instrLog[this.BranchUnit.instrId].exStart = this.instrLog[this.BranchUnit.instrId].exStart ?? this.cycle;
          const lat = this._latencyForOp('BNEZ');
          this.BranchUnit.remaining = lat;
        }
      }
      
      if (this.BranchUnit.executing) {
          if (this.BranchUnit.remaining > 0) this.BranchUnit.remaining--;
          if (this.BranchUnit.remaining === 0) {
            this._resolveBranch(this.cycle);
          }
      }
    }

    // Writeback Selection
    const candidates = this.pendingCDB.filter(p => p.desiredCycle <= this.cycle && p.entry && p.entry.done);
    if (candidates.length > 0) {
      candidates.sort((a, b) => a.entry.instrId - b.entry.instrId);
      const chosen = candidates[0];
      this._writeToCDB(chosen);
      this.pendingCDB = this.pendingCDB.filter(p => p.entry.instrId !== chosen.entry.instrId);
      for (let i = 1; i < candidates.length; i++) {
        const id = candidates[i].entry.instrId;
        if (this.instrLog[id]) this.instrLog[id].stallReasons.push({ cycle: this.cycle, reason: 'CDB busy' });
      }
    }

    if (this.CDB) this._broadcastCDB(this.CDB);

    // Issue
    let issued = 0;
    while (issued < this.cfg.issueWidth && this.PC < this.program.length) {
      const instr = this.program[this.PC];
      const dynamicId = this.nextInstrId;
      const success = this._tryIssue(instr, dynamicId);
      if (!success) break;
      
      this.nextInstrId++;
      this.PC++; issued++;
    }
  }
}

export function parseASM(text: string): Instruction[] {
  const lines = text.split('\n');
  const instructions: Instruction[] = [];
  let id = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(';')) continue;
    const code = trimmed.split(';')[0].trim();
    const parts = code.replace(/,/g, ' ').split(/\s+/);
    const op = parts[0].toUpperCase();
    
    const instr: Instruction = { id: id++, text: code, op: op };

    if (['LD', 'ST', 'FLD', 'FSD', 'LW', 'SW'].includes(op)) {
       instr.dest = parts[1];
       const mem = parts[2];
       if (mem && mem.includes('(')) {
           const [offset, base] = mem.split('(');
           instr.immediate = parseInt(offset);
           instr.src1 = base.replace(')', '');
       } else {
           instr.immediate = parseInt(parts[2]);
           if (parts[3]) instr.src1 = parts[3];
       }
    } else if (['BNEZ', 'BEQZ'].includes(op)) {
       instr.src1 = parts[1];
       instr.immediate = parseInt(parts[2]);
       instr.target = parseInt(parts[2]);
    } else {
       instr.dest = parts[1];
       instr.src1 = parts[2];
       if (parts[3]) {
           const val = parseInt(parts[3]);
           if (!isNaN(val)) instr.immediate = val;
           else instr.src2 = parts[3];
       }
    }
    instructions.push(instr);
  }
  return instructions;
}

export function mapSnapshotToState(snap: any, sim: TomasuloSimulator, instructions: Instruction[]): SimulatorState {
    const status: InstructionStatus[] = Object.entries(snap.instrLog).map(([dId, log]: [string, any]) => {
        const dynamicId = parseInt(dId);
        if (!log) return null;
        return {
            id: dynamicId,
            staticId: log.staticId,
            issue: log.issue,
            execStart: log.exStart,
            execEnd: log.exEnd,
            writeResult: log.wb,
            stallReasons: log.stallReasons || [],
            flushed: log.flushed
        };
    }).filter(s => s !== null).sort((a,b) => a.id - b.id);

    const rs: RSEntry[] = [];
    snap.RS.forEach((r: any) => {
        let type = 'INT';
        if (r.unit === 'FPADD') type = 'FP_ADD';
        if (r.unit === 'MUL') type = 'FP_MUL';
        rs.push({
            id: r.name, type: type, busy: r.busy, op: r.op, vj: r.Vj, vk: r.Vk, qj: r.Qj, qk: r.Qk, dest: r.dest, addr: null, timeLeft: r.remaining, instructionId: r.instrId, executing: r.executing
        });
    });

    snap.LoadBuf.forEach((b: any) => {
        rs.push({ id: b.name, type: 'LOAD', busy: b.busy, op: 'LD', vj: null, vk: null, qj: b.Qaddr, qk: null, dest: b.dest, addr: b.address, timeLeft: b.remaining, instructionId: b.instrId, executing: b.executing });
    });

    snap.StoreBuf.forEach((s: any) => {
        rs.push({ id: s.name, type: 'STORE', busy: s.busy, op: 'ST', vj: s.Vaddr !== null ? `${s.Vaddr}` : null, vk: s.Vdata !== null ? `${s.Vdata}` : null, qj: s.Qaddr, qk: s.Qdata, dest: null, addr: s.address, timeLeft: s.remaining, instructionId: s.instrId, executing: s.executing });
    });

    const rat: Record<string, RatEntry> = {};
    snap.regFile.forEach((r: any, i: number) => { rat[`R${i}`] = { reg: `R${i}`, tag: r.tag, value: r.value }; });
    snap.fpRegFile.forEach((r: any, i: number) => { rat[`F${i}`] = { reg: `F${i}`, tag: r.tag, value: r.value }; });

    const pcAtEnd = sim.loopStopRequested || snap.PC >= instructions.length;
    
    const isPipelineEmpty = 
        sim.RS.every((r: any) => !r.busy) &&
        sim.LoadBuf.every((b: any) => !b.busy) &&
        sim.StoreBuf.every((s: any) => !s.busy) &&
        sim.activeExec.length === 0 &&
        sim.pendingCDB.length === 0 &&
        (!sim.BranchUnit || !sim.BranchUnit.busy) &&
        !sim.CDB; 

    return {
        cycle: snap.cycle,
        pc: snap.PC,
        instructions,
        status,
        rs,
        rat,
        memory: [...sim.memory],
        cdb: snap.CDB ? { tag: snap.CDB.tag, value: snap.CDB.value } : null,
        history: [],
        finished: pcAtEnd && isPipelineEmpty
    };
}
