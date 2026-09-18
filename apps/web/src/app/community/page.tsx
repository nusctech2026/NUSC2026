import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { pages } from "@/content/pages";
import { Community } from "@/components/sections/Community";

export const metadata: Metadata = {
  title: pages.community.label,
  description: pages.community.description,
};

export default function Page() {
  return (
    <>
      <PageHeader {...pages.community} />
      <Community />
    </>
  );
}
