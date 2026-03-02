import type { WorkflowState } from "./types.js";

const store = new Map<string, WorkflowState>();

export function get(threadTs: string): WorkflowState | undefined {
  return store.get(threadTs);
}

export function set(threadTs: string, state: WorkflowState): void {
  store.set(threadTs, state);
}

export function remove(threadTs: string): boolean {
  return store.delete(threadTs);
}

export function has(threadTs: string): boolean {
  return store.has(threadTs);
}
