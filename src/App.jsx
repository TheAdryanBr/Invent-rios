import React, { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase";
import TransferModal from "./components/TransferModal";
import { v4 as uuidv4 } from 'uuid';

function shuffleArray(arr) { 
  const a = [...arr]; 
  for (let i = a.length - 1; i > 0; i--) { 
    const j = Math.floor(Math.random() * (i + 1)); 
    [a[i], a[j]] = [a[j], a[i]]; // Corrected swap syntax
  } 
  return a; 
}

// ---------- Small UI components ----------
function BackButton({ onClick }) {
  return (
    <button className="px-3 py-1 rounded bg-neutral-700 text-white border border-neutral-600" onClick={onClick}>
      Voltar
    </button>
  );
}

function LoginModal({ open, onClose, onLogin, users }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
      <div className="bg-neutral-800 text-white rounded p-6 w-96 border border-neutral-700 shadow-lg">
        <h2 className="text-xl font-bold mb-3">Login rápido</h2>
        <p className="text-sm mb-3 text-neutral-300">Escolha um perfil de teste (GM tem acesso a tudo).</p>
        <div className="flex flex-col gap-2">
          {users.map(u => (
            <button 
              key={u.id} 
              className="text-left p-2 rounded bg-neutral-700 border border-neutral-600" 
              onClick={() => { onLogin(u); onClose(); }}
            >
              {u.name} {u.role === 'gm' ? '(GM)' : ''}
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button className="px-3 py-1 rounded bg-neutral-700 border border-neutral-600" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function EditItemModal({ open, onClose, item, weaponInfo, onSave }) {
  const [name, setName] = useState(item?.name || '');
  const [qty, setQty] = useState(item?.qty || 1);
  const [desc, setDesc] = useState(item?.desc || '');
  const [damage, setDamage] = useState((weaponInfo && (weaponInfo.damage || weaponInfo.damage === 0)) ? weaponInfo.damage : (item?.metadata?.damage || ''));
  const [magCapacity, setMagCapacity] = useState(item?.metadata?.magCapacity || item?.metadata?.mag_capacity || (weaponInfo?.magCapacity || ''));
  const [ammoType, setAmmoType] = useState(item?.metadata?.ammoType || weaponInfo?.ammoType || '');

  useEffect(() => {
    if (!open) return;
    setName(item?.name || '');
    setQty(item?.qty || 1);
    setDesc(item?.desc || '');
    setDamage((weaponInfo && (weaponInfo.damage || weaponInfo.damage === 0)) ? weaponInfo.damage : (item?.metadata?.damage || ''));
    setMagCapacity(item?.metadata?.magCapacity || item?.metadata?.mag_capacity || (weaponInfo?.magCapacity || ''));
    setAmmoType(item?.metadata?.ammoType || weaponInfo?.ammoType || '');
  }, [open, item, weaponInfo]);

  if (!open) return null;
  const isWeapon = !!(item?.type === 'weapon' || item?.metadata?.weapon_id);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
      <div className="bg-neutral-800 text-white rounded p-6 w-96 border border-neutral-700">
        <h3 className="text-lg font-bold mb-2">Editar {isWeapon ? 'arma' : 'item'}</h3>
        <div className="mb-2">
          <label className="block text-sm text-neutral-300">Nome</label>
          <input 
            className="w-full bg-neutral-700 border-neutral-600 border px-2 py-1" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
          />
        </div>
        <div className="mb-2">
          <label className="block text-sm text-neutral-300">Quantidade</label>
          <input 
            className="w-full bg-neutral-700 border-neutral-600 border px-2 py-1" 
            type="number" 
            min="0" 
            value={qty} 
            onChange={(e) => setQty(Number(e.target.value))} 
          />
        </div>
        <div className="mb-2">
          <label className="block text-sm text-neutral-300">Descrição</label>
          <input 
            className="w-full bg-neutral-700 border-neutral-600 border px-2 py-1" 
            value={desc} 
            onChange={(e) => setDesc(e.target.value)} 
          />
        </div>
        {isWeapon && (
          <>
            <div className="mb-2">
              <label className="block text-sm text-neutral-300">Dano</label>
              <input 
                className="w-full bg-neutral-700 border-neutral-600 border px-2 py-1" 
                value={damage} 
                onChange={(e) => setDamage(e.target.value)} 
              />
            </div>
            <div className="mb-2">
              <label className="block text-sm text-neutral-300">Capacidade do pente</label>
              <input 
                className="w-full bg-neutral-700 border-neutral-600 border px-2 py-1" 
                value={magCapacity} 
                onChange={(e) => setMagCapacity(e.target.value)} 
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm text-neutral-300">Tipo de munição</label>
              <input 
                className="w-full bg-neutral-700 border-neutral-600 border px-2 py-1" 
                value={ammoType} 
                onChange={(e) => setAmmoType(e.target.value)} 
              />
            </div>
          </>
        )}
        <div className="flex justify-end gap-2">
          <button 
            className="px-3 py-1 rounded bg-neutral-700 border border-neutral-600" 
            onClick={onClose}
          >
            Cancelar
          </button>
          <button 
            className="px-3 py-1 rounded bg-neutral-600 border border-neutral-600" 
            onClick={() => {
              onSave({
                ...item,
                name, qty, desc,
                metadata: {
                  ...(item.metadata || {}),
                  description: desc,
                  damage,
                  magCapacity,
                  ammoType
                }
              });
              onClose();
            }}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function ShopView({ state, onBack }) {
  const [selectedWeapon, setSelectedWeapon] = useState(null);

  const handleViewWeapon = (weaponId) => {
    setSelectedWeapon(state.weapons[weaponId] || null);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Loja</h2>
        <BackButton onClick={onBack} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {state.shop.stands.map(stand => (
          <div key={stand.id} className="bg-neutral-700 p-4 rounded shadow border border-neutral-600">
            <h3 className="font-semibold text-white">{stand.name}</h3>
            <p className="text-sm text-neutral-300">Slots disponíveis: {stand.slots}</p>
            <div className="mt-2 space-y-2">
              {stand.weaponIds.map(weaponId => {
                const weapon = state.weapons[weaponId];
                return weapon ? (
                  <button
                    key={weaponId}
                    className="w-full text-left p-2 rounded bg-neutral-800 border border-neutral-600 hover:bg-neutral-700"
                    onClick={() => handleViewWeapon(weaponId)}
                  >
                    {weapon.name} (R${weapon.price || 'N/A'})
                  </button>
                ) : null;
              })}
            </div>
          </div>
        ))}
      </div>
      {selectedWeapon && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
          <div className="bg-neutral-800 text-white rounded p-6 w-96 border border-neutral-700">
            <h3 className="text-lg font-bold mb-2">{selectedWeapon.name}</h3>
            <p className="text-sm text-neutral-300">Dano: {selectedWeapon.damage || 'N/A'}</p>
            <p className="text-sm text-neutral-300">Capacidade do pente: {selectedWeapon.mag_capacity || 'N/A'}</p>
            <p className="text-sm text-neutral-300">Tipo de munição: {selectedWeapon.ammo_type || 'N/A'}</p>
            <p className="text-sm text-neutral-300">Preço: R${selectedWeapon.price || 'N/A'}</p>
            {selectedWeapon.image_url && (
              <img
                src={selectedWeapon.image_url}
                alt={selectedWeapon.name}
                className="mt-2 w-full h-32 object-cover rounded border border-neutral-600"
              />
            )}
            <div className="mt-4 flex justify-end">
              <button
                className="px-3 py-1 rounded bg-neutral-700 border border-neutral-600"
                onClick={() => setSelectedWeapon(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InventoryView({ inventory, currentUser, state, updateState, onBack, handleTransfer, handleEditSave, connectedSupabase, loadFromSupabase }) {
  const [selectedFixed, setSelectedFixed] = useState(inventory.fixedCategories?.[0] || 'Mochila');
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editWeaponInfo, setEditWeaponInfo] = useState(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferCategoryId, setTransferCategoryId] = useState(null);

  const isAdmin = currentUser?.role === 'gm';
  const isOwner = currentUser && (currentUser.id === inventory.ownerId || isAdmin);

  const [statusText, setStatusText] = useState(inventory.meta?.status || '');
  const [notesText, setNotesText] = useState(inventory.meta?.notes || '');

  const [newCatName, setNewCatName] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemDesc, setNewItemDesc] = useState('');
  const [targetCatForNewItem, setTargetCatForNewItem] = useState(null);

  useEffect(() => {
    console.log('Inventory data:', inventory);
    setSelectedFixed(inventory.fixedCategories?.[0] || 'Mochila');
    setStatusText(inventory.meta?.status || '');
    setNotesText(inventory.meta?.notes || '');
    setTargetCatForNewItem(
      (inventory.custom && inventory.custom[inventory.fixedCategories?.[0]]) ?
      (inventory.custom[inventory.fixedCategories[0]]?.[0]?.id || null) :
      null
    );
  }, [inventory.id]);

  useEffect(() => {
    const list = inventory.custom?.[selectedFixed] || [];
    console.log('Selected Fixed:', selectedFixed, 'Custom Data:', list);
    setTargetCatForNewItem(list.length > 0 ? list[0].id : null);
  }, [selectedFixed, inventory.custom]);

  async function createCategory() {
    if (!newCatName) return alert('Digite o nome da nova categoria');
    const catId = crypto.randomUUID ? crypto.randomUUID() : `cat_${Date.now()}`;

    if (connectedSupabase) {
      const { data, error } = await supabase.from('categories').insert({
        id: catId,
        inventory_id: inventory.id,
        parent_fixed: selectedFixed,
        name: newCatName
      }).select();

      if (error) {
        console.error('Erro ao criar categoria no Supabase:', error);
        alert('Erro ao criar categoria');
        return;
      }

      const cat = data[0];
      updateState(prev => {
        const inv = { ...prev.inventories[inventory.id] };
        inv.custom = { ...(inv.custom || {}) };
        inv.custom[selectedFixed] = [...(inv.custom[selectedFixed] || []), { id: cat.id, name: cat.name, items: [] }];
        console.log('Updated Inventory:', inv);
        return { ...prev, inventories: { ...prev.inventories, [inventory.id]: inv } };
      });
    } else {
      const cat = { id: catId, name: newCatName, items: [] };
      updateState(prev => {
        const inv = { ...prev.inventories[inventory.id] };
        inv.custom = { ...(inv.custom || {}) };
        inv.custom[selectedFixed] = [...(inv.custom[selectedFixed] || []), cat];
        console.log('Updated Inventory:', inv);
        return { ...prev, inventories: { ...prev.inventories, [inventory.id]: inv } };
      });
    }
    setNewCatName('');
  }

  async function createItem() {
    if (!newItemName || !targetCatForNewItem) return alert('Nome e categoria alvo necessários');
    const itemId = crypto.randomUUID ? crypto.randomUUID() : `it_${Date.now()}`;

    if (connectedSupabase) {
      const metadata = { description: newItemDesc };
      const { data, error } = await supabase.from('items').insert({
        id: itemId,
        category_id: targetCatForNewItem,
        name: newItemName,
        qty: Number(newItemQty) || 1,
        metadata,
        type: 'item'
      }).select();

      if (error) {
        console.error('Erro ao criar item no Supabase:', error);
        alert('Erro ao criar item');
        return;
      }

      const item = data[0];
      updateState(prev => {
        const inv = { ...prev.inventories[inventory.id] };
        inv.custom = { ...(inv.custom || {}) };
        inv.custom[selectedFixed] = (inv.custom[selectedFixed] || []).map(c => 
          c.id === targetCatForNewItem ? { ...c, items: [...c.items, { id: item.id, name: item.name, qty: item.qty, desc: item.metadata?.description || '', type: item.type, metadata: item.metadata }] } : c
        );
        console.log('Updated Inventory:', inv);
        return { ...prev, inventories: { ...prev.inventories, [inventory.id]: inv } };
      });
    } else {
      const item = { id: itemId, name: newItemName, qty: Number(newItemQty) || 1, desc: newItemDesc || '' };
      updateState(prev => {
        const inv = { ...prev.inventories[inventory.id] };
        inv.custom = { ...(inv.custom || {}) };
        inv.custom[selectedFixed] = (inv.custom[selectedFixed] || []).map(c => 
          c.id === targetCatForNewItem ? { ...c, items: [...c.items, item] } : c
        );
        console.log('Updated Inventory:', inv);
        return { ...prev, inventories: { ...prev.inventories, [inventory.id]: inv } };
      });
    }
    setNewItemName(''); setNewItemQty(1); setNewItemDesc('');
  }

  async function handleShoot(item) {
    const mag = (item.metadata && item.metadata.magCurrent) || 0;
    if (mag <= 0) return alert('Pente vazio. Recarregue.');
    const newMag = mag - 1;
    const newMetadata = { ...item.metadata, magCurrent: newMag };

    if (connectedSupabase) {
      const { error } = await supabase.from('items').update({ metadata: newMetadata }).eq('id', item.id);
      if (error) {
        console.error('Erro ao atualizar item no Supabase:', error);
        alert('Erro ao atirar');
        return;
      }
    }

    updateState(prev => {
      const inv = { ...prev.inventories[inventory.id] };
      inv.custom = { ...(inv.custom || {}) };
      inv.custom[selectedFixed] = (inv.custom[selectedFixed] || []).map(c => ({
        ...c,
        items: c.items.map(it => it.id === item.id ? { ...it, metadata: newMetadata } : it)
      }));
      console.log('Updated Inventory:', inv);
      return { ...prev, inventories: { ...prev.inventories, [inventory.id]: inv } };
    });
  }

  async function handleReload(item) {
    const cap = (item.metadata && (item.metadata.magCapacity || item.metadata.mag_capacity)) || 0;
    if (cap <= 0) return alert('Capacidade do pente desconhecida.');
    const newMetadata = { ...item.metadata, magCurrent: cap };

    if (connectedSupabase) {
      const { error } = await supabase.from('items').update({ metadata: newMetadata }).eq('id', item.id);
      if (error) {
        console.error('Erro ao atualizar item no Supabase:', error);
        alert('Erro ao recarregar');
        return;
      }
    }

    updateState(prev => {
      const inv = { ...prev.inventories[inventory.id] };
      inv.custom = { ...(inv.custom || {}) };
      inv.custom[selectedFixed] = (inv.custom[selectedFixed] || []).map(c => ({
        ...c,
        items: c.items.map(it => it.id === item.id ? { ...it, metadata: newMetadata } : it)
      }));
      console.log('Updated Inventory:', inv);
      return { ...prev, inventories: { ...prev.inventories, [inventory.id]: inv } };
    });
  }

  async function deleteItem(catId, itemId) {
    if (!confirm('Remover este item?')) return;

    if (connectedSupabase) {
      const { error } = await supabase.from('items').delete().eq('id', itemId);
      if (error) {
        console.error('Erro ao deletar item no Supabase:', error);
        alert('Erro ao deletar item');
        return;
      }
    }

    updateState(prev => {
      const inv = { ...prev.inventories[inventory.id] };
      inv.custom = { ...(inv.custom || {}) };
      inv.custom[selectedFixed] = inv.custom[selectedFixed].map(c => 
        c.id === catId ? { ...c, items: c.items.filter(x => x.id !== itemId) } : c
      );
      console.log('Updated Inventory:', inv);
      return { ...prev, inventories: { ...prev.inventories, [inventory.id]: inv } };
    });
  }

  async function deleteCategory(catId) {
    if (!confirm('Excluir categoria e todos os itens?')) return;

    if (connectedSupabase) {
      const { data: itemsToDelete, error: fetchErr } = await supabase.from('items').select('id').eq('category_id', catId);
      if (fetchErr) {
        console.error('Erro ao fetch items para delete:', fetchErr);
        alert('Erro ao deletar categoria');
        return;
      }
      if (itemsToDelete.length > 0) {
        const itemIds = itemsToDelete.map(i => i.id);
        const { error: deleteItemsErr } = await supabase.from('items').delete().in('id', itemIds);
        if (deleteItemsErr) {
          console.error('Erro ao deletar items:', deleteItemsErr);
          alert('Erro ao deletar categoria');
          return;
        }
      }
      const { error: deleteCatErr } = await supabase.from('categories').delete().eq('id', catId);
      if (deleteCatErr) {
        console.error('Erro ao deletar categoria:', deleteCatErr);
        alert('Erro ao deletar categoria');
        return;
      }
    }

    updateState(prev => {
      const inv = { ...prev.inventories[inventory.id] };
      inv.custom = { ...(inv.custom || {}) };
      inv.custom[selectedFixed] = (inv.custom[selectedFixed] || []).filter(c => c.id !== catId);
      console.log('Updated Inventory:', inv);
      return { ...prev, inventories: { ...prev.inventories, [inventory.id]: inv } };
    });
  }

  async function handleDrop(e, toCatId) {
    e.preventDefault();
    try {
      const payload = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (!payload || payload.type !== 'item') return;

      const { fromCat, itemId } = payload;
      if (!itemId || fromCat === toCatId) return;

      if (connectedSupabase) {
        const { error } = await supabase.from('items').update({ category_id: toCatId }).eq('id', itemId);
        if (error) {
          console.error('Erro ao mover item no Supabase:', error);
          alert('Erro ao mover item');
          return;
        }
      }

      updateState(prev => {
        const inv = { ...prev.inventories[inventory.id] };
        inv.custom = { ...(inv.custom || {}) };

        const fromList = (inv.custom[selectedFixed] || []).find(c => c.id === fromCat);
        const toList = (inv.custom[selectedFixed] || []).find(c => c.id === toCatId);
        if (!fromList || !toList) return prev;

        const moving = fromList.items.find(i => i.id === itemId);
        if (!moving) return prev;

        inv.custom[selectedFixed] = (inv.custom[selectedFixed] || []).map(c => 
          c.id === fromCat ? { ...c, items: c.items.filter(x => x.id !== itemId) } : c
        );

        inv.custom[selectedFixed] = (inv.custom[selectedFixed] || []).map(c => 
          c.id === toCatId ? { ...c, items: [...c.items, moving] } : c
        );

        console.log('Updated Inventory:', inv);
        return { ...prev, inventories: { ...prev.inventories, [inventory.id]: inv } };
      });
    } catch (err) { 
      console.error('drop parse', err); 
    }
  }

  async function renameFixedCategory(index, newName) {
    try {
      const fixed = [...(inventory.fixedCategories || [])];
      fixed[index] = newName;

      // update local state
      updateState(prev => {
        const inv = { ...prev.inventories[inventory.id] };
        inv.fixedCategories = fixed;
        console.log('Updated Inventory:', inv);
        return { ...prev, inventories: { ...prev.inventories, [inventory.id]: inv } };
      });

      if (!connectedSupabase) {
        return true;
      }

      // Try updating common column names used: fixed_categories (snake_case) and fixedCategories (camelCase)
      const attempts = [
        { key: 'fixed_categories', payload: { fixed_categories: fixed } },
        { key: 'fixedCategories', payload: { fixedCategories: fixed } }
      ];

      for (const a of attempts) {
        try {
          const res = await supabase.from('inventories').update(a.payload).eq('id', inventory.id).select();
          if (res && !res.error) {
            console.log('fixed categories saved with', a.key, res.data);
            return true;
          } else {
            console.warn('Attempt to save fixed categories with', a.key, 'failed:', res.error);
          }
        } catch (e) {
          console.warn('Attempt update failed for', a.key, e);
        }
      }

      // if none succeeded
      alert('Erro ao renomear categoria fixa (persistência). Veja console para detalhes.');
      return false;
    } catch (e) {
      console.error('renameFixedCategory unexpected', e);
      alert('Erro ao renomear categoria fixa (persistência). Veja console.');
      return false;
    }
  }

  async function renameCustomCategory(catId, newName) {
    if (connectedSupabase) {
      const { error } = await supabase.from('categories').update({ name: newName }).eq('id', catId);
      if (error) {
        console.error('Erro ao renomear categoria no Supabase:', error);
        alert('Erro ao renomear categoria');
        return;
      }
    }

    updateState(prev => {
      const inv = { ...prev.inventories[inventory.id] };
      inv.custom = { ...(inv.custom || {}) };
      inv.custom[selectedFixed] = (inv.custom[selectedFixed] || []).map(c => 
        c.id === catId ? { ...c, name: newName } : c
      );
      console.log('Updated Inventory:', inv);
      return { ...prev, inventories: { ...prev.inventories, [inventory.id]: inv } };
    });
  }

  async function saveStatusNotesToState() {
    if (connectedSupabase) {
      const { error } = await supabase.from('inventories').update({ status: statusText, notes: notesText }).eq('id', inventory.id);
      if (error) {
        console.error('Erro ao salvar status/notes no Supabase:', error);
        alert('Erro ao salvar');
        return;
      }
    }

    updateState(prev => {
      const inv = { ...prev.inventories[inventory.id] };
      inv.meta = { ...(inv.meta || {}), status: statusText, notes: notesText };
      console.log('Updated Inventory:', inv);
      return { ...prev, inventories: { ...prev.inventories, [inventory.id]: inv } };
    });
    alert('Salvo.');
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">{inventory.name} — Inventário</h2>
        <div className="flex gap-2">
          <BackButton onClick={onBack} />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <aside className="w-full md:w-56 bg-neutral-900 p-3 rounded shadow border border-neutral-700">
          <h3 className="font-semibold mb-2 text-white">Categorias</h3>
          <div className="flex flex-col gap-2">
            {(inventory.fixedCategories || []).map((cat, idx) => (
              <div key={cat} className="flex items-center gap-2">
                <button 
                  className={`text-left p-2 rounded w-full text-white ${
                    cat === selectedFixed ? 'bg-neutral-700' : 'hover:bg-neutral-800'
                  }`} 
                  onClick={() => setSelectedFixed(cat)}
                >
                  {cat}
                </button>
                {(isOwner || isAdmin) && (
                  <button 
                    className="text-xs px-2 py-1 rounded bg-neutral-700 border border-neutral-600" 
                    onClick={() => { 
                      const nn = prompt('Novo nome:', cat); 
                      if (nn) renameFixedCategory(idx, nn); 
                    }}
                  >
                    Renomear
                  </button>
                )}
              </div>
            ))}
          </div>
        </aside>

        <section className="flex-1">
          <div className="bg-neutral-900 p-4 rounded shadow border border-neutral-700 min-h-[300px]">
            <h4 className="font-semibold mb-3">{selectedFixed}</h4>

            {((selectedFixed || '').toLowerCase().includes('moch') ||
              (selectedFixed || '').toLowerCase().includes('malet') ||
              (selectedFixed || '').toLowerCase().includes('porta')) ? (
              <div>
                <p className="text-sm text-neutral-400 mb-2">
                  Crie sub-categorias e itens dentro delas. Arraste itens para organizar.
                </p>

                <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {inventory.custom?.[selectedFixed] && Array.isArray(inventory.custom[selectedFixed]) && inventory.custom[selectedFixed].length > 0 ? (
                    inventory.custom[selectedFixed].map(cat => (
                      <div
                        key={cat.id}
                        className="border border-neutral-700 rounded p-2 bg-neutral-800"
                        onDragOver={e => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, cat.id)}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <strong className="text-white">{cat.name}</strong>
                          <div className="flex gap-2">
                            {(isOwner || isAdmin) && (
                              <>
                                <button 
                                  className="text-xs border px-2 rounded bg-neutral-700 border-neutral-600" 
                                  onClick={() => { 
                                    const nn = prompt('Novo nome da categoria:', cat.name); 
                                    if (nn) renameCustomCategory(cat.id, nn); 
                                  }}
                                >
                                  Renomear
                                </button>
                                <button 
                                  className="text-xs px-2 py-1 rounded bg-red-700 border border-red-600" 
                                  onClick={() => deleteCategory(cat.id)}
                                >
                                  Excluir
                                </button>
                                <button 
                                  className="text-xs px-2 py-1 rounded bg-neutral-700 border border-neutral-600" 
                                  onClick={() => { 
                                    setTransferCategoryId(cat.id); 
                                    setTransferOpen(true); 
                                  }}
                                >
                                  Transferir
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {(cat.items || []).map(it => (
                            <div 
                              key={it.id}
                              className="p-2 bg-neutral-800 rounded border border-neutral-700 flex justify-between items-center"
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'item', fromCat: cat.id, itemId: it.id }));
                              }}
                            >
                              <div>
                                <div className="font-semibold text-white">{it.name}</div>
                                <div className="text-sm text-neutral-300">x{it.qty} {it.desc ? `— ${it.desc}` : ''}</div>
                              </div>
                              <div className="text-sm flex flex-col gap-2 items-end">
                                <div className="flex gap-1">
                                  <button 
                                    className="px-2 py-1 rounded bg-neutral-700 border border-neutral-600" 
                                    onClick={() => {
                                      setEditItem(it);
                                      const wInfo = (it.type === 'weapon' || it.metadata?.weapon_id) && it.metadata?.weapon_id ? 
                                        state.weapons[it.metadata.weapon_id] : null;
                                      setEditWeaponInfo(wInfo);
                                      setEditOpen(true);
                                    }}
                                  >
                                    Editar
                                  </button>
                                  {(isOwner || isAdmin) && (
                                    <button 
                                      className="px-2 py-1 rounded bg-red-700 border border-red-600" 
                                      onClick={() => deleteItem(cat.id, it.id)}
                                    >
                                      Excluir
                                    </button>
                                  )}
                                </div>
                                {(it.type === 'weapon' || it.metadata?.weapon_id) && (
                                  <div className="flex gap-2">
                                    <button 
                                      className="px-2 py-1 rounded bg-neutral-700 border border-neutral-600 text-xs" 
                                      onClick={() => handleShoot(it)}
                                    >
                                      ATIRAR
                                    </button>
                                    <button 
                                      className="px-2 py-1 rounded bg-neutral-700 border border-neutral-600 text-xs" 
                                      onClick={() => handleReload(it)}
                                    >
                                      Recarregar
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div>
                      <p className="text-neutral-300">Carregando inventário... ou dados não encontrados.</p>
                      <pre className="text-xs text-neutral-400 mt-2">{JSON.stringify(inventory.custom?.[selectedFixed], null, 2)}</pre>
                    </div>
                  )}
                </div>

                {(isOwner || isAdmin) && (
                  <div className="border-t border-neutral-700 pt-3">
                    <h5 className="font-semibold text-white">Criar sub-categoria</h5>
                    <div className="flex gap-2 mt-2">
                      <input
                        className="border px-2 py-1 bg-neutral-700 text-white border-neutral-600 placeholder-neutral-400"
                        placeholder="Nome da categoria"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                      />
                      <button 
                        className="px-3 py-1 rounded bg-neutral-600 border border-neutral-600" 
                        onClick={createCategory}
                      >
                        Criar
                      </button>
                    </div>

                    <h5 className="font-semibold mt-4 text-white">Criar item</h5>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                      <input 
                        className="border px-2 py-1 bg-neutral-700 text-white border-neutral-600" 
                        placeholder="Nome do item" 
                        value={newItemName} 
                        onChange={(e) => setNewItemName(e.target.value)} 
                      />
                      <input 
                        className="border px-2 py-1 bg-neutral-700 text-white border-neutral-600" 
                        type="number" 
                        min={1} 
                        value={newItemQty} 
                        onChange={(e) => setNewItemQty(e.target.value)} 
                      />
                      <select 
                        className="border px-2 py-1 bg-neutral-700 text-white border-neutral-600" 
                        value={targetCatForNewItem || ''} 
                        onChange={(e) => setTargetCatForNewItem(e.target.value)}
                      >
                        <option value="">Selecione categoria</option>
                        {(inventory.custom?.[selectedFixed] || []).map(c => 
                          <option key={c.id} value={c.id}>{c.name}</option>
                        )}
                      </select>
                      <input 
                        className="border px-2 py-1 col-span-1 md:col-span-3 bg-neutral-700 text-white border-neutral-600" 
                        placeholder="Descrição (opcional)" 
                        value={newItemDesc} 
                        onChange={(e) => setNewItemDesc(e.target.value)} 
                      />
                      <button 
                        className="px-3 py-1 rounded bg-neutral-600 border border-neutral-600" 
                        onClick={createItem}
                      >
                        Criar item
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                {(selectedFixed || '').toLowerCase().includes('dinheiro') && (
                  <div>
                    <p className="text-neutral-300">Conteúdo editável dentro dessa categoria:</p>
                    <div className="mt-3">
                      <div className="mb-2 text-white">
                        <strong>Dinheiro:</strong> R$ {inventory.money}
                        {isOwner && (
                          <button 
                            className="ml-2 px-2 py-1 rounded bg-neutral-700 border border-neutral-600" 
                            onClick={() => { 
                              const v = prompt('Novo valor:', String(inventory.money)); 
                              if (v != null) { 
                                updateState(prev => { 
                                  const inv = { ...prev.inventories[inventory.id], money: Number(v) }; 
                                  return { ...prev, inventories: { ...prev.inventories, [inventory.id]: inv } }; 
                                }); 
                                if (connectedSupabase) {
                                  supabase.from('inventories').update({ money: Number(v) }).eq('id', inventory.id);
                                }
                              } 
                            }}
                          >
                            Editar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {(selectedFixed || '').toLowerCase().includes('status') && (
                  <div>
                    <p className="text-neutral-300">Conteúdo editável dentro dessa categoria:</p>
                    <div className="mt-3">
                      <label className="font-semibold text-white">Status</label>
                      <textarea 
                        rows={6} 
                        className="w-full border p-2 mt-2 bg-neutral-700 text-white border-neutral-600 resize-none" 
                        value={statusText} 
                        onChange={(e) => setStatusText(e.target.value)} 
                        disabled={!isOwner && !isAdmin}
                      />
                      {(isOwner || isAdmin) && (
                        <div className="mt-2">
                          <button 
                            className="px-3 py-1 rounded bg-neutral-600 border border-neutral-600" 
                            onClick={saveStatusNotesToState}
                          >
                            Salvar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(selectedFixed || '').toLowerCase().includes('anota') && (
                  <div>
                    <p className="text-neutral-300">Conteúdo editável dentro dessa categoria:</p>
                    <div className="mt-3">
                      <label className="font-semibold text-white">Anotações</label>
                      <textarea 
                        rows={6} 
                        className="w-full border p-2 mt-2 bg-neutral-700 text-white border-neutral-600 resize-none" 
                        value={notesText} 
                        onChange={(e) => setNotesText(e.target.value)} 
                        disabled={!isOwner && !isAdmin}
                      />
                      {(isOwner || isAdmin) && (
                        <div className="mt-2">
                          <button 
                            className="px-3 py-1 rounded bg-neutral-600 border border-neutral-600" 
                            onClick={saveStatusNotesToState}
                          >
                            Salvar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!((selectedFixed || '').toLowerCase().includes('dinheiro') ||
                   (selectedFixed || '').toLowerCase().includes('status') ||
                   (selectedFixed || '').toLowerCase().includes('anota')) && (
                  <div>
                    <p className="text-neutral-300">
                      Categoria "{selectedFixed}" — implementação específica ainda não adicionada.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      <TransferModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        fromInventory={inventory}
        categoryId={transferCategoryId}
        inventories={state.inventories}
        onTransfer={handleTransfer}
      />

      <EditItemModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        item={editItem}
        weaponInfo={editWeaponInfo}
        onSave={handleEditSave}
      />
    </div>
  );
}

const MOCK_STATE = {
  currentUser: null,
  users: [
    { id: 'gm', name: 'GM', role: 'gm' },
    { id: 'senshi', name: 'Senshi', role: 'player' },
    { id: 'don', name: 'Don', role: 'player' }
  ],
  inventories: {
    senshi: {
      id: 'senshi', 
      name: 'Senshi', 
      ownerId: 'senshi', 
      type: 'character', 
      wallpaper: 'senshi_bg.jpg',
      money: 5000,
      fixedCategories: ['Status','Mochila','Dinheiro','Anotações'],
      custom: { 
        Mochila: [ 
          { 
            id:'c1', 
            name:'Chaves', 
            items:[{id:'i1', name:'Corda', qty:1, desc:''}]
          }, 
          { 
            id:'c2', 
            name:'Armas', 
            items:[]
          } 
        ] 
      },
      meta: { status: '', notes: '' }
    },
    don: {
      id:'don', 
      name:'Don', 
      ownerId: 'don', 
      type:'character', 
      wallpaper:'don_bg.jpg', 
      money:3000,
      fixedCategories: ['Status','Maleta','Dinheiro','Caderno'],
      custom: { Maleta: [] },
      meta: { status: '', notes: '' }
    },
    carro: {
      id:'carro', 
      name:'Carro', 
      ownerId: null, 
      type:'vehicle', 
      wallpaper:'car_bg.jpg',
      fixedCategories: ['Porta-luvas','Banco de trás','Porta-malas'],
      custom: { 'Porta-luvas': [] },
      meta: { status: '', notes: '' }
    }
  },
  shop: {
    stands: Array.from({length:6}).map((_,i)=>({ 
      id:`stand${i+1}`, 
      name:`Stand ${i+1}`, 
      slots:20, 
      weaponIds:[] 
    }))
  },
  weapons: {}
};

export default function App() {
  const [state, setState] = useState(MOCK_STATE);
  const [view, setView] = useState('menu');
  const [selectedInventoryId, setSelectedInventoryId] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [connectedSupabase, setConnectedSupabase] = useState(false);

  useEffect(() => {
    if (supabase) {
      console.log('Supabase client configurado');
      loadFromSupabase();
    }
  }, []);

  async function updateInventoryCustom(invId, newCustom) {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('inventories').update({ custom: newCustom }).eq('id', invId);
      if (error) {
        console.error('Erro ao atualizar inventário:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('updateInventoryCustom unexpected', e);
      return false;
    }
  }

  async function updateCategoryName(categoryId, newName) {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('categories').update({ name: newName }).eq('id', categoryId);
      if (error) {
        console.error('Erro ao atualizar categoria:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('updateCategoryName unexpected', e);
      return false;
    }
  }

  async function createWeaponSupabase({ name, damage, magCapacity, ammoType, price, imageFile }) {
    if (!supabase) throw new Error('Supabase não configurado');

    const id = crypto.randomUUID ? crypto.randomUUID() : `w_${Date.now()}`;
    let image_url = null;
    const bucket = 'weapons';

    try {
      if (imageFile) {
        const ext = (imageFile.name && imageFile.name.split('.').pop()) || 'jpg';
        const path = `weapons/${id}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(path, imageFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
        image_url = urlData?.publicUrl ?? null;
      }

      const payload = {
        id,
        name,
        damage,
        mag_capacity: magCapacity,
        ammo_type: ammoType,
        price,
        image_url
      };

      const { data, error } = await supabase
        .from('weapons')
        .insert([payload], { returning: 'representation' });

      if (error) {
        if (image_url) {
          try {
            const ext = (imageFile.name && imageFile.name.split('.').pop()) || 'jpg';
            const path = `weapons/${id}.${ext}`;
            await supabase.storage.from(bucket).remove([path]);
          } catch (e) {
            console.warn('Erro ao limpar imagem após falha de insert:', e);
          }
        }
        throw error;
      }

      return (Array.isArray(data) && data[0]) ? data[0] : data;
    } catch (err) {
      console.error('Erro em createWeaponSupabase:', err);
      throw err;
    }
  }

  async function loadFromSupabase() {
    if (!supabase) {
      alert('Supabase não configurado. Configure as variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY');
      return false;
    }

    try {
      console.log('Loading from Supabase...');
      const [
        { data: users },
        { data: invs },
        { data: cats },
        { data: items },
        { data: weapons },
        { data: stands },
        { data: stand_weapons }
      ] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('inventories').select('*'),
        supabase.from('categories').select('*'),
        supabase.from('items').select('*'),
        supabase.from('weapons').select('*'),
        supabase.from('stands').select('*'),
        supabase.from('stand_weapons').select('*')
      ]);

      console.log('Supabase Data:', { users, invs, cats, items, weapons, stands, stand_weapons });

      const weaponsMap = {};
      (weapons || []).forEach(w => { weaponsMap[w.id] = { ...w }; });

      const invMap = {};
      (invs || []).forEach(inv => {
        invMap[inv.id] = { 
          id: inv.id, 
          name: inv.name, 
          ownerId: inv.owner_user_id, 
          type: inv.type, 
          wallpaper: inv.wallpaper, 
          money: inv.money || 0, 
          fixedCategories: inv.fixed_categories || ['Status','Mochila','Dinheiro','Anotações'], 
          custom: {},
          meta: { status: inv.status || '', notes: inv.notes || '' }
        };
      });

      Object.values(invMap).forEach(inv => {
        inv.fixedCategories.forEach(fc => {
          if (!inv.custom[fc]) inv.custom[fc] = [];
        });
      });

      (cats || []).forEach(c => {
        const inv = invMap[c.inventory_id];
        if (!inv) {
          console.warn('Category with no matching inventory:', c);
          return;
        }
        const parent = c.parent_fixed || inv.fixedCategories[0] || 'Mochila';
        if (!inv.custom[parent]) inv.custom[parent] = [];
        const existingCat = inv.custom[parent].find(cc => cc.id === c.id);
        if (!existingCat) {
          inv.custom[parent].push({ id: c.id, name: c.name || 'Unnamed', items: [] });
        }
      });

      (items || []).forEach(it => {
        const cat = (cats || []).find(c => c.id === it.category_id);
        if (!cat) {
          console.warn('Item with no matching category:', it);
          return;
        }
        const inv = invMap[cat.inventory_id];
        if (!inv) {
          console.warn('Item with no matching inventory:', it);
          return;
        }
        const parent = cat.parent_fixed || inv.fixedCategories[0] || 'Mochila';
        const catList = inv.custom[parent] || [];
        const catObj = catList.find(cc => cc.id === cat.id);
        if (catObj) {
          catObj.items.push({ 
            id: it.id, 
            name: it.name || 'Unnamed Item', 
            qty: it.qty || 1, 
            desc: it.metadata?.description || '', 
            type: it.type || 'item', 
            metadata: it.metadata || {} 
          });
        } else {
          console.warn('Category not found for item during mapping:', cat, it);
          inv.custom[parent] = inv.custom[parent] || [];
          inv.custom[parent].push({ id: cat.id, name: cat.name || 'Unnamed', items: [{ 
            id: it.id, 
            name: it.name || 'Unnamed Item', 
            qty: it.qty || 1, 
            desc: it.metadata?.description || '', 
            type: it.type || 'item', 
            metadata: it.metadata || {} 
          }] });
        }
      });

      const shop = { 
        stands: (stands || []).map(s => ({ 
          id: s.id, 
          name: s.name, 
          slots: s.slots, 
          weaponIds: [] 
        })) 
      };

      (stand_weapons || []).forEach(sw => {
        const st = shop.stands.find(s => s.id === sw.stand_id);
        if (st && !st.weaponIds.includes(sw.weapon_id)) st.weaponIds.push(sw.weapon_id);
      });

      try {
      // update state safely preserving prev.currentUser
      setState(prev => ({
        ...prev,
        users: users || prev.users || [],
        inventories: invMap,
        shop,
        weapons: weaponsMap
      }));
      setConnectedSupabase(true);
      setupRealtime();
      return true;
    } catch (err) { 
      console.error('loadFromSupabase', err); 
      alert('Erro ao carregar dados do Supabase. Veja console.'); 
      return false; 
    } catch (err) {
       console.error("Erro em load:", err);
    }

  function setupRealtime() { 
    if (!supabase) return; 
    try { 
      supabase.channel('public-all')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'inventories' }, () => { loadFromSupabase(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => { loadFromSupabase(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => { loadFromSupabase(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'weapons' }, () => { loadFromSupabase(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'stands' }, () => { loadFromSupabase(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'stand_weapons' }, () => { loadFromSupabase(); })
        .subscribe(); 
    } catch (err) {
   console.error("Erro:", err);
}
  }

  const currentUser = state.currentUser;

  const visibleInventories = Object.values(state.inventories).filter(inv => {
    if (currentUser?.role === 'gm') return true;
    if (!currentUser) return inv.ownerId == null;
    return (inv.ownerId && inv.ownerId === currentUser.id) || inv.ownerId == null;
  });

  function handleLogin(user) { 
    setState(prev => ({ ...prev, currentUser: user })); 
  }

  function logout() { 
    setState(prev => ({ ...prev, currentUser: null })); 
  }

  function openInventory(invId){ 
  console.log("Abrindo inventário:", invId, state.inventories);
  setSelectedInventoryId(invId); 
  setView('inventory'); 
}

  function openShop() { 
    setView('shop'); 
  }

  function updateState(updater) { 
    setState(prev => { 
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }; 
      return next; 
    }); 
  }

  async function handleTransfer(fromInvId, fromCatId, itemId, toInvId, toCatId) {
  const fromInv = state.inventories[fromInvId];
  const toInv = state.inventories[toInvId];
  if (!fromInv || !toInv) return;

  const fromCat = (fromInv.custom?.[fromInv.fixedCategories?.[0]] || []).find(c => c.id === fromCatId);
  const toCat = (toInv.custom?.[toInv.fixedCategories?.[0]] || []).find(c => c.id === toCatId);
  if (!fromCat || !toCat) return;

  const item = fromCat.items.find(i => i.id === itemId);
  if (!item) return;

  // --- Atualiza o estado local ---
  updateState(prev => {
    const newState = { ...prev };
    const updatedFromInv = { ...newState.inventories[fromInvId] };
    const updatedToInv = { ...newState.inventories[toInvId] };

    updatedFromInv.custom = { ...(updatedFromInv.custom || {}) };
    updatedToInv.custom = { ...(updatedToInv.custom || {}) };

    const fromList = updatedFromInv.custom[fromInv.fixedCategories?.[0]] || [];
    const toList = updatedToInv.custom[toInv.fixedCategories?.[0]] || [];

    updatedFromInv.custom[fromInv.fixedCategories?.[0]] = fromList.map(c => 
      c.id === fromCatId ? { ...c, items: c.items.filter(i => i.id !== itemId) } : c
    );
    updatedToInv.custom[toInv.fixedCategories?.[0]] = toList.map(c => 
      c.id === toCatId ? { ...c, items: [...c.items, item] } : c
    );

    newState.inventories = { ...newState.inventories, [fromInvId]: updatedFromInv, [toInvId]: updatedToInv };
    return newState;
  });

  // --- Atualiza no Supabase também ---
  if (connectedSupabase) {
    try {
      // Atualiza a tabela items (relação normalizada)
      const { error } = await supabase
        .from('items')
        .update({ category_id: toCatId, inventory_id: toInvId })
        .eq('id', itemId);

      if (error) {
        console.error("Erro ao mover item no Supabase:", error);
      } else {
        console.log("Item movido no Supabase com sucesso!");
      }
    } catch (err) {
   console.error("Erro:", err);
}
  }
}


  // Edit/save item handler that updates local state and persists to Supabase
  async function editSaveInApp(updatedItem, invId) {
    try {
      // Update local state first for immediate UI feedback
      updateState(prev => {
        // find inventory id (use invId if provided, else search)
        let targetInvId = invId;
        if (!targetInvId) {
          // find which inventory contains the item
          for (const [iid, inv] of Object.entries(prev.inventories || {})) {
            const listKeys = Object.keys(inv.custom || {});
            for (const k of listKeys) {
              const cat = (inv.custom[k] || []).find(c => (c.items || []).some(it => it.id === updatedItem.id));
              if (cat) { targetInvId = iid; break; }
            }
            if (targetInvId) break;
          }
        }
        if (!targetInvId) return prev; // item not found anywhere
} catch (err) {
   console.error("Erro:", err);
}
        const inv = { ...prev.inventories[targetInvId] };
        inv.custom = { ...(inv.custom || {}) };
        const fixed = inv.fixedCategories?.[0] || Object.keys(inv.custom || {})[0] || 'Mochila';
        inv.custom[fixed] = (inv.custom[fixed] || []).map(c => ({
          ...c,
          items: (c.items || []).map(it => it.id === updatedItem.id ? { ...it, ...updatedItem } : it)
        }));
        return { ...prev, inventories: { ...prev.inventories, [targetInvId]: inv } };
      });

      // Persist to Supabase if connected
      if (connectedSupabase) {
        const payload = {
          name: updatedItem.name,
          qty: updatedItem.qty,
          metadata: updatedItem.metadata || updatedItem,
          type: updatedItem.type || 'item'
        };
        const { error } = await supabase.from('items').update(payload).eq('id', updatedItem.id);
        if (error) {
          console.error('Erro ao salvar item no Supabase:', error);
        } else {
          console.log('Item salvo no Supabase:', updatedItem.id);
        }
      }
    } catch (err) {
      console.error('editSaveInApp unexpected', err);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-800 text-white">
      <header className="p-4 bg-neutral-900 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-0 shadow-sm border-b border-neutral-700">
        <h1 className="text-2xl font-bold">Inventários & Loja — Completo</h1>
        <div className="flex items-center gap-3">
          {connectedSupabase && (
            <span className="text-sm text-green-400">✓ Conectado ao Supabase</span>
          )}
          {currentUser ? (
            <>
              <span className="text-sm">
                Logado: <strong>{currentUser.name}</strong>
              </span>
              <button 
                className="px-3 py-1 rounded bg-neutral-700 border border-neutral-600" 
                onClick={logout}
              >
                Logout
              </button>
            </>
          ) : (
            <button 
              className="px-3 py-1 rounded bg-neutral-700 border border-neutral-600" 
              onClick={() => setLoginOpen(true)}
            >
              Login
            </button>
          )}
        </div>
      </header>

      <main className="p-4 md:p-6">
        {view === 'menu' && (
          <div>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {visibleInventories.map(inv => (
                  <div key={inv.id} className="bg-neutral-700 p-4 rounded shadow border border-neutral-600 text-white">
                    <h2 className="font-bold">{inv.name}</h2>
                    <p className="text-sm text-neutral-300">Tipo: {inv.type}</p>
                    <p className="text-sm text-neutral-300">Dinheiro: R$ {inv.money}</p>
                    <div className="mt-3 flex gap-2">
                      <button 
                        className="px-3 py-1 rounded bg-neutral-600 border border-neutral-600" 
                        onClick={() => openInventory(inv.id)}
                      >
                        Abrir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Loja</h3>
              <div className="bg-neutral-700 p-4 rounded shadow border border-neutral-600">
                <p className="text-neutral-200">Loja com stands — clique para abrir</p>
                <div className="mt-3">
                  <button 
                    className="px-3 py-1 rounded bg-neutral-600 border border-neutral-600" 
                    onClick={openShop}
                  >
                    Entrar na Loja
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'inventory' && selectedInventoryId && (
  <InventoryView
    inventory={state.inventories[selectedInventoryId]}
    currentUser={currentUser}
    state={state}
    updateState={updateState}
    onBack={() => setView('menu')}
    connectedSupabase={connectedSupabase}
    loadFromSupabase={loadFromSupabase}
    handleTransfer={handleTransfer}
    handleEditSave={(item) => editSaveInApp(item, selectedInventoryId)}
  />
)}

        {view === 'shop' && (
          <ShopView
            state={state}
            onBack={() => setView('menu')}
          />
        )}

        <LoginModal 
          open={loginOpen} 
          onClose={() => setLoginOpen(false)} 
          onLogin={handleLogin} 
          users={state.users} 
        />
      </main>
    </div>
  );
}

