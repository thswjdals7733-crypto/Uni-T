/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import ParentReportPage, { ReportData } from './components/ParentReportPage';
import { Settings, Eye, Plus, Trash2 } from 'lucide-react';

const INITIAL_WEEKS = [
  "2026년 3월 1주차",
  "2026년 2월 4주차",
  "2026년 2월 3주차",
  "2026년 2월 2주차"
];

const DEFAULT_REPORT_TEMPLATE = (studentName: string, week: string): ReportData => ({
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
    { week: "1주", myScore: 0, avgScore: 0 },
    { week: "2주", myScore: 0, avgScore: 0 },
    { week: "3주", myScore: 0, avgScore: 0 },
    { week: "4주", myScore: 0, avgScore: 0 }
  ],
  feedback: {
    weeklyContent: "이번 주 학습 내용을 입력하세요.",
    homeworkNotice: "과제 내용을 입력하세요.",
    nextClassNotice: "다음 수업 안내를 입력하세요.",
    extraFeedback: ""
  },
  parentInsight: "학생의 학습 태도와 성취도에 대한 의견을 입력하세요.",
  competency: {
    homework: 80,
    understanding: 80,
    concentration: 80,
    homeworkLevel: "우수",
    understandingLevel: "우수",
    concentrationLevel: "우수"
  },
  aiInsight: "학습 데이터를 바탕으로 한 AI 분석 내용입니다."
});

