import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { pages } from "@/content/pages";
import { Careers } from "@/components/sections/Careers";

export const metadata: Metadata = {
  title: pages.careers.label,
  description: pages.careers.description,
};

export default function Page() {
  return (
    <>
      <PageHeader {...pages.careers} />
      <Careers />
    </>
  );
}
