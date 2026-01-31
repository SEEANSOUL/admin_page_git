import React, { useEffect, useState, useMemo, useRef } from 'react'
import { supabase } from './../supabaseClient'
import {
  DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay, useDroppable, closestCorners
} from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { SortableCard } from './SortableCard'
import Login from './Login'
import Tesseract from 'tesseract.js' // Sadece Kamera/OCR kaldı
import './App.css' 

// --- Droppable Container ---
function DroppableContainer({ id, children, className }) {
  const { setNodeRef } = useDroppable({ id });
  return <div ref={setNodeRef} className={className}>{children}</div>;
}

function App() {
  const [session, setSession] = useState(null)
  
  // Veri State'leri
  const [boards, setBoards] = useState([])
  const [lists, setLists] = useState([])
  const [cards, setCards] = useState([])
  
  const [view, setView] = useState('dashboard') 
  const [activeBoardId, setActiveBoardId] = useState(null)
  const [activeId, setActiveId] = useState(null)
  
  // İşlemler (Kamera ve OCR)
  const [isProcessing, setIsProcessing] = useState(false) 
  const fileInputRef = useRef(null) 
  const [targetListId, setTargetListId] = useState(null) 

  // UI State'leri
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalConfig, setModalConfig] = useState({ 
    title: '', value: '', color: 'gray', isBatch: false, 
    showColors: false, showMachineOption: false, isMachine: false,
    isAssignMode: false, 
    onConfirm: null 
  })
  
  const [selectedCard, setSelectedCard] = useState(null)
  const [detailValues, setDetailValues] = useState({ description: '', due_date: '', assignee: '' })
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const [alertConfig, setAlertConfig] = useState({ title: '', message: '', onConfirm: null })
  const [searchQuery, setSearchQuery] = useState('')
  const [lastInteractionTime, setLastInteractionTime] = useState(0)

  const factoryStaff = ["Ahmet Usta", "Mehmet Şef", "Ayşe Kontrol", "Fatma Depo", "Ali Montaj", "Veli Paketleme"]
  const colors = [
    { name: 'gray',   cssClass: 'bg-gray' },
    { name: 'green',  cssClass: 'bg-green' },
    { name: 'red',    cssClass: 'bg-red' },
    { name: 'yellow', cssClass: 'bg-yellow' },
    { name: 'blue',   cssClass: 'bg-blue' }
  ]

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  )

  const activeBoard = useMemo(() => boards.find(b => b.id === activeBoardId), [boards, activeBoardId]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) {
      fetchBoards().then((loadedBoards) => {
        const savedId = localStorage.getItem('lastActiveBoardId')
        if (savedId && loadedBoards) {
          const idNum = parseInt(savedId)
          if (loadedBoards.some(b => b.id === idNum)) {
             setActiveBoardId(idNum)
             setView('board_detail')
          }
        }
      })
    }
  }, [session])

  useEffect(() => {
    if (activeBoardId && view === 'board_detail') {
      localStorage.setItem('lastActiveBoardId', activeBoardId)
      fetchBoardContent(activeBoardId)
      const interval = setInterval(() => {
        const isDragging = activeId !== null;
        const isDetailOpen = selectedCard !== null;
        const isCoolingDown = (Date.now() - lastInteractionTime) < 5000; 
        if (!isDragging && !isDetailOpen && !isCoolingDown) fetchBoardContent(activeBoardId, true) 
      }, 2000) 
      return () => clearInterval(interval)
    } 
    else if (view === 'dashboard') {
      localStorage.removeItem('lastActiveBoardId')
      setActiveBoardId(null)
      const interval = setInterval(() => fetchBoards(), 5000)
      return () => clearInterval(interval)
    }
  }, [activeBoardId, view, activeId, selectedCard, lastInteractionTime])

  async function fetchBoards() {
    const { data } = await supabase.from('boards').select('*').order('created_at', { ascending: false })
    if (data) setBoards(prev => JSON.stringify(prev) !== JSON.stringify(data) ? data : prev)
    return data
  }

  async function fetchBoardContent(boardId) {
    const { data: l } = await supabase.from('lists').select('*').eq('board_id', boardId).order('position')
    const { data: c } = await supabase.from('cards').select('*').order('position')
    if (l && c) {
       setLists(prev => JSON.stringify(prev) !== JSON.stringify(l) ? l : prev)
       setCards(prev => JSON.stringify(prev) !== JSON.stringify(c) ? c : prev)
    }
  }

  const triggerInteraction = () => setLastInteractionTime(Date.now()); 

  const saveCardDetails = async () => {
    if (!selectedCard) return;
    triggerInteraction(); 
    setCards(cards.map(c => c.id === selectedCard.id ? { ...c, ...detailValues } : c));
    setSelectedCard(null); 
    await supabase.from('cards').update({ ...detailValues }).eq('id', selectedCard.id);
  }

  const handleCameraClick = (listId) => {
    setTargetListId(listId);
    if (fileInputRef.current) fileInputRef.current.click();
  };

  // Görüntü İyileştirme (Siyah/Beyaz yapma)
  const preprocessImage = (file) => {
    return new Promise((resolve) => {
       const img = new Image();
       img.src = URL.createObjectURL(file);
       img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // 2 Kat büyüt
          const scale = 2;
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const d = imgData.data;
          
          // Kontrastı artır
          for (let i = 0; i < d.length; i += 4) {
             const gray = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
             const val = gray > 110 ? 255 : 0; 
             d[i] = d[i+1] = d[i+2] = val;
          }
          ctx.putImageData(imgData, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
       };
    });
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setIsProcessing(true); 
    try {
      const processedImageBase64 = await preprocessImage(file);
      const { data: { text } } = await Tesseract.recognize(
        processedImageBase64, 'tur', 
        { tessedit_char_whitelist: 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZabcçdefgğhıijklmnoöprsştuüvyz0123456789-/. ' } 
      );
      const cleanText = text.split('\n').map(l => l.trim()).filter(l => l.length > 3).join('\n');
      if (!cleanText) { alert("Yazı okunamadı."); setIsProcessing(false); return; }
      openModal({ 
        title: "Taranan Liste", value: cleanText, color: "gray", showColors: false, isBatch: true, 
        onConfirm: async (v) => { 
          const lines = v.split('\n').filter(l => l.trim()); 
          if(!lines.length) return; 
          const newCards = lines.map((l, i) => ({ list_id: targetListId, title: l, position: cards.length + i })); 
          await supabase.from('cards').insert(newCards); 
        } 
      });
    } catch (error) { alert("Okuma hatası."); } 
    finally { setIsProcessing(false); event.target.value = ''; }
  };

  const handlePrintCard = () => {
    if (!selectedCard) return;
    const printWindow = window.open('', '', 'width=800,height=600');
    const formattedDate = detailValues.due_date ? new Date(detailValues.due_date).toLocaleDateString('tr-TR') : 'Belirtilmedi';
    printWindow.document.write(`<html><head><title>İş Emri</title><style>body{font-family:sans-serif;padding:20px;}.box{border:1px solid #000;padding:20px;}</style></head><body><div class="box"><h1>İŞ EMRİ</h1><h2>${selectedCard.title}</h2><p><strong>Personel:</strong> ${detailValues.assignee}</p><p><strong>Tarih:</strong> ${formattedDate}</p><p><strong>Detay:</strong> ${detailValues.description}</p></div><script>window.onload=function(){window.print();}</script></body></html>`);
    printWindow.document.close();
  };

  const handlePrintList = (listId, listTitle) => {
    const listCards = cards.filter(c => c.list_id === listId);
    if (listCards.length === 0) { alert("Liste boş."); return; }
    const printWindow = window.open('', '', 'width=900,height=600');
    const rows = listCards.map((c, i) => `<tr><td>${i+1}</td><td>${c.title}</td><td>${c.assignee||''}</td><td>${c.due_date || ''}</td><td></td></tr>`).join('');
    printWindow.document.write(`<html><head><title>${listTitle}</title><style>table{width:100%;border-collapse:collapse;}th,td{border:1px solid #000;padding:8px;text-align:left;}</style></head><body><h2>${listTitle} Listesi</h2><table><thead><tr><th>#</th><th>Görev</th><th>Sorumlu</th><th>Tarih</th><th>OK</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=function(){window.print();}</script></body></html>`);
    printWindow.document.close();
  }

  const handleCreateCard = async (title, listId) => {
    triggerInteraction(); 
    const tempCard = { id: Date.now(), list_id: listId, title, position: 9999 } 
    setCards(prev => [...prev, tempCard]) 
    await supabase.from('cards').insert([{ list_id: listId, title, position: 9999 }]);
  }

  const findContainer = (id) => {
    if (lists.some(l => l.id === id)) return id;
    const card = cards.find(c => c.id === id);
    return card ? card.list_id : null;
  }

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
    triggerInteraction(); 
  }

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id;
    const overId = over.id;
    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);
    if (!activeContainer || !overContainer || activeContainer === activeContainer) {
      if (activeContainer === overContainer) return;
    }
    setCards((prev) => {
      return prev.map((c) => {
        if (c.id === activeId) return { ...c, list_id: overContainer }; 
        return c;
      });
    });
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    const activeId = active.id;
    const overId = over ? over.id : null;
    setActiveId(null);
    triggerInteraction();
    if (!over) return;
    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);
    if (activeContainer && overContainer) {
        const activeIndex = cards.findIndex((c) => c.id === activeId);
        const overIndex = cards.findIndex((c) => c.id === overId);
        let newCards = [...cards];
        if (activeIndex !== overIndex) {
            newCards = arrayMove(cards, activeIndex, overIndex);
            setCards(newCards);
        }
        const newListCards = newCards.filter(c => c.list_id === activeContainer);
        const newPosition = newListCards.findIndex(c => c.id === activeId);
        await supabase.from('cards').update({ list_id: activeContainer, position: newPosition }).eq('id', activeId);
    }
  }

  const openModal = (config) => { 
    setModalConfig({ 
      value: '', color: 'gray', isBatch: false, showColors: false, showMachineOption: false, isMachine: false, isAssignMode: false,
      ...config 
    }); 
    setIsModalOpen(true); 
  }
  
  const openDetailPanel = (card) => { 
      triggerInteraction(); 
      setSelectedCard(card); 
      setDetailValues({ 
          description: card.description || '', 
          due_date: card.due_date || '', 
          assignee: card.assignee || ''
      }); 
  }

  if (!session) return <Login />

  return (
    <div className="app-container">
      
      <input type="file" accept="image/*" capture="environment" ref={fileInputRef} style={{display: 'none'}} onChange={handleFileChange} />

      {isProcessing && (
        <div className="modal-overlay">
          <div className="modal-content" style={{textAlign:'center'}}>
            <h2 className="animate-pulse">⚙️ İşleniyor...</h2>
            <p>Görüntü taranıyor...</p>
            <div style={{marginTop:'20px', fontSize:'2rem'}}>⏳</div>
          </div>
        </div>
      )}

      {isAlertOpen && (
        <div className="modal-overlay">
           <div className="modal-content">
             <h3 style={{marginTop:0}}>{alertConfig.title}</h3>
             <p>{alertConfig.message}</p>
             <div style={{display:'flex', gap:'10px'}}>
                <button onClick={() => setIsAlertOpen(false)} className="btn btn-secondary" style={{flex:1}}>Vazgeç</button>
                <button onClick={() => { alertConfig.onConfirm(); setIsAlertOpen(false) }} className="btn btn-danger" style={{flex:1}}>Onayla</button>
             </div>
           </div>
        </div>
      )}

      {/* --- DETAY PANELİ --- */}
      <div className={`detail-panel ${selectedCard ? 'open' : ''}`}>
        {selectedCard && (
          <>
            <div className="list-header">
              <h2>Detaylar</h2>
              <div style={{display:'flex', gap:'10px'}}>
                 <button onClick={handlePrintCard} className="btn btn-secondary">📄 Yazdır</button>
                 <button onClick={() => setSelectedCard(null)} className="btn btn-ghost">✕</button>
              </div>
            </div>
            
            <h3 style={{margin:'20px 0 10px 0', color:'#fff'}}>{selectedCard.title}</h3>

            <div style={{flex:1, padding:'10px 0', overflowY:'auto'}}>
              <label className="input-label">👷 Personel</label>
              <select className="select-field" value={detailValues.assignee} onChange={(e) => setDetailValues({ ...detailValues, assignee: e.target.value })}>
                <option value="">Seçiniz...</option>
                {factoryStaff.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <label className="input-label">📅 Termin</label>
              <input type="date" className="input-field" value={detailValues.due_date} onChange={(e) => setDetailValues({ ...detailValues, due_date: e.target.value })} />
              <label className="input-label">📝 Açıklama</label>
              <textarea rows="4" value={detailValues.description} onChange={(e) => setDetailValues({ ...detailValues, description: e.target.value })} />
            </div>
            <div style={{paddingTop:'20px'}}>
              <button onClick={saveCardDetails} className="btn btn-primary" style={{width:'100%'}}>Kaydet</button>
            </div>
          </>
        )}
      </div>

      {/* --- ANA MODAL --- */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{textAlign:'center', marginTop:0}}>{modalConfig.title}</h2>
            
            {/* --- TOPLU ATAMA MODU --- */}
            {modalConfig.isAssignMode ? (
              <div style={{marginBottom:'20px'}}>
                  <p style={{textAlign:'center', color:'#cbd5e1', marginBottom:'10px'}}>Bu listedeki tüm işler kime atansın?</p>
                  <select className="select-field" value={modalConfig.value} onChange={(e) => setModalConfig({ ...modalConfig, value: e.target.value })}>
                    <option value="">Seçiniz...</option>
                    {factoryStaff.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
              </div>
            ) : (
              // --- NORMAL MOD ---
              modalConfig.isBatch ? (
                <textarea autoFocus rows="10" className="input-field" placeholder={"Metin..."} value={modalConfig.value} onChange={(e) => setModalConfig({ ...modalConfig, value: e.target.value })} />
              ) : (
                <input autoFocus className="input-field" style={{textAlign:'center', fontSize:'1.1rem'}} value={modalConfig.value} onChange={(e) => setModalConfig({ ...modalConfig, value: e.target.value })} 
                  onKeyDown={(e) => e.key === 'Enter' && (!modalConfig.value.trim() ? alert("Boş olamaz") : (modalConfig.onConfirm(modalConfig.value, modalConfig.color, modalConfig.isMachine), setIsModalOpen(false)))} />
              )
            )}
            
            {modalConfig.showColors && (
              <div style={{display:'flex', justifyContent:'center', gap:'10px', marginBottom:'20px'}}>
                {colors.map(c => (
                  <button key={c.name} onClick={() => setModalConfig({ ...modalConfig, color: c.name })} className={c.cssClass} style={{width:'30px', height:'30px', borderRadius:'50%', border: modalConfig.color === c.name ? '2px solid white' : 'none', opacity: modalConfig.color === c.name ? 1 : 0.6}} />
                ))}
              </div>
            )}
            {modalConfig.showMachineOption && (
              <div style={{background:'#1e293b', padding:'10px', borderRadius:'8px', marginBottom:'20px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div><div style={{fontWeight:'bold'}}>Makine Şablonu</div><div style={{fontSize:'0.8rem', color:'#94a3b8'}}>Otomatik listeler</div></div>
                <input type="checkbox" checked={modalConfig.isMachine} onChange={(e) => setModalConfig({...modalConfig, isMachine: e.target.checked})} style={{transform:'scale(1.5)'}} />
              </div>
            )}
            <div style={{display:'flex', gap:'10px'}}>
              <button onClick={() => setIsModalOpen(false)} className="btn btn-secondary" style={{flex:1}}>İptal</button>
              <button onClick={() => { if (!modalConfig.value.trim()) return alert("Seçim yapmalısınız!"); modalConfig.onConfirm(modalConfig.value, modalConfig.color, modalConfig.isMachine); setIsModalOpen(false); }} className="btn btn-primary" style={{flex:1}}>Tamamla</button>
            </div>
          </div>
        </div>
      )}

      {/* --- DASHBOARD --- */}
      {view === 'dashboard' ? (
        <div className="dashboard-container">
          <header className="header" style={{marginBottom:'30px', borderRadius:'12px'}}>
            <div className="header-title"><h1>Panolarım</h1><small style={{color:'#94a3b8'}}>Süreç Yönetimi</small></div>
            <div className="header-actions">
               <span style={{marginRight:'10px', fontSize:'0.9rem'}}>{session.user.email}</span>
               <button onClick={() => supabase.auth.signOut()} className="btn btn-secondary">Çıkış</button>
               <button onClick={() => openModal({ title: "Yeni Pano", value: "", color: "gray", showColors: true, showMachineOption: true, isBatch: false, onConfirm: async (val, col, isMachine) => { const { data } = await supabase.from('boards').insert([{ title: val, color: col }]).select(); if (data) { const newBoard = data[0]; setBoards([newBoard, ...boards]); if (isMachine) { const machineTemplates = ["700", "900", "KBA", "KONTROL EDİLDİ", "MONTAJ","ÇEKİLDİ"]; const listsToInsert = machineTemplates.map((name, index) => ({ board_id: newBoard.id, title: name, position: index, color: 'gray' })); await supabase.from('lists').insert(listsToInsert); } } } })} className="btn btn-primary">+ Yeni Pano</button>
            </div>
          </header>
          <div className="board-grid">
            {boards.map(b => (
              <div key={b.id} onClick={() => { setActiveBoardId(b.id); setView('board_detail'); }} className="board-card">
                <div className={`board-color-strip ${colors.find(c => c.name === b.color)?.cssClass || 'bg-gray'}`}></div>
                <h3>{b.title}</h3>
                <div style={{position:'absolute', top:'15px', right:'15px', display:'flex', gap:'5px'}}>
                  <button onClick={(e) => { e.stopPropagation(); openModal({ title: "Düzenle", value: b.title, color: b.color, showColors: true, isBatch: false, onConfirm: async (v, c) => { await supabase.from('boards').update({ title: v, color: c }).eq('id', b.id); } }); }} className="btn btn-secondary" style={{padding:'5px'}}>✏️</button>
                  <button onClick={(e) => { e.stopPropagation(); setAlertConfig({ title: "Sil?", message: "Silinecek!", onConfirm: async () => { await supabase.from('boards').delete().eq('id', b.id); setBoards(boards.filter(item => item.id !== b.id)) } }); setIsAlertOpen(true); }} className="btn btn-danger" style={{padding:'5px'}}>🗑️</button>
                </div>
              </div>
            ))}
            {boards.length === 0 && <div style={{gridColumn:'1/-1', textAlign:'center', padding:'50px', color:'#64748b'}}>Henüz pano yok.</div>}
          </div>
        </div>
      ) : (
        // --- BOARD DETAY ---
        <>
          <header className="header">
            <div className="header-actions">
              <button onClick={() => setView('dashboard')} className="btn btn-secondary">← Geri</button>
              <h2 style={{margin:'0 15px', color:'white'}}>{activeBoard && activeBoard.title}</h2>
            </div>
            <div className="header-actions">
              <input type="text" placeholder="Ara..." className="input-field" style={{marginBottom:0, width:'200px'}} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              <span className="btn btn-secondary" style={{cursor:'default'}}>{cards.length} İş</span>
            </div>
          </header>

          <div className="board-detail-container">
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
              <div className="lists-wrapper">
                {lists.map(list => {
                  const listCards = cards.filter(c => c.list_id === list.id);
                  return (
                    <DroppableContainer key={list.id} id={list.id} className="list-column">
                      <div className="list-header">
                          <span onClick={() => openModal({ title: "Düzenle", value: list.title, color: list.color, showColors: true, isBatch: false, onConfirm: async (v, c) => await supabase.from('lists').update({ title: v, color: c }).eq('id', list.id) })} style={{cursor:'pointer'}}>{list.title}</span>
                          <div style={{display:'flex', gap:'5px'}}>
                            
                            {/* --- TOPLU ATAMA BUTONU (👤) --- */}
                            <button onClick={() => openModal({
                              title: "Toplu Atama", value: "", isAssignMode: true, 
                              onConfirm: async (personName) => {
                                await supabase.from('cards').update({ assignee: personName }).eq('list_id', list.id);
                                setCards(cards.map(c => c.list_id === list.id ? { ...c, assignee: personName } : c));
                              }
                            })} className="btn btn-ghost" title="Listeyi Birine Ata" style={{padding:'0 5px'}}>👤</button>

                            <button onClick={() => handlePrintList(list.id, list.title)} className="btn btn-ghost" style={{padding:'0 5px'}}>🖨️</button>
                            <button onClick={() => { setAlertConfig({ title: "Sil?", message: "Silinecek.", onConfirm: async () => { await supabase.from('lists').delete().eq('id', list.id); setLists(lists.filter(l => l.id !== list.id)) } }); setIsAlertOpen(true); }} className="btn btn-ghost" style={{padding:'0 5px'}}>🗑️</button>
                          </div>
                      </div>
                      <div className="list-body custom-scrollbar">
                        <SortableContext id={list.id} items={listCards.map(c => c.id)} strategy={verticalListSortingStrategy}>
                          {listCards.map(card => {
                              const isMatch = card.title.toLowerCase().includes(searchQuery.toLowerCase());
                              return <SortableCard key={card.id} id={card.id} title={card.title} dueDate={card.due_date} assignee={card.assignee} isDimmed={searchQuery && !isMatch} onView={() => openDetailPanel(card)} onEdit={(e) => openModal({ title: "Düzenle", value: card.title, color: "gray", showColors: false, isBatch: false, onConfirm: async (v) => { await supabase.from('cards').update({title: v}).eq('id', card.id); } })} onDelete={(e) => { setAlertConfig({ title: "Sil?", message: "Silinecek.", onConfirm: async () => { await supabase.from('cards').delete().eq('id', card.id); setCards(cards.filter(c => c.id !== card.id)) }}); setIsAlertOpen(true); }} />
                          })}
                        </SortableContext>
                      </div>
                      <div className="list-footer">
                          <button onClick={() => handleCameraClick(list.id)} className="btn btn-secondary" title="Listeyi Tara">📷</button>
                          <button onClick={() => openModal({ title: "Yeni Görev", value: "", color: "gray", showColors: false, isBatch: false, onConfirm: async (v) => handleCreateCard(v, list.id) })} className="btn btn-secondary" style={{width:'40px'}}>+</button>
                          <button onClick={() => openModal({ title: "Seri Ekle", value: "", color: "gray", showColors: false, isBatch: true, onConfirm: async (v) => { const lines = v.split('\n').filter(l => l.trim()); if(!lines.length) return; const newCards = lines.map((l, i) => ({ list_id: list.id, title: l, position: cards.length + i })); await supabase.from('cards').insert(newCards); } })} className="btn btn-secondary">⚡</button>
                      </div>
                    </DroppableContainer>
                  )
                })}
                <button onClick={() => openModal({ title: "Yeni Liste", value: "", color: "gray", showColors: true, isBatch: false, onConfirm: async (v, c) => { const { data } = await supabase.from('lists').insert([{ board_id: activeBoardId, title: v, color: c, position: lists.length }]).select(); if(data) setLists([...lists, data[0]]) } })} className="btn btn-add-list">+ Yeni Liste</button>
                <div style={{width:'20px'}}></div>
              </div>
              <DragOverlay>{activeId ? <div className="task-card" style={{transform:'rotate(3deg)', width:'250px'}}>{cards.find(c => c.id === activeId)?.title}</div> : null}</DragOverlay>
            </DndContext>
          </div>
        </>
      )}
    </div>
  )
}

export default App