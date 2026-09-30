import React from 'react';
import { X, UserCheck } from 'lucide-react';
import { AccessRequestsTab } from './AccessRequestsTab';

interface AccessRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestCountChange?: (count: number) => void;
}

export const AccessRequestsModal: React.FC<AccessRequestsModalProps> = ({
  isOpen,
  onClose,
  onRequestCountChange,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Нэвтрэх хүсэлт & Хэрэглэгчийн эрхийн удирдлага</h2>
              <p className="text-[11px] text-stone-400">
                Хэрэглэгчийн ID-аар эрх оноох, хүсэлт зөвшөөрөх, анхдагч эрхийн тохиргоо
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 min-h-0">
          <AccessRequestsTab onCountChange={onRequestCountChange} />
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-stone-100 border-t border-stone-200 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold rounded-lg text-xs cursor-pointer"
          >
            Хаах
          </button>
        </div>
      </div>
    </div>
  );
};
