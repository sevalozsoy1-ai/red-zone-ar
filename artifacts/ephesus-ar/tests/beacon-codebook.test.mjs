import test from "node:test";
import assert from "node:assert/strict";
import { BEACON_CODES, minimumCyclicDistance } from "../lib/beacon-codebook.ts";

test("ten beacon codes are balanced and have no rotational duplicates", () => {
  assert.equal(BEACON_CODES.length, 10);
  for (const code of BEACON_CODES) {
    assert.equal(code.length, 20);
    assert.equal([...code].filter((bit) => bit === "1").length, 10);
  }
  for (let left = 0; left < BEACON_CODES.length; left += 1) {
    for (let right = left + 1; right < BEACON_CODES.length; right += 1) {
      assert.ok(
        minimumCyclicDistance(BEACON_CODES[left], BEACON_CODES[right]) >= 6,
        `codes ${left} and ${right} are too close`,
      );
    }
  }
});