import { syncPracticeSolutions } from './practiceSolutions';
import { TopicPackage, GradeNumber, TheoryRule, WorkedExample, PracticeProblem, TestQuestion } from '../types';
import { INITIAL_TOPICS } from '../data/initialData';
import { cloud } from './cloud';


const LEGACY_STORAGE_KEY = 'mongolian_math_curriculum_v2';

// Older saves used long test titles; show them with the short level names.
function normalizeTestTitles(topic: TopicPackage): TopicPackage {
  const test1 = topic.test1 ? { ...topic.test1 } : topic.test1;
  const test2 = topic.test2 ? { ...topic.test2 } : topic.test2;
  const test3 = topic.test3 ? { ...topic.test3 } : topic.test3;
  let changed = false;

  if (test1 && (test1.title.includes('Сорил 1') || test1.title.includes('суурь чадвар') || test1.title.includes('Суурь чадвар') || test1.title.includes('Алгебрийн бутархайн суурь ойлголт') || test1.title.includes('Дискриминант ба шийдийн чанар'))) {
    test1.title = 'Анхан';
    changed = true;
  }
  if (test2 && (test2.title.includes('Сорил 2') || test2.title.includes('Стандарт хэрэглээ') || test2.title.includes('Стандарт квадрат тэгшитгэл бодох') || test2.title.includes('Олон гишүүнт агуулсан бутархайг хураах'))) {
    test2.title = 'Дунд';
    changed = true;
  }
  if (test3 && (test3.title.includes('Сорил 3') || test3.title.includes('Нийлмэл') || test3.title.includes('Параметр бүхий квадрат тэгшитгэл'))) {
    test3.title = 'Гүнзгий';
    changed = true;
  }
  return changed ? { ...topic, test1, test2, test3 } : topic;
}

/**
 * Topics saved in this browser by the pre-Firestore version of the app, if any.
 * Used once to seed Firestore from the admin's browser.
 */
export function readLegacyLocalTopics(): TopicPackage[] | null {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY) ?? localStorage.getItem('mongolian_math_curriculum_v1');
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) && parsed.length > 0 ? parsed.map(normalizeTestTitles) : null;
  } catch {
    return null;
  }
}

export const storageService = {
  getTopics(): TopicPackage[] {
    const topics = cloud.getTopics();
    // Until the admin's first sign-in seeds Firestore, show the built-in lessons
    return topics.length > 0 ? topics.map(normalizeTestTitles) : INITIAL_TOPICS;
  },

  saveTopics(topics: TopicPackage[]): void {
    cloud.replaceTopics(topics);
  },

  getTopicById(id: string): TopicPackage | undefined {
    const topics = this.getTopics();
    return topics.find((t) => t.id === id);
  },

  getTopicsByGrade(grade: GradeNumber): TopicPackage[] {
    const topics = this.getTopics();
    return topics.filter((t) => t.grade === grade);
  },

  saveTopic(topic: TopicPackage): void {
    cloud.setTopic(topic);
    // Users the admin opened the practice solutions for get the edited ones
    syncPracticeSolutions(topic).catch((err) => console.error('Practice solutions not refreshed', err));
  },

  deleteTopic(topicId: string): void {
    cloud.deleteTopic(topicId);
  },

  resetToDefaults(): TopicPackage[] {
    this.saveTopics(INITIAL_TOPICS);
    return INITIAL_TOPICS;
  },

  exportAsJSON(): string {
    const topics = this.getTopics();
    return JSON.stringify(topics, null, 2);
  },

  importFromJSON(jsonString: string): { success: boolean; count?: number; error?: string } {
    try {
      const data = JSON.parse(jsonString);
      if (!Array.isArray(data)) {
        return { success: false, error: 'Файлын бүтэц буруу байна (массив биш).' };
      }
      // Basic validation
      const valid = data.every((item) => item.id && item.grade && item.title && item.theory);
      if (!valid) {
        return { success: false, error: 'Сэдвийн бүтэц дутуу эсвэл буруу байна.' };
      }
      this.saveTopics(data);
      return { success: true, count: data.length };
    } catch {
      return { success: false, error: 'JSON файлыг уншихад алдаа гарлаа.' };
    }
  },
};
