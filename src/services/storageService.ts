import { TopicPackage, GradeNumber, TheoryRule, WorkedExample, PracticeProblem, TestQuestion } from '../types';
import { INITIAL_TOPICS } from '../data/initialData';

const STORAGE_KEY = 'mongolian_math_curriculum_v2';

export const storageService = {
  getTopics(): TopicPackage[] {
    try {
      let stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // Check if v1 exists and migrate
        const oldStored = localStorage.getItem('mongolian_math_curriculum_v1');
        if (oldStored) {
          try {
            const oldParsed = JSON.parse(oldStored);
            if (Array.isArray(oldParsed) && oldParsed.length > 0) {
              const migrated = oldParsed.map((topic: TopicPackage) => ({
                ...topic,
                test1: topic.test1 ? { ...topic.test1, title: 'Анхан' } : topic.test1,
                test2: topic.test2 ? { ...topic.test2, title: 'Дунд' } : topic.test2,
                test3: topic.test3 ? { ...topic.test3, title: 'Гүнзгий' } : topic.test3,
              }));
              localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
              return migrated;
            }
          } catch {
            // fallback
          }
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_TOPICS));
        return INITIAL_TOPICS;
      }
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return INITIAL_TOPICS;
      }

      // Check and update any old titles
      let hasChanges = false;
      const normalized = parsed.map((topic: TopicPackage) => {
        let topicChanged = false;
        const test1 = topic.test1 ? { ...topic.test1 } : topic.test1;
        const test2 = topic.test2 ? { ...topic.test2 } : topic.test2;
        const test3 = topic.test3 ? { ...topic.test3 } : topic.test3;

        if (test1 && (test1.title.includes('Сорил 1') || test1.title.includes('суурь чадвар') || test1.title.includes('Суурь чадвар') || test1.title.includes('Алгебрийн бутархайн суурь ойлголт') || test1.title.includes('Дискриминант ба шийдийн чанар'))) {
          test1.title = 'Анхан';
          topicChanged = true;
        }
        if (test2 && (test2.title.includes('Сорил 2') || test2.title.includes('Стандарт хэрэглээ') || test2.title.includes('Стандарт квадрат тэгшитгэл бодох') || test2.title.includes('Олон гишүүнт агуулсан бутархайг хураах'))) {
          test2.title = 'Дунд';
          topicChanged = true;
        }
        if (test3 && (test3.title.includes('Сорил 3') || test3.title.includes('Нийлмэл') || test3.title.includes('Параметр бүхий квадрат тэгшитгэл'))) {
          test3.title = 'Гүнзгий';
          topicChanged = true;
        }

        if (topicChanged) {
          hasChanges = true;
          return { ...topic, test1, test2, test3 };
        }
        return topic;
      });

      if (hasChanges) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      }

      return normalized;
    } catch {
      return INITIAL_TOPICS;
    }
  },

  saveTopics(topics: TopicPackage[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(topics));
    } catch (err) {
      console.error('Failed to save to localStorage:', err);
    }
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
    const topics = this.getTopics();
    const index = topics.findIndex((t) => t.id === topic.id);
    if (index >= 0) {
      topics[index] = topic;
    } else {
      topics.push(topic);
    }
    this.saveTopics(topics);
  },

  deleteTopic(topicId: string): void {
    const topics = this.getTopics().filter((t) => t.id !== topicId);
    this.saveTopics(topics);
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
