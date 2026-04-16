import { parseSearchQuery } from "@/app/lib/search-query";

export function navigateToSearch(
  router: { push: (href: string) => void },
  rawQuery: string,
) {
  const term = parseSearchQuery(rawQuery);
  switch (term) {
    case null:
      router.push("/features/user/search");
      break;
    default:
      router.push(`/features/user/search?query=${encodeURIComponent(term)}`);
  }
}
