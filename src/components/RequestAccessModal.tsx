import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Mail,
  Phone,
  User,
  School,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  KeyRound,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { accessRequestService } from '../services/accessRequestService';
import { AccessRequest } from '../types';

interface RequestAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAutoLogin?: (identifier: string, pass: string) => void;
}

export const RequestAccessModal: React.FC<RequestAccessModalProps> = ({
  isOpen,
  onClose,
  onAutoLogin,
}) => {
  const [activeTab, setActiveTab] = useState<'request' | 'check'>('request');

  // Request form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [school, setSchool] = useState('');
  const [note, setNote] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submittedRequest, setSubmittedRequest] = useState<AccessRequest | null>(null);

  // Status check state
  const [checkEmail, setCheckEmail] = useState('');
  const [checkedResult, setCheckedResult] = useState<AccessRequest | null | 'not_found'>(null);

  useEffect(() => {
    if (isOpen) {
      setFeedback(null);
      setCheckedResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const result = accessRequestService.submitRequest({
      fullName,
      email,
      phoneNumber,
      school,
      note,
    });

    if (result.success && result.request) {
      setFeedback({ type: 'success', text: result.message });
      setSubmittedRequest(result.request);
      setCheckEmail(email.trim().toLowerCase());
    } else {
      setFeedback({ type: 'error', text: result.message });
      if (result.request) {
        setSubmittedRequest(result.request);
      }
    }
  };

  const handleCheckStatus = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = checkEmail.trim().toLowerCase();
    if (!clean) return;

    const req = accessRequestService.getRequestByEmail(clean);
    if (req) {
      setCheckedResult(req);
    } else {
      setCheckedResult('not_found');
    }
  };

  const formatRemainingTime = (expiresAt: number) => {
    const diff = expiresAt - Date.now();
    if (diff <= 0) return 'Хугацаа дууссан';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours} цаг ${mins} минут үлдсэн`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Нэвтрэх эрх авах</h2>
              <p className="text-[11px] text-stone-400">
                Админ зөвшөөрснөөр таны Gmail рүү нэвтрэх нэр, нууц үг очно
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

        {/* Tab switch */}
        <div className="flex border-b border-stone-200 bg-stone-50 px-6">
          <button
            type="button"
            onClick={() => setActiveTab('request')}
            className={`py-3 text-xs font-bold border-b-2 transition-colors mr-6 cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'request'
                ? 'border-amber-600 text-amber-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Шинэ хүсэлт илгээх</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('check')}
            className={`py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'check'
                ? 'border-amber-600 text-amber-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Хүсэлтийн төлөв шалгах</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'request' ? (
            submittedRequest && feedback?.type === 'success' ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-stone-900">
                  Таны хүсэлт амжилттай бүртгэгдлээ!
                </h3>
                <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
                  Админ таны хүсэлтийг хянаад зөвшөөрөхөд таны <strong>{submittedRequest.email}</strong> Gmail хаяг руу нэвтрэх нэр, нууц үг автоматаар илгээгдэх болно.
                </p>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 text-left max-w-sm mx-auto space-y-1.5">
                  <div className="flex items-center space-x-1.5 font-bold">
                    <Clock className="w-4 h-4 text-amber-700" />
                    <span>Хүчинтэй хугацаа: 24 цаг</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Хэрэв 24 цагийн дотор зөвшөөрөгдөхгүй бол хүсэлт автоматаар цуцлагдах зарчимтай.
                  </p>
                </div>

                <div className="pt-2 flex justify-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('check')}
                    className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-colors cursor-pointer"
                  >
                    Хүсэлтийн төлөв шалгах
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-stone-100 text-stone-700 rounded-xl text-xs font-bold hover:bg-stone-200 transition-colors cursor-pointer"
                  >
                    Буцах
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {feedback && (
                  <div
                    className={`p-3 rounded-xl text-xs font-medium flex items-start space-x-2 ${
                      feedback.type === 'error'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{feedback.text}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Овог, нэр <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Жишээ: Д. Батбаяр"
                      className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Gmail хаяг <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Жишээ: bagsh@gmail.com"
                      className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-stone-500 mt-1">
                    Админ таны хүсэлтийг зөвшөөрөх үед энэхүү Gmail рүү нэвтрэх нэр, нууц үг очно.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Утасны дугаар (заавал биш)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="Холбоо барих утас (жишээ: 99xxxxxx)"
                      className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Сургууль / Байгууллага (заавал биш)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                      <School className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      placeholder="Жишээ: 1-р сургууль, Математикийн багш"
                      className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Хүсэлтийн зорилго / Тэмдэглэл
                  </label>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Материалуудыг ангидаа хэвлэж ашиглах хүсэлттэй байна..."
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  />
                </div>

                {/* 24-hour notice */}
                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start space-x-2.5 text-xs text-amber-900">
                  <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed">
                    <strong>24 цагийн хугацааны журам:</strong> Илгээсэн хүсэлтийг админ 24 цагийн дотор зөвшөөрөөгүй тохиолдолд системээс автоматаар цуцлагдана.
                  </div>
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Болих
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Хүсэлт илгээх</span>
                  </button>
                </div>
              </form>
            )
          ) : (
            /* Tab 2: Check status */
            <div className="space-y-4">
              <form onSubmit={handleCheckStatus} className="flex space-x-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={checkEmail}
                    onChange={(e) => setCheckEmail(e.target.value)}
                    placeholder="Gmail хаягаа оруулна уу"
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-colors cursor-pointer"
                >
                  Шалгах
                </button>
              </form>

              {checkedResult === 'not_found' && (
                <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl text-center space-y-1.5">
                  <p className="text-xs font-bold text-stone-700">Хүсэлт бүртгэгдээгүй байна</p>
                  <p className="text-[11px] text-stone-500">
                    Энэ Gmail хаягаар нэвтрэх хүсэлт илгээгдээгүй байна. Та "Шинэ хүсэлт илгээх" цэсээр орж хүсэлтээ илгээнэ үү.
                  </p>
                </div>
              )}

              {checkedResult && checkedResult !== 'not_found' && (
                <div className="border border-stone-200 rounded-xl p-4 bg-stone-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-stone-900">{checkedResult.fullName}</h4>
                      <p className="text-[11px] text-stone-500 flex items-center space-x-1 mt-0.5">
                        <Mail className="w-3 h-3 text-stone-400" />
                        <span>Gmail: {checkedResult.email}</span>
                      </p>
                    </div>

                    {checkedResult.status === 'pending' && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <Clock className="w-3 h-3" />
                        <span>Хүлээгдэж буй</span>
                      </span>
                    )}

                    {checkedResult.status === 'approved' && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Зөвшөөрөгдсөн</span>
                      </span>
                    )}

                    {checkedResult.status === 'expired' && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-stone-200 text-stone-700 border border-stone-300">
                        <AlertCircle className="w-3 h-3" />
                        <span>Хугацаа дууссан</span>
                      </span>
                    )}

                    {checkedResult.status === 'rejected' && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                        <ShieldAlert className="w-3 h-3" />
                        <span>Татгалзсан</span>
                      </span>
                    )}
                  </div>

                  {/* Pending state details */}
                  {checkedResult.status === 'pending' && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                      <div className="font-bold flex items-center space-x-1 text-amber-800">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Хугацаа: {formatRemainingTime(checkedResult.expiresAt)}</span>
                      </div>
                      <p className="text-[11px] text-amber-700 leading-relaxed">
                        Админ таны хүсэлтийг хянаж байна. Зөвшөөрөх үед таны <strong>{checkedResult.email}</strong> хаяг руу нэвтрэх нэр, нууц үг очих болно.
                      </p>
                    </div>
                  )}

                  {/* Approved state details */}
                  {checkedResult.status === 'approved' && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-2">
                      <div className="flex items-center space-x-1.5 font-bold text-emerald-900">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Нэвтрэх эрх олгогдлоо!</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-emerald-200 font-mono text-xs text-stone-800 space-y-1">
                        <div>Нэвтрэх нэр (Gmail): <strong>{checkedResult.email}</strong></div>
                        <div>Нэвтрэх нууц үг: <strong className="text-emerald-700">{checkedResult.generatedPassword}</strong></div>
                      </div>

                      {onAutoLogin && checkedResult.generatedPassword && (
                        <button
                          type="button"
                          onClick={() => {
                            onAutoLogin(checkedResult.email, checkedResult.generatedPassword!);
                            onClose();
                          }}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                        >
                          <span>Шууд нэвтрэх</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Expired state details */}
                  {checkedResult.status === 'expired' && (
                    <div className="p-3 bg-stone-100 border border-stone-200 rounded-xl text-xs text-stone-600 space-y-2">
                      <p className="text-[11px]">
                        24 цагийн дотор зөвшөөрөгдөөгүй тул хүсэлт цуцлагдсан байна.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setFullName(checkedResult.fullName);
                          setEmail(checkedResult.email);
                          setActiveTab('request');
                        }}
                        className="text-xs font-bold text-amber-700 hover:text-amber-900 cursor-pointer"
                      >
                        Шинээр дахин хүсэлт илгээх →
                      </button>
                    </div>
                  )}

                  {/* Rejected state details */}
                  {checkedResult.status === 'rejected' && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                      Админ таны хүсэлтийг шийдвэрлэн татгалзсан байна.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
