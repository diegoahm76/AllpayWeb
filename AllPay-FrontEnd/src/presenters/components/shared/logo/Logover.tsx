'use client';

import Image from 'next/image';

const Delet_icon = () => {

    return (
        <div className="flex items-center justify-center w-full">
            <Image
                width={24}
                height={24}
                src={'/images/icons/delete.png'}
                alt="Update_icon"
                className="m-auto w-auto h-auto max-w-[140px] max-h-[140px]"
                priority
            />
        </div>
    );
};

export default Delet_icon;
