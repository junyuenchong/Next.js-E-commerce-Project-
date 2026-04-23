/**
 * route entry
 * redirect site root to public storefront
 */
import { redirect } from "next/navigation";

export default function RootRedirect() {
  redirect("/features/user");
}
