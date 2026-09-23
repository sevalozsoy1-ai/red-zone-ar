/** Shared documentation/test oracle for the Android beacon codebook. */
export const BEACON_CODES = [
  "11010111000101001100", "01111111010100001000",
  "00010101001110111100", "00001101011110101010",
  "00000001111100111101", "00001010111010011101",
  "00000011001111110110", "00001011001010111011",
  "00110001001111001110", "00100101011010110011",
] as const;

export function cyclicHammingDistance(left: string, right: string, rotation: number) {
  if (left.length !== right.length) throw new Error("Beacon codes must have equal length");
  let distance = 0;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[(index + rotation) % right.length]) distance += 1;
  }
  return distance;
}

export function minimumCyclicDistance(left: string, right: string) {
  return Math.min(...Array.from({ length: left.length }, (_, rotation) => (
    cyclicHammingDistance(left, right, rotation)
  )));
}