import cron from "node-cron";
import { env } from "./config/env";
import { runScanJob } from "./jobs/scanJob";
import { runHealthJob } from "./jobs/healthJob";

async function boot() {
  cron.schedule(env.SCAN_CRON, async () => {
    try {
      await runScanJob();
      // eslint-disable-next-line no-console
      console.log("[worker] scan job done");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[worker] scan job failed", error);
    }
  });

  cron.schedule(env.HEALTH_CRON, async () => {
    try {
      await runHealthJob();
      // eslint-disable-next-line no-console
      console.log("[worker] health job done");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[worker] health job failed", error);
    }
  });
}

boot().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
