'use client';

import Image from 'next/image';

interface DescargaProps {
  width?: number;
  height?: number;
}

const Descarga: React.FC<DescargaProps> = ({ width = 24, height = 24 }) => {
  return (
    <div className="flex items-center justify-center w-full">
      <Image
        width={width}
        height={height}
        src="/images/icons/descarga.png"
        alt="Descarga_icon"
        className="m-auto w-auto h-auto"
        priority
      />
    </div>
  );
};

export default Descarga;
