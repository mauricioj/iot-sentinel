import { simulateScan } from "@iot/shared";
import { DiscoveredHost } from "../db/models";

export async function runScan(cidrs: string[]): Promise<{ scanRunId: string; count: number }> {
  const scan = simulateScan(cidrs);
  const now = new Date();

  for (const host of scan.hosts) {
    const existing = await DiscoveredHost.findOne({ where: { ip: host.ip, mac: host.mac ?? null } });
    if (existing) {
      await existing.update({
        last_seen_at: now,
        open_ports: host.openPorts ?? [],
        hints: host.hints ?? [],
        vendor: host.vendor ?? null,
        hostname: host.hostname ?? null
      });
    } else {
      await DiscoveredHost.create({
        ip: host.ip,
        mac: host.mac,
        vendor: host.vendor ?? null,
        hostname: host.hostname ?? null,
        open_ports: host.openPorts ?? [],
        hints: host.hints ?? [],
        first_seen_at: now,
        last_seen_at: now
      });
    }
  }

  return { scanRunId: scan.scanRunId, count: scan.hosts.length };
}
