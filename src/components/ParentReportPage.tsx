import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend, RadarChart, PolarGrid, PolarAngleAxis, Radar 
} from 'recharts';
import { 
  Calendar, Clock, Award, TrendingUp, MessageSquare, 
  BookOpen, Lightbulb, CheckCircle2, ChevronDown, User
} from 'lucide-react';
import { motion } from 'motion/react';

export interface ReportData {
  studentId: string;
  studentName: string;
  selectedWeek: string;
  availableWeeks: string[];
  attendance: {
    status: string;
    note: string;
    dismissTime: string;
  };
  performance: {
    testScore: number;
  };
  analysis: {
    topic: string;
    myScore: number;
    averageScore: number;
  };
  trend: {
    week: string;
    myScore: number;
    avgScore: number;
  }[];
  feedback: {
    weeklyContent: string;
    homeworkNotice: string;
    nextClassNotice: string;
    extraFeedback: string;
  };
  parentInsight: string;
  competency: {
    homework: number;
    understanding: number;
    concentration: number;
    homeworkLevel: string;
    understandingLevel: string;
    concentrationLevel: string;
  };
  aiInsight: string;
  parentFeedback?: string;
}

interface ParentReportPageProps {
  data: ReportData;
  parentMessage: string;
  onWeekChange: (week: string) => void;
  onParentMessageChange: (message: string) => void;
  onCommentSubmit: () => void;
}