const INITIAL_REPORTS: Record<string, Record<string, ReportData>> = {
  "김지우": {
    "2026년 3월 1주차": {
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
      parentInsight: "지우는 최근 수학에 대한 자신감이 부쩍 상승한 모습입니다. 어려운 문제를 만났을 때 바로 포기하지 않고 여러 가지 방법으로 접근해보는 끈기가 생겼습니다. 가정에서도 지우의 이러한 변화에 대해 많은 칭찬 부탁드립니다.",
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
      parentInsight: "이번 주에는 다소 어려운 개념을 접하며 조금 힘들어하는 모습을 보였으나, 끝까지 스스로 풀어내려는 의지가 좋았습니다.",
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
  // Get student from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const studentFromUrl = urlParams.get('student') || "김지우";

  const [reports, setReports] = useState<Record<string, Record<string, ReportData>>>(() => {
    const saved = localStorage.getItem('uni_t_reports');
    return saved ? JSON.parse(saved) : INITIAL_REPORTS;
  });

  useEffect(() => {
    localStorage.setItem('uni_t_reports', JSON.stringify(reports));
  }, [reports]);
  const [currentStudent, setCurrentStudent] = useState(studentFromUrl);
  const [currentWeek, setCurrentWeek] = useState(INITIAL_WEEKS[0]);
  const [parentMessage, setParentMessage] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  const handlePasswordSubmit = () => {
    if (passwordInput === "0305") {
      setIsEditMode(true);
      setShowPasswordModal(false);
      setPasswordInput("");
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const toggleEditMode = () => {
    if (isEditMode) {
      setIsEditMode(false);
    } else {
      setShowPasswordModal(true);
    }
  };
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddWeek, setShowAddWeek] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newWeekName, setNewWeekName] = useState("");

  // Safe data access
  const studentData = reports[currentStudent] || {};
  const weekData = studentData[currentWeek] || DEFAULT_REPORT_TEMPLATE(currentStudent, currentWeek);
  
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

    setReports(prev => ({
      ...prev,
      [currentStudent]: {
        ...prev[currentStudent],
        [newWeekName]: DEFAULT_REPORT_TEMPLATE(currentStudent, newWeekName)
      }
    }));
    setCurrentWeek(newWeekName);
    setNewWeekName("");
    setShowAddWeek(false);
  };

  const handleAddStudent = () => {
    if (!newStudentName.trim()) return;

    if (reports[newStudentName]) {
      alert("이미 존재하는 학생입니다.");
      return;
    }

    setReports(prev => ({
      ...prev,
      [newStudentName]: {
        [INITIAL_WEEKS[0]]: DEFAULT_REPORT_TEMPLATE(newStudentName, INITIAL_WEEKS[0])
      }
    }));
    setCurrentStudent(newStudentName);
    setCurrentWeek(INITIAL_WEEKS[0]);
    setNewStudentName("");
    setShowAddStudent(false);
  };

  const handleParentMessageChange = (message: string) => {
    setParentMessage(message);
  };

  const handleCommentSubmit = () => {
    if (!parentMessage.trim()) return;
    alert(`선생님께 의견이 전달되었습니다: \n"${parentMessage}"`);
    setParentMessage("");
  };

  const updateField = (path: string, value: any) => {
    setReports(prev => {
      const studentData = prev[currentStudent] || {};
      const weekData = studentData[currentWeek] || DEFAULT_REPORT_TEMPLATE(currentStudent, currentWeek);
      
      const newData = { ...weekData };
      const keys = path.split('.');
      let current: any = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;

      return {
        ...prev,
        [currentStudent]: {
          ...studentData,
          [currentWeek]: newData
        }
      };
    });
  };

  const handleResetData = () => {
    if (confirm("모든 데이터가 초기화됩니다. 계속하시겠습니까?")) {
      localStorage.removeItem('uni_t_reports');
      setReports(INITIAL_REPORTS);
      setCurrentStudent("김지우");
      setCurrentWeek(INITIAL_WEEKS[0]);
    }
  };

  const handleTrendChange = (index: number, field: string, value: any) => {
    setReports(prev => {
      const studentData = prev[currentStudent] || {};
      const weekData = studentData[currentWeek] || DEFAULT_REPORT_TEMPLATE(currentStudent, currentWeek);
      
      const newTrend = [...weekData.trend];
      newTrend[index] = { ...newTrend[index], [field]: value };
      
      return {
        ...prev,
        [currentStudent]: {
          ...studentData,
          [currentWeek]: {
            ...weekData,
            trend: newTrend
          }
        }
      };
    });
  };

  const addTrendItem = () => {
    setReports(prev => {
      const studentData = prev[currentStudent] || {};
      const weekData = studentData[currentWeek] || DEFAULT_REPORT_TEMPLATE(currentStudent, currentWeek);
      
      return {
        ...prev,
        [currentStudent]: {
          ...studentData,
          [currentWeek]: {
            ...weekData,
            trend: [...weekData.trend, { week: "새 주차", myScore: 0, avgScore: 0 }]
          }
        }
      };
    });
  };

  const removeTrendItem = (index: number) => {
    setReports(prev => {
      const studentData = prev[currentStudent] || {};
      const weekData = studentData[currentWeek] || DEFAULT_REPORT_TEMPLATE(currentStudent, currentWeek);
      
      return {
        ...prev,
        [currentStudent]: {
          ...studentData,
          [currentWeek]: {
            ...weekData,
            trend: weekData.trend.filter((_, i) => i !== index)
          }
        }
      };
    });
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

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full border border-slate-200"
          >
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Settings className="text-indigo-600" />
              관리자 인증
            </h3>
            <p className="text-slate-500 text-sm mb-6">
              데이터 수정을 위해 비밀번호를 입력해주세요.
            </p>
            <div className="space-y-4">
              <input 
                type="password"
                placeholder="비밀번호 입력"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError(false);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                className={`w-full p-4 bg-slate-50 border ${passwordError ? 'border-rose-500 ring-2 ring-rose-100' : 'border-slate-200'} rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all`}
                autoFocus
              />
              {passwordError && (
                <p className="text-rose-500 text-xs font-medium">비밀번호가 일치하지 않습니다.</p>
              )}
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordInput("");
                    setPasswordError(false);
                  }}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
                >
                  취소
                </button>
                <button 
                  onClick={handlePasswordSubmit}
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                  확인
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {isEditMode ? (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans">
          <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
            <div className="bg-indigo-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Settings className="w-6 h-6" />
                    리포트 데이터 관리자
                  </h1>
                  <p className="text-indigo-100 text-sm mt-1">
                    {currentStudent} 학생 / {currentWeek} 데이터 수정 중
                  </p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleResetData}
                    className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={14} /> 초기화
                  </button>
                  <button 
                    onClick={() => {
                      setShowAddStudent(!showAddStudent);
                      setShowAddWeek(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${showAddStudent ? 'bg-white text-indigo-600' : 'bg-white/20 hover:bg-white/30 text-white'}`}
                  >
                    <Plus size={14} /> 학생 추가
                  </button>
                  <button 
                    onClick={() => {
                      setShowAddWeek(!showAddWeek);
                      setShowAddStudent(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${showAddWeek ? 'bg-white text-indigo-600' : 'bg-white/20 hover:bg-white/30 text-white'}`}
                  >
                    <Plus size={14} /> 주차 추가
                  </button>
                </div>
              </div>
              
              {/* Inline Add Forms */}
              {showAddStudent && (
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
                  <label className="text-xs font-bold text-slate-500 uppercase">관리할 학생 선택</label>
                  <select 
                    value={currentStudent}
                    onChange={(e) => {
                      const studentName = e.target.value;
                      setCurrentStudent(studentName);
                      const studentWeeks = Object.keys(reports[studentName] || {});
                      if (studentWeeks.length > 0) {
                        setCurrentWeek(studentWeeks.sort().reverse()[0]);
                      } else {
                        setCurrentWeek(INITIAL_WEEKS[0]);
                      }
                    }}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {Object.keys(reports).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">관리할 주차 선택</label>
                  <select 
                    value={currentWeek}
                    onChange={(e) => setCurrentWeek(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {Object.keys(reports[currentStudent]).sort().reverse().map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              </section>

              {/* 기본 정보 */}
              <section className="space-y-4">
                <h2 className="text-lg font-bold text-slate-800 border-b pb-2">기본 정보</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">학생 이름</label>
                    <input 
                      type="text" 
                      value={reportData.studentName} 
                      onChange={(e) => updateField('studentName', e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">주차 명칭</label>
                    <input 
                      type="text" 
                      value={reportData.selectedWeek} 
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
                      value={reportData.attendance.status} 
                      onChange={(e) => updateField('attendance.status', e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">하원 시간</label>
                    <input 
                      type="text" 
                      value={reportData.attendance.dismissTime} 
                      onChange={(e) => updateField('attendance.dismissTime', e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">테스트 점수</label>
                    <input 
                      type="number" 
                      value={reportData.performance.testScore === 0 ? "" : reportData.performance.testScore} 
                      onChange={(e) => updateField('performance.testScore', e.target.value === "" ? 0 : Number(e.target.value))}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">출결 비고</label>
                  <input 
                    type="text" 
                    value={reportData.attendance.note} 
                    onChange={(e) => updateField('attendance.note', e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </section>

              {/* 정밀 분석 */}
              <section className="space-y-4">
                <h2 className="text-lg font-bold text-slate-800 border-b pb-2">성적 정밀 분석</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">분석 주제</label>
                    <input 
                      type="text" 
                      value={reportData.analysis.topic} 
                      onChange={(e) => updateField('analysis.topic', e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">내 점수</label>
                    <input 
                      type="number" 
                      value={reportData.analysis.myScore === 0 ? "" : reportData.analysis.myScore} 
                      onChange={(e) => updateField('analysis.myScore', e.target.value === "" ? 0 : Number(e.target.value))}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">평균 점수</label>
                    <input 
                      type="number" 
                      value={reportData.analysis.averageScore === 0 ? "" : reportData.analysis.averageScore} 
                      onChange={(e) => updateField('analysis.averageScore', e.target.value === "" ? 0 : Number(e.target.value))}
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
                  <h2 className="text-lg font-bold text-slate-800">최근 성적 추이</h2>
                  <button 
                    onClick={addTrendItem}
                    className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <div className="space-y-3">
                  {reportData.trend.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">주차</label>
                        <input 
                          type="text" 
                          value={item.week} 
                          onChange={(e) => handleTrendChange(idx, 'week', e.target.value)}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">내 점수</label>
                        <input 
                          type="number" 
                          value={item.myScore === 0 ? "" : item.myScore} 
                          onChange={(e) => handleTrendChange(idx, 'myScore', e.target.value === "" ? 0 : Number(e.target.value))}
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
                          onChange={(e) => handleTrendChange(idx, 'avgScore', e.target.value === "" ? 0 : Number(e.target.value))}
                          placeholder="0"
                          onFocus={(e) => e.target.select()}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                        />
                      </div>
                      <button 
                        onClick={() => removeTrendItem(idx)}
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
                    <label className="text-xs font-bold text-slate-500 uppercase">과제 수행 ({reportData.competency.homework})</label>
                    <input 
                      type="range" min="0" max="100"
                      value={reportData.competency.homework} 
                      onChange={(e) => updateField('competency.homework', Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <input 
                      type="text" 
                      placeholder="수행 레벨 (예: 매우 우수)"
                      value={reportData.competency.homeworkLevel} 
                      onChange={(e) => updateField('competency.homeworkLevel', e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">수업 이해 ({reportData.competency.understanding})</label>
                    <input 
                      type="range" min="0" max="100"
                      value={reportData.competency.understanding} 
                      onChange={(e) => updateField('competency.understanding', Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <input 
                      type="text" 
                      placeholder="이해 레벨 (예: 우수)"
                      value={reportData.competency.understandingLevel} 
                      onChange={(e) => updateField('competency.understandingLevel', e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">수업 집중 ({reportData.competency.concentration})</label>
                    <input 
                      type="range" min="0" max="100"
                      value={reportData.competency.concentration} 
                      onChange={(e) => updateField('competency.concentration', Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <input 
                      type="text" 
                      placeholder="집중 레벨 (예: 매우 우수)"
                      value={reportData.competency.concentrationLevel} 
                      onChange={(e) => updateField('competency.concentrationLevel', e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </section>

              {/* 주간 학습 요약 */}
              <section className="space-y-4">
                <h2 className="text-lg font-bold text-slate-800 border-b pb-2">주간 학습 요약</h2>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">이번 주 학습 내용</label>
                    <textarea 
                      value={reportData.feedback.weeklyContent} 
                      onChange={(e) => updateField('feedback.weeklyContent', e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm h-24 resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">과제 및 테스트 예고</label>
                    <textarea 
                      value={reportData.feedback.homeworkNotice} 
                      onChange={(e) => updateField('feedback.homeworkNotice', e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm h-24 resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">다음 주 수업 안내</label>
                    <textarea 
                      value={reportData.feedback.nextClassNotice} 
                      onChange={(e) => updateField('feedback.nextClassNotice', e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm h-24 resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">추가 보충 내용</label>
                    <textarea 
                      value={reportData.feedback.extraFeedback} 
                      onChange={(e) => updateField('feedback.extraFeedback', e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm h-24 resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </section>

              {/* 밀착 리포트 및 AI 인사이트 */}
              <section className="space-y-4">
                <h2 className="text-lg font-bold text-slate-800 border-b pb-2">밀착 리포트 & AI</h2>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">학부모님께 드리는 밀착 리포트</label>
                    <textarea 
                      value={reportData.parentInsight} 
                      onChange={(e) => updateField('parentInsight', e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm h-32 resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">AI LEARNING INSIGHT</label>
                    <textarea 
                      value={reportData.aiInsight} 
                      onChange={(e) => updateField('aiInsight', e.target.value)}
                      className="w-full p-3 bg-slate-900 text-indigo-100 border border-slate-800 rounded-xl text-sm h-32 resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </section>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button 
                onClick={() => setIsEditMode(false)}
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
