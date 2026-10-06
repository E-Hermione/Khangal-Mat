export type GradeNumber = 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface TheoryRule {
  id: string;
  title: string;
  // The grade this part belongs to (unset: the topic's own grade); higher grades are hidden from lower-grade students
  prerequisiteGrade?: number;
  ruleText: string;
  formula?: string;
  note?: string;
  badge?: string;
}

export interface WorkedExample {
  id: string;
  number: number;
  title?: string;
  problem: string;
  solutionSteps: string[];
  answer: string;
  prerequisiteGrade?: number;
}

export interface PracticeProblem {
  id: string;
  number: number;
  question: string;
  hint?: string;
  difficulty: DifficultyLevel;
  answer: string;
  solution?: string;
  workSpaceLines?: number;
  // The grade this exercise belongs to (unset: the topic's own grade)
  prerequisiteGrade?: number;
}

export interface TestQuestion {
  id: string;
  number: number;
  question: string;
  // The grade this question belongs to (unset: the topic's own grade); not shown to students
  prerequisiteGrade?: number;
  options?: string[];
  points: number;
  answer: string;
  solution?: string;
  // Hashed answer key used for grading when the plain answer is withheld (see services/answers.ts)
  answerHash?: string;
  workSpaceLines?: number;
}

export interface TestPackage {
  id: string;
  testNumber: 1 | 2 | 3;
  title: string;
  subtitle: string;
  targetSkills: string;
  totalPoints: number;
  questions: TestQuestion[];
}

export interface TopicPackage {
  id: string;
  grade: GradeNumber;
  visibleGrades?: GradeNumber[]; // Support displaying in multiple grades (6, 7, 8, etc.)
  // A subtopic sits under this topic (the parent then groups its subtopics in the topic list)
  parentId?: string;
  // Position among its siblings in the topic list
  order?: number;
  category: string;
  title: string;
  code?: string;
  description: string;
  prerequisiteNotice?: string;
  theory: TheoryRule[];
  examples: WorkedExample[];
  practice: PracticeProblem[];
  test1: TestPackage;
  test2: TestPackage;
  test3: TestPackage;
  generalAnswersNote?: string;
}

export interface PrintSectionsSelection {
  theory: boolean;
  examples: boolean;
  practice: boolean;
  test1: boolean;
  test2: boolean;
  test3: boolean;
  answers: boolean;
}

export interface PrintOptions {
  includeWorkSpace: boolean;
  teacherVersion: boolean;
  fontSize: 'sm' | 'md' | 'lg';
  twoColumnPractice: boolean;
}

export interface GradeCategory {
  id: string;
  name: string;
  description: string;
}

export interface LoggedInDevice {
  id: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  ip: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
  phoneNumber?: string;
  email?: string;
}

export interface AuthUser {
  userId?: string;
  phoneNumber?: string;
  email?: string;
  username?: string;
  name?: string;
  role: 'teacher' | 'admin';
  loggedInAt: string;
  deviceId: string;
}

export interface ApprovedAccount {
  uid?: string;
  userId?: string;
  email: string;
  username?: string;
  phoneNumber?: string;
  password?: string;
  fullName: string;
  lastName?: string;
  firstName?: string;
  school?: string;
  // Chosen at self-registration (older accounts may say teacher; everyone is treated as a student)
  accountType?: 'student' | 'teacher';
  grades?: GradeNumber[];
  approvedAt: number;
  active: boolean;
}

export interface UserPermissions {
  userId: string;
  allowedGrades: GradeNumber[];
  sections: {
    theory: boolean;
    examples: boolean;
    practice: boolean;
    exams: boolean;
  };
  accessMode: 'visible' | 'locked';
  isBlocked?: boolean;
  // Access ends after this moment (ms); null/undefined means no time limit
  expiresAt?: number | null;
  updatedAt?: number;
  // Every change the admin made, oldest first (kept inside the permissions document)
  history?: PermissionHistoryEntry[];
}

export interface PermissionHistoryEntry {
  at: number;
  // 'permissions': the permissions below were granted; 'account': the account was blocked/unblocked
  kind: 'permissions' | 'account';
  allowedGrades?: GradeNumber[];
  sections?: UserPermissions['sections'];
  accessMode?: UserPermissions['accessMode'];
  isBlocked?: boolean;
  expiresAt?: number | null;
  active?: boolean;
}

export interface DefaultPermissionsConfig {
  allowedGrades: GradeNumber[];
  sections: {
    theory: boolean;
    examples: boolean;
    practice: boolean;
    exams: boolean;
  };
  defaultAccessMode: 'visible' | 'locked';
}

// Profile stored in Firestore users/{uid}, created by the completeRegistration function
export interface UserProfile {
  uid: string;
  userId: string;
  email: string;
  phoneNumber: string;
  lastName: string;
  firstName: string;
  fullName: string;
  school: string;
  accountType: 'student' | 'teacher';
  grades: GradeNumber[];
  active: boolean;
  createdAt: number;
}
