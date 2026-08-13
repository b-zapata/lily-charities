import { redirect } from "next/navigation";

export default async function SchoolCreatedPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/schools/${id}`);
}
