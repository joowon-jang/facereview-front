import { ReactElement, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import ProfileIcon from 'components/ProfileIcon/ProfileIcon';
import TextInput from 'components/TextInput/TextInput';
import UploadButton from 'components/UploadButton/UploadButton';
import ModalDialog from 'components/ModalDialog/ModalDialog';
import Button from 'components/Button/Button';
import CommentItem from 'components/CommentItem/CommentItem';
import {
  deleteComment,
  getVideoComments,
  modifyComment,
  sendNewComment,
} from 'api/watch';
import { getTimeToString, mapNumberToEmotion } from 'utils/index';
import { useRequireSignIn } from 'hooks/useRequireSignIn';

const PROFILE_ICON_STYLE = { marginRight: '12px' };

type CommentSectionProps = {
  videoId: string;
  isMobile: boolean;
  userProfile: number;
};

export const CommentSection = ({
  videoId,
  isMobile,
  userProfile,
}: CommentSectionProps): ReactElement => {
  const queryClient = useQueryClient();
  const requireSignIn = useRequireSignIn();

  const [comment, setComment] = useState('');
  const [modifyingComment, setModifyingComment] = useState('');
  const [hoveredComment, setHoveredComment] = useState<string | null>(null);
  const [isEditVisible, setIsEditVisible] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(
    null,
  );
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  const { data: commentList = [], isLoading: isCommentsLoading } = useQuery({
    queryKey: ['videoComments', videoId],
    queryFn: () => getVideoComments({ video_id: videoId }),
    enabled: !!videoId,
  });

  const commentMutation = useMutation({
    mutationFn: (newComment: string) =>
      sendNewComment({ content: newComment, video_id: videoId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videoComments', videoId] });
      setComment('');
    },
    onError: () => {
      toast.error('댓글이 달리지 않았어요', { toastId: 'error new comment' });
    },
  });

  const modifyCommentMutation = useMutation({
    mutationFn: (params: { comment_id: string; content: string }) =>
      modifyComment(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videoComments', videoId] });
      setEditingCommentId(null);
    },
    onError: () => {
      toast.error('댓글 수정에 실패했어요', {
        toastId: 'error modify comment',
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (comment_id: string) => deleteComment({ comment_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videoComments', videoId] });
      closeDeleteModal();
    },
    onError: () => {
      toast.error('댓글 삭제에 실패했어요', {
        toastId: 'error delete comment',
      });
    },
  });

  const handleCommentSubmit = () => {
    if (!requireSignIn()) return;
    if (commentMutation.isPending) return;
    const trimmed = comment.trim();
    if (trimmed.length > 0) {
      commentMutation.mutate(trimmed);
    }
  };

  const openDeleteModal = () => {
    setIsDeleteModalOpen(true);
  };
  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setIsEditVisible(null);
  };

  // CommentItem callbacks — React Compiler handles memoization automatically
  const handleCommentMouseEnter = (commentId: string) => {
    setHoveredComment(commentId);
  };
  const handleCommentMouseLeave = () => {
    setHoveredComment(null);
    setIsEditVisible(null);
  };
  const handleCommentEditClick = (commentId: string) => {
    // 터치 환경에서는 mouseLeave 가 발생하지 않으므로 토글로 닫을 수 있게 한다
    setIsEditVisible((prev) => (prev === commentId ? null : commentId));
  };
  const handleCommentDeleteClick = () => {
    setIsEditVisible(null);
    openDeleteModal();
  };
  const handleModifyingCommentSave = () => {
    const trimmed = modifyingComment.trim();
    if (
      editingCommentId === null ||
      trimmed.length === 0 ||
      modifyCommentMutation.isPending
    ) {
      return;
    }
    modifyCommentMutation.mutate({
      comment_id: editingCommentId,
      content: trimmed,
    });
  };
  const handleCommentStartEditing = (commentId: string) => {
    setIsEditVisible(null);
    setEditingCommentId(commentId);
    const target = commentList.find((item) => item.comment_id === commentId);
    if (target) {
      setModifyingComment(target.content);
    }
  };

  return (
    <div className="comment-container">
      <div className="comment-input-container">
        <ProfileIcon
          type={isMobile ? 'icon-small' : 'icon-medium'}
          color={mapNumberToEmotion(userProfile)}
          style={PROFILE_ICON_STYLE}
        />
        <TextInput
          variant="underline"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={(e) => {
            // 한글 IME 조합 중 Enter 는 무시 (isComposing)
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              handleCommentSubmit();
            }
          }}
          placeholder={'영상에 대한 의견을 남겨보아요'}
          aria-label="댓글 입력"
          disabled={commentMutation.isPending}
        />
        <UploadButton
          onClick={handleCommentSubmit}
          aria-label="댓글 등록"
          isDisabled={commentMutation.isPending}
          style={{
            marginLeft: '12px',
            display: comment.trim().length > 0 ? 'block' : 'none',
          }}
        />
      </div>
      <div
        className={
          isMobile
            ? 'comment-info-text font-title-mini'
            : 'comment-info-text font-title-small'
        }>
        {isCommentsLoading ? '댓글' : `댓글 ${commentList.length}개`}
      </div>
      <div className="comment-list-container">
        {isCommentsLoading ? (
          [0, 1, 2].map((index) => (
            <div
              className="comment-skeleton"
              key={index}
              role="status"
              aria-busy="true"
              aria-label="댓글 불러오는 중">
              <div className="comment-skeleton-avatar" />
              <div className="comment-skeleton-lines">
                <div className="comment-skeleton-line short" />
                <div className="comment-skeleton-line" />
              </div>
            </div>
          ))
        ) : commentList.length > 0 ? (
          commentList.map((item) =>
            item.comment_id === editingCommentId ? (
              <div key={item.comment_id} className="comment-modifying-container">
                <ProfileIcon
                  type={'icon-small'}
                  color={mapNumberToEmotion(userProfile)}
                  style={PROFILE_ICON_STYLE}
                />
                <div className="comment-modifying-wrapper">
                  <div className="comment-modifying-info-wrapper">
                    <div className="comment-modifying-nickname font-label-small">
                      {item.user_name}
                    </div>
                    <div className="comment-modifying-time-text font-label-small">
                      {getTimeToString(item.created_at)}
                    </div>
                  </div>
                  <TextInput
                    variant="underline"
                    value={modifyingComment}
                    onChange={(e) => setModifyingComment(e.target.value)}
                    onKeyDown={(e) => {
                      // 한글 IME 조합 중 Enter 는 무시 (isComposing)
                      if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                        handleModifyingCommentSave();
                      }
                    }}
                    placeholder={''}
                    aria-label="댓글 수정"
                    style={{ marginBottom: '16px' }}
                  />
                  <div className="comment-modifying-button-wrapper">
                    <button
                      type="button"
                      className="comment-modifying-cancel font-label-small"
                      onClick={() => {
                        setEditingCommentId(null);
                      }}>
                      취소
                    </button>
                    <button
                      type="button"
                      className="comment-modifying-save font-label-small"
                      disabled={
                        modifyingComment.trim().length === 0 ||
                        modifyCommentMutation.isPending
                      }
                      onClick={handleModifyingCommentSave}>
                      저장
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <CommentItem
                key={item.comment_id}
                user_name={item.user_name}
                created_at={getTimeToString(item.created_at)}
                content={item.content}
                user_profile_image_id={item.user_profile_image_id}
                comment_id={item.comment_id}
                is_modified={item.is_modified}
                is_mine={item.is_mine}
                user_id={item.user_id}
                hoveredComment={hoveredComment}
                isEditVisible={isEditVisible}
                isMobile={isMobile}
                onMouseEnter={handleCommentMouseEnter}
                onMouseLeave={handleCommentMouseLeave}
                onEditClick={handleCommentEditClick}
                onDeleteClick={() => {
                  setDeletingCommentId(item.comment_id);
                  handleCommentDeleteClick();
                }}
                onStartEditing={handleCommentStartEditing}
              />
            ),
          )
        ) : (
          <p className="no-comments-text font-label-large">아직 댓글이 없어요</p>
        )}
        {/* Single modal instance outside the loop */}
        <ModalDialog
          isOpen={isDeleteModalOpen}
          onClose={closeDeleteModal}
          contentLabel="댓글 삭제 확인">
          <div className="comment-delete-modal-container">
            <h2>댓글을 삭제하시겠어요?</h2>
            <div className="comment-delete-modal-button-wrapper">
              <Button
                label={'취소'}
                variant={'cta-fixed-secondary'}
                style={{
                  marginRight: '12px',
                  background: '#5D5D6D',
                }}
                onClick={closeDeleteModal}
              />
              <Button
                label={'확인'}
                variant={'cta-fixed'}
                disabled={deleteCommentMutation.isPending}
                onClick={() => {
                  if (deletingCommentId) {
                    deleteCommentMutation.mutate(deletingCommentId);
                  }
                }}
              />
            </div>
          </div>
        </ModalDialog>
      </div>
    </div>
  );
};
