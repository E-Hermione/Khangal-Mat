import React, { useEffect, useState } from 'react';
import { Bell, Megaphone, X } from 'lucide-react';
import { InboxItem, markAnnouncementsRead, subscribeMyAnnouncements } from '../services/announcements';

/**
 * Header bell for members: the admin's announcements, newest first. Unread ones open by
 * themselves; closing that window marks them read.
 */
export const AnnouncementsBell: React.FC<{ uid: string }> = ({ uid }) => {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<'unread' | 'all' | null>(null);
  // Unread ones being shown right now (kept stable while the window is open)
  const [shown, setShown] = useState<InboxItem[]>([]);

  useEffect(
    () =>
      subscribeMyAnnouncements(uid, (list, reads) => {
        setItems(list);
        setReadIds(reads);
      }),
    [uid]
  );

  const unread = items.filter((a) => !readIds.has(a.id));

  // New unread announcements pop up
  useEffect(() => {
    if (open === null && unread.length > 0) {
      setShown(unread);
      setOpen('unread');
    } else if (open === 'unread') {
      // Arrived while the window is open: add it on top
      setShown((prev) => [...unread.filter((a) => !prev.some((p) => p.id === a.id)), ...prev]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unread.length]);

  const close = () => {
    const ids = (open === 'unread' ? shown : items).map((a) => a.id).filter((id) => !readIds.has(id));
    setOpen(null);
    if (ids.length > 0) markAnnouncementsRead(uid, ids).catch((err) => console.error(err));
  };

  const list = open === 'unread' ? shown : items;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen('all')}
        className="relative p-1.5 rounded-lg text-stone-700 hover:bg-stone-100 cursor-pointer"
        title="Зарлал"
        aria-label="Зарлал"
        data-testid="announcements-bell"
      >
        <Bell className="w-5 h-5" />
        {unread.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center">
            {unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4 no-print" onClick={close}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
            data-testid="announcements-dialog"
          >
            <div className="px-5 py-3.5 border-b border-stone-200 flex items-center justify-between">
              <h3 className="font-extrabold text-stone-900 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-600" />
                {open === 'unread' ? 'Шинэ зарлал' : 'Зарлалууд'}
              </h3>
              <button type="button" onClick={close} className="p-1 rounded-md hover:bg-stone-100 cursor-pointer" aria-label="Хаах">
                <X className="w-5 h-5 text-stone-500" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-3">
              {list.length === 0 ? (
                <div className="text-sm text-stone-500">Зарлал алга.</div>
              ) : (
                list.map((a) => (
                  <div
                    key={a.id}
                    className={`p-3.5 rounded-xl border ${
                      readIds.has(a.id) ? 'border-stone-200 bg-white' : 'border-amber-300 bg-amber-50'
                    }`}
                  >
                    <div className="font-bold text-stone-900">{a.title}</div>
                    <div className="text-[11px] text-stone-500 mb-1.5">{new Date(a.createdAt).toLocaleString()}</div>
                    <div className="text-sm text-stone-800 whitespace-pre-wrap">{a.body}</div>
                  </div>
                ))
              )}
            </div>
            <div className="px-5 py-3 border-t border-stone-200 flex justify-end">
              <button
                type="button"
                onClick={close}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-stone-900 text-white hover:bg-black cursor-pointer"
              >
                Ойлголоо
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