export default function ParentReportPage({
  data,
  parentMessage,
  onWeekChange,
  onParentMessageChange,
  onCommentSubmit
}: ParentReportPageProps) {
  
  const radarData = [
    { subject: '과제 수행', A: data.competency.homework, fullMark: 100 },
    { subject: '수업 이해', A: data.competency.understanding, fullMark: 100 },
    { subject: '수업 집중', A: data.competency.concentration, fullMark: 100 },
  ];

  const barData = [
    { name: '내 점수', score: data.analysis.myScore, fill: '#6366f1' },
    { name: '평균 점수', score: data.analysis.averageScore, fill: '#e2e8f0' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sans text-slate-900">
      {/* 1. Header Section */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-4 md:px-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-widest text-indigo-600 uppercase mb-1">
              WEEKLY LEARNING REPORT
            </p>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <span className="text-indigo-600">{data.studentName}</span> 리포트
            </h1>
          </div>
          
          <div className="relative inline-block">
            <select 
              value={data.selectedWeek}
              onChange={(e) => onWeekChange(e.target.value)}
              className="appearance-none bg-slate-100 border-none rounded-xl px-4 py-2.5 pr-10 text-sm font-medium focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-all"
            >
              {data.availableWeeks.map(week => (
                <option key={week} value={week}>{week}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 mt-6 space-y-6">
        
        {/* 2. Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-indigo-600 to-blue-500 p-6 rounded-2xl shadow-lg text-white flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-indigo-100 mb-1">주간 테스트 성적</p>
                <h3 className="text-3xl font-bold">{data.performance.testScore}점</h3>
              </div>
              <div className="p-2 bg-white/20 rounded-lg">
                <Award className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="mt-4">
              {/* Team rank removed */}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 mb-1">출결 현황</p>
                <h3 className="text-xl font-bold text-slate-800">{data.attendance.status}</h3>
              </div>
              <div className="p-2 bg-indigo-50 rounded-lg">
                <Calendar className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-sm text-slate-600 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                {data.attendance.note}
              </p>
              <p className="text-sm text-slate-500 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                하원 시간: {data.attendance.dismissTime}
              </p>
            </div>
          </motion.div>
        </div>

        {/* 3. Score Comparison Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">성적 데이터 정밀 분석</h2>
              <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-md uppercase tracking-wider">
                {data.analysis.topic}
              </span>
            </div>
          </div>
          <div className="h-48 w-full max-w-xl">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={barData} margin={{ left: 0, right: 60, top: 10, bottom: 10 }}>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }}
                  width={80}
                />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="score" radius={[0, 8, 8, 0]} barSize={32} label={{ position: 'right', fontSize: 12, fontWeight: 700, fill: '#475569' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        {/* 4. Recent Trend Line Chart */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
        >
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">최근 성적 추이</h2>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trend} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} width={30} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '30px' }} />
                <Line 
                  name="내 점수" 
                  type="monotone" 
                  dataKey="myScore" 
                  stroke="#6366f1" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} 
                  activeDot={{ r: 6 }}
                />
                <Line 
                  name="평균 점수" 
                  type="monotone" 
                  dataKey="avgScore" 
                  stroke="#cbd5e1" 
                  strokeWidth={2} 
                  strokeDasharray="5 5"
                  dot={{ r: 3, fill: '#cbd5e1' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        {/* 8. Weekly Competency Radar Chart (Moved up for better flow) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
          >
            <h2 className="text-lg font-bold text-slate-800 mb-6">주간 학습 역량 분석</h2>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="h-64 w-full md:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }} />
                    <Radar
                      name="학습 역량"
                      dataKey="A"
                      stroke="#6366f1"
                      fill="#6366f1"
                      fillOpacity={0.2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-1/2 space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-sm font-medium text-slate-600">과제 수행</span>
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">
                    {data.competency.homeworkLevel}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-sm font-medium text-slate-600">수업 이해</span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                    {data.competency.understandingLevel}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-sm font-medium text-slate-600">수업 집중</span>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                    {data.competency.concentrationLevel}
                  </span>
                </div>
              </div>
            </div>
          </motion.section>

          {/* 9. AI Insight Section */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-slate-900 p-6 rounded-2xl shadow-xl text-white flex flex-col"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-indigo-500 rounded-lg">
                <Lightbulb className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-sm font-bold tracking-wider text-indigo-400">AI LEARNING INSIGHT</h2>
            </div>
            <div className="flex-grow flex flex-col justify-center">
              <p className="text-sm leading-relaxed text-slate-300 italic">
                "{data.aiInsight}"
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800">
              <p className="text-[10px] text-slate-500 font-medium">AI 분석 기반 맞춤형 학습 제언</p>
            </div>
          </motion.section>
        </div>

        {/* 6. Weekly Learning Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-800">이번 주 학습 내용</h2>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{data.feedback.weeklyContent}</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-3 text-amber-600">
                <CheckCircle2 className="w-5 h-5" />
                <h2 className="text-base font-bold">과제 및 테스트 예고</h2>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{data.feedback.homeworkNotice}</p>
            </div>
          </motion.section>

          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-800">다음 주 수업 안내</h2>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{data.feedback.nextClassNotice}</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-3 text-emerald-600">
                <MessageSquare className="w-5 h-5" />
                <h2 className="text-base font-bold">추가 보충 내용</h2>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{data.feedback.extraFeedback}</p>
            </div>
          </motion.section>
        </div>

        {/* 7. Parent Personalized Message */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-indigo-50 to-blue-50 p-8 rounded-2xl border border-indigo-100"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white">
              <User className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-indigo-900">학부모님께 드리는 밀착 리포트</h2>
          </div>
          <p className="text-slate-700 leading-relaxed text-sm md:text-base">
            {data.parentInsight}
          </p>
        </motion.section>

        {/* 5. Teacher Comment Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
        >
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">선생님께 의견 남기기</h2>
          </div>
          <textarea
            value={parentMessage}
            onChange={(e) => onParentMessageChange(e.target.value)}
            placeholder="학습 내용이나 아이에 대해 궁금한 점을 남겨주세요."
            className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
          />
          <div className="mt-4 flex justify-end">
            <button
              onClick={onCommentSubmit}
              className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-200"
            >
              의견 보내기
            </button>
          </div>
        </motion.section>

      </main>

      <footer className="max-w-5xl mx-auto px-4 mt-12 text-center text-slate-400 text-xs">
        <p>© 2026 EduReport Learning Center. All rights reserved.</p>
      </footer>
    </div>
  );
}
