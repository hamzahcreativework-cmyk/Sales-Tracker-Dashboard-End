import React from 'react';
import { CloseIcon } from './Icons';

interface ImagePreviewModalProps {
    src: string;
    onClose: () => void;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ src, onClose }) => {
    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-[60] fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="Image Preview"
        >
            <div 
                className="relative max-w-4xl max-h-[90vh] w-full h-full"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on the image itself
            >
                <img 
                    src={src} 
                    alt="Pratinjau Gambar Laporan" 
                    className="object-contain w-full h-full"
                />
                <button 
                    onClick={onClose} 
                    className="absolute -top-2 -right-2 sm:top-2 sm:right-2 text-white bg-black/50 p-2 rounded-full hover:bg-black/80 transition-colors"
                    aria-label="Close image preview"
                >
                    <CloseIcon className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
};

export default ImagePreviewModal;
