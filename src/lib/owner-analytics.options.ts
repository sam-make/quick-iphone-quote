import { queryOptions } from "@tanstack/react-query";
import { getOwnerAnalytics } from "@/lib/owner-analytics.functions";

export const ownerAnalyticsOptions = (days: 7 | 30 | 90, shop: string) =>
  queryOptions({
    queryKey: ["owner-analytics", days, shop],
    queryFn: () => getOwnerAnalytics({ data: { days, shopId: shop || undefined } }),
    staleTime: 30_000,
  });
