import React from 'react';

const Modal = ({ children, button, title = '', onClose }: {
  children: React.ReactNode,
  button?: any,
  onClose?: any
  title: string
}) => {

  return (
    <div>
      <div className='fixed top-10 left-0 w-full h-full backdrop-blur-sm flex justify-center items-center' style={{ zIndex: 100 }}>
        <div className='max-w-[900px] mr-10 ml-10 bg-white shadow-lg py-2 rounded-md'>
        <div className='text-sm font-medium text-gray-900 border-b border-gray-300 py-3 px-4 mb-4 h-13'>
            <h2 className='float-left'>{title}</h2>
            {onClose && (
              <span className='float-right cursor-pointer' onClick={() => onClose()}>X</span>
            )}
          </div>
          <div className='px-4 pb-4' style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <div className='text-md font-medium' style={{ margin: '0px 20px' }}>
              {children}
            </div>
          </div>
          {button && (
            <div className='flex justify-between items-center px-4 pt-2 float-right'>
              {button}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;