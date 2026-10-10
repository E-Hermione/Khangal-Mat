import React, { useEffect, useRef, useState } from 'react';
import { FileText, Eye, Printer, Trash2, Upload, Loader2 } from 'lucide-react';
import { LessonSectionHeader } from './LessonSectionHeader';
import { deleteMaterial, loadMaterials, materialBlob, MAX_MATERIAL_BYTES, TopicMaterial, uploadMaterial } from '../services/topicMaterials';

// Extra material of a topic (admin only): PDF files to add, open and print
export const MaterialsSection: React.FC<{ topicId: string }> = ({ topicId }) => {
  const [files, setFiles] = useState<TopicMaterial[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const blobs = useRef(new Map<string, string>());

  useEffect(() => {
    setFiles(null);
    setError('');
    loadMaterials(topicId)
      .then(setFiles)
      .catch(() => {
        setFiles([]);
        setError('Материалыг ачаалж чадсангүй.');
      });
  }, [topicId]);
  useEffect(() => () => blobs.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const urlOf = async (m: TopicMaterial) => {
    let url = blobs.current.get(m.id);
    if (!url) {
      url = URL.createObjectURL(await materialBlob(m));
      blobs.current.set(m.id, url);
    }
    return url;
  };

  const run = async (key: string, job: () => Promise<void>) => {
    setBusy(key);
    setError('');
    try {
      await job();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Алдаа гарлаа.');
    } finally {
      setBusy(null);
    }
  };

  const open = (m: TopicMaterial) =>
    run(`open-${m.id}`, async () => {
      window.open(await urlOf(m), '_blank', 'noopener');
    });

  // The PDF goes into a hidden frame and the browser's print dialog opens for it alone
  const print = (m: TopicMaterial) =>
    run(`print-${m.id}`, async () => {
      const url = await urlOf(m);
      const frame = document.createElement('iframe');
      frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
      frame.src = url;
      frame.onload = () => {
        setTimeout(() => {
          frame.contentWindow?.focus();
          frame.contentWindow?.print();
        }, 300);
        setTimeout(() => frame.remove(), 60_000);
      };
      document.body.appendChild(frame);
    });

  const add = (list: FileList | null) => {
    const file = list?.[0];
    if (!file) return;
    run('upload', async () => {
      setProgress(0);
      const m = await uploadMaterial(topicId, file, setProgress);
      setFiles((f) => [...(f || []), m]);
    });
    if (input.current) input.current.value = '';
  };

  const remove = (m: TopicMaterial) => {
    if (!window.confirm(`«${m.name}» файлыг устгах уу?`)) return;
    run(`del-${m.id}`, async () => {
      await deleteMaterial(topicId, m);
      setFiles((f) => (f || []).filter((x) => x.id !== m.id));
    });
  };

  const btn =
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-default';

  return (
    <section className="mb-12 no-print" id="section-materials" data-testid="materials-section">
      <LessonSectionHeader title="Нэмэлт материал" />
      <p className="text-sm text-stone-500 mb-4">
        Сэдэвтэй холбоотой PDF файл оруулж, нээж харах, хэвлэх боломжтой (зөвхөн админд харагдана, {MAX_MATERIAL_BYTES / 1024 / 1024} MB хүртэл).
      </p>

      <div className="mb-5">
        <input ref={input} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => add(e.target.files)} />
        <button
          type="button"
          disabled={busy === 'upload'}
          onClick={() => input.current?.click()}
          className={`${btn} border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900`}
          data-testid="material-upload"
        >
          {busy === 'upload' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {busy === 'upload' ? `Хуулж байна… ${Math.round(progress * 100)}%` : 'PDF файл нэмэх'}
        </button>
      </div>

      {error && <p className="text-sm text-rose-600 mb-3">{error}</p>}

      {files === null ? (
        <p className="text-sm text-stone-400 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Ачаалж байна…
        </p>
      ) : files.length === 0 ? (
        <div className="py-10 text-center text-stone-400 border-2 border-dashed border-stone-200 rounded-xl">
          <FileText className="w-9 h-9 mx-auto text-stone-300 mb-2" />
          <p className="text-sm font-semibold text-stone-600">Нэмэлт материал оруулаагүй байна.</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {files.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 p-3.5 rounded-xl border border-stone-200 bg-stone-50/60">
              <FileText className="w-6 h-6 text-rose-500 shrink-0" />
              <div className="flex-1 min-w-[10rem]">
                <p className="text-sm font-bold text-stone-900 break-all">{m.name}</p>
                <p className="text-xs text-stone-500">
                  {(m.size / 1024 / 1024).toFixed(m.size < 1024 * 1024 ? 2 : 1)} MB · {new Date(m.uploadedAt).toLocaleDateString('mn-MN')}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={!!busy} onClick={() => open(m)} className={`${btn} border-stone-300 bg-white hover:bg-stone-100 text-stone-800`}>
                  {busy === `open-${m.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />} Нээх
                </button>
                <button type="button" disabled={!!busy} onClick={() => print(m)} className={`${btn} border-stone-300 bg-white hover:bg-stone-100 text-stone-800`}>
                  {busy === `print-${m.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />} Хэвлэх
                </button>
                <button type="button" disabled={!!busy} onClick={() => remove(m)} className={`${btn} border-rose-200 bg-white hover:bg-rose-50 text-rose-600`} title="Устгах">
                  {busy === `del-${m.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
