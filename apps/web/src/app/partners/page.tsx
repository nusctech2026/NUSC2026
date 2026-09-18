import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { pages } from "@/content/pages";
import { Partners } from "@/components/sections/Partners";

export const metadata: Metadata = {
  title: pages.partners.label,
  description: pages.partners.description,
};

export default function Page() {
  return (
    <>
      <PageHeader {...pages.partners} />
      <Partners />
    </>
  );
}
