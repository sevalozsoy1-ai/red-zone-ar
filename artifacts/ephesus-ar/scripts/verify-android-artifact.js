const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PAGE_SIZE = 16 * 1024;

function fail(message) {
  console.error(`Android artifact verification failed: ${message}`);
  process.exitCode = 1;
}

function commandPath(command) {
  const finder = process.platform === 'win32' ? 'where' : 'which';
  try {
    return execFileSync(finder, [command], { encoding: 'utf8' }).trim().split(/\r?\n/)[0];
  } catch {
    return null;
  }
}

function run(command, args) {
  try {
    return {
      status: 0,
      output: execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }),
    };
  } catch (error) {
    return {
      status: typeof error.status === 'number' ? error.status : 1,
      output: `${error.stdout ?? ''}${error.stderr ?? ''}`,
    };
  }
}

function runBuffer(command, args) {
  try {
    return {
      status: 0,
      output: execFileSync(command, args, {
        encoding: null,
        maxBuffer: 128 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
      }),
    };
  } catch (error) {
    return {
      status: typeof error.status === 'number' ? error.status : 1,
      output: Buffer.concat([
        Buffer.isBuffer(error.stdout) ? error.stdout : Buffer.from(error.stdout ?? ''),
        Buffer.isBuffer(error.stderr) ? error.stderr : Buffer.from(error.stderr ?? ''),
      ]),
    };
  }
}

function artifactArgument(argv = process.argv.slice(2)) {
  let value;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--certificate-sha256' || argument === '--cert-sha256') {
      index += 1;
      continue;
    }
    if (!argument.startsWith('--')) {
      value = argument;
      break;
    }
  }
  if (!value) {
    fail('provide an APK or AAB path');
    return null;
  }
  const artifact = path.resolve(value);
  if (!fs.existsSync(artifact) || !fs.statSync(artifact).isFile()) {
    fail(`artifact does not exist: ${artifact}`);
    return null;
  }
  return artifact;
}

function normalizeCertificateDigest(value) {
  const normalized = String(value).replace(/[\s:]/g, '').toUpperCase();
  if (!/^[0-9A-F]{64}$/.test(normalized)) {
    throw new Error(`certificate SHA-256 fingerprint is not 32 bytes: ${value}`);
  }
  return normalized;
}

function certificateDigestsFromOutput(output) {
  const digests = [];
  const text = String(output);
  const patterns = [
    /certificate\s+SHA-?256\s+digest\s*:\s*([0-9A-Fa-f: ]{64,95})/gi,
    /\bSHA-?256\s*:\s*([0-9A-Fa-f: ]{64,95})/gi,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      try {
        const digest = normalizeCertificateDigest(match[1]);
        if (!digests.includes(digest)) digests.push(digest);
      } catch {
        // Ignore malformed incidental text; the caller will require a real digest.
      }
    }
  }
  return digests;
}

function approvedCertificateDigests(argv = process.argv.slice(2), env = process.env) {
  const values = [];
  const environmentValue = env.ANDROID_UPLOAD_CERT_SHA256
    ?? env.ANDROID_UPLOAD_CERT_SHA256_ALLOWLIST;
  if (environmentValue) values.push(...environmentValue.split(/[\s,;]+/));

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--certificate-sha256' || argument === '--cert-sha256') {
      if (!argv[index + 1] || argv[index + 1].startsWith('--')) {
        throw new Error(`${argument} requires a SHA-256 certificate fingerprint`);
      }
      values.push(...argv[index + 1].split(/[\s,;]+/));
      index += 1;
    } else if (argument.startsWith('--certificate-sha256=') || argument.startsWith('--cert-sha256=')) {
      values.push(argument.slice(argument.indexOf('=') + 1).split(/[\s,;]+/));
    }
  }

  const flattened = values.flat().filter(Boolean);
  if (!flattened.length) {
    throw new Error(
      '--release requires an expected upload certificate SHA-256 fingerprint via ' +
      'ANDROID_UPLOAD_CERT_SHA256 or --certificate-sha256',
    );
  }
  return [...new Set(flattened.map(normalizeCertificateDigest))];
}

