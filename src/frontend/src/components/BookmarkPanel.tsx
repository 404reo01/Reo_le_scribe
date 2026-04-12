import type { BookmarkResult } from '@shared/types/index';

interface Props {
  bookmarks: BookmarkResult[];
  onClose: () => void;
}

export function BookmarkPanel({ bookmarks, onClose }: Props) {
  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-gray-800 border-l border-gray-700 flex flex-col z-50 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
        <h2 className="font-semibold text-white">À l'affût</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors text-xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {bookmarks.length === 0 ? (
          <p className="text-gray-500 text-sm text-center mt-8">
            No bookmarks yet. Click "À l'affût" during the meeting to capture a moment.
          </p>
        ) : (
          [...bookmarks].reverse().map((bm) => (
            <div key={bm.id} className="bg-gray-700 rounded-xl p-4 flex flex-col gap-3">
              {/* Meta */}
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>by <span className="text-indigo-400 font-medium">{bm.triggeredBy}</span></span>
                <span>{new Date(bm.createdAt).toLocaleTimeString()}</span>
              </div>

              {/* Summary */}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Summary</p>
                <p className="text-white text-sm whitespace-pre-wrap">{bm.summary}</p>
              </div>

              {/* Transcript (collapsible) */}
              <details className="group">
                <summary className="text-xs text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-300 transition-colors">
                  Transcript ▸
                </summary>
                <p className="mt-2 text-gray-300 text-xs whitespace-pre-wrap leading-relaxed">
                  {bm.transcript}
                </p>
              </details>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
