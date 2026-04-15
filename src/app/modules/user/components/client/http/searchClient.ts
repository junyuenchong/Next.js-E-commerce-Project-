import { parseSearchQuery } from "@/app/lib/search-query";

export function navigateToSearch(
  router: { push: (href: string) => void },
  rawQuery: string,
) {
  const term = parseSearchQuery(rawQuery);
  switch (term) {
    case null:
      router.push("/modules/user/search");
      break;
    default:
      router.push(`/modules/user/search?query=${encodeURIComponent(term)}`);
  }
}
