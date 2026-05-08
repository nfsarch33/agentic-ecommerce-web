// Re-export the usage-fetch helper colocated with billing for callers
// that prefer importing from a metric-specific module.
export { getBillingUsage } from "@/lib/adapters/api/billing";
export type { UsageRequestOptions } from "@/lib/adapters/api/billing";
