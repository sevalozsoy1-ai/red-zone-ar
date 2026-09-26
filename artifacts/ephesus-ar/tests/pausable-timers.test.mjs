import test from 'node:test';
import assert from 'node:assert/strict';
import { PausableTimers } from '../lib/pausable-timers.ts';

function fakeClock() {
  let now = 0;
  let nextId = 0;
  const jobs = new Map();
  const timers = new PausableTimers(
    () => now,
    (run, delay) => {
      const id = ++nextId;
      jobs.set(id, { run, at: now + delay });
      return id;
    },
    (id) => { jobs.delete(id); },
  );
  function advance(ms) {
    const end = now + ms;
    while (true) {
      const due = [...jobs.entries()]
        .filter(([, job]) => job.at <= end)
        .sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      now = due[1].at;
      jobs.delete(due[0]);
      due[1].run();
    }
    now = end;
  }
  return { timers, advance };
}

test('a projectile keeps its remaining flight time when the picker pauses combat', () => {
  const { timers, advance } = fakeClock();
  let hits = 0;
  timers.add(() => { hits++; }, 900);
  advance(300);
  timers.pause();
  advance(20_000);
  assert.equal(hits, 0);
  timers.resume();
  advance(599);
  assert.equal(hits, 0);
  advance(1);
  assert.equal(hits, 1);
  advance(1000);
  assert.equal(hits, 1);
});

test('the defeat countdown neither resets nor fires while paused', () => {
  const { timers, advance } = fakeClock();
  let resets = 0;
  timers.add(() => { resets++; }, 5000);
  advance(1200);
  timers.pause();
  advance(8000);
  timers.resume();
  advance(3000);
  timers.pause();
  advance(8000);
  assert.equal(resets, 0);
  timers.resume();
  advance(799);
  assert.equal(resets, 0);
  advance(1);
  assert.equal(resets, 1);
});

test('leaving the round cancels both active and paused work', () => {
  const { timers, advance } = fakeClock();
  let hits = 0;
  timers.add(() => { hits++; }, 100);
  timers.pause();
  timers.cancelAll();
  timers.resume();
  advance(1000);
  assert.equal(hits, 0);
  timers.add(() => { hits++; }, 100);
  timers.cancelAll();
  advance(1000);
  assert.equal(hits, 0);
});