function assertCertificateAllowed(observedDigests, approvedDigests) {
  if (!observedDigests.length) {
    throw new Error('no signer certificate SHA-256 fingerprint was reported; unsigned artifacts are rejected');
  }
  const unapprovedDigests = observedDigests.filter((digest) => !approvedDigests.includes(digest));
  if (unapprovedDigests.length) {
    throw new Error(
      `signer certificate is not in the approved upload allowlist (unapproved: ${unapprovedDigests.join(', ')}; observed: ${observedDigests.join(', ')})`,
    );
  }
}

function assertSignerLineageSupported(output) {
  if (/(?:certificate\s+)?lineage|proof[- ]of[- ]rotation|past\s+signer/i.test(String(output))) {
    throw new Error(
      'certificate lineage or proof-of-rotation output is ambiguous and unsupported by this verifier',
    );
  }
}

function readUnsigned(buffer, offset, byteLength, littleEndian) {
  if (byteLength === 4) {
    return BigInt(littleEndian ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset));
  }
  return littleEndian ? buffer.readBigUInt64LE(offset) : buffer.readBigUInt64BE(offset);
}

function numberFromUnsigned(value, description) {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`${description} is too large to inspect safely`);
  }
  return Number(value);
}

function inspectElf(buffer, entryName = '<ELF>') {
  if (!Buffer.isBuffer(buffer) || buffer.length < 64
    || buffer[0] !== 0x7f || buffer.toString('ascii', 1, 4) !== 'ELF') {
    throw new Error(`${entryName} is not an ELF shared library`);
  }

  const elfClass = buffer[4];
  const dataEncoding = buffer[5];
  if (![1, 2].includes(elfClass) || ![1, 2].includes(dataEncoding)) {
    throw new Error(`${entryName} has an unsupported ELF class or byte order`);
  }
  const littleEndian = dataEncoding === 1;
  const is64Bit = elfClass === 2;
  const headerSize = is64Bit ? 64 : 52;
  const programHeaderOffsetOffset = is64Bit ? 32 : 28;
  const programHeaderEntrySizeOffset = is64Bit ? 54 : 42;
  const programHeaderCountOffset = is64Bit ? 56 : 44;
  if (buffer.length < headerSize) {
    throw new Error(`${entryName} has a truncated ELF header`);
  }

  const programHeaderOffset = numberFromUnsigned(
    readUnsigned(buffer, programHeaderOffsetOffset, is64Bit ? 8 : 4, littleEndian),
    `${entryName} program header offset`,
  );
  const readEntrySize = littleEndian
    ? buffer.readUInt16LE(programHeaderEntrySizeOffset)
    : buffer.readUInt16BE(programHeaderEntrySizeOffset);
  const programHeaderCount = littleEndian
    ? buffer.readUInt16LE(programHeaderCountOffset)
    : buffer.readUInt16BE(programHeaderCountOffset);
  const minimumEntrySize = is64Bit ? 56 : 32;
  if (readEntrySize < minimumEntrySize || programHeaderCount === 0) {
    throw new Error(`${entryName} has no usable ELF program headers`);
  }
  const programHeadersEnd = programHeaderOffset + (readEntrySize * programHeaderCount);
  if (programHeaderOffset < headerSize || programHeadersEnd > buffer.length) {
    throw new Error(`${entryName} has truncated ELF program headers`);
  }

  const loadSegments = [];
  for (let index = 0; index < programHeaderCount; index += 1) {
    const offset = programHeaderOffset + (index * readEntrySize);
    const type = littleEndian ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset);
    if (type !== 1) continue; // PT_LOAD

    const alignmentOffset = is64Bit ? offset + 48 : offset + 28;
    const alignment = readUnsigned(buffer, alignmentOffset, is64Bit ? 8 : 4, littleEndian);
    loadSegments.push({ index, alignment });
    const isPowerOfTwo = alignment > 0n && (alignment & (alignment - 1n)) === 0n;
    if (alignment < BigInt(PAGE_SIZE) || alignment % BigInt(PAGE_SIZE) !== 0n || !isPowerOfTwo) {
      throw new Error(
        `${entryName} PT_LOAD #${index} has alignment ${alignment.toString()} bytes; ` +
        `16 KB requires a power-of-two alignment of at least ${PAGE_SIZE} bytes`,
      );
    }
  }
  if (!loadSegments.length) {
    throw new Error(`${entryName} contains no PT_LOAD program headers`);
  }
  return {
    bits: is64Bit ? 64 : 32,
    littleEndian,
    loadSegments: loadSegments.map(({ index, alignment }) => ({
      index,
      alignment: Number(alignment),
    })),
  };
}

