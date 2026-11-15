import { redirect } from "next/navigation";

/**
 * The Discount section was renamed to Promotions. Keep the old URL working so
 * bookmarks and any in-flight links still land on the discount code list.
 */
export default async function LegacyDiscountsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/organizer/events/${id}/promotions/discounts`);
}
