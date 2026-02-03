'use client';

import Image from 'next/image';

const LogoHome = () => {

    return (
        <div className="flex items-center justify-center w-full">
            <Image
                width={24}
                height={24}
                src={'/images/corporate/home.png'}
                alt="LogoHome"
                className="m-auto w-auto h-auto max-w-[140px] max-h-[140px]"
                priority
            />
        </div>
    );
};

export default LogoHome;
