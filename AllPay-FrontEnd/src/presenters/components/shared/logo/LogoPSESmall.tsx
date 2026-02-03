'use client';

import Image from 'next/image';

const LogoPSESmall = () => {
  return (
    <div className="flex items-center justify-center">
      <Image
        width={24}
        height={24}
        src="/images/corporate/pse.png"
        alt="Logo PSE"
        className="w-6 h-6 object-contain"
        priority
      />
    </div>
  );
};

export default LogoPSESmall; 