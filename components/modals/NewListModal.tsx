import React, { useState, useEffect } from 'react';
import { t } from '../../translations';
import JalaliCalendar from '../common/JalaliCalendar';

interface NewListModalProps {
  onClose: () => void;
  onCreate: (date: Date) => void;
}

const getUtcToday = () => {
    const today = new Date();
    return new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
};

const NewListModal: React.FC<NewListModalProps> = ({ onClose, onCreate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getUtcToday());

  useEffect(() => {
    setIsOpen(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(selectedDate);
    handleClose();
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`fixed inset-0 bg-black/70 flex items-center justify-center z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleClose}
    >
      <div
        className={`bg-surface p-6 rounded-xl border border-border shadow-card w-full max-w-sm m-4 transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-primary mb-4 text-center">{t.createNewListTitle}</h2>
        <form onSubmit={handleSubmit}>
          
          <div className="p-4 bg-background rounded-lg border border-border">
             <JalaliCalendar
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                isEmbedded={true}
             />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={handleClose} className="px-4 py-2 bg-border text-primary font-medium rounded-lg hover:bg-border/70 transition-colors">
              {t.cancel}
            </button>
            <button type="submit" className="px-4 py-2 bg-accent text-accent-text font-medium rounded-lg hover:opacity-90 transition-opacity">
              {t.create}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewListModal;