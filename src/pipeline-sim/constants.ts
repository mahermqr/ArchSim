import { LatencyConfig } from './types';

export const DEFAULT_LATENCIES: LatencyConfig = {
  integer: 1, 
  intMul: 1,  
  intDiv: 1,  
  memory: 1,
  store: 1,
  fpAdd: 1,   
  fpMul: 1,   
  fpDiv: 1,  
  branch: 1,  
};

export const PDF_EXAMPLE_CODE = `Loop: fld f2,0(Rx)
fmul.d f2,f0,f2
fdiv.d f8,f2,f0
fld f4,0(Ry)
fadd.d f4,f0,f4
fadd.d f10,f8,f2
fsd f4,0(Ry)
addi Rx,Rx,8
addi Ry,Ry,8
sub x20,x4,Rx
bnz x20,Loop`;

export const RAW_HAZARD_EXAMPLE = `Loop:
lw x1,0(x2)
addi x1,x1,1
sw x1,0(x2)
addi x2,x2,4
sub x4,x3,x2
bnz x4,Loop
lw x1,0(x2)`;

export const MIPS_LOOP_EXAMPLE = `li $t0, 10
li $t1, 4
li $t2, 1
Loop:
    addi $t1, $t1, -2
    mul $t0, $t0, $t1
    addi $t0, $t0, -1
    bne $t1, $zero, Loop`;
