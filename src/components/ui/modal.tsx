'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Focus trapping when opened
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll(
      'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          e.preventDefault();
        }
      }
    };

    const currentModal = modalRef.current;
    firstElement?.focus();
    currentModal?.addEventListener('keydown', handleFocusTrap);

    return () => {
      currentModal?.removeEventListener('keydown', handleFocusTrap);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-all duration-300 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Click outside to close */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      <div 
        ref={modalRef}
        className="bg-slate-900 border border-slate-800 max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-850/50 flex items-center justify-between">
          <h3 id="modal-title" className="font-bold text-white text-base leading-none">
            {title}
          </h3>
          <button 
            onClick={onClose}
            aria-label="Close modal"
            className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[75vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
