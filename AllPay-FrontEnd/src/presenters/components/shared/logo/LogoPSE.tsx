'use client';

import Image from 'next/image';

const LogoPSE = ({ className }: { className?: string }) => {

  return (
    <div className="flex items-center justify-center w-full">
      <Image
        width={110}
        height={110}
        src="/images/corporate/pse.png" // Asumimos que guardaremos la imagen aquí
        alt="Logo PSE"
        className={`m-auto w-auto h-auto max-w-[110px] max-h-[110px] ${className}`}
        priority
      />
    </div>
  );
};

export default LogoPSE; 