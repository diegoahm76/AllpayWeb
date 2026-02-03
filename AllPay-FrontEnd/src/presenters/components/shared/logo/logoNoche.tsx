'use client';

import Image from 'next/image';

const LogoNoche = () => {

    return (
        <div className="flex items-center justify-center w-full">
            <Image
                width={24}
                height={24}
                src={'/images/corporate/logoNoche.png'}
                alt="LogoHome"
                className="m-auto w-auto h-auto max-w-[140px] max-h-[140px]"
                priority
            />
        </div>
    );
};

export default LogoNoche;
