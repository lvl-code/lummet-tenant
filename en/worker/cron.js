import { aggregateAnalyticsDaily } from './database/analytics.js';
import { runDueReportSchedules } from './database/reports.js';
import { evaluateAlertRules } from './database/alerts.js';
import { getConfigsDueForSync } from './database/provider-adapters.js';
import { syncAllDueProviders } from './adapters/sync.js';
import { recordCronRun } from './database/cron-health.js';

export async function cleanupExpiredSessions(env) {

    await env.DB.prepare(`
        DELETE FROM sessions
        WHERE expires_at < CURRENT_TIMESTAMP
    `).run();

}

// Analytics daily aggregation (Phase 4). Mirrors the existing
// runScheduledHealthChecks() contract exactly: checks its own
// system_settings feature flag, always safe to call even when
// disabled (default), never throws out to the caller.
//
// recordCronRun() is called EVERY invocation, skipped-or-not -- its
// absence entirely (never a single row) is how the admin health
// indicator (worker/database/cron-health.js) tells "the schedule
// never fires at all" apart from "it fires but is turned off".
export async function runAnalyticsAggregation(env) {
    const result = await aggregateAnalyticsDaily(env.DB);
    await recordCronRun(env.DB, 'analytics_aggregation', result);
    return result;
}

// Scheduled report execution (Phase 9). Same contract as above.
export async function runScheduledReports(env) {
    const result = await runDueReportSchedules(env.DB, env);
    await recordCronRun(env.DB, 'report_schedules', result);
    return result;
}

// Alert-rule evaluation (Phase 13). Same contract as above.
export async function runAlertEvaluation(env) {
    const result = await evaluateAlertRules(env.DB);
    await recordCronRun(env.DB, 'alert_evaluation', result);
    return result;
}

// Outbound provider/API adapter sync (brief §10). Same feature-flag
// contract as the jobs above -- checks 'provider_sync_cron_enabled'
// (default 'false', see migration 0035) and never fetches or writes
// anything when it's off. Deliberately reads the flag here rather than
// inside syncAllDueProviders(), matching where every other job in this
// file makes that check, so the on/off behavior of every scheduled job
// is visible in one place.
export async function runProviderSync(env) {
    const flag = await env.DB.prepare(`SELECT value FROM system_settings WHERE key = 'provider_sync_cron_enabled'`).first();
    if (!flag || flag.value !== 'true') {
        const result = { skipped: true, reason: 'provider_sync_cron_enabled is not "true"' };
        await recordCronRun(env.DB, 'provider_sync', result);
        return result;
    }

    const configs = await getConfigsDueForSync(env.DB);
    if (configs.length === 0) {
        const result = { skipped: false, synced: 0, results: [] };
        await recordCronRun(env.DB, 'provider_sync', result);
        return result;
    }

    const results = await syncAllDueProviders(env.DB, env, configs);
    const result = { skipped: false, synced: results.length, results };
    await recordCronRun(env.DB, 'provider_sync', result);
    return result;
}
