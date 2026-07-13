import { ReactElement } from 'react';
import { useSearchParams } from 'react-router-dom';
import Seo from 'components/Seo/Seo';
import SearchResultsSection from './SearchResultsSection';
import HomeContentSection from './HomeContentSection';
import './mainpage.scss';

const MainPage = (): ReactElement => {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') ?? '';

  return (
    <div className="main-page-container">
      <Seo
        description="FaceReview 홈에서 감정 기반으로 추천되는 영상들을 만나보세요. 드라마, 예능, 먹방, 음악까지 다양한 장르의 인기 영상을 내 표정으로 리뷰하세요."
        keywords="감정 영상 추천, 영상 추천, 인기 영상, 드라마, 예능, 먹방, FaceReview 홈, 페이스리뷰"
        path="/main"
      />
      {searchQuery ? (
        <SearchResultsSection query={searchQuery} />
      ) : (
        <HomeContentSection />
      )}
    </div>
  );
};

export default MainPage;
