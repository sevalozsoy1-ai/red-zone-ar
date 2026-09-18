import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  PAGE_SIZE,
  certificateDigestsFromOutput,
  assertCertificateAllowed,
  assertSignerLineageSupported,
  inspectElf,
} = require('../scripts/verify-android-artifact.js');

function elfFixture({ bits = 64, littleEndian = true, loadAlignment = PAGE_SIZE, magic = true } = {}) {
  const headerSize = bits === 64 ? 64 : 52;
  const programHeaderSize = bits === 64 ? 56 : 32;
  const programHeaderOffset = headerSize;
  const buffer = Buffer.alloc(headerSize + programHeaderSize, 0);
  if (magic) buffer.write('\x7fELF', 0, 'binary');
  buffer[4] = bits === 64 ? 2 : 1;
  buffer[5] = littleEndian ? 1 : 2;

  const write16 = (offset, value) => (
    littleEndian ? buffer.writeUInt16LE(value, offset) : buffer.writeUInt16BE(value, offset)
  );
  const write32 = (offset, value) => (
    littleEndian ? buffer.writeUInt32LE(value, offset) : buffer.writeUInt32BE(value, offset)
  );
  const write64 = (offset, value) => (
    littleEndian ? buffer.writeBigUInt64LE(BigInt(value), offset) : buffer.writeBigUInt64BE(BigInt(value), offset)
  );

  if (bits === 64) write64(32, programHeaderOffset);
  else write32(28, programHeaderOffset);
  write16(bits === 64 ? 54 : 42, programHeaderSize);
  write16(bits === 64 ? 56 : 44, 1);
  write32(programHeaderOffset, 1); // PT_LOAD
  if (bits === 64) write64(programHeaderOffset + 48, loadAlignment);
  else write32(programHeaderOffset + 28, loadAlignment);
  return buffer;
}

test('rejects unsigned JAR output even when jarsigner would return status zero', () => {
  const unsignedOutput = 'jar is unsigned. (signatures missing or not parsable)';
  assert.deepEqual(certificateDigestsFromOutput(unsignedOutput), []);
  assert.throws(
    () => assertCertificateAllowed(certificateDigestsFromOutput(unsignedOutput), ['A'.repeat(64)]),
    /no signer certificate/,
  );
});

test('rejects a signer certificate outside the upload allowlist', () => {
  const observed = certificateDigestsFromOutput(
    'Signer #1 certificate SHA-256 digest: 11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:' +
    '11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00',
  );
  assert.equal(observed.length, 1);
  assert.throws(
    () => assertCertificateAllowed(observed, ['AA'.repeat(32)]),
    /not in the approved upload allowlist/,
  );
});

test('accepts an observed signer only when its SHA-256 digest is approved', () => {
  const digest = 'AB'.repeat(32);
  const observed = certificateDigestsFromOutput(`SHA256: ${digest.match(/../g).join(':')}`);
  assert.deepEqual(observed, [digest]);
  assert.doesNotThrow(() => assertCertificateAllowed(observed, [digest]));
});

test('rejects mixed approved and rogue APK/AAB signer certificate fixtures', () => {
  const approved = 'AB'.repeat(32);
  const rogue = 'CD'.repeat(32);
  const apksignerOutput = [
    `Signer #1 certificate SHA-256 digest: ${approved.match(/../g).join(':')}`,
    `Signer #2 certificate SHA-256 digest: ${rogue.match(/../g).join(':')}`,
  ].join('\n');
  const keytoolOutput = [
    `SHA256: ${approved.match(/../g).join(':')}`,
    `SHA256: ${rogue.match(/../g).join(':')}`,
  ].join('\n');
  const observed = certificateDigestsFromOutput(`${apksignerOutput}\n${keytoolOutput}`);
  assert.deepEqual(observed, [approved, rogue]);
  assert.throws(
    () => assertCertificateAllowed(observed, [approved]),
    /unapproved/,
  );
});

test('fails closed when signer lineage output is ambiguous', () => {
  assert.throws(
    () => assertSignerLineageSupported('proof-of-rotation lineage: past signer'),
    /lineage.*unsupported/,
  );
});

test('checks PT_LOAD alignment for ELF32, ELF64, and both byte orders', () => {
  for (const bits of [32, 64]) {
    for (const littleEndian of [true, false]) {
      const details = inspectElf(elfFixture({ bits, littleEndian }));
      assert.equal(details.bits, bits);
      assert.equal(details.littleEndian, littleEndian);
      assert.deepEqual(details.loadSegments.map(({ alignment }) => alignment), [PAGE_SIZE]);
    }
  }
});

test('rejects wrong ELF PT_LOAD alignment and malformed ELF fixtures', () => {
  assert.throws(
    () => inspectElf(elfFixture({ loadAlignment: 4096 }), 'wrong-alignment.so'),
    /16 KB requires/,
  );
  assert.throws(
    () => inspectElf(elfFixture({ magic: false }), 'not-elf.so'),
    /not an ELF shared library/,
  );
});