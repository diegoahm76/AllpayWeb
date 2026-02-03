import React from 'react';
import ModalContainer from '../ui/ModalContainer';
import { Button } from '../ui/AnimatedButton';
import Image from 'next/image';

interface AlertNotificationProps {
    isOpen: boolean;
    onClose: () => void;
    notificationText: string;
}

const AlertNotification: React.FC<AlertNotificationProps> = ({
    isOpen,
    onClose,
    notificationText
}) => {
    return (
        <ModalContainer isOpen={isOpen} onClose={onClose}>
            <div className="flex flex-col items-center gap-6 pt-4">
                {/* Logo */}
                <div className="w-48">
                    <Image
                        src="/images/corporate/logo.png"
                        alt="Federación Nacional de Cacaoteros"
                        width={200}
                        height={100}
                        style={{ width: '100%', height: 'auto' }}
                    />
                </div>

                {/* Título */}
                <h2 className="text-[#562707] font-bold text-lg">
                    SEÑOR(A) RECAUDOR(A)
                </h2>

                {/* Texto de la notificación */}
                <p className="text-[#562707] text-center" dangerouslySetInnerHTML={{ __html: notificationText }} />

                {/* Botón */}
                <div className="flex gap-4 mt-4">
                    <Button
                        title="Aceptar"
                        onClick={onClose}
                        className="bg-[#4D750F] hover:bg-[#3a5a0a] w-24"
                    />
                </div>
            </div>
        </ModalContainer>
    );
};

export default AlertNotification;