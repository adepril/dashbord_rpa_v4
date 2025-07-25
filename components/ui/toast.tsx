import React from 'react';

interface ToastProps {
  title: string;
  description?: string;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ title, description, onClose }) => {
  return (
    <div className="toast">
      <div className="toast-header">
        <strong className="mr-auto">{title}</strong>
        <button type="button" className="ml-2 close" onClick={onClose}>
          &times;
        </button>
      </div>
      {description && <div className="toast-body">{description}</div>}
    </div>
  );
};

export default Toast;
