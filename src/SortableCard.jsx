import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function SortableCard({ 
  id, 
  title, 
  dueDate, 
  assignee, 
  isDimmed, 
  onView, 
  onEdit, 
  onDelete 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  // --- 1. BAŞLIK KONTROLÜ ---
  // Eğer verinin adı "--" ile başlıyorsa bu bir ARA BAŞLIKTIR.
  const isHeader = title.trim().startsWith('--');
  
  // Ekranda gösterirken tireleri temizleyelim (Örn: "-- TEST --" -> "TEST")
  const displayTitle = isHeader ? title.replaceAll('-', '').trim() : title;

  // --- SÜRÜKLEME SIRASINDAKİ GÖRÜNÜM (GHOST) ---
  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`opacity-30 rounded-xl w-full border-2 border-dashed border-indigo-500 
          ${isHeader ? 'h-10 bg-slate-700 my-4' : 'h-[100px] bg-slate-800'}`}
      />
    );
  }

  // --- 2. ARA BAŞLIK TASARIMI ---
  // Eğer bu bir başlıksa, kart gibi değil, çizgi üzerinde metin gibi görünür.
  if (isHeader) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        // Mobilde yanlışlıkla açılmasın diye onClick olayını boş geçiyoruz
        className="group relative w-full flex items-center justify-center py-4 cursor-grab active:cursor-grabbing touch-none select-none"
      >
        {/* Arkadaki Kesik Çizgi */}
        <div className="absolute inset-0 flex items-center px-2">
          <div className="w-full border-t-2 border-dashed border-slate-700/60"></div>
        </div>

        {/* Başlık Metni (Hap Şeklinde) */}
        <div className="relative z-10 bg-slate-900 px-4 py-1 text-slate-400 font-bold text-xs uppercase tracking-widest border border-slate-700 rounded-full shadow-sm flex items-center gap-2">
          {displayTitle}
          
          {/* Silme Butonu (Sadece üzerine gelince görünür) */}
          <button
             onClick={(e) => { e.stopPropagation(); onDelete(e); }}
             className="ml-1 w-5 h-5 flex items-center justify-center rounded-full text-slate-600 hover:text-red-400 hover:bg-slate-800 transition-all opacity-0 group-hover:opacity-100"
             title="Başlığı Sil"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  // --- 3. NORMAL KART TASARIMI (Standart Görünüm) ---
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onView}
      className={`
        group relative w-full bg-slate-800 hover:bg-slate-750 
        border border-slate-700/50 hover:border-indigo-500/50 
        p-4 rounded-xl shadow-sm transition-all cursor-grab active:cursor-grabbing 
        touch-none select-none
        ${isDimmed ? 'opacity-25 grayscale pointer-events-none' : 'opacity-100'}
      `}
    >
      <div className="flex justify-between items-start gap-2 mb-3">
        <h4 className="text-slate-200 font-medium text-sm leading-snug break-words">
          {title}
        </h4>

        {/* Aksiyon Butonları */}
        <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(e); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-700 rounded-lg transition-colors"
          >
            ✏️
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(e); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded-lg transition-colors"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Alt Bilgiler */}
      {(dueDate || assignee) && (
        <div className="flex flex-wrap gap-2 mt-auto pt-2 border-t border-slate-700/50">
          {assignee && (
            <div className="flex items-center gap-1.5 bg-slate-900/50 px-2 py-1 rounded-md border border-slate-700/50">
              <span className="text-xs">👷</span>
              <span className="text-[10px] font-bold text-slate-400 truncate max-w-[80px]">
                {assignee}
              </span>
            </div>
          )}
          
          {dueDate && (
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-bold border-slate-700/50
              ${new Date(dueDate) < new Date() ? 'bg-rose-950/30 text-rose-400' : 'bg-slate-900/50 text-slate-400'}
            `}>
              <span>📅</span>
              <span>{new Date(dueDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}