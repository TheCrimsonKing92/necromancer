import test from "node:test";
import assert from "node:assert/strict";
import { analyzeXperfGpuMemoryLines } from "./wpr-gpu-memory.mjs";

const segmentHeader =
  "Microsoft-Windows-DxgKrnl/ReportSegment/win:Info, TimeStamp, Process Name ( PID), ThreadID, CPU, etw:ActivityId, etw:Related ActivityId, etw:UserSid, etw:SessionId, ulSegmentId, pDxgAdapter, BaseAddress, CpuTranslatedAddress, Size, NbOfBanks, Flags, CommitLimit, SystemMemoryEndAddress, MemorySegmentGroup";
const allocationHeader = (opcode) =>
  `Microsoft-Windows-DxgKrnl/AdapterAllocation/win:${opcode}, TimeStamp, Process Name ( PID), ThreadID, CPU, etw:ActivityId, etw:Related ActivityId, etw:UserSid, etw:SessionId, hProcessId, hDevice, pDxgAdapter, Flags, allocSize, ulAlignment, dwReadSegment, dwWriteSegment, PreferredSegment, HintedBank, dwEvictionSegment, Priority, hVidMmGlobalAlloc, hDxgGlobalAlloc, hDxgSharedResource`;
const allocationRow = ({ opcode, time, pid, size, segment, handle }) =>
  `Microsoft-Windows-DxgKrnl/AdapterAllocation/win:${opcode}, ${time}, chrome.exe (${pid}), 44, 2, , , , , 0x${pid.toString(16)}, 0x1, 0xadapter, 1, ${size}, 4096, 0, ${segment}, ${segment}, 0, 0, 0, ${handle}, 0x0, 0x0`;

test("deduplicates VidMm handles and separates dedicated from shared segments", () => {
  const lines = [
    segmentHeader,
    "Microsoft-Windows-DxgKrnl/ReportSegment/win:Info, 1, System (4), 1, 0, , , , , 1, 0xadapter, 0, 0, 8000000, 0, 0, 8000000, 0, 0",
    "Microsoft-Windows-DxgKrnl/ReportSegment/win:Info, 2, System (4), 1, 0, , , , , 2, 0xadapter, 0, 0, 16000000, 0, 0, 16000000, 0, 1",
    allocationHeader("Start"),
    allocationHeader("Stop"),
    allocationRow({ opcode: "Start", time: 10, pid: 42, size: 4096, segment: 1, handle: "0xa" }),
    allocationRow({ opcode: "Start", time: 20, pid: 42, size: 8192, segment: 2, handle: "0xb" }),
    allocationRow({ opcode: "Start", time: 25, pid: 99, size: 65536, segment: 1, handle: "0xc" }),
    allocationRow({ opcode: "Stop", time: 30, pid: 42, size: 4096, segment: 1, handle: "0xa" }),
    allocationRow({ opcode: "Stop", time: 40, pid: 42, size: 8192, segment: 2, handle: "0xb" }),
  ];

  const result = analyzeXperfGpuMemoryLines(lines, { targetProcessIds: [42] });

  assert.equal(result.segmentCount, 2);
  assert.deepEqual(result.aggregate.peakBytes, {
    dedicated: 4096,
    shared: 8192,
    unknown: 0,
    total: 12288,
  });
  assert.equal(result.aggregate.currentBytes.total, 0);
  assert.equal(result.aggregate.allocationStarts, 2);
  assert.equal(result.aggregate.allocationStops, 2);
  assert.equal(result.processes.length, 1);
  assert.equal(result.processes[0].id, 42);
});

test("falls back to Chrome process names and reports unknown segments honestly", () => {
  const lines = [
    allocationHeader("DC_Start"),
    allocationRow({ opcode: "DC_Start", time: 1, pid: 77, size: 1024, segment: 9, handle: "0xd" }),
  ];
  const result = analyzeXperfGpuMemoryLines(lines);

  assert.equal(result.target.basis, "process-name fallback");
  assert.equal(result.aggregate.peakBytes.unknown, 1024);
  assert.equal(result.liveAllocationCountAtTraceEnd, 1);
});
