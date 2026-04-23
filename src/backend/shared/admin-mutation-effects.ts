import { revalidatePath, revalidateTag } from "next/cache";
import {
  deleteCacheKeys,
  deleteCacheKeysByPattern,
} from "@/backend/modules/db/redis";

type AdminMutationEffectsParams = {
  paths?: string[];
  tags?: string[];
  cacheKeys?: string[];
  cachePatterns?: string[];
  publish?: () => Promise<void> | void;
};

/**
 * Run cache invalidation and realtime side effects after admin writes.
 */
export async function runAdminMutationEffects(
  params: AdminMutationEffectsParams,
): Promise<void> {
  const {
    paths = [],
    tags = [],
    cacheKeys = [],
    cachePatterns = [],
    publish,
  } = params;

  for (const path of paths) {
    await revalidatePath(path);
  }
  for (const tag of tags) {
    await revalidateTag(tag);
  }
  if (cacheKeys.length > 0) {
    await deleteCacheKeys(cacheKeys);
  }
  for (const pattern of cachePatterns) {
    await deleteCacheKeysByPattern(pattern);
  }
  if (publish) {
    await publish();
  }
}
