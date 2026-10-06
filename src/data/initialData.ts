import { TopicPackage, GradeNumber } from '../types';

export interface GradeMeta {
  grade: GradeNumber;
  title: string;
  category: string;
  topicCount: number;
}

export const GRADES_LIST: GradeNumber[] = [6, 7, 8, 9, 10, 11, 12];

export const GRADE_TOPICS_CATALOG: Record<GradeNumber, { id: string; title: string; category: string; hasFullPackage: boolean }[]> = {
  6: [
    { id: 'g6-divisibility', title: 'Хуваагдах шинж', category: 'Тоо ба тоолол', hasFullPackage: true },
    { id: 'g6-natural-numbers', title: 'Натурал тоо', category: 'Тоо ба тоолол', hasFullPackage: false },
    { id: 'g6-factors-multiples', title: 'Хуваагч ба үржвэр', category: 'Тоо ба тоолол', hasFullPackage: false },
    { id: 'g6-prime-numbers', title: 'Анхны тоо ба зохиомол тоо', category: 'Тоо ба тоолол', hasFullPackage: false },
    { id: 'g6-gcd-lcm', title: 'ХИЕХ ба ХБЕХ', category: 'Тоо ба тоолол', hasFullPackage: false },
    { id: 'g6-common-fractions', title: 'Энгийн бутархай', category: 'Тоо ба тоолол', hasFullPackage: false },
    { id: 'g6-decimal-fractions', title: 'Аравтын бутархай', category: 'Тоо ба тоолол', hasFullPackage: false },
    { id: 'g6-ratio-proportion', title: 'Харьцаа ба пропорц', category: 'Харилцан хамаарал', hasFullPackage: false },
    { id: 'g6-algebraic-expr', title: 'Алгебрийн илэрхийлэл', category: 'Алгебр', hasFullPackage: false },
    { id: 'g6-equations', title: 'Тэгшитгэл бодох', category: 'Алгебр', hasFullPackage: false },
    { id: 'g6-geometry', title: 'Хавтгайн геометр дүрсүүд', category: 'Геометр', hasFullPackage: false },
    { id: 'g6-statistics', title: 'Статистик ба өгөгдөл', category: 'Магадлал ба статистик', hasFullPackage: false },
  ],
  7: [
    { id: 'g7-rational-numbers', title: 'Рационал тоо ба сөрөг тоо', category: 'Тоо ба тоолол', hasFullPackage: false },
    { id: 'g7-fraction-operations', title: 'Энгийн ба аравтын бутархайн үйлдлүүд', category: 'Тоо ба тоолол', hasFullPackage: true },
    { id: 'g7-powers', title: 'Зэрэг ба түүний чанар', category: 'Алгебр', hasFullPackage: false },
    { id: 'g7-monomials-polynomials', title: 'Нэг гишүүнт ба олон гишүүнт', category: 'Алгебр', hasFullPackage: false },
    { id: 'g7-linear-equations', title: 'Нэг хувьсагчтай шугаман тэгшитгэл', category: 'Алгебр', hasFullPackage: false },
    { id: 'g7-angles-triangles', title: 'Өнцөг ба гурвалжин', category: 'Геометр', hasFullPackage: false },
    { id: 'g7-coordinates', title: 'Тэгш өнцөгт координатын систем', category: 'Харилцан хамаарал', hasFullPackage: false },
  ],
  8: [
    { id: 'g8-algebraic-fractions', title: 'Алгебрийн бутархай', category: 'Алгебр', hasFullPackage: true },
    { id: 'g8-square-roots', title: 'Арифметик квадрат язгуур', category: 'Тоо ба тоолол', hasFullPackage: false },
    { id: 'g8-polynomial-factoring', title: 'Олон гишүүнтийг үржигдэхүүн болгон задлах', category: 'Алгебр', hasFullPackage: false },
    { id: 'g8-systems-equations', title: 'Хоёр хувьсагчтай шугаман тэгшитгэлийн систем', category: 'Алгебр', hasFullPackage: false },
    { id: 'g8-inequalities', title: 'Нэг хувьсагчтай шугаман тэнцэтгэл биш', category: 'Алгебр', hasFullPackage: false },
    { id: 'g8-pythagoras', title: 'Пифагорын теорем', category: 'Геометр', hasFullPackage: false },
    { id: 'g8-quadrilaterals', title: 'Дөрвөн өнцөгт ба тэдгээрийн шинж чанар', category: 'Геометр', hasFullPackage: false },
  ],
  9: [
    { id: 'g9-quadratic-equations', title: 'Квадрат тэгшитгэл', category: 'Алгебр', hasFullPackage: true },
    { id: 'g9-vieta-theorem', title: 'Виетийн теорем ба хэрэглээ', category: 'Алгебр', hasFullPackage: false },
    { id: 'g9-quadratic-functions', title: 'Квадрат функц $y = ax^2 + bx + c$', category: 'Функц ба хамаарал', hasFullPackage: false },
    { id: 'g9-circle-geometry', title: 'Тойрог ба багтсан, багтаасан өнцөг', category: 'Геометр', hasFullPackage: false },
    { id: 'g9-trigonometry-intro', title: 'Тэгш өнцөгт гурвалжны тригонометр харьцаа', category: 'Геометр', hasFullPackage: false },
    { id: 'g9-probability', title: 'Нийлмэл үзэгдлийн магадлал', category: 'Магадлал ба статистик', hasFullPackage: false },
  ],
  10: [
    { id: 'g10-functions-graphs', title: 'Функц ба түүний шинж чанар', category: 'Функц ба анализ', hasFullPackage: true },
    { id: 'g10-vectors', title: 'Хавтгайн векторууд', category: 'Геометр ба векторууд', hasFullPackage: false },
    { id: 'g10-combinatorics', title: 'Комбинаторикийн үндсэн зарчмууд', category: 'Магадлал ба тоолол', hasFullPackage: false },
    { id: 'g10-sequences', title: 'Арифметик ба геометр прогресс', category: 'Дараалал', hasFullPackage: false },
  ],
  11: [
    { id: 'g11-trig-formulas', title: 'Тригонометр илэрхийлэл ба тэгшитгэл', category: 'Тригонометр', hasFullPackage: true },
    { id: 'g11-exponential-log', title: 'Илтгэгч ба логарифм тэгшитгэл', category: 'Алгебр ба анализ', hasFullPackage: false },
    { id: 'g11-derivative-intro', title: 'Функцийн уламжлалын үндэс', category: 'Математик анализ', hasFullPackage: false },
    { id: 'g11-stereometry', title: 'Огторгуйн геометр', category: 'Геометр', hasFullPackage: false },
  ],
  12: [
    { id: 'g12-integrals', title: 'Интеграл ба уламжлалын хэрэглээ', category: 'Математик анализ', hasFullPackage: true },
    { id: 'g12-complex-numbers', title: 'Комплекс тоо', category: 'Тооны онол ба алгебр', hasFullPackage: false },
    { id: 'g12-eys-prep', title: 'ЭЕШ-д бэлтгэх холимог сэдэв', category: 'Нэгдсэн сорил', hasFullPackage: false },
  ],
};

// Lessons are kept in Firestore only (and protected there): none ship with the site's code, which
// anyone can download.
export const INITIAL_TOPICS: TopicPackage[] = [];
