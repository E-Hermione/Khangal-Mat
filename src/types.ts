export type GradeNumber = 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface TheoryRule {
  id: string;
  title: string;
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
}

export interface TestQuestion {
  id: string;
  number: number;
  question: string;
  options?: string[];
  points: number;
  answer: string;
  solution?: string;
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

export type AccessRequestStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface AccessRequest {
  id: string;
  userId?: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  school?: string;
  note?: string;
  requestedAt: number;
  expiresAt: number;
  status: AccessRequestStatus;
  approvedAt?: number;
  generatedPassword?: string;
  emailSent?: boolean;
  emailSentAt?: number;
  emailSubject?: string;
  emailBody?: string;
  smsSent?: boolean;
  smsSentAt?: number;
  smsMessage?: string;
  requestedTopicId?: string;
  requestedTopicTitle?: string;
  requestType?: 'full_access' | 'topic_unlock';
}

export interface ApprovedAccount {
  userId?: string;
  email: string;
  username?: string;
  phoneNumber?: string;
  password: string;
  fullName: string;
  lastName?: string;
  firstName?: string;
  school?: string;
  // Chosen at self-registration: a student picks their grade, a teacher picks "Багш"
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
  updatedAt?: number;
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
