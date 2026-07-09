import { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import Button from 'components/Button/Button';
import Seo from 'components/Seo/Seo';
import './notfoundpage.scss';

const NotFoundPage = (): ReactElement => {
  return (
    <div className="not-found-container">
      <Seo
        title="페이지를 찾을 수 없어요"
        description="요청하신 페이지가 존재하지 않거나 이동되었어요. FaceReview 홈으로 돌아가 영상을 계속 즐겨보세요."
        path="/404"
        noindex
      />
      <h1 className="not-found-code" aria-label="404 오류">
        <span aria-hidden="true">4</span>
        <span className="not-found-emoji" aria-hidden="true">
          😲
        </span>
        <span aria-hidden="true">4</span>
      </h1>
      <p className="not-found-title font-title-medium">
        이 페이지는 표정을 잃었어요
      </p>
      <p className="not-found-text font-body-large">
        주소가 바뀌었거나 삭제된 페이지예요.
      </p>
      <Link to="/">
        <Button label="홈으로 돌아가기" variant="cta-fixed" />
      </Link>
    </div>
  );
};

export default NotFoundPage;
