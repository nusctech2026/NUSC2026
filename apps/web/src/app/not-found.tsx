import Link from "next/link";
import { PageHeader } from "@/components/page-header";

export default function NotFound() {
  return (
    <>
      <PageHeader
        label="Page not found"
        title="Off the pitch."
        description="We couldn’t find that page. Head back to the club and find your next destination."
      />
      <section className="sect">
        <div className="wrap">
          <Link className="btn btn-red" href="/">
            Back to home <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </>
  );
}
