import React from 'react';

interface CustomButtonProps {
  onClick: () => void;
  loading?: boolean;
  label: string;
}

const CustomButton: React.FC<CustomButtonProps> = ({ onClick, loading = false, label }) => {
  return (
    <button
      onClick={onClick}
      type="button"
      className="  block rounded-full shadow-xl bg-[#4D750F] px-6 py-2 font-medium text-white float-right"
    >
      {label}
      {loading && (
        <span className="loader" style={{ width: '20px', height: '20px', marginLeft: '10px' }}></span>
      )}
    </button>
  );
};

export default CustomButton;
