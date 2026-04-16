/** Site root → public storefront. */
import { redirect } from "next/navigation";

export default function RootRedirect() {
  redirect("/features/user");
}
