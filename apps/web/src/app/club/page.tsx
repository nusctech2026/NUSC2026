import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { pages } from "@/content/pages";
import { ClubStory } from "@/components/sections/ClubStory";
import { Journey } from "@/components/sections/Journey";
import { Mission } from "@/components/sections/Mission";

export const metadata: Metadata = {
  title: pages.club.label,
  description: pages.club.description,
};

export default function Page() {
  return (
    <>
      <PageHeader {...pages.club} />
      <ClubStory />
      <Journey />
      <Mission />
    </>
  );
}
