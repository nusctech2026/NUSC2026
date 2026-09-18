import { Fragment } from "react";
import type { RichTextPart } from "@/content/collections";

export function RichText({ parts }: { parts: RichTextPart[] }) {
  return parts.map((part, index) =>
    part.strong ? (
      <b key={index}>{part.text}</b>
    ) : (
      <Fragment key={index}>{part.text}</Fragment>
    ),
  );
}
