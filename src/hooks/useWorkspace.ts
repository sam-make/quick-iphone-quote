import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ensureWorkspace } from "@/lib/workspace.functions";
import { useAuth } from "./useAuth";

/** Current tenant (shop + profile + role) for the signed-in user. */
export function useWorkspace() {
  const { user } = useAuth();
  const fetchWorkspace = useServerFn(ensureWorkspace);

  return useQuery({
    queryKey: ["workspace", user?.id],
    queryFn: () => fetchWorkspace({ data: undefined }),
    enabled: Boolean(user?.id),
    staleTime: 60_000,
  });
}