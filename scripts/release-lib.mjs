import { gunzipSync } from "node:zlib";

function text(bytes) {
  const end = bytes.indexOf(0);
  return Buffer.from(end === -1 ? bytes : bytes.subarray(0, end)).toString("utf8");
}

function octal(bytes, field) {
  const value = text(bytes).trim();
  if (!/^[0-7]+$/.test(value)) {
    throw new Error(`invalid tar ${field}`);
  }
  return Number.parseInt(value, 8);
}

export function assertSafePackagePath(name) {
  if (
    !name.startsWith("package/") ||
    name.includes("\\") ||
    name.includes("\0") ||
    name.startsWith("/") ||
    name.split("/").some((part) => part === "." || part === ".." || part.length === 0)
  ) {
    throw new Error(`unsafe package path: ${name}`);
  }
}

export function validatePackageMembers(members, expectedNames) {
  const seen = new Set();
  for (const member of members) {
    assertSafePackagePath(member.name);
    if (member.type !== "0" && member.type !== "\0") {
      throw new Error(`unsupported tar member type for ${member.name}`);
    }
    if (seen.has(member.name)) {
      throw new Error(`duplicate tar member: ${member.name}`);
    }
    seen.add(member.name);
  }
  const actual = [...seen].sort();
  const expected = [...expectedNames].sort();
  if (actual.length !== expected.length || actual.some((name, index) => name !== expected[index])) {
    throw new Error("package contents do not match the exact allowlist");
  }
}

export function readTarGzip(archive) {
  const tar = gunzipSync(archive);
  const members = [];
  let offset = 0;
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) {
      break;
    }
    const storedChecksum = octal(header.subarray(148, 156), "checksum");
    const checksumHeader = Buffer.from(header);
    checksumHeader.fill(32, 148, 156);
    const actualChecksum = checksumHeader.reduce((sum, byte) => sum + byte, 0);
    if (storedChecksum !== actualChecksum) {
      throw new Error("tar header checksum mismatch");
    }
    const name = text(header.subarray(0, 100));
    const prefix = text(header.subarray(345, 500));
    const fullName = prefix ? `${prefix}/${name}` : name;
    const size = octal(header.subarray(124, 136), "size");
    const type = String.fromCharCode(header[156]);
    const start = offset + 512;
    const end = start + size;
    if (end > tar.length) {
      throw new Error(`truncated tar member: ${fullName}`);
    }
    members.push({ content: tar.subarray(start, end), name: fullName, size, type });
    offset = start + Math.ceil(size / 512) * 512;
  }
  return members;
}