function nativeEntries(artifact) {
  const unzip = commandPath('unzip');
  if (!unzip) throw new Error('unzip is required to inspect native ELF libraries');
  const result = run(unzip, ['-Z1', artifact]);
  if (result.status !== 0) {
    throw new Error(`could not list artifact entries:\n${result.output.trim()}`);
  }
  return result.output.split(/\r?\n/).filter((entry) => /\.so$/i.test(entry));
}

function verifyElfAlignment(artifact) {
  const unzip = commandPath('unzip');
  if (!unzip) {
    fail('unzip is required to inspect native ELF library PT_LOAD alignment');
    return;
  }
  let entries;
  try {
    entries = nativeEntries(artifact);
  } catch (error) {
    fail(error.message);
    return;
  }
  if (!entries.length) {
    fail('artifact contains no .so entries; native ELF 16 KB compatibility was not verified');
    return;
  }

  let verified = 0;
  for (const entry of entries) {
    const result = runBuffer(unzip, ['-p', artifact, entry]);
    if (result.status !== 0) {
      fail(`could not extract ${entry}:\n${result.output.toString('utf8').trim()}`);
      continue;
    }
    try {
      const details = inspectElf(result.output, entry);
      verified += 1;
      console.log(
        `${entry}: ELF${details.bits} PT_LOAD segments use at least 16 KB alignment ` +
        `(direct parser; this is not proof of device compatibility).`,
      );
    } catch (error) {
      fail(error.message);
    }
  }
  if (verified === entries.length) {
    console.log(`Verified 16 KB PT_LOAD alignment for all ${verified} native ELF libraries.`);
  }
}

function verifyApkNativeZipAlignment(artifact) {
  const buffer = fs.readFileSync(artifact);
  const endOfCentralDirectorySignature = 0x06054b50;
  const centralDirectorySignature = 0x02014b50;
  const localFileHeaderSignature = 0x04034b50;
  const minimumEndOfCentralDirectorySize = 22;

  let endOfCentralDirectory = -1;
  for (let offset = buffer.length - minimumEndOfCentralDirectorySize; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === endOfCentralDirectorySignature) {
      endOfCentralDirectory = offset;
      break;
    }
  }
  if (endOfCentralDirectory < 0) {
    throw new Error('APK central directory was not found');
  }

  const entryCount = buffer.readUInt16LE(endOfCentralDirectory + 10);
  const centralDirectoryOffset = buffer.readUInt32LE(endOfCentralDirectory + 16);
  let offset = centralDirectoryOffset;
  let verified = 0;

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== centralDirectorySignature) {
      throw new Error(`APK central directory entry ${index} is malformed`);
    }

    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);

    if (name.endsWith('.so')) {
      if (compressionMethod !== 0) {
        throw new Error(`${name} is compressed; native libraries must be stored uncompressed`);
      }
      if (buffer.readUInt32LE(localHeaderOffset) !== localFileHeaderSignature) {
        throw new Error(`${name} has a malformed local file header`);
      }
      const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
      const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength;
      if (dataOffset % PAGE_SIZE !== 0) {
        throw new Error(`${name} data offset ${dataOffset} is not aligned to ${PAGE_SIZE} bytes`);
      }
      verified += 1;
    }

    offset += 46 + nameLength + extraLength + commentLength;
  }

  if (verified === 0) {
    throw new Error('APK contains no native ELF entries to page-align');
  }
  console.log(`APK native ZIP entries are aligned to ${PAGE_SIZE} bytes (${verified} libraries).`);
}

