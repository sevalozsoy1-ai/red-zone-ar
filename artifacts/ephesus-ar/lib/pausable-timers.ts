type TimerHandle = ReturnType<typeof setTimeout>;

type PendingTimer = {
  run: () => void;
  remainingMs: number;
  dueAt: number;
  handle: TimerHandle | null;
};

/** Keeps the remaining delay of in-flight combat events while the game pauses. */
export class PausableTimers {
  private readonly pending = new Set<PendingTimer>();
  private paused = false;
  private readonly now: () => number;
  private readonly setTimer: (run: () => void, delay: number) => TimerHandle;
  private readonly clearTimer: (handle: TimerHandle) => void;

  constructor(
    now: () => number = Date.now,
    setTimer: (run: () => void, delay: number) => TimerHandle = setTimeout,
    clearTimer: (handle: TimerHandle) => void = clearTimeout,
  ) {
    this.now = now;
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
  }

  add(run: () => void, delayMs: number): void {
    const task: PendingTimer = {
      run, remainingMs: Math.max(0, delayMs), dueAt: 0, handle: null,
    };
    this.pending.add(task);
    if (!this.paused) this.arm(task);
  }

  private arm(task: PendingTimer): void {
    task.dueAt = this.now() + task.remainingMs;
    task.handle = this.setTimer(() => {
      task.handle = null;
      this.pending.delete(task);
      task.run();
    }, task.remainingMs);
  }

  pause(): void {
    if (this.paused) return;
    this.paused = true;
    const now = this.now();
    for (const task of this.pending) {
      if (task.handle !== null) this.clearTimer(task.handle);
      task.handle = null;
      task.remainingMs = Math.max(0, task.dueAt - now);
    }
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    for (const task of this.pending) this.arm(task);
  }

  cancelAll(): void {
    for (const task of this.pending) {
      if (task.handle !== null) this.clearTimer(task.handle);
    }
    this.pending.clear();
    this.paused = false;
  }
}