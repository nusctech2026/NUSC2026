import Link from "next/link";
import { Search, Home } from "lucide-react";
import "./not-found.css";

export default function NotFound() {
  return (
    <div className="not-found-page">
      <div className="not-found-container">
        <div className="not-found-number">404</div>
        <h1 className="not-found-title">Page Not Found</h1>
        <p className="not-found-desc">
          We're sorry, but the page you are looking for doesn't exist or has been moved. 
          Let's get you back on the pitch.
        </p>
        
        <div className="not-found-actions">
          <Link href="/" className="not-found-btn primary">
            <Home size={18} />
            Back to Home
          </Link>
          <Link href="/search" className="not-found-btn secondary">
            <Search size={18} />
            Search Store
          </Link>
        </div>
      </div>
    </div>
  );
}
