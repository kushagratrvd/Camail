import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] p-8 text-center bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">
      <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-500 font-bold text-lg">
        404
      </div>
      <h2 className="text-xl font-bold tracking-tight mb-2">Page Not Found</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mb-6">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/chat"
        className="px-4 py-2 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 rounded-xl transition-all shadow-xs"
      >
        Return Home
      </Link>
    </div>
  );
}
