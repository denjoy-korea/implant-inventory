import React from 'react';

interface LegalModalProps {
  type: 'terms' | 'privacy';
  onClose: () => void;
}

const LegalModal: React.FC<LegalModalProps> = ({ type, onClose }) => {
  return (
    <div className="fixed inset-0 z-[300] bg-white overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <button
          onClick={onClose}
          className="fixed top-6 right-6 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {type === 'terms' ? (
          <>
            <div className="text-center mb-12">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
              </div>
              <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2">Terms of Service</p>
              <h1 className="text-3xl font-black text-slate-900">서비스 이용약관</h1>
              <p className="text-sm text-slate-400 mt-2">시행일: 2026년 2월 11일</p>
            </div>
            <div className="prose prose-slate prose-sm max-w-none text-slate-600 leading-relaxed">
              <p>본 약관은 디앤조이(이하 "회사")가 운영하는 웹사이트 denjoy.info(이하 "서비스")에서 제공하는 디지털 콘텐츠 서비스 관련 조건 및 절차, 서비스를 이용함에 있어 회사와 회원간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 1 조 (목적)</h3>
              <p>본 약관은 디앤조이(이하 "회사")가 운영하는 웹사이트 denjoy.info(이하 "서비스")에서 제공하는 디지털 콘텐츠 서비스 관련 조건 및 절차, 서비스를 이용함에 있어 회사와 회원간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 2 조 (용어의 정의)</h3>
              <p>"서비스"란 회사가 제작 또는 동의하에 제작된 '상품 등'을 디지털매체를 매개로하여 회원이 이용할 수 있도록 전자적 형태로 전송하는 것을 의미합니다.</p>
              <p>"회원"이란 서비스에 접속하여 본 약관에 따라 회사와 이용계약을 체결하고 회사가 제공하는 서비스를 이용하는 자를 의미합니다.</p>
              <p>"콘텐츠"란 이미지, 전자책, 노트 생성물, 디지털콘텐츠, 정보 등 디지털 방식으로 제작된 재화물을 말합니다.</p>
              <p>"아이디(ID)"란 회원의 식별과 서비스 이용을 위하여 회원이 정하고 회사가 승인하는 문자와 숫자의 조합으로 이메일 주소 표현을 말합니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 3 조 (약관의 게시와 개정)</h3>
              <p>1. 회사는 이 약관의 내용을 회원이 쉽게 알 수 있도록 서비스 초기 화면 또는 연결 화면을 통하여 게시합니다.</p>
              <p>2. 회사는 "전자상거래등에서의 소비자보호에 관한 법률", "약관의 규제에 관한 법률" 등 관련 법령을 위반하지 않는 범위에서 이 약관을 개정할 수 있습니다.</p>
              <p>3. 회사가 약관을 개정할 경우에는 적용일자 및 개정사유를 명시하여 현행약관과 함께 서비스 공지사항을 통해 적용일 7일 전부터 적용일 전 일까지 공지합니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 4 조 (서비스의 제공 및 변경)</h3>
              <p>회사는 다음과 같은 업무를 수행합니다.</p>
              <p className="pl-4">가. 자료 관련 판매 및 대리판매/제작<br />나. 디지털 콘텐츠(콘텐츠물), 문서 파일 등의 전달<br />다. 커뮤니티 및 게시판 서비스 운영<br />라. 기타 회사가 정하는 서비스</p>
              <p>서비스는 연중무휴, 1일 24시간 제공을 원칙으로 합니다. 다만, 회사의 정보 및 기술상의 필요에 따라 서비스가 일시적 중단될 수 있으며, 이 경우 사전에 공지합니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 5 조 (회원가입 및 이용계약 체결)</h3>
              <p>1. 이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 이 약관에 동의하는 의사표시를 함으로써 회원가입을 신청합니다.</p>
              <p>2. 회사는 다음 각 호에 해당되지 않는 한 회원가입을 승인합니다.</p>
              <p className="pl-4">가. 가입신청자가 이 약관에 의하여 이전에 회원자격을 상실한 적이 있는 경우<br />나. 등록 내용에 허위, 기재누락, 오기가 있는 경우<br />다. 기타 회원으로 등록하는 것이 회사의 기술상 현저히 지장이 있다고 인정되는 경우</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 6 조 (개인정보보호)</h3>
              <p>회사는 "개인정보 보호법" 등 관련 법령이 정하는 바에 따라 회원의 개인정보를 보호하기 위해 노력합니다. 개인정보의 보호 및 사용에 대해서는 관련법령 및 회사의 개인정보처리방침이 적용됩니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 7 조 (회원의 아이디 및 비밀번호에 관한 의무)</h3>
              <p>1. 아이디와 비밀번호에 관한 관리책임은 회원에게 있습니다.</p>
              <p>2. 회원은 자신의 아이디 및 비밀번호를 제3자에게 이용하게 해서는 안 됩니다.</p>
              <p>3. 회원이 자신의 아이디 및 비밀번호를 도난당하거나 제3자가 사용하고 있음을 인지한 경우에는 즉시 회사에 통보하고 회사의 안내가 있는 경우에는 그에 따라야 합니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 8 조 (상품의 공급 및 이용)</h3>
              <p>1. 디지털 콘텐츠의 제공: 회사는 회원이 구매한 디지털 콘텐츠를 다운로드 또는 온라인 방식으로 제공합니다. 유료 콘텐츠의 경우 결제 확인 후 이용이 가능합니다.</p>
              <p>2. 제공이 불가능한 경우의 조치: 회사는 디지털 콘텐츠의 제공이 불가능한 사실을 확인한 경우 즉시 필요한 조치를 취하며 구매대금을 환불합니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 9 조 (청약철회 및 환불 정책)</h3>
              <p><strong>1. 일반 상품:</strong> 배송완료 날짜로부터 7일 이내 청약철회가 가능합니다. 단, 포장 훼손 등으로 상품 가치가 훼손된 경우에는 제한될 수 있습니다.</p>
              <p><strong>2. 디지털 콘텐츠:</strong></p>
              <p className="pl-4">가. 회원이 구매한 상품이 디지털 콘텐츠(스 다운로드, 전자책, 파일 등)인 경우, "전자상거래등에서의 소비자보호에 관한 법률"에 따라 다운로드 또는 스트리밍이 시작된 이후에는 청약철회가 제한됩니다.<br />나. 단, 파일이 손상되거나 내용이 표시된 내용과 다른 경우에는 구매일로부터 7일 이내 환불을 요청할 수 있습니다.<br />다. 회원의 구매건의 콘텐츠 구매일로부터 3개월 이내/콘텐츠 제공일로부터 30일 이내라면 환불이 가능합니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 10 조 (저작권의 귀속 및 이용제한)</h3>
              <p>1. 회사가 작성한 저작물에 대한 저작권 및 기타 지적재산권은 회사에 귀속합니다.</p>
              <p>2. 회원은 서비스를 이용함으로써 얻은 정보나 콘텐츠를 회사의 사전 승낙 없이 복제, 송신, 출판, 배포, 방송, 기타 방법에 의하여 영리목적으로 이용하거나 제3자에게 이용하게 하여서는 안됩니다.</p>
              <p>3. 회원이 구매한 디지털 콘텐츠는 구매자 본인만 이용 가능합니다. 무단 복제/재배포를 금지하며, 회원간 계정 공유를 통한 부정이용도 금지합니다. 위반 시 민사/형사상 책임을 질 수 있습니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 11 조 (회원의 게시물)</h3>
              <p>회원이 작성한 게시물에 대한 책임은 회원에게 있으며, 회사는 회원이 게시하는 내용이 다음 각 호에 해당되면 사전 통보 없이 삭제할 수 있습니다.</p>
              <p className="pl-4">가. 타인의 명예를 훼손하거나 비하하는 내용<br />나. 공서양속에 위반되는 내용<br />다. 저작권 기타 권리를 침해하는 내용<br />라. 회사의 게시판 운영 및 게시규정에 합하지 않는 내용<br />마. 스팸성 홍보글 또는 상업적 광고</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 12 조 (면책조항)</h3>
              <p>1. 회사는 천재지변, 디도스(DDoS) 공격, IDC 장애 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</p>
              <p>2. 회사는 회원의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.</p>
              <p>3. 회사는 회원이 서비스를 이용하여 기대하는 수익의 상실에 대하여 책임을 지지 않습니다. 서비스를 통해 획득한 정보에 대한 책임은 회원에게 있습니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 13 조 (분쟁해결 및 관할법원)</h3>
              <p>1. 회사와 회원 간에 발생한 분쟁에 대하여는 상호 원만하게 해결하기 위해 노력합니다.</p>
              <p>2. 서비스 이용과 관련하여 발생한 분쟁에 대한 소송은 대한민국 법을 준거법으로 하며, 민사소송법상의 관할법원에 제기합니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">부칙</h3>
              <p>이 약관은 2026년 2월 11일부터 시행합니다.</p>
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-12">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-2">Privacy Policy</p>
              <h1 className="text-3xl font-black text-slate-900">개인정보 처리방침</h1>
              <p className="text-sm text-slate-400 mt-2">시행일: 2026년 2월 11일</p>
            </div>
            <div className="prose prose-slate prose-sm max-w-none text-slate-600 leading-relaxed">
              <p>디앤조이(이하 "회사")는 "개인정보 보호법" 제30조에 따라 정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 1 조 (개인정보의 처리목적)</h3>
              <p>회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며 이용 목적이 변경되는 등 필요시 동의를 다시 받는 등 필요한 조치를 이행할 것입니다.</p>
              <p className="pl-4"><strong>가. 회원가입 및 관리:</strong> 회원 가입의사 확인, 본인 확인, 회원자격 유지·관리, 서비스 부정이용 방지, 각종 고지·통지 목적<br /><strong>나. 서비스 제공:</strong> 콘텐츠 제공, 구매 및 요금 결제, 물품배송 또는 서비스 제공<br /><strong>다. 교육서비스:</strong> 인재대상 선발 확인, 인재대상 계약 확인, 서비스대상에 관한 안내 통보, 출석 확인, 최종결과 확인 및 기록<br /><strong>라. 마케팅 및 광고:</strong> 신규 서비스 개발 및 알림 서비스 제공, 이벤트 제공 및 광고성 정보 제공 및 이를 관리·운영을 위한 목적으로 개인정보를 처리합니다.<br /><strong>마. 민감정보 수탁 처리 (개인정보보호법 §23·§26):</strong> 회사는 의료기관 회원의 위탁을 받아 수술 기록에 포함된 환자 건강정보(민감정보)를 처리합니다. 이 정보는 의료기관의 업무 수행을 위해서만 처리되며, 회사의 독자적인 목적으로 이용되지 않습니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 2 조 (처리하는 개인정보 항목)</h3>
              <p>회사는 다음의 개인정보 항목을 처리하고 있습니다.</p>
              <div className="overflow-hidden rounded-xl border border-slate-200 my-4">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50"><th className="px-4 py-2.5 text-left font-bold text-slate-700 border-b border-slate-200">구분</th><th className="px-4 py-2.5 text-left font-bold text-slate-700 border-b border-slate-200">수집 항목</th></tr></thead>
                  <tbody>
                    <tr><td className="px-4 py-2.5 font-medium text-slate-700 border-b border-slate-100">필수항목</td><td className="px-4 py-2.5 border-b border-slate-100">이메일 주소, 비밀번호, 이름/닉네임</td></tr>
                    <tr><td className="px-4 py-2.5 font-medium text-slate-700 border-b border-slate-100">선택항목</td><td className="px-4 py-2.5 border-b border-slate-100">전화번호, 프로필 이미지, 소속 병원</td></tr>
                    <tr><td className="px-4 py-2.5 font-medium text-slate-700">자동수집</td><td className="px-4 py-2.5">접속 IP, 쿠키, 서비스 이용 기록, 접속 로그, 기기 정보</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-2"><strong>민감정보 처리 (개인정보보호법 §23):</strong> 회사는 의료기관 회원이 서비스를 통해 입력하는 <strong>환자 건강정보(수술 기록)</strong>를 처리합니다. 이는 회사가 의료기관의 위탁을 받아 처리하는 민감정보에 해당하며, AES-256 암호화로 보호된 상태로 저장됩니다. 해당 정보는 의료기관의 지시에 따라 처리되며 회사의 독자적인 목적으로 이용되지 않습니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 3 조 (개인정보의 처리 및 보유기간)</h3>
              <p>1. 회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의 받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.</p>
              <p>2. 각각의 개인정보 처리 및 보유기간은 다음과 같습니다.</p>
              <p className="pl-4">가. 회원정보의 경우: <strong>회원 탈퇴 시까지</strong><br />나. 계약 또는 청약철회에 관한 기록: <strong>5년</strong> (전자상거래법)<br />다. 대금결제 및 재화 등의 공급에 관한 기록: <strong>5년</strong> (전자상거래법)<br />라. 소비자 불만 또는 분쟁처리에 관한 기록: <strong>3년</strong> (전자상거래법)<br />마. 접속에 관한 기록: <strong>2년</strong> (개인정보 안전성 확보조치 기준 §7)</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 4 조 (개인정보의 제3자 제공)</h3>
              <p>회사는 정보주체의 개인정보를 제1조(개인정보의 처리목적)에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 개인정보 보호법 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 5 조 (개인정보 처리의 위탁)</h3>
              <p>회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.</p>
              <div className="overflow-hidden rounded-xl border border-slate-200 my-4">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50"><th className="px-4 py-2.5 text-left font-bold text-slate-700 border-b border-slate-200">수탁업체</th><th className="px-4 py-2.5 text-left font-bold text-slate-700 border-b border-slate-200">위탁 업무</th></tr></thead>
                  <tbody>
                    <tr><td className="px-4 py-2.5 font-medium text-slate-700 border-b border-slate-100">결제 대행사</td><td className="px-4 py-2.5 border-b border-slate-100">구매 및 결제 처리</td></tr>
                    <tr><td className="px-4 py-2.5 font-medium text-slate-700 border-b border-slate-100">메일 서비스</td><td className="px-4 py-2.5 border-b border-slate-100">메일의 사전 배포 이용</td></tr>
                    <tr><td className="px-4 py-2.5 font-medium text-slate-700">Supabase Inc. (미국)</td><td className="px-4 py-2.5">데이터베이스 저장·관리, 회원 인증, 파일 저장 서비스</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-400 mt-2">※ Supabase Inc.는 미국에 소재하며, 개인정보 보호법 §28조의8에 따라 국외 이전 동의를 받아 처리합니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 6 조 (개인정보의 파기)</h3>
              <p>1. 회사는 개인정보 처리목적이 달성된 경우 지체 없이 해당 개인정보를 파기합니다. 다만 법정의무기간이 남아있는 경우에는 제3조에 따릅니다.</p>
              <p>2. 파기의 절차 및 방법은 다음과 같습니다.</p>
              <p className="pl-4"><strong>전자적 파일형태:</strong> 복구가 불가능한 방법으로 영구 삭제<br /><strong>종이 문서:</strong> 분쇄기로 분쇄하거나 소각</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 7 조 (정보주체의 권리·의무 및 행사방법)</h3>
              <p>1. 정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.</p>
              <p className="pl-4">가. 개인정보 열람 요구<br />나. 오류 등이 있는 경우 정정 요구<br />다. 삭제 요구<br />라. 처리정지 요구</p>
              <p>2. 권리 행사는 이메일 또는 서비스 내 고객센터를 통해 할 수 있으며, 회사는 이에 대해 즉시 필요한 조치를 취합니다.</p>
              <p>3. 정보주체가 개인정보의 오류 등에 대한 정정 또는 삭제를 요구한 경우에는 회사는 정정 또는 삭제를 완료할 때까지 당해 개인정보를 이용하거나 제공하지 않습니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 8 조 (개인정보의 안전성 확보조치)</h3>
              <p>회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
              <p className="pl-4"><strong>가. 비밀번호의 암호화:</strong> 회원의 비밀번호는 암호화되어 저장 및 관리되고 있습니다.<br /><strong>나. 해킹 등에 대한 대비:</strong> 해킹이나 컴퓨터 바이러스에 의해 개인정보가 유출되는 것을 방지하기 위한 기술적 대책을 마련하고 있습니다.<br /><strong>다. 접근 통제:</strong> 개인정보에 대한 접근권한을 최소화하여 권한있는 자만 접근 가능합니다.<br /><strong>라. 개인정보의 암호화:</strong> 개인정보는 암호화 등을 통해 안전하게 저장 및 관리되고 있습니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 9 조 (쿠키의 사용)</h3>
              <p>1. 회사는 이용자에게 개별적인 맞춤 서비스를 제공하기 위해 이용정보를 저장하고 수시로 불러오는 '쿠키(Cookie)'를 사용합니다.</p>
              <p>2. 이용자는 웹브라우저의 설정을 통해 쿠키 저장을 거부할 수 있습니다. 다만, 쿠키 저장을 거부할 경우 맞춤형 서비스 이용에 어려움이 있을 수 있습니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 10 조 (개인정보 보호책임자)</h3>
              <p>회사는 개인정보 처리에 관한 업무를 총괄하여 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
              <div className="bg-slate-50 rounded-xl p-5 my-4 space-y-1">
                <p className="font-bold text-slate-800">개인정보 보호책임자</p>
                <p>성명: 맹준호</p>
                <p>직책/직급: 대표</p>
                <p>이메일: <a href="mailto:denjoy.info@gmail.com" className="text-indigo-600 hover:underline">denjoy.info@gmail.com</a></p>
              </div>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 11 조 (권익침해 구제방법)</h3>
              <p>정보주체는 개인정보침해로 인한 구제를 받기 위하여 다음 기관에 분쟁해결이나 상담 등을 신청할 수 있습니다.</p>
              <p className="pl-4">개인정보분쟁조정위원회: (국번없이) 1833-6972<br />개인정보침해신고센터: (국번없이) 118<br />대검찰청 사이버수사과: (국번없이) 1301<br />경찰청 사이버안전수사국: (국번없이) 182</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 12 조 (개인정보 처리방침 변경)</h3>
              <p>이 개인정보 처리방침은 시행일로부터 적용됩니다. 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 서비스 사이트 공지사항을 통하여 고지할 것입니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">부칙</h3>
              <p>이 개인정보 처리방침은 2026년 2월 11일부터 시행합니다.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LegalModal;