function verifyPageAlignment(artifact) {
  const extension = path.extname(artifact).toLowerCase();
  if (extension === '.aab') {
    const bundletool = commandPath('bundletool');
    if (!bundletool) {
      fail('bundletool is required to inspect AAB PAGE_ALIGNMENT_16K configuration');
      return;
    }
    const result = run(bundletool, ['dump', 'config', `--bundle=${artifact}`]);
    if (result.status !== 0) {
      fail(`bundletool dump config failed:\n${result.output.trim()}`);
      return;
    }
    if (!/PAGE_ALIGNMENT_16K/.test(result.output)) {
      fail('AAB configuration does not report PAGE_ALIGNMENT_16K');
      return;
    }
    console.log('AAB reports PAGE_ALIGNMENT_16K.');
    return;
  }

  if (extension === '.apk') {
    const zipalign = commandPath('zipalign');
    if (!zipalign) {
      try {
        verifyApkNativeZipAlignment(artifact);
      } catch (error) {
        fail(`native ZIP page alignment check failed:\n${error.message}`);
      }
      return;
    }
    const result = run(zipalign, ['-c', '-P', '16', '-v', '4', artifact]);
    if (result.status !== 0) {
      fail(`zipalign page alignment check failed:\n${result.output.trim()}`);
      return;
    }
    console.log('APK passes zipalign -P 16 verification.');
    return;
  }

  fail('artifact must have an .apk or .aab extension');
}

function verifyReleaseSigning(artifact, argv = process.argv.slice(2), env = process.env) {
  const extension = path.extname(artifact).toLowerCase();
  let signerOutput = '';
  let certificateOutput = '';

  if (extension === '.apk') {
    const command = commandPath('apksigner');
    if (!command) {
      fail('apksigner is required for --release signing verification');
      return;
    }
    const result = run(command, ['verify', '--print-certs', artifact]);
    if (result.status !== 0) {
      fail(`release signing verification failed:\n${result.output.trim()}`);
      return;
    }
    signerOutput = result.output;
    certificateOutput = result.output;
  } else {
    const jarsigner = commandPath('jarsigner');
    const keytool = commandPath('keytool');
    if (!jarsigner || !keytool) {
      fail('jarsigner and keytool are required for --release AAB signing verification');
      return;
    }
    const result = run(jarsigner, ['-verify', '-verbose', '-certs', artifact]);
    if (result.status !== 0 || !/jar verified\./i.test(result.output)
      || /jar verified,\s*with signer errors/i.test(result.output)
      || /\bjar is unsigned\b/i.test(result.output)) {
      fail(`release signing verification failed; AAB must contain an actual signer:\n${result.output.trim()}`);
      return;
    }
    const certificate = run(keytool, ['-printcert', '-jarfile', artifact]);
    if (certificate.status !== 0) {
      fail(`could not read the AAB signer certificate:\n${certificate.output.trim()}`);
      return;
    }
    signerOutput = result.output;
    certificateOutput = certificate.output;
  }

  try {
    assertSignerLineageSupported(`${signerOutput}\n${certificateOutput}`);
  } catch (error) {
    fail(error.message);
    return;
  }

  if (/Android Debug|androiddebugkey|debug\.keystore/i.test(`${signerOutput}\n${certificateOutput}`)) {
    fail('debug signing material was detected; this artifact must not be uploaded to Google Play');
    return;
  }

  const observedDigests = certificateDigestsFromOutput(certificateOutput);
  let approvedDigests;
  try {
    approvedDigests = approvedCertificateDigests(argv, env);
    assertCertificateAllowed(observedDigests, approvedDigests);
  } catch (error) {
    fail(error.message);
    return;
  }
  console.log(`Release signer certificate is approved (${observedDigests.join(', ')}).`);
}

function main(argv = process.argv.slice(2)) {
  const artifact = artifactArgument(argv);
  if (!artifact) return;
  const extension = path.extname(artifact).toLowerCase();
  verifyPageAlignment(artifact);
  if (['.apk', '.aab'].includes(extension)) {
    verifyElfAlignment(artifact);
  }
  if (argv.includes('--release') && ['.apk', '.aab'].includes(extension)) {
    verifyReleaseSigning(artifact, argv);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  PAGE_SIZE,
  normalizeCertificateDigest,
  certificateDigestsFromOutput,
  approvedCertificateDigests,
  assertCertificateAllowed,
  assertSignerLineageSupported,
  inspectElf,
  verifyElfAlignment,
  verifyReleaseSigning,
  main,
};