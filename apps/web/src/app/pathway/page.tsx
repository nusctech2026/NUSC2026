import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { pages } from "@/content/pages";
import { Pathway } from "@/components/sections/Pathway";
import { Players } from "@/components/sections/Players";
import { Scholarships } from "@/components/sections/Scholarships";

export const metadata: Metadata = {
  title: pages.pathway.label,
  description: pages.pathway.description,
};

export default function Page() {
  return (
    <>
      <PageHeader {...pages.pathway} />
      <Pathway />
      <Players />
      <Scholarships />
    </>
  );
}
