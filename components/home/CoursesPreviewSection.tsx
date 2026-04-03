import React from 'react';

interface CoursesPreviewSectionProps {
  onGoToContact: () => void;
  onGoToFeaturedCourse: () => void;
}

const COURSES = [
  {
    title: '덴트웹 데이터로 보는 임플란트 재고관리',
    type: '실무 강의',
    description: '엑셀 정리 시간을 줄이고 수술기록을 운영 데이터로 바꾸는 방법을 다룹니다.',
    actionLabel: '상세 보기',
    isDetailEnabled: true,
  },
  {
    title: '병원 운영자를 위한 KPI 읽기',
    type: '경영 강의',
    description: '매출, 재고, 보험, 인력 데이터를 함께 보는 기준을 정리합니다.',
    actionLabel: '알림 신청',
    isDetailEnabled: false,
  },
  {
    title: '신입 스탭 온보딩 표준화',
    type: '교육 강의',
    description: '반복 설명을 줄이는 교육 설계와 현장 적용 템플릿을 다룹니다.',
    actionLabel: '알림 신청',
    isDetailEnabled: false,
  },
];

const CoursesPreviewSection: React.FC<CoursesPreviewSectionProps> = ({
  onGoToContact,
  onGoToFeaturedCourse,
}) => {
  return (
    <section id="home-courses" className="py-24 relative">
      <div className="section-divider mb-24" />
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16">
          <div>
            <p className="text-sm text-indigo-500 font-medium mb-2">COURSES</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-800">
              강의는 메인 홈페이지에서 보이되,
              <span className="block gradient-text-purple">병원 단위 솔루션과는 랜딩이 분리됩니다.</span>
            </h2>
            <p className="text-lg text-gray-500 leading-relaxed">브랜드 전체 경험 안에서 강의 구매는 별도의 B2C 축으로 이어집니다.</p>
          </div>
          <div className="flex items-center gap-4 mt-6 md:mt-0">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200">
              <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs text-orange-700 font-medium">실무/경영 집중</span>
            </div>
            <button onClick={onGoToContact} className="btn-secondary">
              강의 문의하기
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {COURSES.map((course) => (
            <div key={course.title} className="card-premium glow-box flex flex-col justify-between">
              <div>
                <span className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-[11px] font-bold text-orange-800 mb-4">
                  {course.type}
                </span>
                <h3 className="text-xl font-bold text-gray-800 mb-3">{course.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500 mb-6">{course.description}</p>
              </div>
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-500">
                  {course.isDetailEnabled ? '강의 상세페이지 연결됨' : '강의 상세페이지로 확장 예정'}
                </span>
                <button
                  onClick={course.isDetailEnabled ? onGoToFeaturedCourse : onGoToContact}
                  className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors"
                >
                  {course.actionLabel} &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CoursesPreviewSection;
