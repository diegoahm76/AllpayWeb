'use client';

import Image from 'next/image';

interface EditarProps {
  width?: number;
  height?: number;
}

const Editar: React.FC<EditarProps> = ({ width = 20, height = 20 }) => {
  return (
    <div className="flex items-center justify-center w-full">
      <Image
        width={width}
        height={height}
        src="/images/icons/update.png"
        alt="Update_icon"
        className="m-auto w-auto h-auto"
        priority
      />
    </div>
  );
};

export default Editar;
