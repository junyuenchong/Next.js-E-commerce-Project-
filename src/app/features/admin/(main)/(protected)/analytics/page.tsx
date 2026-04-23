/**
 * admin analytics page
 * show sales and traffic summaries
 */
import AdminAnalyticsClient from "@/app/features/admin/components/client/analytics/AdminAnalyticsClient";

export const metadata = { title: "Analytics · Admin" };

export default function AdminAnalyticsPage() {
  return <AdminAnalyticsClient />;
}
