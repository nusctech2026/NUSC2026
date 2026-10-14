import { redirect } from "next/navigation";

export default function CancellationRedirect() {
  redirect("/cancellation-policy");
}
