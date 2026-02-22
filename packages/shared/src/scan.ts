import { randomUUID } from "node:crypto";
import { ScanHostInput, ScanRunResult } from "./types";

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function normalizeCidrs(cidrs: string[]): string[] {
  return cidrs.map((c) => c.trim()).filter(Boolean);
}

function createHostFromCidr(cidr: string): ScanHostInput {
  const base = cidr.split("/")[0];
  const octets = base.split(".");
  if (octets.length !== 4) {
    return {
      ip: "192.168.0.10",
      mac: `02:42:ac:11:${randomInt(10, 99)}:${randomInt(10, 99)}`,
      vendor: "Unknown",
      hostname: "host-unknown",
      openPorts: [80],
      hints: ["invalid-cidr"]
    };
  }

  const hostIp = `${octets[0]}.${octets[1]}.${octets[2]}.${randomInt(2, 250)}`;
  return {
    ip: hostIp,
    mac: `02:42:${randomInt(10, 99)}:${randomInt(10, 99)}:${randomInt(10, 99)}:${randomInt(10, 99)}`,
    vendor: ["Cisco", "Ubiquiti", "MikroTik", "Intel"][randomInt(0, 3)],
    hostname: `host-${octets[2]}-${randomInt(10, 99)}`,
    openPorts: [22, 80, 443].filter(() => Math.random() > 0.4),
    hints: ["simulated-scan"]
  };
}

export function simulateScan(cidrs: string[]): ScanRunResult {
  const validCidrs = normalizeCidrs(cidrs);
  const hosts = validCidrs.map(createHostFromCidr);
  return {
    scanRunId: randomUUID(),
    hosts
  };
}
