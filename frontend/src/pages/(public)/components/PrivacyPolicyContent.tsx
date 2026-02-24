import React from "react";
import * as S from "../TermsOfServicePage.styles";

const PrivacyPolicyContent: React.FC = () => (
  <div>
    <S.Paragraph>
      FreakIT는 개인정보 보호법 제30조에 따라 정보주체(회원)의 개인정보를
      보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여
      다음과 같이 개인정보 처리방침을 두고 있습니다. FreakIT의
      개인정보처리방침은 관련 법률이나 방침 변경 또는 내부방침 변경 등으로
      인하여 수시로 변경될 수 있으며, 개인정보처리방침을 개정하는 경우
      홈페이지에 게시하여 개정된 사항을 쉽게 알아볼 수 있도록 공지할 예정입니다.
    </S.Paragraph>
    <S.Article>
      <S.ArticleTitle>제1조 개인정보의 처리목적</S.ArticleTitle>
      <S.Paragraph>
        FreakIT는 서비스 이용시 필요한 최소한의 개인정보를 수집하며, 이에 대한
        동의를 얻고 있습니다. 수집하는 개인정보의 항목은 아래와 같으며, 고지한
        목적 범위 내에서만 사용됩니다. 다음의 목적을 위하여 개인정보를 처리하고
        있으며, 다음의 목적 이외의 용도로는 이용하지 않습니다.
      </S.Paragraph>
      <S.List>
        <S.ListItem>
          서비스 제공에 관한 계약 이행 및 서비스 제공에 따른 요금정산, 서비스,
          구매 및 요금 결제, 회원관리
        </S.ListItem>
        <S.ListItem>
          회원 관리를 위한 회원제 서비스 이용에 따른 본인확인, 개인 식별,
          불량회원의 부정 이용 방지와 비인가 사용 방지, 이용계약 체결의사 확인,
          연령확인, 불만처리 등 민원처리, 고지사항전달
        </S.ListItem>
        <S.ListItem>
          마케팅 및 광고에 활용을 위한 신규 서비스(제품) 개발 및 특화, 이벤트 등
          광고성 정보 전달, 접속 빈도 파악 또는 회원의 서비스 이용에 대한 통계
        </S.ListItem>
        <S.ListItem>
          가입횟수 제한, 분쟁조정을 위한 기록보존, 프라이버시 보호 측면의 서비스
          환경 구축, 회원의 서비스 만족 및 목표도달 유무 확인 및 강의, 학과,
          관심사 등 기타 통계자료 산출
        </S.ListItem>
        <S.ListItem>
          회원의 신원 확인, 고충사항 확인, 사실조사를 위한 연락·통지, 처리결과
          통보 등 고충처리
        </S.ListItem>
      </S.List>
    </S.Article>
    <S.Article>
      <S.ArticleTitle>제2조 처리하는 개인정보 항목</S.ArticleTitle>
      <S.List>
        <S.ListItem>
          가. FreakIT는 서비스 이용 과정에서 아래와 같은 개인정보를 수집하고
          이용합니다.
          <S.SubList>
            <S.SubListItem>
              <b>필수항목 :</b> 성명, 이메일 주소, 비밀번호, 교육이력
            </S.SubListItem>
            <S.SubListItem>
              <b>선택항목 :</b> 소속 정보, 프로필 사진, 닉네임
            </S.SubListItem>
            <S.SubListItem>
              <b>만 14세 미만 아동의 개인정보 수집 시:</b> 법정대리인의 성명,
              연락처(개인정보 보호법 제22조의2 제2항에 따라 법정대리인의 동의
              없이 아동으로부터 직접 수집)
            </S.SubListItem>
            <S.SubListItem>
              이 외에 회원이 서비스 이용을 위해 회사에 추가 정보를 제공하는 경우
              해당 정보가 추가로 수집될 수 있습니다.
            </S.SubListItem>
          </S.SubList>
        </S.ListItem>
        <S.ListItem>
          나. 서비스 이용과정이나 사업 처리과정에서 컨텐츠 이용여부 등을
          확인하기 위하여 모바일 기기의 디바이스 아이디, 접속IP정보, Advertising
          ID (AAID, IDFA 등), 쿠키, 방문 일시 등의 정보들이 자동으로 생성되어
          수집될 수 있습니다.
        </S.ListItem>
        <S.ListItem>
          다. 회원이 제휴 콘텐츠 이용시 콘텐츠 제공사로부터 회원의
          이용내역(이름, 수강정보)을 제공받습니다.
        </S.ListItem>
        <S.ListItem>
          라. 고충처리 시, 회원으로부터 위 각 정보 중 필요한 항목 및 해당
          고충처리에 필요한 별개 항목을 수집 및 처리할 수 있습니다.
        </S.ListItem>
      </S.List>
    </S.Article>
    <S.Article>
      <S.ArticleTitle>제3조 개인정보의 처리 및 보유기간</S.ArticleTitle>
      <S.List>
        <S.ListItem>
          가. FreakIT는 정보주체로부터 개인정보를 수집할 때 동의받은 개인정보
          보유·이용기간 또는 법령에 따른 개인정보 보유·이용기간 내에서
          개인정보를 처리·보유합니다.
        </S.ListItem>
        <S.ListItem>
          나. 구체적인 개인정보 처리 및 보유 기간은 다음과 같습니다.
          <S.SubList>
            <S.SubListItem>
              <b>부정 가입 및 부정 이용 방지 :</b> 부정가입 및 게시물 유출,
              아이디 공유 등의 서비스 부정 사용기록이 있는 경우 개인정보 중
              가입인증 정보(이메일 또는 페이스북 고유번호, 만 14세 미만 회원의
              경우 법정대리인 이메일 및 휴대전화번호)를 탈퇴일로부터 5일 이내
              파기
            </S.SubListItem>
            <S.SubListItem>
              <b>고객 가입 및 관리 :</b> 서비스 이용계약 또는 회원가입
              해지시까지, 다만 채권․채무관계 잔존시에는 해당 채권·채무관계
              정산시까지
            </S.SubListItem>
            <S.SubListItem>
              <b>
                전자상거래에서의 계약․청약철회, 대금결제, 재화 등의 공급에 관한
                기록 :
              </b>{" "}
              5년
            </S.SubListItem>
            <S.SubListItem>
              <b>소비자의 불만 또는 분쟁처리에 관한 기록 :</b> 3년
            </S.SubListItem>
            <S.SubListItem>
              <b>방문에 관한 기록(통신사실확인자료) :</b> 3개월
            </S.SubListItem>
            <S.SubListItem>
              <b>무료 체험 신청, 문의하기, 웨비나 신청 :</b> 5년
            </S.SubListItem>
            <S.SubListItem>
              <b>뉴스레터 신청 :</b> 동의 철회 시 혹은 서비스 종료 시
            </S.SubListItem>
          </S.SubList>
        </S.ListItem>
      </S.List>
    </S.Article>
    <S.Article>
      <S.ArticleTitle>제4조 개인정보의 제3자 제공</S.ArticleTitle>
      <S.List>
        <S.ListItem>
          가. FreakIT는 정보 주체의 별도 동의, 개인정보 보호법 제17조에 해당하는
          경우, 개인정보보호법 제28조의 2에 따라 통계 작성, 학술 연구나 시장
          조사 등을 위하여 특정 개인을 식별할 수 없는 형태로 제공하는 경우 등
          법률의 특별한 규정 이외에는 개인정보를 제3자에게 제공하지 않습니다.
        </S.ListItem>
      </S.List>
    </S.Article>
    <S.Article>
      <S.ArticleTitle>제5조 개인정보의 국외 이전</S.ArticleTitle>
      <S.List>
        <S.ListItem>
          가. FreakIT는 다음과 같이 개인정보를 국외 이전하고 있습니다.
          <S.SubList>
            <S.SubListItem>
              <b>이전 받는 자 :</b> Amazon Web Service Inc.
              (aws-korea-privacy@amazon.com)
            </S.SubListItem>
            <S.SubListItem>
              <b>국가 :</b> 일본(도쿄) 등
            </S.SubListItem>
            <S.SubListItem>
              <b>이전 되는 개인 정보 항목 :</b> 성명, 이메일 주소, 비밀번호,
              소속 정보, 프로필 사진, 닉네임
            </S.SubListItem>
            <S.SubListItem>
              <b>이전 일시 및 이전 방법 :</b> 서비스 이용 시 네트워크를 통한
              이전
            </S.SubListItem>
            <S.SubListItem>
              <b>이용 목적 및 보유 기간 :</b>
              <S.SubList>
                <S.SubListItem>
                  <b>이전 목적 :</b> 데이터 저장 및 인프라 운영
                </S.SubListItem>
                <S.SubListItem>
                  <b>보유 기간 :</b> 제3조에 기재된 보유·이용 기간과 일치함
                </S.SubListItem>
              </S.SubList>
            </S.SubListItem>
          </S.SubList>
        </S.ListItem>
        <S.ListItem>
          나. 클라썸 회원가입 시 약관 동의 거부를 통하여 개인정보의 이전을
          거부할 수 있습니다. 다만, 약관 동의는 서비스 이용을 위한 필수적
          사항이므로 약관에 동의하셔야만 클라썸 회원가입 및 서비스 이용이
          가능합니다.
        </S.ListItem>
      </S.List>
    </S.Article>
    <S.Article>
      <S.ArticleTitle>
        제6조 정보주체와 법정대리인의 권리·의무 및 행사방법
      </S.ArticleTitle>
      <S.List>
        <S.ListItem>
          가. 정보주체는 회사에 대해 언제든지 개인정보 열람·정정·삭제·처리정지
          요구 등의 권리를 행사할 수 있습니다.
          <S.SubList>
            <S.SubListItem>
              회원은 홈페이지 ‘내 프로필 - 계정 설정 - 계정 정보’에서 개인정보를
              직접 조회・수정・삭제할 수 있습니다.
            </S.SubListItem>
            <S.SubListItem>
              회원은 ‘회원탈퇴’를 통해 개인정보의 수집 및 이용 동의 철회가
              가능합니다.
            </S.SubListItem>
            <S.SubListItem>
              정보주체는 언제든지 freakit2025@gmail.com을 통해 정보주체의
              권리행사 요청이 가능합니다.
            </S.SubListItem>
          </S.SubList>
        </S.ListItem>
        <S.ListItem>
          나. 가항에 따른 권리 행사는 서면, 전자우편 등을 통해서도 하실 수
          있으며, 회사는 이에 대해 지체 없이 조치하겠습니다.
        </S.ListItem>
        <S.ListItem>
          다. 가항에 따른 권리 행사는 회원의 법정대리인이나 위임을 받은 자 등
          대리인을 통하여서 하실 수도 있습니다. 이 경우 수임인에 대한 위임사실을
          확인할 수 있는 위임장을 제출하셔야 합니다. 만 14세 미만 아동에 관한
          개인정보의 열람 등 요구는 법정대리인이 직접 해야 하며, 14세 이상의
          미성년자인 정보주체는 정보주체의 개인정보에 관하여 미성년자 본인이
          권리를 행사하거나 법정대리인을 통하여 권리를 행사할 수도 있습니다.
        </S.ListItem>
        <S.ListItem>
          라. 개인정보 보호법 등 관계 법령에서 정하는 바에 따라 회원의 개인정보
          열람·정정·삭제·처리정지 요구 등의 권리 행사가 제한될 수 있습니다.
        </S.ListItem>
        <S.ListItem>
          마. 개인정보의 정정 및 삭제 요구는 다른 법령에서 그 개인정보가 수입
          대상으로 명시되어 있는 경우에는 그 삭제를 요구할 수 없습니다.
        </S.ListItem>
        <S.ListItem>
          바. 회사는 정보주체 권리에 따른 열람의 요구, 정정·삭제의 요구,
          처리정지의 요구 시 열람 등 요구를 한 자가 본인이거나 정당한
          대리인인이지를 확인합니다.
        </S.ListItem>
      </S.List>
    </S.Article>
    <S.Article>
      <S.ArticleTitle>제7조 개인정보의 파기</S.ArticleTitle>
      <S.Paragraph>
        FreakIT는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가
        불필요하게 되었을 때에는 다음의 방법으로 지체없이 해당 개인정보를
        파기합니다.
      </S.Paragraph>
      <S.List>
        <S.ListItem>
          <b>파기절차:</b> 회원이 입력한 정보는 목적 달성 후 별도의 DB에
          옮겨져(종이의 경우 별도의 서류) 내부 방침 및 기타 관련 법령에 따라
          일정기간 저장된 후 혹은 즉시 파기됩니다. 이 때, DB로 옮겨진 개인정보는
          법률에 의한 경우가 아니고서는 다른 목적으로 이용되지 않습니다.
        </S.ListItem>
        <S.ListItem>
          <b>파기기한:</b> 회원의 개인정보는 개인정보의 보유기간이 경과된
          경우에는 보유기간의 종료일로부터 5일 이내에, 개인정보의 처리 목적
          달성, 해당 서비스의 폐지, 사업의 종료 등 그 개인정보가 불필요하게
          되었을 때에는 개인정보의 처리가 불필요한 것으로 인정되는 날로부터 5일
          이내에 그 개인정보를 파기합니다.
        </S.ListItem>
        <S.ListItem>
          <b>파기방법:</b> 전자적 파일 형태의 정보는 기록을 재생할 수 없는
          기술적 방법을 사용합니다. 종이에 출력된 개인정보는 분쇄기로 분쇄하거나
          소각을 통하여 파기합니다.
        </S.ListItem>
      </S.List>
    </S.Article>
    <S.Article>
      <S.ArticleTitle>제8조 개인정보의 안전성 확보조치</S.ArticleTitle>
      <S.Paragraph>
        FreakIT는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고
        있습니다.
      </S.Paragraph>
      <S.List>
        <S.ListItem>
          <b>관리적 조치 :</b> 내부관리계획 수립․시행, 직원․종업원 등에 대한
          정기적 교육
        </S.ListItem>
        <S.ListItem>
          <b>기술적 조치 :</b> 개인정보가 저장된 컴퓨터의 비밀번호 설정 등 접근
          권한 관리, 백신소프트웨어 등 보안프로그램 설치, 개인정보가 저장된
          파일의 암호화
        </S.ListItem>
      </S.List>
    </S.Article>
    <S.Article>
      <S.ArticleTitle>
        제9조 개인정보 자동 수집 장치의 설치∙운영 및 거부에 관한 사항
      </S.ArticleTitle>
      <S.Paragraph>
        FreakIT는 회원에게 개별적인 맞춤서비스를 제공하기 위해 이용정보를
        저장하고 수시로 불러오는 ‘쿠키(cookie)’를 사용합니다.
      </S.Paragraph>
      <S.Paragraph>
        쿠키는 웹사이트를 운영하는데 이용되는 서버가 회원의 컴퓨터 브라우저에게
        보내는 소량의 정보이며 회원들의 PC 컴퓨터내의 하드디스크에 저장되기도
        합니다.
      </S.Paragraph>
      <S.List>
        <S.ListItem>
          가. <b>쿠키의 사용목적:</b> 회원이 방문한 각 서비스와 웹 사이트들에
          대한 방문 및 이용형태, 인기 검색어, 보안접속 여부 등을 파악하여
          회원에게 최적화된 정보 제공을 위해 사용됩니다.
        </S.ListItem>
        <S.ListItem>
          나. <b>쿠키의 설치∙운영 및 거부 :</b> 웹브라우저 상단의 도구 → 인터넷
          옵션 → 개인정보 메뉴의 옵션 설정을 통해 쿠키 저장을 거부 할 수
          있습니다.
        </S.ListItem>
        <S.ListItem>
          다. 쿠키 저장을 거부할 경우 맞춤형 서비스 이용에 어려움이 발생할 수
          있습니다.
        </S.ListItem>
      </S.List>
    </S.Article>
    <S.Article>
      <S.ArticleTitle>
        제10조 수집목적과 합리적으로 관련된 범위 내의 개인정보 이용 및 제공
      </S.ArticleTitle>
      <S.List>
        <S.ListItem>
          가. FreakIT는 당초 수집 목적과 합리적인 범위 내에서 아래 각 기준을
          고려하여, 정보주체의 동의 없이 개인정보를 이용 또는 제3자에게 제공할
          수 있습니다.
          <S.SubList>
            <S.SubListItem>
              <b>당초 수집 목적과 관련성이 있는지 여부:</b> 당초 수집 목적과
              추가적 이용 제공 목적이 성질이나 경향에 있어 연관이 있는지를
              고려하여 따라 판단
            </S.SubListItem>
            <S.SubListItem>
              <b>
                개인정보를 수집한 정황 또는 처리 관행에 비추어 볼 때 개인정보의
                추가적인 이용 또는 제공에 대한 예측 가능성이 있는지 여부:
              </b>{" "}
              개인정보처리자와 정보주체 간의 관계, 기술 수준 및 발전 속도,
              상당한 기간동안 정립된 일반적인 사정(관행)을 고려하여 판단
            </S.SubListItem>
            <S.SubListItem>
              <b>정보주체의 이익을 부당하게 침해하는지 여부:</b> 추가적인 이용
              목적과의 관계에서 정보주체의 이익이 실질적으로 침해되는지 및 해당
              이익 침해가 부당한지를 고려하여 판단
            </S.SubListItem>
            <S.SubListItem>
              <b>
                가명처리 또는 암호화 등 안전성 확보에 필요한 조치를 하였는지
                여부:
              </b>{" "}
              침해 가능성을 고려한 안전 조치가 취해지는지를 고려하여 판단
            </S.SubListItem>
          </S.SubList>
        </S.ListItem>
        <S.ListItem>
          나. FreakIT는 아래 기준에 따라, 정보 주체의 동의 없이 개인정보를
          추가적으로 이용, 제공할 수 있습니다.
          <S.SubList>
            <S.SubListItem>
              <b>제공받는자 :</b> 회원이 소속된 고객사 (목록은 사업장에 게시)
            </S.SubListItem>
            <S.SubListItem>
              <b>제공 목적 :</b> 고객사 소속 임직원에 대한 교육 관리 기능 제공
            </S.SubListItem>
            <S.SubListItem>
              <b>제공 항목 :</b> 교육 수강 이력
            </S.SubListItem>
            <S.SubListItem>
              <b>보유기관 :</b> 서비스 종료 후 5년 경과 시
            </S.SubListItem>
          </S.SubList>
        </S.ListItem>
      </S.List>
    </S.Article>
    <S.Article>
      <S.ArticleTitle>
        제11조 만 14세 미만 아동의 개인정보 처리에 관한 사항
      </S.ArticleTitle>
      <S.List>
        <S.ListItem>
          가. FreakIT는 만 14세 미만 아동에 대해 개인정보를 수집할 때
          법정대리인의 동의를 얻어 해당 서비스 수행에 필요한 최소한의 개인정보를
          수집합니다.
          <S.SubList>
            <S.SubListItem>
              <b>필수 항목 :</b> 법정 대리인의 성명, 관계, 연락처
            </S.SubListItem>
          </S.SubList>
        </S.ListItem>
        <S.ListItem>
          나. FreakIT는 만 14세 미만 아동의 개인정보를 수집할 때에는 아동에게
          법정대리인의 성명, 연락처와 같은 최소한의 정보를 요구할 수 있으며,
          법정대리인이 동의하였는지를 확인합니다.
        </S.ListItem>
      </S.List>
    </S.Article>
    <S.Article>
      <S.ArticleTitle>제12조 개인정보 보호책임자</S.ArticleTitle>
      <S.Paragraph>
        FreakIT는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와
        관련한 정보주체의 불만처리 및 피해구제를 처리하기 위하여 아래와 같이
        개인정보 보호책임자 및 개인정보 보호담당자를 지정하고 있습니다.
      </S.Paragraph>
      <S.List>
        <S.ListItem>
          <b>개인정보 보호책임자</b>
          <S.SubList>
            <S.SubListItem>
              <b>성명 :</b> 이도운
            </S.SubListItem>
            <S.SubListItem>
              <b>직책 :</b> 대표
            </S.SubListItem>
            <S.SubListItem>
              <b>연락처 :</b> 010-7568-3302
            </S.SubListItem>
          </S.SubList>
        </S.ListItem>
        <S.ListItem>
          <b>개인정보 보호담당자</b>
          <S.SubList>
            <S.SubListItem>
              <b>성명 :</b> 윤성수
            </S.SubListItem>
            <S.SubListItem>
              <b>메일 :</b> yun041123@gmail.com
            </S.SubListItem>
          </S.SubList>
        </S.ListItem>
      </S.List>
      <S.Paragraph>
        정보주체께서는 FreakIT의 서비스를 이용하면서 발생한 모든 개인정보 보호
        관련 문의, 불만처리, 피해구제 등에 관한 사항을 개인정보 보호책임자 및
        담당부서로 문의하실 수 있습니다. FreakIT는 정보주체의 문의에 대해 지체
        없이 답변 및 처리해드리겠습니다.
      </S.Paragraph>
    </S.Article>
    <S.Article>
      <S.ArticleTitle>제13조 정보주체의 권익침해에 대한 구제방법</S.ArticleTitle>
      <S.Paragraph>
        정보주체는 개인정보침해로 인한 구제를 받기 위하여
        개인정보분쟁조정위원회, 한국인터넷진흥원 개인정보침해신고센터 등에
        분쟁해결이나 상담 등을 신청할 수 있습니다. 이 밖에 기타 개인정보침해의
        신고, 상담에 대하여는 아래의 기관에 문의하시기 바랍니다.
      </S.Paragraph>
      <S.List>
        <S.ListItem>
          <b>개인정보 분쟁조정 :</b> (국번없이) 1833-6972 (www.kopico.go.kr)
        </S.ListItem>
        <S.ListItem>
          <b>개인정보침해신고센터 :</b> (국번없이) 118 (privacy.kisa.or.kr)
        </S.ListItem>
        <S.ListItem>
          <b>대검찰청 :</b> (국번없이) 1301 (www.spo.go.kr)
        </S.ListItem>
        <S.ListItem>
          <b>경찰청 :</b> (국번없이) 182 (ecrm.cyber.go.kr)
        </S.ListItem>
      </S.List>
    </S.Article>
    <S.Article>
      <S.ArticleTitle>제14조 개인정보 처리방침 변경</S.ArticleTitle>
      <S.Paragraph>
        현재 개인정보처리방침은 2025년 9월 2일부터 적용됩니다.
      </S.Paragraph>
      <S.Paragraph>
        <b>현재 개인정보 처리방침 공고 일자 :</b> 2025년 9월 2일
        <br />
        <b>현재 개인정보 처리방침 시행 일자 :</b> 2025년 9월 2일
      </S.Paragraph>
    </S.Article>
  </div>
);

export default PrivacyPolicyContent;
