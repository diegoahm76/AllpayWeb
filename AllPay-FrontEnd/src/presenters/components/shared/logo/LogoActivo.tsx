'use client';

import Image from 'next/image';

const LogoActivo = () => {

    return (
        <div className="flex items-center justify-center w-full">
            <Image
                width={34}
                height={34}
                src={'/images/corporate/logoActivo.png'}
                alt="LogoHome"
                className="m-auto w-auto h-auto max-w-[140px] max-h-[140px]"
                priority
            />
        </div>
    );
};

export default LogoActivo;
