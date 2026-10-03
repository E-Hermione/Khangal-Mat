import { GradeNumber, TestPackage } from '../types';

// Fallback test generator for any catalog topic that doesn't have custom test definitions
export function generateTopicTests(
  topicId: string,
  topicTitle: string,
  grade: GradeNumber,
  category?: string
): { test1: TestPackage; test2: TestPackage; test3: TestPackage } {
  const cat = category || 'Математик';

  const test1: TestPackage = {
    id: `t1-${topicId}`,
    testNumber: 1,
    title: 'Анхан',
    subtitle: `${topicTitle} - Анхан шатны сорил тест`,
    targetSkills: `${cat} • Суурь ойлголт, тодорхойлолт ба энгийн бодлогууд`,
    totalPoints: 10,
    questions: [
      {
        id: `t1-${topicId}-q1`,
        number: 1,
        question: `«${topicTitle}» сэдвийн хүрээнд $2a + 3b$ илэрхийллийн утгыг ол, энд $a=4, b=2$.`,
        options: ['14', '12', '16', '10'],
        points: 3,
        answer: 'A',
        solution: '$2 \\times 4 + 3 \\times 2 = 8 + 6 = 14$. Суурь үйлдлийн дарааллаар үржүүлэх үйлдлийг эхэлж гүйцэтгэнэ. Зөв хариу нь A (14).',
      },
      {
        id: `t1-${topicId}-q2`,
        number: 2,
        question: `«${topicTitle}» сэдвийн хүрээнд дараах өгүүлбэрүүдээс ҮНЭН чанарыг сонго:`,
        options: ['$x + 0 = x$', '$x \\times 0 = x$', '$x - x = 1$', '$x \\div 1 = 0$'],
        points: 3,
        answer: 'A',
        solution: 'Аливаа бодит тоон дээр 0-ийг нэмэхэд уг тоо өөрөө гарна: $x + 0 = x$. Бусад хувилбарууд нь буруу байна. Зөв хариу нь A.',
      },
      {
        id: `t1-${topicId}-q3`,
        number: 3,
        question: `$3x = 24$ тэгшитгэлийн шийдийг ол.`,
        options: ['6', '7', '8', '9'],
        points: 4,
        answer: 'C',
        solution: 'Тэгшитгэлийн хоёр талыг 3-т хуваавал: $x = \\frac{24}{3} = 8$. Зөв хариу нь C (8).',
      },
    ],
  };

  const test2: TestPackage = {
    id: `t2-${topicId}`,
    testNumber: 2,
    title: 'Үндсэн (Дунд)',
    subtitle: `${topicTitle} - Үндсэн түвшний сорил тест`,
    targetSkills: `${cat} • Алгоритм хэрэглэх, хувиргалт хийх, тэгшитгэл бодох`,
    totalPoints: 15,
    questions: [
      {
        id: `t2-${topicId}-q1`,
        number: 1,
        question: `«${topicTitle}» сэдвээр $3(2x - 5) - 4(x - 2)$ илэрхийллийг хялбарчил:`,
        options: ['$2x - 7$', '$2x - 23$', '$10x - 7$', '$2x + 7$'],
        points: 5,
        answer: 'A',
        solution: 'Хаалтыг задалбал: $6x - 15 - 4x + 8 = (6x - 4x) + (-15 + 8) = 2x - 7$. Зөв хариу нь A ($2x - 7$).',
      },
      {
        id: `t2-${topicId}-q2`,
        number: 2,
        question: `$4x + 7 = 2x + 19$ тэгшитгэлийг бодож, $x$-ийн утгыг ол:`,
        options: ['4', '5', '6', '7'],
        points: 5,
        answer: 'C',
        solution: 'Хувьсагчтай гишүүдийг зүүн талд, сул тоонуудыг баруун талд гаргавал: $4x - 2x = 19 - 7 \\implies 2x = 12 \\implies x = 6$. Зөв хариу нь C (6).',
      },
      {
        id: `t2-${topicId}-q3`,
        number: 3,
        question: `$x^2 - 5x + 6 = 0$ тэгшитгэлийн язгууруудын нийлбэрийг ол:`,
        options: ['-5', '5', '6', '-6'],
        points: 5,
        answer: 'B',
        solution: 'Виетийн теоремоор $x_1 + x_2 = -(-5) = 5$. Зөв хариу нь B (5).',
      },
    ],
  };

  const test3: TestPackage = {
    id: `t3-${topicId}`,
    testNumber: 3,
    title: 'Ахисан түвшин',
    subtitle: `${topicTitle} - Ахисан түвшний сорил тест`,
    targetSkills: `${cat} • Олон алхамт логик дүгнэлт, хэрэглээ ба баталгаа`,
    totalPoints: 20,
    questions: [
      {
        id: `t3-${topicId}-q1`,
        number: 1,
        question: `Хэрэв $a + b = 6$ ба $ab = 7$ бол $a^2 + b^2$ утгыг ол:`,
        options: ['20', '22', '24', '36'],
        points: 6,
        answer: 'B',
        solution: 'Бүтэн квадратын томьёогоор: $(a+b)^2 = a^2 + 2ab + b^2$. Иймд $a^2 + b^2 = (a+b)^2 - 2ab = 6^2 - 2(7) = 36 - 14 = 22$. Зөв хариу нь B (22).',
      },
      {
        id: `t3-${topicId}-q2`,
        number: 2,
        question: `Аливаа бодит $x$-ийн хувьд $f(x) = x^2 - 4x + 9$ илэрхийллийн авч болох ХАМГИЙН БАГА утгыг ол:`,
        options: ['3', '4', '5', '9'],
        points: 7,
        answer: 'C',
        solution: 'Бүтэн квадрат ялгавал: $x^2 - 4x + 9 = (x - 2)^2 - 4 + 9 = (x - 2)^2 + 5 \\ge 5$. Хамгийн бага утга нь $5$. Зөв хариу нь C (5).',
      },
      {
        id: `t3-${topicId}-q3`,
        number: 3,
        question: `$n^3 - n$ илэрхийлэл ямар ч натурал $n$-ийн хувьд ямар тоонд үргэлж хуваагдах вэ?`,
        options: ['4', '5', '6', '8'],
        points: 7,
        answer: 'C',
        solution: 'Үржигдэхүүн болгон задалбал: $n^3 - n = n(n^2 - 1) = (n-1)n(n+1)$ нь дараалсан 3 тооны үржвэр тул 2 ба 3-т зэрэг хуваагдаж, улмаар 6-д үргэлж хуваагдана. Зөв хариу нь C (6).',
      },
    ],
  };

  return { test1, test2, test3 };
}
