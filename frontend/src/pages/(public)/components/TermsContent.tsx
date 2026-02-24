import React from "react";
import * as S from "../TermsOfServicePage.styles";

const TermsContent: React.FC = () => (
  <div>
    <S.Article>
      <S.ArticleTitle>제1조 (목적)</S.ArticleTitle>
      <S.Paragraph>
        이 이용약관(이하 '약관'이라 합니다)은 FreakIT(이하 '회사'라 합니다)이
        제공하는 '서비스'(이하 '서비스'라 합니다)의 이용과 관련하여 '회사'와
        이용 회원(이하 '회원'이라 합니다)간의 권리, 의무 및 책임사항, 이용조건
        및 절차 등 기본적인 사항을 규정함을 목적으로 합니다.
      </S.Paragraph>
    </S.Article>

    <S.Article>
      <S.ArticleTitle>제2조 (용어의 정의)</S.ArticleTitle>
      <S.DefinitionList>
        <S.DefinitionItem>
          <S.DefinitionTerm>'서비스':</S.DefinitionTerm>
          <S.DefinitionDesc>
            {" "}
            구현되는 단말기(PC, TV, 휴대형 단말기 등의 각종 유무선 장치를
            포함)와 상관없이 '회원'이 이용할 수 있는 학습 플랫폼 및 관련 제반
            '서비스'를 의미합니다.
          </S.DefinitionDesc>
        </S.DefinitionItem>
        <S.DefinitionItem>
          <S.DefinitionTerm>'회원':</S.DefinitionTerm>
          <S.DefinitionDesc>
            {" "}
            이 약관에 동의하고 '회사'가 제공하는 '서비스'를 이용하는 자를
            의미합니다.
          </S.DefinitionDesc>
        </S.DefinitionItem>
        <S.DefinitionItem>
          <S.DefinitionTerm>'구성원':</S.DefinitionTerm>
          <S.DefinitionDesc>
            {" "}
            '기관'에 소속되어 해당 '기관'내에서 활동하는 '회원'을 의미하며,
            '기관'의 운영에 관하여 가지는 권한에 따라 '기관 관리자' 또는
            '멤버'로 구분됩니다.
          </S.DefinitionDesc>
          <S.SubList>
            <S.SubListItem>
              기관 관리자: '구성원'이 되고자 하는 '회원'의 '기관' 가입 허락 및
              '구성원'이 신청한 서비스의 이용 허락 권한, 관리 권한 및 '기관'
              자체 서비스의 이용 계약 해지 권한을 가진 '구성원'을 의미합니다.
            </S.SubListItem>
            <S.SubListItem>
              멤버: '기관 관리자' 이외의 '구성원'으로서 '기관' 자체 서비스 이용
              권한을 가진 '구성원'을 의미합니다
            </S.SubListItem>
          </S.SubList>
        </S.DefinitionItem>
        <S.DefinitionItem>
          <S.DefinitionTerm>'가입 신청자':</S.DefinitionTerm>
          <S.DefinitionDesc>
            {" "}
            '회원'이 되고자 하는 자를 의미합니다.
          </S.DefinitionDesc>
        </S.DefinitionItem>
        <S.DefinitionItem>
          <S.DefinitionTerm>'기관':</S.DefinitionTerm>
          <S.DefinitionDesc>
            {" "}
            '회원'이 '서비스' 이용 및 '서비스'를 이용한 자체적인 서비스 제공을
            위해 FreakIT에 생성한 가상의 활동 공간을 의미합니다.
          </S.DefinitionDesc>
        </S.DefinitionItem>
        <S.DefinitionItem>
          <S.DefinitionTerm>'아이디':</S.DefinitionTerm>
          <S.DefinitionDesc>
            {" "}
            '서비스' 이용 시 '회원'의 식별을 위해 필요한 것으로서 특정 이메일
            주소 또는 고유한 문자와 숫자의 조합을 의미합니다.
          </S.DefinitionDesc>
        </S.DefinitionItem>
        <S.DefinitionItem>
          <S.DefinitionTerm>'비밀번호':</S.DefinitionTerm>
          <S.DefinitionDesc>
            {" "}
            '회원'이 접근 권한 증명 및 보안 목적으로 스스로 정한 문자, 숫자 또는
            부호의 조합을 의미합니다
          </S.DefinitionDesc>
        </S.DefinitionItem>
        <S.DefinitionItem>
          <S.DefinitionTerm>'공간':</S.DefinitionTerm>
          <S.DefinitionDesc>
            {" "}
            '회원'이 '회사'의 '서비스'를 이용하여 '서비스' 내에 개설한 개별
            공간을 의미합니다.
          </S.DefinitionDesc>
        </S.DefinitionItem>
      </S.DefinitionList>
    </S.Article>

    <S.Article>
      <S.ArticleTitle>제3조 (이용약관의 명시와 설명 및 개정)</S.ArticleTitle>
      <S.List>
        <S.ListItem>
          '회사'는 이 약관의 내용을 '회원'이 쉽게 알 수 있도록 웹사이트의 초기
          '서비스' 화면에 게시합니다. 다만, 약관의 구체적 내용은 '회원'이 연결
          화면에서 볼 수 있습니다.
        </S.ListItem>
        <S.ListItem>
          '회사'는 『약관의 규제 등에 관한 법률』, 『개인정보보호법』,
          『정보통신망 이용촉진 및 정보보호 등에 관한 법률』(정보통신망법),
          『전자상거래 등에서의 소비자보호에 관한 법률』 등 관련 법령을 위배하지
          않는 범위에서 이 약관을 개정할 수 있습니다.
        </S.ListItem>
        <S.ListItem>
          '회사'가 약관을 개정할 경우에는 적용 일자 및 개정 사유를 명시하여 현행
          약관과 함께 웹사이트의 초기 화면에 그 개정 약관의 적용 일자 7일 전부터
          적용 일자 전일까지 공지합니다. 다만, '회원'에게 불리한 약관의 개정의
          경우에는 30일 이상의 사전 유예기간을 두고 공지합니다.
        </S.ListItem>
        <S.ListItem>
          본조 제3항에 따라 공지된 적용 일자 이후에 '회원'이 '회사'의 '서비스'를
          계속 이용하는 경우에는 개정된 약관에 동의하는 것으로 봅니다. 개정된
          약관에 동의하지 아니하는 '회원'은 언제든지 자유롭게 '서비스'
          이용계약을 해지할 수 있습니다.
        </S.ListItem>
      </S.List>
    </S.Article>

    <S.Article>
      <S.ArticleTitle>제4조 (약관 외 준칙 및 관련법령과의 관계)</S.ArticleTitle>
      <S.List>
        <S.ListItem>
          이 약관 또는 개별약관에서 정하지 않은 사항은 정보통신망법, 전자상거래
          등에서의 소비자보호에 관한 법률 등 관련 법령의 규정과 일반적인
          상관례에 의합니다.
        </S.ListItem>
      </S.List>
    </S.Article>

    <S.Article>
      <S.ArticleTitle>제5조 (이용 계약의 성립)</S.ArticleTitle>
      <S.List>
        <S.ListItem>
          이용 계약은 '가입 신청자'가 약관의 내용에 동의를 하고, '회사'가 제공한
          가입 신청 양식에 따른 정보를 기입하여 '회원' 가입 신청을 하고 '회사'가
          이러한 신청에 대하여 승인함으로써 체결됩니다.
        </S.ListItem>
        <S.ListItem>
          '회사'는 다음 각 호에 해당하는 신청에 대하여는 승인을 하지 않거나
          사후에 이용계약을 해지할 수 있습니다.
          <S.SubList>
            <S.SubListItem>
              '가입 신청자'가 이 약관에 의하여 이전에 '회원'자격을 상실한 적이
              있는 경우. 다만, '회원'자격 상실 후 3개월이 경과한 자로서 '회사'의
              '회원' 재가입 승낙을 얻은 경우에는 예외로 함
            </S.SubListItem>
            <S.SubListItem>실명이 아니거나 타인의 명의를 이용한 경우</S.SubListItem>
            <S.SubListItem>
              '회사'가 제공한 가입 신청 양식에 허위의 정보를 기재하거나, 기재
              누락 또는 오기가 있는 경우
            </S.SubListItem>
            <S.SubListItem>
              '회원'이 이미 가입된 '회원'정보와 동일한 전화번호나 전자우편주소를
              입력하는 경우
            </S.SubListItem>
            <S.SubListItem>
              만 14세 미만의 아동이 법정대리인(부모)의 동의 얻지 못한 경우
            </S.SubListItem>
            <S.SubListItem>
              '회원'의 귀책 사유로 인하여 승인이 불가능하거나 기타 이 약관 또는
              관계 법령 등 제반 사항을 위반하여 신청하는 경우
            </S.SubListItem>
            <S.SubListItem>
              그 밖에 각 호에 준하는 사유로서 승인이 부적절하다고 판단되는 경우
            </S.SubListItem>
          </S.SubList>
        </S.ListItem>
        <S.ListItem>
          '회사'는 본조 제1항에 따른 신청에 대하여 '회원'에게 전문기관 내지
          제휴기관을 통한 실명확인 및 본인인증을 요청할 수 있습니다.
        </S.ListItem>
        <S.ListItem>
          '회사'는 '서비스' 관련 설비의 여유가 없거나, 기술상 또는 업무상 문제가
          있는 경우에는 승낙을 유보할 수 있습니다.
        </S.ListItem>
        <S.ListItem>
          '회사'는 본조 제3항과 제4항에 따라 '회원' 가입 신청의 승낙을 하지
          아니하거나 유보한 때 이를 '가입 신청자'에게 알리도록 노력합니다.
        </S.ListItem>
        <S.ListItem>
          '회사'는 '회원'에 대해 '회사'정책에 따라 '회원'의 형태 및 등급 등으로
          구분하여 이용시간, 이용횟수, '서비스' 내용 등을 세분하여 이용에 차등을
          둘 수 있습니다.
        </S.ListItem>
        <S.ListItem>
          이용 계약의 성립 시기는 '회사'가 가입 완료를 신청 절차 상에 표시한
          시점으로 합니다.
        </S.ListItem>
      </S.List>
    </S.Article>

    <S.Article>
      <S.ArticleTitle>제6조('회원'정보의 변경)</S.ArticleTitle>
      <S.List>
        <S.ListItem>
          '회원'은 '서비스' 내 '회원' 정보 관리 화면을 통하여 언제든지 자신의
          개인정보를 열람하고 수정할 수 있습니다. 다만 '회사'가 그 '서비스'
          관리를 위하여 필요 정보로 지정한 '아이디' 등은 수정할 수 없습니다.
        </S.ListItem>
        <S.ListItem>
          '회원'은 '회원' 가입 신청시 기재한 사항이 변경되었을 경우 '회원' 정보
          관리 화면을 통해 온라인으로 수정을 하거나 전자우편 등의 방법으로
          '회사'에게 그 변경사항을 알려야 합니다.
        </S.ListItem>
        <S.ListItem>
          '회사'는 '회원'이 제2항의 변경사항을 '회사'에 알리지 않아 불이익이
          발생한 경우 책임지지 않습니다.
        </S.ListItem>
        <S.ListItem>
          '회원'은 '서비스' 내 프로필 관리 화면을 통하여 자신의 정보를 수정할 수
          있습니다.
        </S.ListItem>
        <S.ListItem>
          '구성원' 정보의 경우, '회사' 또는 '기관 관리자'가 허용하지 않는 정보는
          수정할 수 없습니다.
        </S.ListItem>
      </S.List>
    </S.Article>

    <S.Article>
      <S.ArticleTitle>
        제7조('아이디' 및 '비밀번호'의 관리에 대한 의무)
      </S.ArticleTitle>
      <S.List>
        <S.ListItem>
          '회원' 의 '아이디'와 '비밀번호'에 관한 관리 책임은 '회원'에게 있으며,
          이를 제3자가 이용하도록 하여서는 안 됩니다.
        </S.ListItem>
        <S.ListItem>
          '회원'은 아이디 및 비밀번호가 도용되거나 제3자에 의해 사용되고 있음을
          인지한 경우에는 이를 즉시 '회사'에 통지하고 '회사'의 안내에 따라야
          합니다.
        </S.ListItem>
        <S.ListItem>
          '회사'는 '회원'이 본조 1항을 따르지 않는 경우 혹은 '회사'에 본조
          제2항에 따른 통지를 하지 않거나, 통지하였더라도 '회사'의 안내에 따르지
          않아 발생한 불이익에 대하여 책임지지 않습니다.
        </S.ListItem>
        <S.ListItem>
          '회사'는 '회원'의 '아이디'가 유출되었을 우려가 있거나, 반사회적 또는
          미풍양속에 어긋나거나 '회사' 및 '회사'의 운영자로 오인한 우려가 있는
          경우, 해당 '아이디'의 이용을 제한할 수 있습니다.
        </S.ListItem>
      </S.List>
    </S.Article>

    <S.Article>
      <S.ArticleTitle>제8조(‘회원’의 의무)</S.ArticleTitle>
      <S.List>
        <S.ListItem>
          ‘회원’은 관계법령이 약관의 규정, 이용안내 등 ‘회사’가 통지하는 사항을
          준수하여야 하며, 기타 ‘회사’ 업무에 방해되는 행위를 하여서는 안됩니다.
        </S.ListItem>
        <S.ListItem>
          ‘회원’은 다음 각 행위를 하여서는 안 됩니다.
          <S.SubList>
            <S.SubListItem>
              신청 또는 변경 시 허위내용의 기재 또는 필요적 정보의 기재 누락
            </S.SubListItem>
            <S.SubListItem>타인의 정보도용</S.SubListItem>
            <S.SubListItem>‘회사’에 게시된 정보의 변경</S.SubListItem>
            <S.SubListItem>
              ‘회사’가 금지한 정보(컴퓨터 프로그램 등)의 송신 또는 게시
            </S.SubListItem>
            <S.SubListItem>
              ‘회사’와 기타 제3자의 저작권 등 지적재산권에 대한 침해
            </S.SubListItem>
            <S.SubListItem>
              ‘회사’ 및 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위
            </S.SubListItem>
            <S.SubListItem>‘회사’의 모든 재산에 대한 침해 행위</S.SubListItem>
            <S.SubListItem>
              ‘회사’의 ‘서비스’ 이외에 허가하지 않은 행위
            </S.SubListItem>
            <S.SubListItem>
              ‘회사’의 직원 또는 ‘서비스’ 관리자를 사칭하는 행위
            </S.SubListItem>
            <S.SubListItem>
              ‘회사’의 사전 승낙 없이 ‘서비스’에서 제공한 정보를 복제, 송신,
              출판, 배포, 방송 등 기타 방법에 의하여 ‘서비스’ 내 이용 외
              목적으로 이용하거나 제3자에게 제공 또는 이용하게 하는 행위
            </S.SubListItem>
            <S.SubListItem>
              타인의 개인정보 및 계정을 수집, 저장, 공개, 이용하거나 자신과
              타인의 개인정보를 제3자에게 공개, 양도하는 행위
            </S.SubListItem>
            <S.SubListItem>
              타인의 의사에 반하여 광고성 정보 등 일정한 내용을 계속적으로
              전송하는 행위
            </S.SubListItem>
            <S.SubListItem>
              외설 또는 폭력적인 말이나 글, 화상, 음향, 기타 공서양속에 반하는
              정보를 ‘회사’의 웹사이트에 공개 또는 게시하는 행위
            </S.SubListItem>
            <S.SubListItem>
              리버스엔지니어링, 디컴파일, 디스어셈블 및 기타 일체의 가공행위를
              통하여 ‘서비스’를 복제, 분해 또는 모방 기타 변형하는 행위
            </S.SubListItem>
            <S.SubListItem>해킹 행위 또는 바이러스의 유포 행위</S.SubListItem>
            <S.SubListItem>
              자동 접속 프로그램 등을 사용하는 등 정상적인 용법과 다른 방법으로
              ‘서비스’를 이용하여 ‘회사’의 서버에 부하를 일으켜 ‘회사’의
              정상적인 ‘서비스’를 방해하는 행위
            </S.SubListItem>
            <S.SubListItem>
              다중 계정을 이용하여 정상적인 용법과 다르게 ‘회사’의 정상적인
              ‘서비스’를 방해하거나 다른 ‘회원’들에게 불편을 주는 행위
            </S.SubListItem>
            <S.SubListItem>허가되지 않은 상업적 행위</S.SubListItem>
            <S.SubListItem>기타 불법적이거나 부당한 행위</S.SubListItem>
          </S.SubList>
        </S.ListItem>
        <S.ListItem>
          ‘회원’은 관계법령, 이 약관의 규정, 이용안내 및 ‘서비스’와 관련하여
          공지한 주의사항, ‘회사’가 통지하는 사항 등을 준수하여야 하며, 기타
          ‘회사’의 업무에 방해되는 행위를 하여서는 안 됩니다.
        </S.ListItem>
        <S.ListItem>
          ‘기관 관리자’는 ‘구성원’에게 자체 서비스를 제공하기 전 해당 서비스
          제공과 관련하여 ‘기관 관리자’와 ‘구성원’ 간 권리와 의무를 정한 계약을
          체결하여야 하며, ‘회사’는 해당 계약의 내용에 관하여 책임을 지지
          않습니다.
        </S.ListItem>
        <S.ListItem>
          ‘기관 관리자’는 ‘구성원’의 ‘기관’ 초대 여부 및 ‘기관’ 이용과 관련하여
          ‘서비스’가 허용하는 범위 내에서 ‘구성원’의 이용 권한의 범위를 자유롭게
          결정할 수 있으며 ‘회사’는 이로 인한 ‘기관 관리자’와 ‘구성원’ 간 또는
          ‘기관 관리자’와 제3자 간 분쟁에 대해 책임을 지지 않습니다.
        </S.ListItem>
      </S.List>
    </S.Article>

    <S.Article>
      <S.ArticleTitle>제9조(‘회원’에 대한 통지)</S.ArticleTitle>
      <S.List>
        <S.ListItem>
          ‘회사’가 ‘회원’에 대한 통지를 하는 경우, ‘회원’이 가입신청시 ‘회사’에
          고지한 전자우편 주소나 휴대전화에 대한 문자(SMS) 등으로 할 수
          있습니다.
        </S.ListItem>
        <S.ListItem>
          ‘회사’는 ‘회원’의 알림 설정 허가 여부에 따라 스마트폰 등 전자기기를
          통해 개별적으로 ‘회원’에 대한 통지를 할 수 있습니다.
        </S.ListItem>
        <S.ListItem>
          ‘회사’는 불특정다수 ‘회원’에 대한 통지의 경우, 7일 이상 웹사이트에
          게시 함으로서 개별 통지에 갈음할 수 있습니다.
        </S.ListItem>
      </S.List>
    </S.Article>

    <S.Article>
      <S.ArticleTitle>제10조(‘회사’의 의무)</S.ArticleTitle>
      <S.List>
        <S.ListItem>
          ‘회사’는 법령과 이 약관이 정하는 계속적, 안정적인 ‘서비스’를
          제공하도록 최선의 노력을 하여야 합니다.
        </S.ListItem>
        <S.ListItem>
          ‘회사’는 ‘회원’이 안전하게 ‘서비스’를 이용할 수 있도록
          개인정보(신용정보 포함)보호를 위해 보안 시스템을 갖추어야 하며
          개인정보처리방침을 공시하고 준수합니다.
        </S.ListItem>
      </S.List>
    </S.Article>

    <S.Article>
      <S.ArticleTitle>제11조(개인정보의 보호 및 사용)</S.ArticleTitle>
      <S.List>
        <S.ListItem>
          ‘회사’는 ‘회원’ 의 개인정보를 보호하기 위하여 개인정보 보호법 등 관계
          법령에서 정하는 바를 준수합니다. ‘회원’ 의 개인정보의 보호 및 사용에
          대해서는 관계 법령 및 ‘회사’의 개인정보처리방침이 적용됩니다.
        </S.ListItem>
        <S.ListItem>
          ‘기관 관리자’가 ‘서비스’ 이용과 관련하여 ‘구성원’의 개인정보를
          수집하고자 할 경우 ‘구성원’의 개인정보 수집에 관하여 적법한 동의를
          받아야 하며, 수집한 ‘구성원’의 정보는 ‘기관 관리자’의 소유로서 ‘기관
          관리자’가 관리하여야 하고, 관련 법령이 정한 바에 따라 ‘구성원’의
          개인정보를 보호하여야 합니다.
        </S.ListItem>
        <S.ListItem>
          ‘회사’의 공식 웹사이트 이외의 링크된 웹사이트에서는 ‘회사’의
          개인정보처리방침이 적용되지 않습니다. 링크된 웹사이트 및 구매 상품이나
          ‘서비스’를 제공하는 제3자의 개인정보 취급과 관련하여 해당 웹사이트 및
          제3자의 개인정보처리방침을 확인할 책임이 ‘회원’ 에게 있으며, ‘회사’는
          이에 대하여 책임을 부담하지 않습니다.
        </S.ListItem>
        <S.ListItem>
          ‘회사’는 다음과 같은 경우에 법이 허용하는 범위 내에서 ‘회원’의
          개인정보를 제3자에게 제공할 수 있습니다.
          <S.SubList>
            <S.SubListItem>
              수사기관이나 기타 정부기관으로부터 정보제공을 요청 받은 경우
            </S.SubListItem>
            <S.SubListItem>
              ‘회원’ 의 법령 또는 약관의 위반을 포함하여 부정행위 확인 등의
              정보보호 업무를 위해 필요한 경우
            </S.SubListItem>
            <S.SubListItem>기타 법률에 의해 요구되는 경우</S.SubListItem>
          </S.SubList>
        </S.ListItem>
      </S.List>
    </S.Article>

    <S.Article>
      <S.ArticleTitle>제12조(책임 제한)</S.ArticleTitle>
      <S.List>
        <S.ListItem>
          ‘회사’는 천재지변 또는 이에 준하는 불가항력으로 인하여 ‘서비스’를
          제공할 수 없는 경우에는 ‘서비스’ 제공에 관한 책임이 면제됩니다.
        </S.ListItem>
        <S.ListItem>
          ‘회사’는 ‘회원’의 귀책 사유로 인한 ‘서비스’ 이용의 장애에 대하여는
          책임을 지지 않습니다.
        </S.ListItem>
        <S.ListItem>
          ‘회사’는 제3자가 ‘서비스’ 내 화면 또는 링크된 웹사이트를 통하여 광고한
          제품 또는 추천한 자료의 내용과 품질에 대하여 감시할 의무 기타 어떠한
          책임도 지지 아니합니다.
        </S.ListItem>
        <S.ListItem>
          ‘회사’는 ‘회사’ 및 ‘회사’의 임직원 그리고 대리인의 고의 또는 중대한
          과실이 없는 한 다음과 같은 사항으로부터 발생하는 손해에 대해 책임을
          지지 아니합니다.
          <S.SubList>
            <S.SubListItem>
              ‘회원’ 상태정보의 허위 또는 부정확성에 기인하는 손해
            </S.SubListItem>
            <S.SubListItem>
              ‘서비스’에 대한 접속 및 ‘서비스’의 이용과정에서 발생하는 개인적인
              손해
            </S.SubListItem>
            <S.SubListItem>
              서버에 대한 제3자의 모든 불법적인 접속 또는 서버의 불법적인
              이용으로부터 발생하는 손해
            </S.SubListItem>
            <S.SubListItem>
              서버에 대한 전송 또는 서버로부터의 전송에 대한 제3자의 모든
              불법적인 방해 또는 중단행위로부터 발생하는 손해
            </S.SubListItem>
            <S.SubListItem>
              제3자가 ‘서비스’를 이용하여 불법적으로 전송, 유포하거나 또는 전송,
              유포되도록 한 모든 바이러스, 스파이웨어 및 기타 악성 프로그램으로
              인한 손해
            </S.SubListItem>
            <S.SubListItem>
              전송된 데이터의 오류 및 생략, 누락, 파괴 등으로 발생되는 손해
            </S.SubListItem>
            <S.SubListItem>
              ‘회원’ 간의 ‘회원’ 정보 확인 등 처리 행위 및 ‘서비스’ 이용
              과정에서 발생하는 명예훼손 기타 불법행위로 인한 각종 민형사상 책임
            </S.SubListItem>
          </S.SubList>
        </S.ListItem>
        <S.ListItem>
          ‘기관 관리자’는 ‘구성원’의 데이터를 제어(추가, 삭제, 변경)하는 것에
          대한 책임을 부담합니다. ‘회사’는 ‘회원’과 ‘회원’ 간 또는 ‘기관
          관리자’와 ‘멤버’ 간의 분쟁에 개입하지 않으며 이에 관한 손해를 배상할
          책임을 부담하지 않습니다. 만약 ‘멤버’ 또는 다른 ‘구성원’이 ‘기관
          관리자’와의 분쟁을 이유로 ‘회사’를 상대로 이의를 제기할 경우 ‘기관
          관리자’는 직접 자신의 비용과 책임으로 분쟁을 해결하고 ‘회사’를
          면책시켜야 하며 ‘회사’에 발생한 모든 손해를 배상해야 합니다.
        </S.ListItem>
        <S.ListItem>
          ‘회원’이 ‘회사’가 무료로 제공하는 서비스를 이용하는 경우에는 유료
          서비스에 적용되는 계약 철회 등의 규정은 적용하지 않으며, ‘회사’는 무료
          서비스에 대해서는 손해 배상, 장애 보상, SLA 등의 책임을 부담하지
          않습니다.
        </S.ListItem>
        <S.ListItem>
          ‘회사’는 ‘회원’이 ‘서비스’를 이용하여 기대하는 수익을 상실한 것에
          대하여 책임을 지지 않으며, 그 밖의 ‘서비스’를 통하여 얻은 자료로 인한
          손해에 관하여 책임을 지지 않습니다.
        </S.ListItem>
      </S.List>
    </S.Article>

    <S.Article>
      <S.ArticleTitle>제13조(‘서비스’ 이용 및 변경 등)</S.ArticleTitle>
      <S.List>
        <S.ListItem>
          ‘서비스’의 이용은 ‘회사’의 업무상 또는 기술상 특별한 지장이 없는 한
          연중무휴 1일 24시간을 원칙으로 합니다. 다만 정기 점검 등의 필요로
          ‘회사’가 정한 날이나 시간은 제외됩니다. 정기 점검 시간은 ‘서비스’ 제공
          화면에 공지한 바에 따릅니다.
        </S.ListItem>
        <S.ListItem>
          ‘회사’는 ‘서비스’를 일정 범위로 분할하여 각 범위별로 이용 가능 시간을
          별도로 지정할 수 있습니다. 다만 이러한 경우에는 그 내용을 사전에
          공지합니다.
        </S.ListItem>
        <S.ListItem>
          ‘서비스’의 내용, 이용 방법, 이용 시간에 대하여 변경 또는 ‘서비스’
          중단이 있는 경우에는 변경 또는 중단될 ‘서비스’의 내용 및 사유와 일자
          등은 그 변경 또는 중단전에 ‘회사’ 웹사이트 또는 ‘서비스’ 내 공지사항
          화면 등 ‘회원’이 충분히 인지할 수 있는 방법으로 상당기간을 두고 사전에
          공지하도록 노력합니다. 다만 ‘회사’가 통제할 수 없는 사유로 ‘서비스’가
          중단되어 통지가 불가능한 경우에는 사후에 이를 고지할 수 있습니다.
        </S.ListItem>
        <S.ListItem>
          ‘회사’는 이용 감소로 인한 원활한 ‘서비스’ 제공의 곤란 및 수익성 악화,
          기술 진보에 따른 차세대 ‘서비스’로의 전환 필요성, ‘서비스’ 제공과
          관련한 ‘회사’ 정책의 변경 등 기타 상당한 이유가 있는 경우에 운영상,
          기술상의 필요에 따라 제공하고 있는 전부 또는 일부 ‘서비스’를 변경 또는
          중단할 수 있습니다.
        </S.ListItem>
        <S.ListItem>
          ‘회사’는 무료로 제공되는 ‘서비스’의 일부 또는 전부를 ‘회사’의 운영의
          필요상 수정, 중단, 변경할 수 있으며, 이에 대하여 관련법에 특별한
          규정이 없는 한 ‘회원’에게 별도의 보상을 하지 않습니다.
        </S.ListItem>
      </S.List>
    </S.Article>

    <S.Article>
      <S.ArticleTitle>제14조(회원의 해지)</S.ArticleTitle>
      <S.List>
        <S.ListItem>
          <b>‘회원’의 해지</b>
          <S.SubList>
            <S.SubListItem>
              ‘회원’은 언제든지 ‘회사’에게 해지 의사를 통지함으로써 이용계약을
              해지할 수 있습니다.
            </S.SubListItem>
            <S.SubListItem>
              ‘회원’의 해지 의사가 ‘회사’에 도달한 때에 이용계약은 종료됩니다.
            </S.SubListItem>
          </S.SubList>
        </S.ListItem>
        <S.ListItem>
          ‘회원’이 '기관 관리자' 등으로서 기관이나 공간의 관리권한을 가진 경우,
          제3자에게 관리 권한을 양도하는 등 관리 권한이 없는 상태여야 이용계약이
          종료됩니다.
        </S.ListItem>
        <S.ListItem>
          ‘회원’이 계약을 해지할 경우 관계법령, 본 약관에 따른 의무 이행,
          개인정보처리방침 등에 따라 ‘회사’가 ‘회원’정보를 보유하는 경우를
          제외하고는 ‘회사’는 즉시 ‘회원’의 개인정보를 파기합니다.
        </S.ListItem>
        <S.ListItem>
          ‘회원’은 탈퇴하거나 서비스 이용 계약을 해지하기 전에 ‘회원’ 스스로
          ‘회원’ 데이터를 백업하여야 하며 ‘회원’이 ‘회원’ 데이터를 백업하지 않아
          ‘회원’ 데이터가 소멸하더라도 회사는 책임을 부담하지 않습니다.
        </S.ListItem>
      </S.List>
    </S.Article>

    <S.Article>
      <S.ArticleTitle>제15조(회사의 해지)</S.ArticleTitle>
      <S.List>
        <S.ListItem>
          ‘회사’는 다음과 같은 사유가 있는 경우, 이용계약을 해지할 수 있습니다.
          이 경우 ‘회사’는 ‘회원’에게 전자우편, 전화, 팩스 기타의 방법을 통하여
          해지 사유를 밝혀 해지 의사를 통지합니다. 다만 ‘회사’는 해당 ‘회원’에게
          사전에 해지 사유에 대한 의견진술의 기회를 부여 할 수 있습니다.
          <S.SubList>
            <S.SubListItem>
              제5조 제2항에서 정하고 있는 이용 계약의 승낙 거부 사유가 있음이
              확인된 경우
            </S.SubListItem>
            <S.SubListItem>
              ‘회원’이 ‘회사’나 다른 ‘회원’ 기타 타인의 권리나 명예, 신용 기타
              정당한 이익을 침해하는 행위를 한 경우
            </S.SubListItem>
            <S.SubListItem>
              기타 ‘회원’이 본 약관에 위배되는 행위를 하거나 본 약관에서 정한
              해지 사유가 발생한 경우
            </S.SubListItem>
            <S.SubListItem>1년 이상 ‘서비스’를 이용한 적이 없는 경우</S.SubListItem>
          </S.SubList>
        </S.ListItem>
        <S.ListItem>
          이용 계약은 본 조 1항에 해당하는 경우 ‘회사’가 해지 의사를 ‘회원’에게
          통지함으로써 종료됩니다. 이 경우 ‘회사’가 해지 의사를 ‘회원’이 등록한
          전자우편주소로 발송하여 갈음합니다.
        </S.ListItem>
        <S.ListItem>
          이용 계약의 종료와 관련하여 발생한 손해는 이용 계약이 종료된 해당
          ‘회원’이 책임을 부담하여야 하고 ‘회사’는 일체의 책임을 지지 않습니다.
        </S.ListItem>
        <S.ListItem>
          ‘회원’은 ‘회사’가 ‘서비스’ 이용 계약을 해지하기 전에 ‘회원’ 스스로
          ‘회원’ 데이터를 백업하여야 하며 ‘회원’이 ‘회원’ 데이터를 백업하지 않아
          ‘회원’ 데이터가 소멸하더라도 회사는 책임을 부담하지 않습니다.
        </S.ListItem>
      </S.List>
    </S.Article>

    <S.Article>
      <S.ArticleTitle>제16조(‘서비스’ 이용제한)</S.ArticleTitle>
      <S.List>
        <S.ListItem>
          ‘회사’는 ‘회원’ 이 본 약관의 의무를 위반하거나 ‘서비스’의 정상적인
          운영을 방해한 경우, 경고, 일시정지, 영구이용정지 등으로 ‘서비스’
          이용을 단계적으로 제한할 수 있습니다.
        </S.ListItem>
        <S.ListItem>
          ‘회사’는 본조 제1항에도 불구하고, ‘주민등록법’을 위반한 명의도용 및
          결제도용, 전화번호 도용, ‘저작권법’을 위반한 불법프로그램의 제공 및
          운영방해, ‘정보통신망법’을 위반한 불법통신 및 해킹, 악성프로그램의
          배포, 접속권한 초과행위 등과 같이 관련법을 위반한 경우에는 즉시
          영구이용정지를 할 수 있습니다. 본 항에 따른 영구이용정지 시 ‘서비스’
          이용을 통해 얻은 ‘서비스’ 내 혜택 등은 모두 소멸되며, ‘회사’는 이에
          대해 별도로 보상하지 않습니다.
        </S.ListItem>
        <S.ListItem>
          본 조에 따라 ‘서비스’ 이용을 제한하는 경우, ‘회사’는 ‘회원’에게
          이용제한 사유, 이용제한 유형 및 기간, 이용제한에 대한 이의신청 방법을
          통지합니다.
        </S.ListItem>
        <S.ListItem>
          본 조의 이용제한 범위 내에서 제한의 조건 및 세부내용은 ‘회사’의
          이용제한정책에서 정하는 바에 의합니다.
        </S.ListItem>
        <S.ListItem>
          본 조에 따라 ‘서비스’ 이용을 제한하거나 계약을 해지하는 경우에는
          ‘회사’는 제9조[‘회원’에 대한 통지]에 따라 통지합니다.
        </S.ListItem>
        <S.ListItem>
          ‘회원’은 본 조에 따른 이용제한 등에 대해 ‘회사’가 정한 절차에 따라
          이의신청을 할 수 있습니다. 이 때 이의가 정당하다고 ‘회사’가 인정하는
          경우 ‘회사’는 즉시 ‘서비스’의 이용을 재개합니다.
        </S.ListItem>
      </S.List>
    </S.Article>

    <S.Article>
      <S.ArticleTitle>제17조(권리의 귀속 등)</S.ArticleTitle>
      <S.List>
        <S.ListItem>
          ‘서비스’에 대한 저작권 및 지적재산권은 ‘회사’에 귀속됩니다. 단, ‘회원’
          의 ‘게시물’ 및 제휴 계약에 따라 제공된 저작물 등은 제외합니다.
        </S.ListItem>
        <S.ListItem>
          ‘회사’가 제공하는 ‘서비스’의 디자인, ‘회사’가 만든 텍스트,
          스크립트(script), 영상, 그래픽, ‘회원’ 상호간 전송 기능 등 ‘회사’가
          제공하는 ‘서비스’에 관련된 모든 상표, ‘서비스’ 마크, 로고 등에 관한
          저작권 기타 지적재산권은 대한민국 및 외국의 법령에 기하여 ‘회사’가
          보유하고 있거나 ‘회사’에게 소유권 또는 사용권이 있습니다.
        </S.ListItem>
        <S.ListItem>
          ‘회원’ 은 본 이용약관으로 인하여 ‘서비스’를 소유하거나 ‘서비스’에 관한
          저작권을 보유하게 되는 것이 아니라, ‘회사’로부터 ‘서비스’의 이용을
          허락 받는바, ‘서비스’는 정보 취득 또는 개인 용도로만 제공되는 형태로
          ‘회원’이 이용할 수 있습니다.
        </S.ListItem>
        <S.ListItem>
          ‘회원’은 명시적으로 허락된 내용을 제외하고는 ‘서비스’를 통해 얻어지는
          ‘회원’ 상태 정보를 영리 목적으로 사용, 복사, 유통하는 것을 포함하여
          ‘회사’가 만든 텍스트, 스크립트, 영상, 그래픽의 ‘회원’ 상호간 전송기능
          등을 복사하거나 유통할 수 없습니다.
        </S.ListItem>
        <S.ListItem>
          ‘회사’는 ‘서비스’와 관련하여 ‘회원’에게 ‘회사’가 정한 이용조건에 따라
          계정, ID, 콘텐츠 등을 이용할 수 있는 이용권만을 부여하며, ‘회원’은
          이를 양도, 판매, 담보제공 등의 처분행위를 할 수 없습니다.
        </S.ListItem>
        <S.ListItem>
          ‘회원’ 은 자신이 ‘서비스’에 게재 또는 등록한 게시물에 대한
          비독점적∙취소불가능∙양도 및 서브라이선스 가능한∙사용료 없는 전세계적
          사용권을 ‘회사’에게 부여합니다. 이에 따라 ‘회사’는 ‘회원’이 작성한
          게시물을 검색 노출, 판촉, 홍보 기타의 자료로 무상으로 영구적으로
          사용할 수 있으며, 필요한 범위 내에서 ‘게시물’의 일부를 수정, 복제,
          편집할 수 있습니다. ‘회원’이 ‘회사’와의 이용계약을 해지한 경우에도
          기존 게시물에 관한 ‘회사’의 사용권은 유효하게 존속합니다. 이 때
          ‘회사’는 특정 ‘회원’의 신상정보를 노출하는 방법으로 사용하지 않도록
          하고, 이를 예방하기 위하여 노력합니다.
        </S.ListItem>
      </S.List>
    </S.Article>

    <S.Article>
      <S.ArticleTitle>제18조(정보의 제공 및 광고의 게재)</S.ArticleTitle>
      <S.List>
        <S.ListItem>
          ‘회사’는 ‘서비스’ 이용에 필요가 있다고 인정되거나 ‘서비스’ 개선 및
          ‘회원’ 대상의 ‘서비스’ 소개 등의 목적으로 하는 각종 정보를 이메일,
          푸시 알림, 문자메시지 등의 방법으로 ‘회원’에게 제공할 수 있습니다.
          다만, ‘회원’은 관련법령에 따라 거래관련 정보 및 고객문의 등에 대한
          답변 등을 제외하고는 언제든지 ‘회사’에 대하여 광고성 정보 수신을
          거절할 수 있습니다.
        </S.ListItem>
        <S.ListItem>
          ‘회사’가 ‘회원’에게 ‘서비스’를 제공할 수 있는 ‘서비스’ 투자 기반의
          일부는 광고 게재를 통한 수익으로부터 나옵니다. ‘회원’ 및 ‘회원’은
          ‘서비스’ 이용 시 노출되는 광고 게재에 대해 동의합니다.
        </S.ListItem>
        <S.ListItem>
          ‘회사’는 ‘서비스’ 상에 게재되어 있거나 ‘서비스’를 통한 광고주의 판촉
          활동에 ‘회원’이 참여하거나 교신 또는 거래를 함으로써 발생하는 손실과
          손해에 대해 일체의 책임을 지지 않습니다.
        </S.ListItem>
      </S.List>
    </S.Article>

    <S.Article>
      <S.ArticleTitle>제19조(준거법 및 관할법원)</S.ArticleTitle>
      <S.List>
        <S.ListItem>
          이 약관의 해석 및 ‘회사’와 ‘회원’ 간의 분쟁에 대해서는 대한민국의 법을
          적용합니다.
        </S.ListItem>
        <S.ListItem>
          ‘서비스’ 이용 중 발생한 ‘회원’과 ‘회사’간의 소송은 민사소송법에 따라
          관할권을 가지는 법원을 관할 법원으로 합니다.
        </S.ListItem>
      </S.List>
    </S.Article>

    <S.Article>
      <S.ArticleTitle>부 칙</S.ArticleTitle>
      <S.Paragraph>
        본 약관은 2025년 9월 2일 공지되어, 2025년 9월 2일부터 적용됩니다. 단, 본
        약관의 공지 시점으로부터 적용일 전일까지 기간 동안에 가입한 신규 회원에
        대해서는 회원가입시부터 본 약관이 적용됩니다.
      </S.Paragraph>
    </S.Article>
  </div>
);

export default TermsContent;
