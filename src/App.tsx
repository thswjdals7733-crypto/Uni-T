/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useEffect, ReactNode } from 'react';
import { motion } from 'motion/react';
import ParentReportPage, { ReportData } from './components/ParentReportPage';
import { Settings, Eye, Plus, Trash2, MessageSquare, AlertTriangle, ExternalLink, Sparkles, Save, LogOut, Search, Calendar, Clock, Award, TrendingUp, BookOpen, Lightbulb, CheckCircle2, ChevronDown, User } from 'lucide-react';
import { db, auth } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc,
  onSnapshot, 
  getDoc, 
  deleteDoc,
  query, 
  getDocs,
  getDocFromServer
} from 'firebase/firestore';
import { 
  signInAnonymously, 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut 
} from 'firebase/auth';
import { GoogleGenAI } from "@google/genai";

// --- AI Service ---
const generateAIInsight = async (reportData: ReportData, history: ReportData[] = [], customApiKey?: string) => {
  try {
    const apiKey = (customApiKey && customApiKey.trim() !== "") ? customApiKey : (import.meta.env.VITE_GEMINI_API_KEY as string);
    
    if (!apiKey || apiKey === "undefined" || apiKey.trim() === "") {
      console.error("Gemini API Key is missing or undefined.");
      return "AI 분석을 위한 API 키가 설정되지 않았습니다. 상단 '관리자 설정' 버튼을 눌러 본인의 Gemini API 키를 입력해주세요. (AI Studio에서 발급 가능)";
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Format history for the prompt
    const historyContext = history.length > 0 
      ? `
        [이전 학습 이력]
        ${history.map(h => `
        - ${h.selectedWeek}:
          * 테스트 점수: ${h.performance.testScore}점
          * 학습 내용: ${h.feedback.weeklyContent}
          * 튜터 피드백: ${h.feedback.extraFeedback}
        `).join('\n')}
      ` 
      : "이전 학습 이력이 없습니다.";

    const prompt = `
      학생 이름: ${reportData.studentName}
      
      ${historyContext}

      [이번 주 (${reportData.selectedWeek}) 데이터 - 메인 분석 대상]
      주간 테스트 점수: ${reportData.performance.testScore}점
      학습 역량 (0-100):
      - 과제 수행: ${reportData.competency.homework} (${reportData.competency.homeworkLevel})
      - 수업 이해: ${reportData.competency.understanding} (${reportData.competency.understandingLevel})
      - 수업 집중: ${reportData.competency.concentration} (${reportData.competency.concentrationLevel})
      
      주간 학습 요약:
      - 이번 주 학습 내용: ${reportData.feedback.weeklyContent}
      - 과제 및 테스트 예고: ${reportData.feedback.homeworkNotice}
      - 다음 주 수업 안내: ${reportData.feedback.nextClassNotice}
      - 추가 보충 내용: ${reportData.feedback.extraFeedback}
      
      위 데이터를 바탕으로 학생의 이번 주 학습 성과를 분석하고, 학부모님께 전달할 따뜻하고 전문적인 'AI LEARNING INSIGHT'를 2-3문장으로 작성해줘. 
      
      지침:
      1. 이번 주 내용을 중심으로 작성하되, 이전 이력이 있다면 성적 추이나 학습 태도의 변화를 언급하여 종합적인 성장을 보여줘.
      2. 학생의 강점을 칭찬하고 보완할 점을 부드럽게 제안하는 어조로 작성해줘.
      3. 학부모님이 학생의 학습 흐름을 한눈에 파악할 수 있도록 전문적이면서도 다정한 톤을 유지해줘.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text.trim() || "분석 결과를 생성할 수 없습니다.";
  } catch (error: any) {
    console.error("AI Insight Generation Error:", error);
    return `AI 분석 호출 실패: ${error?.message || "알 수 없는 오류"}. API 키가 유효한지 확인해주세요.`;
  }
};

const refineTextWithAI = async (fieldName: string, text: string, customApiKey?: string) => {
  try {
    const apiKey = (customApiKey && customApiKey.trim() !== "") ? customApiKey : (import.meta.env.VITE_GEMINI_API_KEY as string);
    
    if (!apiKey || apiKey === "undefined" || apiKey.trim() === "") {
      alert("AI 기능을 사용하려면 API 키 설정이 필요합니다. 관리자 설정에서 키를 등록해주세요.");
      return text;
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
      대상 필드: ${fieldName}
      입력 텍스트: ${text}
      
      위 텍스트를 바탕으로, 학부모님께 전달할 리포트용 문장으로 정중하고 전문적이게 다듬어줘. 
      내용이 너무 짧다면 적절한 격려나 안내 문구를 추가해서 풍성하게 만들어줘.
      결과는 다듬어진 텍스트만 출력해줘.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text.trim() || text;
  } catch (error: any) {
    console.error("AI Refinement Error:", error);
    alert(`AI 문장 다듬기 실패: ${error?.message || "알 수 없는 오류"}`);
    return text;
  }
};

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  if (errInfo.error.includes("Missing or insufficient permissions")) {
    alert("저장 권한이 없습니다.\n\n비밀번호만으로는 서버 저장이 불가능합니다. '구글 로그인'을 통해 관리자 인증을 완료해주세요.");
  }
  
  throw new Error(JSON.stringify(errInfo));
}

// --- Error Boundary ---
class ErrorBoundary extends (React.Component as any) {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let message = "문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error.includes("Missing or insufficient permissions")) {
          message = "권한이 없습니다. 관리자 로그인이 필요할 수 있습니다.";
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-slate-200">
            <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">오류 발생</h2>
            <p className="text-slate-600 mb-6">{message}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all"
            >
              새로고침
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const INITIAL_WEEKS = [
  "2026년 3월 1주차",
  "2026년 2월 4주차",
  "2026년 2월 3주차",
  "2026년 2월 2주차"
];

const DEFAULT_REPORT_TEMPLATE = (studentId: string, studentName: string, week: string): ReportData => ({
  studentId,
  studentName,
  selectedWeek: week,
  availableWeeks: [], // Will be filled dynamically
  attendance: {
    status: "정상 출석",
    note: "수업에 성실히 참여했습니다.",
    dismissTime: "18:30"
  },
  performance: {
    testScore: 0
  },
  analysis: {
    topic: "학습 주제를 입력하세요",
    myScore: 0,
    averageScore: 0
  },
  trend: [
    { week: "1주", myScore: 0, avgScore: 0 }
  ],
  feedback: {
    weeklyContent: "이번 주 학습 내용을 입력하세요.",
    homeworkNotice: "과제 내용을 입력하세요.",
    nextClassNotice: "다음 수업 안내를 입력하세요.",
    extraFeedback: ""
  },
  competency: {
    homework: 80,
    understanding: 80,
    concentration: 80,
    homeworkLevel: "우수",
    understandingLevel: "우수",
    concentrationLevel: "우수"
  },
  aiInsight: "학습 데이터를 바탕으로 한 AI 분석 내용입니다.",
  parentFeedback: ""
});

const INITIAL_REPORTS: Record<string, Record<string, ReportData>> = {
  "ST1001": {
    "2026년 3월 1주차": {
      studentId: "ST1001",
      studentName: "김지우",
      selectedWeek: "2026년 3월 1주차",
      availableWeeks: INITIAL_WEEKS,
      attendance: {
        status: "정상 출석",
        note: "지각/결석 없이 모든 수업에 성실히 참여했습니다.",
        dismissTime: "18:30"
      },
      performance: {
        testScore: 92
      },
      analysis: {
        topic: "이차함수의 그래프와 활용",
        myScore: 92,
        averageScore: 78
      },
      trend: [
        { week: "2월 2주", myScore: 85, avgScore: 72 },
        { week: "2월 3주", myScore: 88, avgScore: 74 },
        { week: "2월 4주", myScore: 82, avgScore: 75 },
        { week: "3월 1주", myScore: 92, avgScore: 78 }
      ],
      feedback: {
        weeklyContent: "이번 주에는 이차함수의 표준형과 일반형 사이의 관계를 학습했습니다. 특히 그래프의 꼭짓점과 축의 방정식을 구하는 과정에서 계산 실수가 줄어들고 논리적인 풀이 과정을 보여주었습니다.",
        homeworkNotice: "다음 주 월요일까지 워크북 42~50페이지 풀이 및 오답 정리가 과제입니다. 수요일에는 이차함수 단원 종합 테스트가 예정되어 있습니다.",
        nextClassNotice: "다음 주부터는 '이차함수의 최대와 최소' 단원을 시작합니다. 실생활 활용 문제가 많이 등장하므로 개념 이해에 집중할 예정입니다.",
        extraFeedback: "지우는 수업 시간 중 질문이 매우 구체적이고 날카로워졌습니다. 스스로 원리를 파악하려는 노력이 돋보입니다."
      },
      competency: {
        homework: 95,
        understanding: 88,
        concentration: 92,
        homeworkLevel: "매우 우수",
        understandingLevel: "우수",
        concentrationLevel: "매우 우수"
      },
      aiInsight: "최근 4주간의 성적 추이를 분석한 결과, 지우는 기하학적 직관력이 뛰어납니다. 함수 그래프를 시각화하여 이해하는 능력을 더욱 발전시킨다면 고난도 킬러 문항 정복이 가능할 것으로 보입니다."
    },
    "2026년 2월 4주차": {
      studentId: "ST1001",
      studentName: "김지우",
      selectedWeek: "2026년 2월 4주차",
      availableWeeks: INITIAL_WEEKS,
      attendance: {
        status: "지각 (1회)",
        note: "교통 사정으로 인해 월요일 수업에 10분 지각하였습니다. 이후 수업은 정상 참여했습니다.",
        dismissTime: "18:35"
      },
      performance: {
        testScore: 82
      },
      analysis: {
        topic: "이차방정식의 근과 계수의 관계",
        myScore: 82,
        averageScore: 75
      },
      trend: [
        { week: "2월 1주", myScore: 80, avgScore: 70 },
        { week: "2월 2주", myScore: 85, avgScore: 72 },
        { week: "2월 3주", myScore: 88, avgScore: 74 },
        { week: "2월 4주", myScore: 82, avgScore: 75 }
      ],
      feedback: {
        weeklyContent: "이차방정식의 근과 계수의 관계를 활용하여 복잡한 식의 값을 구하는 연습을 했습니다. 공식 암기는 잘 되어 있으나, 문제 적용 시 부호 실수에 주의가 필요합니다.",
        homeworkNotice: "이차함수 예습 프린트 1~3페이지가 과제입니다.",
        nextClassNotice: "다음 주부터는 본격적으로 이차함수의 그래프를 그리는 방법을 배웁니다.",
        extraFeedback: "오답 노트를 꼼꼼히 작성하는 습관이 잡히고 있습니다."
      },
      competency: {
        homework: 90,
        understanding: 75,
        concentration: 85,
        homeworkLevel: "우수",
        understandingLevel: "보통",
        concentrationLevel: "우수"
      },
      aiInsight: "연산 실수가 잦은 편입니다. 풀이 과정을 한 줄씩 정갈하게 쓰는 연습을 병행하면 점수 향상이 기대됩니다."
    }
  }
};

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}

function MainApp() {
  // Get student ID from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const studentIdFromUrl = urlParams.get('id');
  const weekFromUrl = urlParams.get('week');

  const [reports, setReports] = useState<Record<string, Record<string, ReportData>>>(INITIAL_REPORTS);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isMigrating, setIsMigrating] = useState(false);

  // Auth setup
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        signInAnonymously(auth).catch(console.error);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    try {
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email;
      
      // Check if primary admin or in admin_emails list
      const isAdmin = email === "thswjdals7733@gmail.com" || adminEmails.some(a => a.email === email);
      
      if (isAdmin) {
        setIsEditMode(true);
        alert(`${result.user.displayName} 선생님, 환영합니다! 이제 서버 저장이 활성화되었습니다.`);
      } else {
        // Double check Firestore just in case state hasn't updated
        const adminDoc = await getDoc(doc(db, 'admin_emails', email || ""));
        if (adminDoc.exists()) {
          setIsEditMode(true);
          alert(`${result.user.displayName} 선생님, 환영합니다! 이제 서버 저장이 활성화되었습니다.`);
        } else {
          alert(`관리자 권한이 없는 계정입니다: ${email}\n\n관리자에게 권한 요청을 하시거나, 등록된 계정으로 로그인해주세요.`);
          await signOut(auth);
        }
      }
    } catch (error: any) {
      console.error("Detailed Login Error:", error);
      
      let msg = `로그인 실패 (${error.code})\n\n원인: ${error.message}`;
      
      if (error.code === 'auth/popup-blocked') {
        msg = "브라우저에서 팝업이 차단되었습니다.\n\n주소창 오른쪽의 '팝업 차단' 아이콘을 눌러 허용해주시거나, 아래의 '새 탭에서 열기' 버튼을 눌러주세요.";
      } else if (error.code === 'auth/unauthorized-domain') {
        msg = "Firebase 설정에서 현재 도메인이 승인되지 않았습니다.\n\nFirebase 콘솔 > Authentication > Settings > Authorized domains에 아래 주소를 추가해주세요:\n" + window.location.hostname;
      } else if (error.code === 'auth/cancelled-popup-request') {
        return;
      } else {
        msg += "\n\n팁: 화면 하단의 '새 탭에서 열기' 버튼을 눌러 시도하면 대부분 해결됩니다.";
      }
      
      alert(msg);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsEditMode(false);
      alert("로그아웃 되었습니다.");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Data Migration: LocalStorage -> Firestore
  useEffect(() => {
    if (!isAuthReady || isMigrating) return;

    const migrate = async () => {
      const saved = localStorage.getItem('uni_t_reports');
      if (saved) {
        setIsMigrating(true);
        try {
          const parsed = JSON.parse(saved);
          const studentIds = Object.keys(parsed);
          
          for (const sId of studentIds) {
            // Check if student exists in Firestore
            const studentDoc = await getDoc(doc(db, 'students', sId));
            if (!studentDoc.exists()) {
              const studentName = parsed[sId][Object.keys(parsed[sId])[0]]?.studentName || "알 수 없음";
              await setDoc(doc(db, 'students', sId), { studentId: sId, studentName });
              
              const weeks = Object.keys(parsed[sId]);
              for (const week of weeks) {
                await setDoc(doc(db, 'students', sId, 'reports', week), parsed[sId][week]);
              }
            }
          }
          // After migration, we can clear or keep localStorage as backup
          // localStorage.removeItem('uni_t_reports'); 
        } catch (e) {
          console.error("Migration failed:", e);
        } finally {
          setIsMigrating(false);
        }
      }
    };

    migrate();
  }, [isAuthReady]);

  // Sync with Firestore
  useEffect(() => {
    if (!isAuthReady) return;

    // 1. Listen to the specific student from URL if present (Priority)
    let unsubSpecific: (() => void) | null = null;
    if (studentIdFromUrl) {
      const reportsRef = collection(db, 'students', studentIdFromUrl, 'reports');
      unsubSpecific = onSnapshot(reportsRef, (snapshot) => {
        setReports(prev => {
          const newReports = { ...prev };
          if (!newReports[studentIdFromUrl]) newReports[studentIdFromUrl] = {};
          snapshot.docs.forEach(doc => {
            newReports[studentIdFromUrl][doc.id] = doc.data() as ReportData;
          });
          return newReports;
        });
      });
    }

    // 2. Listen to all students (for admin view)
    const studentsRef = collection(db, 'students');
    const unsubStudents = onSnapshot(studentsRef, (snapshot) => {
      snapshot.docs.forEach(studentDoc => {
        const studentId = studentDoc.id;
        // Skip if already listening specifically
        if (studentId === studentIdFromUrl) return;

        const reportsRef = collection(db, 'students', studentId, 'reports');
        onSnapshot(reportsRef, (reportSnapshot) => {
          setReports(prev => {
            const newReports = { ...prev };
            if (!newReports[studentId]) newReports[studentId] = {};
            reportSnapshot.docs.forEach(doc => {
              newReports[studentId][doc.id] = doc.data() as ReportData;
            });
            return newReports;
          });
        });
      });
    });

    return () => {
      if (unsubSpecific) unsubSpecific();
      unsubStudents();
    };
  }, [isAuthReady, studentIdFromUrl]);

  // Determine initial current student
  const getInitialStudent = () => {
    if (studentIdFromUrl) return studentIdFromUrl;
    return Object.keys(reports)[0] || "ST1001";
  };

  const [currentStudent, setCurrentStudent] = useState(getInitialStudent);
  const [currentWeek, setCurrentWeek] = useState(() => {
    if (weekFromUrl) return weekFromUrl;
    const studentData = reports[getInitialStudent()] || {};
    return Object.keys(studentData).sort().reverse()[0] || INITIAL_WEEKS[0];
  });

  // Local state for editing to fix Korean typing issue (IME)
  const [localReportData, setLocalReportData] = useState<ReportData | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [refiningField, setRefiningField] = useState<string | null>(null);

  // Sync localReportData when current student/week or reports change
  useEffect(() => {
    const sData = reports[currentStudent] || {};
    const sName = sData[Object.keys(sData)[0]]?.studentName || "알 수 없음";
    const wData = sData[currentWeek] || DEFAULT_REPORT_TEMPLATE(currentStudent, sName, currentWeek);
    
    // Only update local state if we're not currently editing or if the student/week changed
    setLocalReportData(wData);
  }, [currentStudent, currentWeek, reports]);

  const handleAIInsightGenerate = async () => {
    if (!localReportData) return;
    setIsGeneratingAI(true);
    
    try {
      // Get previous reports for context
      const studentReports = reports[currentStudent] || {};
      const allWeeks = Object.keys(studentReports).sort(); // Chronological order
      const currentWeekIdx = allWeeks.indexOf(currentWeek);
      
      // Get up to 3 previous weeks for context
      const previousWeeks = currentWeekIdx > 0 
        ? allWeeks.slice(Math.max(0, currentWeekIdx - 3), currentWeekIdx)
        : [];
      
      const history = previousWeeks.map(w => studentReports[w]);

      const insight = await generateAIInsight(localReportData, history, userApiKey);
      updateLocalField('aiInsight', insight);
    } catch (error) {
      console.error("Handle AI Insight Generate Error:", error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleRefineField = async (path: string, fieldName: string) => {
    if (!localReportData) return;
    
    // Get current text from path
    const keys = path.split('.');
    let current: any = localReportData;
    for (const key of keys) {
      current = current[key];
    }
    const currentText = current as string;
    
    if (!currentText || !currentText.trim() || currentText.includes("입력하세요")) {
      alert("내용을 먼저 입력해주세요.");
      return;
    }

    setRefiningField(path);
    try {
      const refined = await refineTextWithAI(fieldName, currentText, userApiKey);
      updateLocalField(path, refined);
    } catch (error) {
      console.error("Handle Refine Field Error:", error);
    } finally {
      setRefiningField(null);
    }
  };

  const getCompetencyLevel = (score: number) => {
    if (score >= 91) return "매우 우수";
    if (score >= 71) return "우수";
    if (score >= 26) return "보통";
    return "미흡";
  };

  const updateLocalField = (path: string, value: any) => {
    if (!localReportData) return;
    
    let newData = { ...localReportData };
    const keys = path.split('.');
    let current: any = newData;
    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = { ...current[keys[i]] };
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;

    // Sync performance.testScore and analysis.myScore
    if (path === 'performance.testScore') {
      newData.analysis.myScore = value;
      
      const weekLabelMatch = currentWeek.match(/(\d+월 \d+주)/);
      const weekLabel = weekLabelMatch ? weekLabelMatch[1] : currentWeek;
      
      const trendIndex = newData.trend.findIndex(t => t.week === weekLabel);
      let newTrend = [...newData.trend];
      
      if (trendIndex > -1) {
        newTrend[trendIndex] = { ...newTrend[trendIndex], myScore: value };
      } else {
        newTrend.push({ week: weekLabel, myScore: value, avgScore: 0 });
      }
      newData.trend = newTrend;
    } else if (path === 'analysis.myScore') {
      newData.performance.testScore = value;
      
      const weekLabelMatch = currentWeek.match(/(\d+월 \d+주)/);
      const weekLabel = weekLabelMatch ? weekLabelMatch[1] : currentWeek;
      
      const trendIndex = newData.trend.findIndex(t => t.week === weekLabel);
      let newTrend = [...newData.trend];
      
      if (trendIndex > -1) {
        newTrend[trendIndex] = { ...newTrend[trendIndex], myScore: value };
      }
      newData.trend = newTrend;
    } else if (path === 'analysis.averageScore') {
      const weekLabelMatch = currentWeek.match(/(\d+월 \d+주)/);
      const weekLabel = weekLabelMatch ? weekLabelMatch[1] : currentWeek;
      
      const trendIndex = newData.trend.findIndex(t => t.week === weekLabel);
      let newTrend = [...newData.trend];
      
      if (trendIndex > -1) {
        newTrend[trendIndex] = { ...newTrend[trendIndex], avgScore: value };
      } else {
        newTrend.push({ week: weekLabel, myScore: newData.analysis.myScore, avgScore: value });
      }
      newData.trend = newTrend;
    }

    // Auto-update competency levels
    if (path === 'competency.homework') {
      newData.competency.homeworkLevel = getCompetencyLevel(value);
    } else if (path === 'competency.understanding') {
      newData.competency.understandingLevel = getCompetencyLevel(value);
    } else if (path === 'competency.concentration') {
      newData.competency.concentrationLevel = getCompetencyLevel(value);
    }

    setLocalReportData(newData);
  };

  const saveLocalData = () => {
    if (!localReportData) return;
    
    const sData = reports[currentStudent] || {};
    const firestorePath = `students/${currentStudent}/reports/${currentWeek}`;
    
    // If trend was updated, we need to sync to all weeks
    // We check if trend changed by comparing with current data in reports
    const currentData = sData[currentWeek];
    const trendChanged = JSON.stringify(localReportData.trend) !== JSON.stringify(currentData?.trend);

    if (trendChanged) {
      const batchPromises = Object.keys(sData).map(week => {
        const reportToUpdate = {
          ...sData[week],
          ...(week === currentWeek ? localReportData : { trend: localReportData.trend })
        };
        return setDoc(doc(db, 'students', currentStudent, 'reports', week), reportToUpdate);
      });
      Promise.all(batchPromises).catch(err => handleFirestoreError(err, OperationType.WRITE, firestorePath));
    } else {
      setDoc(doc(db, 'students', currentStudent, 'reports', currentWeek), localReportData)
        .catch(err => handleFirestoreError(err, OperationType.WRITE, firestorePath));
    }
  };

  // Update current student when URL changes or data loads
  useEffect(() => {
    if (studentIdFromUrl && reports[studentIdFromUrl] && currentStudent !== studentIdFromUrl) {
      setCurrentStudent(studentIdFromUrl);
    }
  }, [studentIdFromUrl, reports]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('id', currentStudent);
    params.set('week', currentWeek);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [currentStudent, currentWeek]);
  const [parentMessage, setParentMessage] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);

  const toggleEditMode = () => {
    if (isEditMode) {
      if (confirm("관리자 모드를 종료하시겠습니까? (로그아웃)")) {
        handleLogout();
      }
    } else {
      handleGoogleLogin();
    }
  };
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddWeek, setShowAddWeek] = useState(false);
  const [showAdminManage, setShowAdminManage] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newWeekName, setNewWeekName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [adminEmails, setAdminEmails] = useState<any[]>([]);
  const [accessibleStudents, setAccessibleStudents] = useState<string[] | null>(null);
  const [userApiKey, setUserApiKey] = useState<string>("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  // Load API Key from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) setUserApiKey(savedKey);
  }, []);

  const saveApiKey = (key: string) => {
    localStorage.setItem('gemini_api_key', key);
    setUserApiKey(key);
    alert("API 키가 브라우저에 안전하게 저장되었습니다.");
    setShowApiKeyInput(false);
  };
  const isSuperAdmin = user?.email === "thswjdals7733@gmail.com";

  // Fetch admin data and permissions
  useEffect(() => {
    if (!isAuthReady || !user || user.isAnonymous) {
      setAdminEmails([]);
      setAccessibleStudents(null);
      return;
    }
    
    const unsubAdmins = onSnapshot(collection(db, 'admin_emails'), (snapshot) => {
      const admins = snapshot.docs.map(doc => ({ email: doc.id, ...doc.data() }));
      setAdminEmails(admins);
      
      const currentUserAdmin = admins.find((a: any) => a.email === user.email) as any;
      if (isSuperAdmin) {
        setAccessibleStudents(null); // null means all
      } else if (currentUserAdmin) {
        setAccessibleStudents(currentUserAdmin.accessibleStudents || []);
      } else {
        setAccessibleStudents([]);
      }
    });
    
    return () => unsubAdmins();
  }, [isAuthReady, user, isSuperAdmin]);

  const handleUpdateAdminAccess = async (email: string, studentId: string, checked: boolean) => {
    if (!isSuperAdmin) return;
    
    const adminDoc = adminEmails.find(a => a.email === email);
    let newAccess = [...(adminDoc?.accessibleStudents || [])];
    
    if (checked) {
      if (!newAccess.includes(studentId)) newAccess.push(studentId);
    } else {
      newAccess = newAccess.filter(id => id !== studentId);
    }
    
    try {
      await setDoc(doc(db, 'admin_emails', email), { accessibleStudents: newAccess }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `admin_emails/${email}`);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!isSuperAdmin) {
      alert("학생 삭제 권한이 없습니다.");
      return;
    }
    if (studentId === 'ST1001') {
      alert("기본 학생 데이터는 삭제할 수 없습니다.");
      return;
    }
    if (!confirm(`학생 ${studentId}의 모든 리포트 데이터가 삭제됩니다. 계속하시겠습니까?`)) return;
    
    try {
      const reportsRef = collection(db, 'students', studentId, 'reports');
      const reportsSnap = await getDocs(reportsRef);
      for (const reportDoc of reportsSnap.docs) {
        await deleteDoc(doc(db, 'students', studentId, 'reports', reportDoc.id));
      }
      await deleteDoc(doc(db, 'students', studentId));
      
      setReports(prev => {
        const newReports = { ...prev };
        delete newReports[studentId];
        return newReports;
      });
      
      if (currentStudent === studentId) {
        setCurrentStudent(Object.keys(reports).find(id => id !== studentId) || "");
      }
      
      alert("학생 데이터가 삭제되었습니다.");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `students/${studentId}`);
    }
  };

  const handleAddAdmin = async () => {
    if (!isSuperAdmin) return;
    if (!newAdminEmail.trim() || !newAdminEmail.includes('@')) {
      alert("올바른 이메일 주소를 입력해주세요.");
      return;
    }
    try {
      await setDoc(doc(db, 'admin_emails', newAdminEmail.trim()), {
        addedAt: new Date().toISOString(),
        addedBy: user.email,
        accessibleStudents: []
      });
      setNewAdminEmail("");
      alert(`${newAdminEmail} 계정이 관리자로 추가되었습니다.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `admin_emails/${newAdminEmail}`);
    }
  };

  const handleRemoveAdmin = async (email: string) => {
    if (!isSuperAdmin) return;
    if (email === "thswjdals7733@gmail.com") {
      alert("기본 관리자 계정은 삭제할 수 없습니다.");
      return;
    }
    if (!confirm(`${email} 계정의 관리자 권한을 삭제하시겠습니까?`)) return;
    try {
      await deleteDoc(doc(db, 'admin_emails', email));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `admin_emails/${email}`);
    }
  };

  // Filter reports based on access
  const filteredStudentIds = Object.keys(reports).filter(id => {
    if (accessibleStudents === null) return true;
    return accessibleStudents.includes(id);
  });

  // Safe data access
  const studentData = reports[currentStudent] || {};
  const studentName = studentData[Object.keys(studentData)[0]]?.studentName || "알 수 없음";
  const weekData = studentData[currentWeek] || DEFAULT_REPORT_TEMPLATE(currentStudent, studentName, currentWeek);
  
  const availableWeeks = Object.keys(studentData).length > 0 
    ? Object.keys(studentData).sort().reverse() 
    : INITIAL_WEEKS;

  const reportData = { ...weekData, availableWeeks };

  const handleWeekChange = (week: string) => {
    setCurrentWeek(week);
  };

  const handleAddWeek = () => {
    if (!newWeekName.trim()) return;
    
    const studentReports = reports[currentStudent] || {};
    if (studentReports[newWeekName]) {
      alert("이미 존재하는 주차입니다.");
      return;
    }

    const sName = studentReports[Object.keys(studentReports)[0]]?.studentName || "알 수 없음";

    const firstWeekKey = Object.keys(studentReports)[0];
    const existingTrend = firstWeekKey ? studentReports[firstWeekKey].trend : [];
    
    const newReport = DEFAULT_REPORT_TEMPLATE(currentStudent, sName, newWeekName);
    if (existingTrend.length > 0) {
      newReport.trend = existingTrend;
    }

    const path = `students/${currentStudent}/reports/${newWeekName}`;
    setDoc(doc(db, 'students', currentStudent, 'reports', newWeekName), newReport)
      .catch(err => handleFirestoreError(err, OperationType.WRITE, path));

    setCurrentWeek(newWeekName);
    setNewWeekName("");
    setShowAddWeek(false);
  };

  const handleAddStudent = async () => {
    if (!newStudentName.trim()) return;

    const studentId = "ST" + Math.floor(1000 + Math.random() * 9000);
    const initialReport = DEFAULT_REPORT_TEMPLATE(studentId, newStudentName, INITIAL_WEEKS[0]);

    const studentPath = `students/${studentId}`;
    const reportPath = `students/${studentId}/reports/${INITIAL_WEEKS[0]}`;

    try {
      // 1. Create student document
      await setDoc(doc(db, 'students', studentId), { 
        studentId, 
        studentName: newStudentName,
        createdAt: new Date().toISOString()
      });
      
      // 2. Create initial report
      await setDoc(doc(db, 'students', studentId, 'reports', INITIAL_WEEKS[0]), initialReport);

      setCurrentStudent(studentId);
      setCurrentWeek(INITIAL_WEEKS[0]);
      setNewStudentName("");
      setShowAddStudent(false);
      alert(`${newStudentName} 학생이 성공적으로 추가되었습니다.`);
    } catch (err) {
      console.error("Add Student Error:", err);
      handleFirestoreError(err, OperationType.WRITE, studentPath);
    }
  };

  const handleParentMessageChange = (message: string) => {
    setParentMessage(message);
  };

  const handleCommentSubmit = async () => {
    if (!parentMessage.trim()) return;
    
    const path = `students/${currentStudent}/reports/${currentWeek}`;
    const reportRef = doc(db, 'students', currentStudent, 'reports', currentWeek);

    try {
      await updateDoc(reportRef, {
        parentFeedback: parentMessage
      });
      alert(`선생님께 의견이 전달되었습니다: \n"${parentMessage}"`);
      setParentMessage("");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleResetData = () => {
    if (confirm("모든 데이터가 초기화됩니다. 계속하시겠습니까?")) {
      // For Firestore, we'd need to delete all docs. 
      // For now, let's just alert that this is a restricted operation or implement a simple version.
      alert("데이터베이스 초기화는 관리자 콘솔에서 수행해주세요.");
    }
  };

  return (
    <div className="relative">
      {/* Toggle Button */}
      <button
        onClick={toggleEditMode}
        className="fixed bottom-6 right-6 z-50 p-4 bg-indigo-600 text-white rounded-full shadow-2xl hover:bg-indigo-700 transition-all flex items-center gap-2 group"
      >
        {isEditMode ? <Eye size={20} /> : <Settings size={20} />}
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap">
          {isEditMode ? "리포트 보기" : "데이터 수정하기"}
        </span>
      </button>


      {isEditMode && localReportData ? (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans">
          <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
            {/* Admin Status Banner */}
            <div className={`p-3 flex items-center justify-between ${user && !user.isAnonymous ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
                {user && !user.isAnonymous ? (
                  <>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    관리자 인증 완료 (서버 저장 활성화)
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                    비로그인 상태 (데이터 수정은 로그인이 필요합니다)
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={saveLocalData}
                  className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  수동 저장
                </button>
                {!user || user.isAnonymous ? (
                  <button 
                    onClick={handleGoogleLogin}
                    className="px-3 py-1 bg-amber-600 text-white text-[10px] font-bold rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    구글 로그인하기
                  </button>
                ) : (
                  <button 
                    onClick={handleLogout}
                    className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    로그아웃
                  </button>
                )}
              </div>
            </div>

            <div className="bg-indigo-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Settings className="w-6 h-6" />
                    리포트 데이터 관리자
                  </h1>
                  <p className="text-indigo-100 text-sm mt-1">
                    {reportData.studentName} 학생 ({currentStudent}) / {currentWeek} 데이터 수정 중
                  </p>
                </div>
                <div className="flex gap-2">
                  {user && !user.isAnonymous && (
                    <div className="flex items-center gap-2 mr-2">
                      <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full border border-white/20" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold leading-none">{user.displayName}</span>
                        <span className="text-[8px] opacity-70 leading-none mt-1">{user.email}</span>
                      </div>
                    </div>
                  )}
                  {isSuperAdmin && (
                    <>
                      <button 
                        onClick={() => {
                          setShowAdminManage(!showAdminManage);
                          setShowAddStudent(false);
                          setShowAddWeek(false);
                          setShowApiKeyInput(false);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${showAdminManage ? 'bg-white text-indigo-600' : 'bg-white/20 hover:bg-white/30 text-white'}`}
                      >
                        <Settings size={14} /> 계정 관리
                      </button>
                      <button 
                        onClick={() => {
                          setShowAddStudent(!showAddStudent);
                          setShowAddWeek(false);
                          setShowAdminManage(false);
                          setShowApiKeyInput(false);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${showAddStudent ? 'bg-white text-indigo-600' : 'bg-white/20 hover:bg-white/30 text-white'}`}
                      >
                        <Plus size={14} /> 학생 추가
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => {
                      setShowApiKeyInput(!showApiKeyInput);
                      setShowAdminManage(false);
                      setShowAddStudent(false);
                      setShowAddWeek(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${showApiKeyInput ? 'bg-white text-indigo-600' : 'bg-white/20 hover:bg-white/30 text-white'}`}
                  >
                    <Sparkles size={14} /> AI 키 설정
                  </button>
                  <button 
                    onClick={() => {
                      setShowAddWeek(!showAddWeek);
                      setShowAddStudent(false);
                      setShowAdminManage(false);
                      setShowApiKeyInput(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${showAddWeek ? 'bg-white text-indigo-600' : 'bg-white/20 hover:bg-white/30 text-white'}`}
                  >
                    <Plus size={14} /> 주차 추가
                  </button>
                </div>
              </div>
              
              {/* API Key Input Form */}
              {showApiKeyInput && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 p-4 bg-indigo-900/40 border border-indigo-400/30 rounded-xl space-y-3"
                >
                  <div className="flex items-center gap-2 text-indigo-200 mb-1">
                    <AlertTriangle size={14} />
                    <p className="text-[10px] font-bold uppercase">Gemini AI 키 설정 (GitHub Pages용)</p>
                  </div>
                  <p className="text-[11px] text-indigo-100 leading-relaxed">
                    깃허브 페이지와 같은 환경에서 AI 기능을 사용하려면 본인의 Gemini API 키가 필요합니다. 
                    입력하신 키는 서버에 저장되지 않고 **현재 브라우저에만 안전하게 저장**됩니다.
                  </p>
                  <div className="flex gap-2">
                    <input 
                      type="password"
                      placeholder="AI API 키 입력 (AI Studio에서 발급)"
                      value={userApiKey}
                      onChange={(e) => setUserApiKey(e.target.value)}
                      className="flex-grow p-2 bg-white text-slate-900 rounded-lg text-sm outline-none"
                    />
                    <button 
                      onClick={() => saveApiKey(userApiKey)}
                      className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-bold hover:bg-indigo-400 transition-colors"
                    >
                      저장
                    </button>
                  </div>
                  <p className="text-[9px] text-indigo-300">
                    * 키가 없으시다면 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="underline">Google AI Studio</a>에서 무료로 발급받으실 수 있습니다.
                  </p>
                </motion.div>
              )}

              {/* Inline Add Forms */}
              {isSuperAdmin && showAdminManage && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 p-4 bg-white/10 rounded-xl space-y-4"
                >
                  <div className="flex gap-2 items-center">
                    <input 
                      type="email"
                      placeholder="추가할 관리자 구글 이메일 입력"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      className="flex-grow p-2 bg-white text-slate-900 rounded-lg text-sm outline-none"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddAdmin()}
                    />
                    <button 
                      onClick={handleAddAdmin}
                      className="px-4 py-2 bg-white text-indigo-600 rounded-lg text-sm font-bold"
                    >
                      추가
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-indigo-200 uppercase">현재 관리자 목록 및 학생 접근 권한</p>
                    <div className="space-y-3">
                      <div className="p-3 bg-white/10 rounded-lg text-[10px]">
                        <p className="font-bold mb-1">thswjdals7733@gmail.com (슈퍼 관리자)</p>
                        <p className="text-indigo-200">모든 학생 리포트에 접근 가능합니다.</p>
                      </div>
                      {adminEmails.filter(a => a.email !== "thswjdals7733@gmail.com").map((admin: any) => (
                        <div key={admin.email} className="p-3 bg-white/10 rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold">{admin.email}</span>
                            <button onClick={() => handleRemoveAdmin(admin.email)} className="text-rose-300 hover:text-rose-100">
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[8px] text-indigo-200 font-bold uppercase">접근 가능한 학생 선택</p>
                            <div className="flex flex-wrap gap-2">
                              {Object.keys(reports).map(sId => {
                                const sName = reports[sId][Object.keys(reports[sId])[0]]?.studentName || sId;
                                return (
                                  <label key={sId} className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded cursor-pointer hover:bg-white/10 transition-colors">
                                    <input 
                                      type="checkbox" 
                                      checked={(admin.accessibleStudents || []).includes(sId)}
                                      onChange={(e) => handleUpdateAdminAccess(admin.email, sId, e.target.checked)}
                                      className="w-3 h-3 accent-indigo-500"
                                    />
                                    <span className="text-[9px]">{sName}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {isSuperAdmin && showAddStudent && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 p-4 bg-white/10 rounded-xl flex gap-2 items-center"
                >
                  <input 
                    type="text"
                    placeholder="새 학생 이름 입력"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    className="flex-grow p-2 bg-white text-slate-900 rounded-lg text-sm outline-none"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleAddStudent()}
                  />
                  <button 
                    onClick={handleAddStudent}
                    className="px-4 py-2 bg-white text-indigo-600 rounded-lg text-sm font-bold"
                  >
                    추가
                  </button>
                </motion.div>
              )}
              
              {showAddWeek && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 p-4 bg-white/10 rounded-xl flex gap-2 items-center"
                >
                  <input 
                    type="text"
                    placeholder="새 주차 명칭 입력 (예: 2026년 3월 2주차)"
                    value={newWeekName}
                    onChange={(e) => setNewWeekName(e.target.value)}
                    className="flex-grow p-2 bg-white text-slate-900 rounded-lg text-sm outline-none"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleAddWeek()}
                  />
                  <button 
                    onClick={handleAddWeek}
                    className="px-4 py-2 bg-white text-indigo-600 rounded-lg text-sm font-bold"
                  >
                    추가
                  </button>
                </motion.div>
              )}
            </div>

            <div className="p-6 space-y-8 max-h-[80vh] overflow-y-auto">
              {/* 학생 및 주차 선택 (관리자용) */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase">관리할 학생 선택</label>
                    {isSuperAdmin && currentStudent !== 'ST1001' && (
                      <button 
                        onClick={() => handleDeleteStudent(currentStudent)}
                        className="text-rose-500 hover:text-rose-700 text-[10px] font-bold flex items-center gap-1"
                      >
                        <Trash2 size={10} /> 학생 삭제
                      </button>
                    )}
                  </div>
                  <select 
                    value={currentStudent}
                    onChange={(e) => {
                      const studentId = e.target.value;
                      setCurrentStudent(studentId);
                      const studentWeeks = Object.keys(reports[studentId] || {});
                      if (studentWeeks.length > 0) {
                        setCurrentWeek(studentWeeks.sort().reverse()[0]);
                      } else {
                        setCurrentWeek(INITIAL_WEEKS[0]);
                      }
                    }}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {filteredStudentIds.map(id => {
                      const studentName = reports[id][Object.keys(reports[id])[0]]?.studentName || "알 수 없음";
                      return <option key={id} value={id}>{studentName} ({id})</option>;
                    })}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">관리할 주차 선택</label>
                  <select 
                    value={currentWeek}
                    onChange={(e) => setCurrentWeek(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {Object.keys(reports[currentStudent] || {}).sort().reverse().map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              </section>

              {/* 기본 정보 */}
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h2 className="text-lg font-bold text-slate-800">기본 정보</h2>
                  <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold">
                    고유번호: {currentStudent}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">학생 이름</label>
                    <input 
                      type="text" 
                      value={localReportData.studentName} 
                      onChange={(e) => updateLocalField('studentName', e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">주차 명칭</label>
                    <input 
                      type="text" 
                      value={localReportData.selectedWeek} 
                      disabled
                      className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>
              </section>

              {/* 출결 및 성적 요약 */}
              <section className="space-y-4">
                <h2 className="text-lg font-bold text-slate-800 border-b pb-2">출결 및 요약</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">출결 상태</label>
                    <input 
                      type="text" 
                      value={localReportData.attendance.status} 
                      onChange={(e) => updateLocalField('attendance.status', e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">하원 시간</label>
                    <input 
                      type="text" 
                      value={localReportData.attendance.dismissTime} 
                      onChange={(e) => updateLocalField('attendance.dismissTime', e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">테스트 점수</label>
                    <input 
                      type="number" 
                      value={localReportData.performance.testScore === 0 ? "" : localReportData.performance.testScore} 
                      onChange={(e) => updateLocalField('performance.testScore', e.target.value === "" ? 0 : Number(e.target.value))}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase">출결 비고</label>
                    <button 
                      onClick={() => handleRefineField('attendance.note', '출결 비고')}
                      disabled={refiningField === 'attendance.note'}
                      className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded-lg transition-colors border border-indigo-100 disabled:opacity-50"
                    >
                      {refiningField === 'attendance.note' ? <div className="w-2 h-2 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /> : <Sparkles size={10} />}
                      AI 문장 다듬기
                    </button>
                  </div>
                  <input 
                    type="text" 
                    value={localReportData.attendance.note} 
                    onChange={(e) => updateLocalField('attendance.note', e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </section>

              {/* 정밀 분석 */}
              <section className="space-y-4">
                <h2 className="text-lg font-bold text-slate-800 border-b pb-2">성적 정밀 분석</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase">분석 주제</label>
                      <button 
                        onClick={() => handleRefineField('analysis.topic', '분석 주제')}
                        disabled={refiningField === 'analysis.topic'}
                        className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded-lg transition-colors border border-indigo-100 disabled:opacity-50"
                      >
                        {refiningField === 'analysis.topic' ? <div className="w-2 h-2 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /> : <Sparkles size={10} />}
                        AI 문장 다듬기
                      </button>
                    </div>
                    <input 
                      type="text" 
                      value={localReportData.analysis.topic} 
                      onChange={(e) => updateLocalField('analysis.topic', e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">내 점수</label>
                    <input 
                      type="number" 
                      value={localReportData.analysis.myScore === 0 ? "" : localReportData.analysis.myScore} 
                      onChange={(e) => updateLocalField('analysis.myScore', e.target.value === "" ? 0 : Number(e.target.value))}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">평균 점수</label>
                    <input 
                      type="number" 
                      value={localReportData.analysis.averageScore === 0 ? "" : localReportData.analysis.averageScore} 
                      onChange={(e) => updateLocalField('analysis.averageScore', e.target.value === "" ? 0 : Number(e.target.value))}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </section>

              {/* 성적 추이 */}
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h2 className="text-lg font-bold text-slate-800">성적 추이</h2>
                  <button 
                    onClick={() => {
                      const newTrend = [...localReportData.trend, { week: `${localReportData.trend.length + 1}주`, myScore: 0, avgScore: 0 }];
                      updateLocalField('trend', newTrend);
                    }}
                    className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <div className="space-y-3">
                  {localReportData.trend.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">주차</label>
                        <input 
                          type="text" 
                          value={item.week} 
                          onChange={(e) => {
                            const newTrend = [...localReportData.trend];
                            newTrend[idx] = { ...newTrend[idx], week: e.target.value };
                            updateLocalField('trend', newTrend);
                          }}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">내 점수</label>
                        <input 
                          type="number" 
                          value={item.myScore === 0 ? "" : item.myScore} 
                          onChange={(e) => {
                            const newTrend = [...localReportData.trend];
                            newTrend[idx] = { ...newTrend[idx], myScore: e.target.value === "" ? 0 : Number(e.target.value) };
                            updateLocalField('trend', newTrend);
                          }}
                          placeholder="0"
                          onFocus={(e) => e.target.select()}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">평균 점수</label>
                        <input 
                          type="number" 
                          value={item.avgScore === 0 ? "" : item.avgScore} 
                          onChange={(e) => {
                            const newTrend = [...localReportData.trend];
                            newTrend[idx] = { ...newTrend[idx], avgScore: e.target.value === "" ? 0 : Number(e.target.value) };
                            updateLocalField('trend', newTrend);
                          }}
                          placeholder="0"
                          onFocus={(e) => e.target.select()}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                        />
                      </div>
                      <button 
                        onClick={() => {
                          const newTrend = localReportData.trend.filter((_, i) => i !== idx);
                          updateLocalField('trend', newTrend);
                        }}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors flex justify-center"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {/* 학습 역량 */}
              <section className="space-y-4">
                <h2 className="text-lg font-bold text-slate-800 border-b pb-2">학습 역량 (0-100)</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">과제 수행 (0-100)</label>
                    <input 
                      type="number" min="0" max="100"
                      value={localReportData.competency.homework === 0 ? "" : localReportData.competency.homework} 
                      onChange={(e) => updateLocalField('competency.homework', e.target.value === "" ? 0 : Number(e.target.value))}
                      onFocus={(e) => e.target.select()}
                      placeholder="0"
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                    />
                    <div className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-full inline-block">
                      {localReportData.competency.homeworkLevel}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">수업 이해 (0-100)</label>
                    <input 
                      type="number" min="0" max="100"
                      value={localReportData.competency.understanding === 0 ? "" : localReportData.competency.understanding} 
                      onChange={(e) => updateLocalField('competency.understanding', e.target.value === "" ? 0 : Number(e.target.value))}
                      onFocus={(e) => e.target.select()}
                      placeholder="0"
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                    />
                    <div className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full inline-block">
                      {localReportData.competency.understandingLevel}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">수업 집중 (0-100)</label>
                    <input 
                      type="number" min="0" max="100"
                      value={localReportData.competency.concentration === 0 ? "" : localReportData.competency.concentration} 
                      onChange={(e) => updateLocalField('competency.concentration', e.target.value === "" ? 0 : Number(e.target.value))}
                      onFocus={(e) => e.target.select()}
                      placeholder="0"
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                    />
                    <div className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full inline-block">
                      {localReportData.competency.concentrationLevel}
                    </div>
                  </div>
                </div>
              </section>

              {/* 주간 학습 요약 */}
              <section className="space-y-4">
                <h2 className="text-lg font-bold text-slate-800 border-b pb-2">주간 학습 요약</h2>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase">이번 주 학습 내용</label>
                      <button 
                        onClick={() => handleRefineField('feedback.weeklyContent', '이번 주 학습 내용')}
                        disabled={refiningField === 'feedback.weeklyContent'}
                        className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded-lg transition-colors border border-indigo-100 disabled:opacity-50"
                      >
                        {refiningField === 'feedback.weeklyContent' ? <div className="w-2 h-2 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /> : <Sparkles size={10} />}
                        AI 문장 다듬기
                      </button>
                    </div>
                    <textarea 
                      value={localReportData.feedback.weeklyContent} 
                      onChange={(e) => updateLocalField('feedback.weeklyContent', e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm h-24 resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase">과제 및 테스트 예고</label>
                      <button 
                        onClick={() => handleRefineField('feedback.homeworkNotice', '과제 및 테스트 예고')}
                        disabled={refiningField === 'feedback.homeworkNotice'}
                        className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded-lg transition-colors border border-indigo-100 disabled:opacity-50"
                      >
                        {refiningField === 'feedback.homeworkNotice' ? <div className="w-2 h-2 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /> : <Sparkles size={10} />}
                        AI 문장 다듬기
                      </button>
                    </div>
                    <textarea 
                      value={localReportData.feedback.homeworkNotice} 
                      onChange={(e) => updateLocalField('feedback.homeworkNotice', e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm h-24 resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase">다음 주 수업 안내</label>
                      <button 
                        onClick={() => handleRefineField('feedback.nextClassNotice', '다음 주 수업 안내')}
                        disabled={refiningField === 'feedback.nextClassNotice'}
                        className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded-lg transition-colors border border-indigo-100 disabled:opacity-50"
                      >
                        {refiningField === 'feedback.nextClassNotice' ? <div className="w-2 h-2 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /> : <Sparkles size={10} />}
                        AI 문장 다듬기
                      </button>
                    </div>
                    <textarea 
                      value={localReportData.feedback.nextClassNotice} 
                      onChange={(e) => updateLocalField('feedback.nextClassNotice', e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm h-24 resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase">추가 보충 내용</label>
                      <button 
                        onClick={() => handleRefineField('feedback.extraFeedback', '추가 보충 내용')}
                        disabled={refiningField === 'feedback.extraFeedback'}
                        className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded-lg transition-colors border border-indigo-100 disabled:opacity-50"
                      >
                        {refiningField === 'feedback.extraFeedback' ? <div className="w-2 h-2 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /> : <Sparkles size={10} />}
                        AI 문장 다듬기
                      </button>
                    </div>
                    <textarea 
                      value={localReportData.feedback.extraFeedback} 
                      onChange={(e) => updateLocalField('feedback.extraFeedback', e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm h-24 resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </section>

              {/* AI 인사이트 생성 */}
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h2 className="text-lg font-bold text-slate-800">AI LEARNING INSIGHT</h2>
                  <button 
                    onClick={handleAIInsightGenerate}
                    disabled={isGeneratingAI}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      isGeneratingAI 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100'
                    }`}
                  >
                    {isGeneratingAI ? (
                      <>
                        <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                        AI 분석 중...
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        AI 리포트 생성
                      </>
                    )}
                  </button>
                </div>
                <div className="space-y-1">
                  <textarea 
                    value={localReportData.aiInsight} 
                    onChange={(e) => updateLocalField('aiInsight', e.target.value)}
                    placeholder="AI 리포트 생성 버튼을 누르거나 직접 입력하세요."
                    className="w-full p-4 bg-slate-900 text-indigo-100 border border-slate-800 rounded-2xl text-sm h-48 resize-none focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                  />
                </div>
              </section>

              {/* 학부모 의견 확인 */}
              {reportData.parentFeedback && (
                <section className="space-y-4">
                  <h2 className="text-lg font-bold text-rose-600 border-b border-rose-100 pb-2 flex items-center gap-2">
                    <MessageSquare size={20} />
                    학부모님 전달 의견
                  </h2>
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {reportData.parentFeedback}
                  </div>
                </section>
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button 
                onClick={async () => {
                  await saveLocalData();
                  setIsEditMode(false);
                }}
                className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
              >
                수정 완료 및 리포트 보기
              </button>
            </div>
          </div>
        </div>
      ) : (
        <ParentReportPage 
          data={reportData}
          parentMessage={parentMessage}
          onWeekChange={handleWeekChange}
          onParentMessageChange={handleParentMessageChange}
          onCommentSubmit={handleCommentSubmit}
        />
      )}
    </div>
  );
}
