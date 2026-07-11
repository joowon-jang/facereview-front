import React, { ReactElement, useEffect } from 'react';
import ReactModal from 'react-modal';
import { lockBodyScroll, unlockBodyScroll } from 'utils/scrollLock';
import './modaldialog.scss';

type ModalDialogPropTypes = {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  contentLabel?: string;
};

const ModalDialog = ({
  children,
  isOpen,
  onClose,
  contentLabel = '대화상자',
}: ModalDialogPropTypes): ReactElement => {
  // Bind react-modal to the app root so it can manage aria-hidden on the rest of the app.
  useEffect(() => {
    const el = document.getElementById('root');
    if (el) ReactModal.setAppElement(el);
  }, []);

  // Nested-safe scroll lock; html scrollbar-gutter keeps width stable.
  useEffect(() => {
    if (!isOpen) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [isOpen]);

  return (
    <ReactModal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="modal-dialog"
      overlayClassName="modal-overlay"
      contentLabel={contentLabel}
      aria={{
        labelledby: undefined,
        describedby: undefined,
      }}>
      {children}
    </ReactModal>
  );
};

export default ModalDialog;
