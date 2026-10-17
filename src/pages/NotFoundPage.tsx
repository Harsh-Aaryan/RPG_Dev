import { Link } from 'react-router-dom';
import { EmptyDais } from '../components/art/Illustrations';
import { Shell } from '../components/ui/Shell';

export function NotFoundPage() {
  return (
    <Shell>
      <div className="mx-auto mt-20 max-w-md text-center">
        <EmptyDais className="mx-auto h-24 w-44" />
        <h1 className="mt-6 font-display text-4xl font-bold text-ink">This path leads nowhere</h1>
        <p className="mt-3 text-ink-2">The page you followed doesn't exist. Check the link, or head back to your raids.</p>
        <div className="mt-7 flex justify-center gap-3">
          <Link to="/" className="btn-primary">
            Back to raids
          </Link>
          <Link to="/create" className="btn-secondary">
            Start a battle
          </Link>
        </div>
      </div>
    </Shell>
  );
}
