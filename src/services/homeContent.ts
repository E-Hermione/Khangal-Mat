import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { getDb } from './firebase';

/** Texts on the home page the admin can edit (settings/home). */
export interface HomeContent {
  intro: string;
  lessonsTitle: string;
  lessonsText: string;
  placementTitle: string;
  placementText: string;
  examsTitle: string;
  examsText: string;
  accessTitle: string;
  accessText: string;
}

export const DEFAULT_HOME_CONTENT: HomeContent = {
  intro: '',
  lessonsTitle: 'Хичээл',
  lessonsText: 'Онол, жишээ, дасгалтай сэдвүүд.',
  placementTitle: 'Түвшин тогтоох сорил',
  placementText: 'Ангиа сонгоод сорилоо өгнө. Анги бүрийнх нэг удаа.',
  examsTitle: 'Сэдэвчилсэн сорил',
  examsText: 'Сэдэв бүр дээр Анхан → Дунд → Ахисан. 85%-иас дээш авбал дараагийн шат нээгдэнэ.',
  accessTitle: 'Эрх авах',
  accessText: 'Түвшин тогтоох сорил өгсний дараа төлбөрөө төлж хичээлийн эрх авна.',
};

export function useHomeContent(): HomeContent {
  const [content, setContent] = useState<HomeContent>(DEFAULT_HOME_CONTENT);
  useEffect(
    () =>
      onSnapshot(
        doc(getDb(), 'settings', 'home'),
        (snap) => setContent({ ...DEFAULT_HOME_CONTENT, ...(snap.data() as Partial<HomeContent> | undefined) }),
        (err) => console.error('Home page texts failed to load', err)
      ),
    []
  );
  return content;
}

export async function saveHomeContent(patch: Partial<HomeContent>): Promise<void> {
  await setDoc(doc(getDb(), 'settings', 'home'), patch, { merge: true });
}
