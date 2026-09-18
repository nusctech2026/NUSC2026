import Link from "next/link";

export function PageHeader({
  title,
  label,
  description,
}: {
  title: string;
  label: string;
  description: string;
}) {
  return (
    <header className="page-header">
      <div className="burst" aria-hidden="true" />
      <div className="wrap page-header-in">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{label}</span>
        </nav>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </header>
  );
}
