import React, { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase";
import TransferModal from "./components/TransferModal";
import { v4 as uuidv4 } from 'uuid';

function shuffleArray(arr) { 
  const a = [...arr]; 
  for (let i = a.length - 1; i > 0; i--) { 
    const j = Math.floor(Math.random() * (i + 1)); 
    [a[i], a[j]] = [a[j], a[i]]; 
  } 
  return a; 
}

// ---------- Small UI components ----------
function BackButton({onClick}) {
  return (
    <button className="px-3 py-1 rounded bg-neutral-700 text-white border border-neutral-600" onClick={onClick}>
      Voltar
    </button>
  );
}

function LoginModal({open, onClose, onLogin, users}){
  if(!open) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
      <div className="bg-neutral-800 text-white rounded p-6 w-96 border border-neutral-700 shadow-lg">
        <h2 className="text-xl font-bold mb-3">Login rápido</h2>
        <p className="text-sm mb-3 text-neutral-300">Escolha um perfil de teste (GM tem acesso a tudo).</p>
        <div className="flex flex-col gap-2">
          {users.map(u=> (
            <button 
              key={u.id} 
              className="text-left p-2 rounded bg-neutral-700 border border-neutral-600" 
              onClick={()=>{ onLogin(u); onClose(); }}
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

// Edit modal (for items/weapons)
function EditItemModal({ open, onClose, item, weaponInfo, onSave }) {
  const [name, setName] = useState(item?.name || '');
  const [qty, setQty] = useState(item?.qty || 1);
  const [desc, setDesc] = useState(item?.desc || '');
  // weapon fields
  const [damage, setDamage] = useState((weaponInfo && (weaponInfo.damage || weaponInfo.damage === 0)) ? weaponInfo.damage : (item?.metadata?.damage || ''));
  const [magCapacity, setMagCapacity] = useState(item?.metadata?.magCapacity || item?.metadata?.mag_capacity || (weaponInfo?.magCapacity || ''));
  const [ammoType, setAmmoType] = useState(item?.metadata?.ammoType || weaponInfo?.ammoType || '');

  useEffect(()=> {
    if(!open) return;
    setName(item?.name || '');
    setQty(item?.qty || 1);
    setDesc(item?.desc || '');
    setDamage((weaponInfo && (weaponInfo.damage || weaponInfo.damage === 0)) ? weaponInfo.damage : (item?.metadata?.damage || ''));
    setMagCapacity(item?.metadata?.magCapacity || item?.metadata?.mag_capacity || (weaponInfo?.magCapacity || ''));
    setAmmoType(item?.metadata?.ammoType || weaponInfo?.ammoType || '');
  }, [open, item, weaponInfo]);

  if(!open) return null;
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
            onChange={(e)=> setName(e.target.value)} 
          />
        </div>

        <div className="mb-2">
          <label className="block text-sm text-neutral-300">Quantidade</label>
          <input 
            className="w-full bg-neutral-700 border-neutral-600 border px-2 py-1" 
            type="number" 
            min="0" 
            value={qty} 
            onChange={(e)=> setQty(Number(e.target.value))} 
          />
        </div>

        <div className="mb-2">
          <label className="block text-sm text-neutral-300">Descrição</label>
          <input 
            className="w-full bg-neutral-700 border-neutral-600 border px-2 py-1" 
            value={desc} 
            onChange={(e)=> setDesc(e.target.value)} 
          />
        </div>

        {isWeapon && (
          <>
            <div className="mb-2">
              <label className="block text-sm text-neutral-300">Dano</label>
              <input 
                className="w-full bg-neutral-700 border-neutral-600 border px-2 py-1" 
                value={damage} 
                onChange={(e)=> setDamage(e.target.value)} 
              />
            </div>
            <div className="mb-2">
              <label className="block text-sm text-neutral-300">Capacidade do pente</label>
              <input 
                className="w-full bg-neutral-700 border-neutral-600 border px-2 py-1" 
                value={magCapacity} 
                onChange={(e)=> setMagCapacity(e.target.value)} 
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm text-neutral-300">Tipo de munição</label>
              <input 
                className="w-full bg-neutral-700 border-neutral-600 border px-2 py-1" 
                value={ammoType} 
                onChange={(e)=> setAmmoType(e.target.value)} 
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
            onClick={()=>{
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

// InventoryView Component
function InventoryView({ inventory, currentUser, state, updateState, onBack, connectedSupabase, loadFromSupabase }) {
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

  // Reset when inventory changes
  useEffect(() => {
    setSelectedFixed(inventory.fixedCategories?.[0] || 'Mochila');
    setStatusText(inventory.meta?.status || '');
    setNotesText(inventory.meta?.notes || '');
    setTargetCatForNewItem(
      (inventory.custom && inventory.custom[inventory.fixedCategories?.[0]]) ?
      (inventory.custom[inventory.fixedCategories[0]][0]?.id || null) :
      null
    );
  }, [inventory.id]);

  useEffect(() => {
    const list = inventory.custom?.[selectedFixed] || [];
    setTargetCatForNewItem(list.length > 0 ? list[0].id : null);
  }, [selectedFixed, inventory.custom]);

  // Create category/item functions
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
        if (!inv.custom[selectedFixed]) inv.custom[selectedFixed] = [];
        inv.custom[selectedFixed].push({ id: cat.id, name: cat.name, items: [] });
        return { ...prev, inventories: { ...prev.inventories, [inventory.id]: inv } };
      });
    } else {
      const cat = { id: catId, name: newCatName, items: [] };
      updateState(prev => {
        const inv = { ...prev.inventories[inventory.id] };
        inv.custom = { ...(inv.custom || {}) };
        inv.custom[selectedFixed] = [...(inv.custom[selectedFixed] || []), cat];
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
        return { ...prev, inventories: { ...prev.inventories, [inventory.id]: inv } };
      });
    } else {
      const item = { 
        id: itemId, 
        name: newItemName, 
        qty: Number(newItemQty) || 1, 
        desc: newItemDesc || '' 
      };

      updateState(prev => {
        const inv = { ...prev.inventories[inventory.id] };
        inv.custom = { ...(inv.custom || {}) };
        inv.custom[selectedFixed] = (inv.custom[selectedFixed] || []).map(c => 
          c.id === targetCatForNewItem ? { ...c, items: [...c.items, item] } : c
        );
        return { ...prev, inventories: { ...prev.inventories, [inventory.id]: inv } };
      });
    }

    setNewItemName(''); 
    setNewItemQty(1); 
    setNewItemDesc('');
  }

  // Weapon actions
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
        items: c.items.map(it => 
          it.id === item.id ? 
          { ...it, metadata: newMetadata } : 
          it
        )
      }));
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
        items: c.items.map(it => 
          it.id === item.id ? 
          { ...it, metadata: newMetadata } : 
          it
        )
      }));
      return { ...prev, inventories: { ...prev.inventories, [inventory.id]: inv } };
    });
  }

  // Edit handlers
  async function handleEditSave(updated) {
    const newMetadata = { ...updated.metadata, description: updated.desc || '' };

    if (connectedSupabase) {
      const { error } = await supabase.from('items').update({
        name: updated.name,
        qty: updated.qty,
        metadata: newMetadata
      }).eq('id', updated.id);
      if (error) {
        console.error('Erro ao atualizar item no Supabase:', error);
        alert('Erro ao salvar edição');
        return;
      }
    }

    updateState(prev => {
      const inv = { ...prev.inventories[inventory.id] };
      inv.custom = { ...(inv.custom || {}) };
      inv.custom[selectedFixed] = (inv.custom[selectedFixed] || []).map(c => ({
        ...c,
        items: (c.items || []).map(i => 
          i.id === updated.id ? 
          { 
            ...i, 
            name: updated.name, 
            qty: updated.qty, 
            desc: updated.desc || '',
            metadata: newMetadata 
          } : 
          i
        )
      }));
      return { ...prev, inventories: { ...prev.inventories, [inventory.id]: inv } };
    });
  }

  // Transfer handler
  async function handleTransfer({ categoryId, itemId, quantity, targetInventoryId }) {
    const srcInv = state.inventories[inventory.id];
    const catList = srcInv.custom[selectedFixed] || [];
    const catObj = catList.find(c => c.id === categoryId);
    if (!catObj) return;

    const itemObj = catObj.items.find(it => it.id === itemId);
    if (!itemObj) return;

    const moveQty = Math.min(quantity, itemObj.qty || 0);

    if (connectedSupabase) {
      // Find or create target category
      let tgtCatId;
      const tgtInv = state.inventories[targetInventoryId];
      const storageFixed = tgtInv.fixedCategories.find(f => 
        f.toLowerCase().includes('moch') || f.toLowerCase().includes('malet')
      ) || tgtInv.fixedCategories[0];

      let tgtCat = tgtInv.custom[storageFixed]?.find(c => c.name === catObj.name);
      if (!tgtCat) {
        const newTgtCatId = crypto.randomUUID ? crypto.randomUUID() : `cat_${Date.now()}`;
        const { data, error } = await supabase.from('categories').insert({
          id: newTgtCatId,
          inventory_id: targetInventoryId,
          parent_fixed: storageFixed,
          name: catObj.name || 'Transferidos'
        }).select();
        if (error) {
          console.error('Erro ao criar categoria no target:', error);
          alert('Erro na transferência');
          return;
        }
        tgtCat = data[0];
        // Update local target
        updateState(prev => {
          const nextTgt = { ...prev.inventories[targetInventoryId] };
          if (!nextTgt.custom[storageFixed]) nextTgt.custom[storageFixed] = [];
          nextTgt.custom[storageFixed].push({ id: tgtCat.id, name: tgtCat.name, items: [] });
          return { ...prev, inventories: { ...prev.inventories, [targetInventoryId]: nextTgt } };
        });
      }
      tgtCatId = tgtCat.id;

      // Handle item move
      if (moveQty >= itemObj.qty) {
        // Move whole item
        const { error } = await supabase.from('items').update({ category_id: tgtCatId }).eq('id', itemId);
        if (error) {
          console.error('Erro ao mover item:', error);
          alert('Erro na transferência');
          return;
        }
      } else {
        // Reduce original, create new
        const { error: updateErr } = await supabase.from('items').update({ qty: itemObj.qty - moveQty }).eq('id', itemId);
        if (updateErr) {
          console.error('Erro ao atualizar qty original:', updateErr);
          alert('Erro na transferência');
          return;
        }

        const newItemId = crypto.randomUUID ? crypto.randomUUID() : `it_${Date.now()}`;
        const { error: insertErr } = await supabase.from('items').insert({
          id: newItemId,
          category_id: tgtCatId,
          name: itemObj.name,
          qty: moveQty,
          metadata: itemObj.metadata,
          type: itemObj.type
        });
        if (insertErr) {
          console.error('Erro ao criar novo item:', insertErr);
          alert('Erro na transferência');
          return;
        }
      }
    }

    updateState(prev => {
      const next = { ...prev };
      const srcInv = { ...next.inventories[inventory.id] };
      srcInv.custom = { ...(srcInv.custom || {}) };

      const catList = srcInv.custom[selectedFixed] || [];
      const catObj = catList.find(c => c.id === categoryId);

      const itemObj = catObj.items.find(it => it.id === itemId);

      const moveQty = Math.min(quantity, itemObj.qty || 0);

      // Deduct from source item (or remove)
      if ((itemObj.qty || 0) - moveQty <= 0) {
        catObj.items = catObj.items.filter(it => it.id !== itemId);
      } else {
        itemObj.qty = (itemObj.qty || 0) - moveQty;
        catObj.items = catObj.items.map(it => it.id === itemId ? { ...itemObj } : it);
      }

      srcInv.custom[selectedFixed] = catList.map(c => c.id === catObj.id ? catObj : c);
      next.inventories[inventory.id] = srcInv;

      // Add to target inventory
      const tgtInv = { ...next.inventories[targetInventoryId] };
      tgtInv.custom = { ...(tgtInv.custom || {}) };
      const storageFixed = tgtInv.fixedCategories.find(f => 
        f.toLowerCase().includes('moch') || f.toLowerCase().includes('malet')
      ) || tgtInv.fixedCategories[0];

      if (!tgtInv.custom[storageFixed]) tgtInv.custom[storageFixed] = [];

      let tgtCat = tgtInv.custom[storageFixed].find(c => c.name === catObj.name) || 
                   tgtInv.custom[storageFixed].find(c => c.name.toLowerCase().includes('transfer')) || 
                   tgtInv.custom[storageFixed][0];

      if (!tgtCat) {
        tgtCat = { id: `cat_${Date.now()}`, name: 'Transferidos', items: [] };
        tgtInv.custom[storageFixed].push(tgtCat);
      }

      const existing = tgtCat.items.find(it => 
        it.name === itemObj.name && 
        (it.metadata?.weapon_id === itemObj.metadata?.weapon_id || !it.metadata?.weapon_id)
      );

      if (existing) {
        existing.qty = (existing.qty || 0) + moveQty;
      } else {
        const newItem = { ...itemObj, id: `it_${Date.now()}`, qty: moveQty };
        tgtCat.items.push(newItem);
      }

      next.inventories[targetInventoryId] = tgtInv;
      return next;
    });
  }

  // Delete functions
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
      return { ...prev, inventories: { ...prev.inventories, [inventory.id]: inv } };
    });
  }

  async function deleteCategory(catId) {
    if (!confirm('Excluir categoria e todos os itens?')) return;

    if (connectedSupabase) {
      // Delete items first
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
      // Delete category
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
      return { ...prev, inventories: { ...prev.inventories, [inventory.id]: inv } };
    });
  }

  // Drag & Drop handlers
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
          c.id === fromCat ? 
          { ...c, items: c.items.filter(x => x.id !== itemId) } : 
          c
        );

        inv.custom[selectedFixed] = (inv.custom[selectedFixed] || []).map(c => 
          c.id === toCatId ? 
          { ...c, items: [...c.items, moving] } : 
          c
        );

        return { ...prev, inventories: { ...prev.inventories, [inventory.id]: inv } };
      });
    } catch (err) { 
      console.error('drop parse', err); 
    }
  }

  // Rename functions
  async function renameFixedCategory(index, newName) {
    // Assuming fixedCategories are local only, no Supabase sync for rename fixed
    updateState(prev => {
      const inv = { ...prev.inventories[inventory.id] };
      const fixed = [...(inv.fixedCategories || [])];
      fixed[index] = newName;
      inv.fixedCategories = fixed;
      return { ...prev, inventories: { ...prev.inventories, [inventory.id]: inv } };
    });
    if (connectedSupabase) {
      // If fixedCategories saved in DB, update here
      // e.g., await supabase.from('inventories').update({ fixed_categories: fixed }).eq('id', inventory.id);
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
                  {(inventory.custom?.[selectedFixed] || []).map(cat => (
                    <div
                      key={cat.id}
                      className="border border-neutral-700 rounded p-2 bg-neutral-800"
                      onDragOver={handleDragOver}
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
                        {(cat.items || []).map(it => {
                          const itemIsWeapon = it.type === 'weapon' || (it.metadata && it.metadata.weapon_id);
                          const weaponData = itemIsWeapon ? (state.weapons[it.metadata?.weapon_id] || null) : null;

                          return (
                            <div 
                              key={it.id}
                              className="p-2 bg-neutral-800 rounded border border-neutral-700 flex justify-between items-center"
                              draggable
                              onDragStart={(e) => handleDragStart(e, cat.id, it.id)}
                            >
                              <div className="flex gap-3 items-center">
                                {itemIsWeapon && (weaponData?.image_url || weaponData?.imageBase64 || it.metadata?.image) ? (
                                  <img 
                                    src={weaponData?.image_url || weaponData?.imageBase64 || it.metadata?.image} 
                                    alt="img" 
                                    className="w-12 h-8 object-cover rounded border border-neutral-600" 
                                  />
                                ) : null}
                                <div>
                                  <div className="font-semibold text-white">{it.name}</div>
                                  <div className="text-sm text-neutral-300">
                                    x{it.qty} {it.desc ? `— ${it.desc}` : ''}
                                  </div>
                                  {itemIsWeapon && (
                                    <div className="mt-2 text-xs text-neutral-300">
                                      Dano: {it.metadata?.damage ?? weaponData?.damage ?? '—'} — 
                                      Pente: {it.metadata?.magCurrent ?? '—'}/{it.metadata?.magCapacity ?? weaponData?.magCapacity ?? '—'} — 
                                      Munição: {it.metadata?.ammoType ?? weaponData?.ammoType ?? '—'}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="text-sm flex flex-col gap-2 items-end">
                                <div className="flex gap-1">
                                  <button 
                                    className="px-2 py-1 rounded bg-neutral-700 border border-neutral-600" 
                                    onClick={() => {
                                      setEditItem(it);
                                      const wInfo = itemIsWeapon && it.metadata?.weapon_id ? 
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

                                {(it.type === 'weapon' || (it.metadata && it.metadata.weapon_id)) && (
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
                          );
                        })}
                      </div>
                    </div>
                  ))}
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

// ---------- MOCK DATA ----------
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
      }
    },
    don: {
      id:'don', 
      name:'Don', 
      ownerId: 'don', 
      type:'character', 
      wallpaper:'don_bg.jpg', 
      money:3000,
      fixedCategories: ['Status','Maleta','Dinheiro','Caderno'],
      custom: { Maleta: [] }
    },
    carro: {
      id:'carro', 
      name:'Carro', 
      ownerId: null, 
      type:'vehicle', 
      wallpaper:'car_bg.jpg',
      fixedCategories: ['Porta-luvas','Banco de trás','Porta-malas'],
      custom: { 'Porta-luvas': [] }
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
const [users, setUsers] = useState([]);
const [inventories, setInventories] = useState([]);
const [categories, setCategories] = useState([]);
const [items, setItems] = useState([]);
const [weapons, setWeapons] = useState([]);
const [stands, setStands] = useState([]);
const [standWeapons, setStandWeapons] = useState([]);
const [loading, setLoading] = useState(false);

useEffect(() => {
  async function fetchWeapons() {
    const { data, error } = await supabase.from("weapons").select("*");
    console.log("WEAPONS DATA:", data);
    console.log("WEAPONS ERROR:", error);

    const { data: users } = await supabase.from("users").select("*");
    console.log("USERS DATA:", users);

    const { data: inv } = await supabase.from("inventories").select("*");
    console.log("INVENTORIES DATA:", inv);
  }

  fetchWeapons();
}, []);

async function fetchAllData() {
  setLoading(true);
  try {
    const [
      { data: usersData },
      { data: inventoriesData },
      { data: categoriesData },
      { data: itemsData },
      { data: weaponsData },
      { data: standsData },
      { data: standWeaponsData },
    ] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('inventories').select('*'),
      supabase.from('categories').select('*'),
      supabase.from('items').select('*'),
      supabase.from('weapons').select('*'),
      supabase.from('stands').select('*'),
      supabase.from('stand_weapons').select('*'),
    ]);

    setUsers(usersData || []);
    setCategories(categoriesData || []);
    setItems(itemsData || []);
    setWeapons(weaponsData || []);
    setStands(standsData || []);
    setStandWeapons(standWeaponsData || []);

    const enrichedInventories = (inventoriesData || []).map(inv => {
      let detailedItem = null;
      if (inv.item_id) detailedItem = itemsData.find(i => i.id === inv.item_id);
      else if (inv.weapon_id) detailedItem = weaponsData.find(w => w.id === inv.weapon_id);

      return {
        ...inv,
        details: detailedItem || null,
      };
    });

    setInventories(enrichedInventories);

  } catch (err) {
    console.error("Erro ao buscar dados:", err);
  } finally {
    setLoading(false);
  }
}
  
useEffect(() => {
  fetchAllData();
}, []);

  const [state, setState] = useState(MOCK_STATE);
  const [view, setView] = useState('menu'); // menu | inventory | shop
  const [selectedInventoryId, setSelectedInventoryId] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [connectedSupabase, setConnectedSupabase] = useState(false);

  useEffect(()=> { 
    if(supabase){ 
      console.log('Supabase client configurado');
    } 
  },[]);

  const currentUser = state.currentUser;

  const visibleInventories = Object.values(state.inventories).filter(inv => {
    if (currentUser?.role === 'gm') return true;
    if (!currentUser) return inv.ownerId == null;
    return (inv.ownerId && inv.ownerId === currentUser.id) || inv.ownerId == null;
  });

  function handleLogin(user){ 
    setState(prev=> ({...prev, currentUser: user})); 
  }

  function logout(){ 
    setState(prev=> ({...prev, currentUser: null})); 
  }

  function openInventory(invId){ 
    setSelectedInventoryId(invId); 
    setView('inventory'); 
  }

  function openShop(){ 
    setView('shop'); 
  }

  function updateState(updater){ 
    setState(prev=> { 
      const next = typeof updater === 'function' ? updater(prev) : {...prev, ...updater}; 
      return next; 
    }); 
  }

  // ---------- Supabase helpers ----------
  async function loadFromSupabase(){
    if(!supabase) {
      alert('Supabase não configurado. Configure as variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY');
      return false;
    }

    try{
      const [
        {data: users},
        {data: invs},
        {data: cats},
        {data: items},
        {data: weapons},
        {data: stands},
        {data: stand_weapons}
      ] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('inventories').select('*'),
        supabase.from('categories').select('*'),
        supabase.from('items').select('*'),
        supabase.from('weapons').select('*'),
        supabase.from('stands').select('*'),
        supabase.from('stand_weapons').select('*')
      ]);

      const weaponsMap = {};
      (weapons||[]).forEach(w=>{ weaponsMap[w.id] = {...w}; });

      const invMap = {};
      (invs||[]).forEach(inv => {
        invMap[inv.id] = { 
          id: inv.id, 
          name: inv.name, 
          ownerId: inv.owner_user_id, 
          type: inv.type, 
          wallpaper: inv.wallpaper, 
          money: inv.money || 0, 
          fixedCategories: inv.fixed_categories || [], 
          custom: {},
          meta: { status: inv.status || '', notes: inv.notes || '' }
        };
      });

      (cats||[]).forEach(c => {
        if(!invMap[c.inventory_id]) return;
        const parent = c.parent_fixed || 'Mochila';
        const inv = invMap[c.inventory_id];
        inv.fixedCategories = inv.fixedCategories.length ? inv.fixedCategories : ['Status','Mochila','Dinheiro','Anotações'];
        if(!inv.custom[parent]) inv.custom[parent] = [];
        inv.custom[parent].push({ id: c.id, name: c.name, items: [] });
      });

      (items||[]).forEach(it => {
        const cat = (cats||[]).find(c=> c.id === it.category_id);
        if(!cat) return;
        const inv = invMap[cat.inventory_id];
        if(!inv) return;
        const parent = cat.parent_fixed || 'Mochila';
        const catList = inv.custom[parent] || [];
        const catObj = catList.find(cc => cc.id === cat.id);
        const itemObj = { 
          id: it.id, 
          name: it.name, 
          qty: it.qty, 
          desc: it.metadata?.description || '', 
          type: it.type || 'item', 
          metadata: it.metadata || {} 
        };
        if(catObj) catObj.items.push(itemObj);
      });

      const shop = { 
        stands: (stands||[]).map(s=> ({ 
          id: s.id, 
          name: s.name, 
          slots: s.slots, 
          weaponIds: [] 
        })) 
      };

      (stand_weapons||[]).forEach(sw => {
        const st = shop.stands.find(s=> s.id === sw.stand_id);
        if(st && !st.weaponIds.includes(sw.weapon_id)) st.weaponIds.push(sw.weapon_id);
      });

      const nextState = { 
        currentUser: state.currentUser, 
        users: users||[], 
        inventories: invMap, 
        shop, 
        weapons: weaponsMap 
      };

      setState(nextState);
      setConnectedSupabase(true);
      setupRealtime();
      return true;

    }catch(err){ 
      console.error('loadFromSupabase', err); 
      alert('Erro ao carregar dados do Supabase. Veja console.'); 
      return false; 
    }
  }

  function setupRealtime(){ 
    if(!supabase) return; 
    try{ 
      supabase.channel('public-all')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'inventories' }, ()=>{ loadFromSupabase(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, ()=>{ loadFromSupabase(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, ()=>{ loadFromSupabase(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'weapons' }, ()=>{ loadFromSupabase(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'stands' }, ()=>{ loadFromSupabase(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'stand_weapons' }, ()=>{ loadFromSupabase(); })
        .subscribe(); 
    } catch(err){ 
      console.error('realtime setup', err);
    } 
  }

  // More Supabase helpers would go here...
  async function createWeaponSupabase({ name, damage, magCapacity, ammoType, price, imageFile }) {
  if (!supabase) throw new Error('Supabase não configurado');

  // gerar id no cliente (UUID). Usa crypto.randomUUID se disponível, senão fallback timestamp
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `w_${Date.now()}`;

  let image_url = null;
  const bucket = 'weapons'; // garanta que o bucket existe no Supabase Storage

  try {
    // 1) Upload da imagem (se houver)
    if (imageFile) {
      const ext = (imageFile.name && imageFile.name.split('.').pop()) || 'jpg';
      const path = `weapons/${id}.${ext}`; // caminho no storage

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, imageFile, { upsert: true });

      if (uploadError) throw uploadError;

      // obter url pública
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      image_url = urlData?.publicUrl ?? null;
    }

    // 2) Insert na tabela weapons
    const payload = {
      id, // usamos o id gerado no cliente
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
      // se insert falhar, remover a imagem que acabou de subir (cleanup)
      if (image_url) {
        try {
          // path precisa ser igual ao usado no upload; remover arquivo
          const ext = (imageFile.name && imageFile.name.split('.').pop()) || 'jpg';
          const path = `weapons/${id}.${ext}`;
          await supabase.storage.from(bucket).remove([path]);
        } catch (e) {
          console.warn('Erro ao limpar imagem após falha de insert:', e);
        }
      }
      throw error;
    }

    // 3) Atualizar UI / estados (chame sua função de reload se existir)
    if (typeof fetchAllData === 'function') {
      try { fetchAllData(); } catch (e) { console.warn('fetchAllData falhou:', e); }
    }

    // data é um array (representation), retornar o primeiro elemento
    return (Array.isArray(data) && data[0]) ? data[0] : data;
  } catch (err) {
    console.error('Erro em createWeaponSupabase:', err);
    throw err; // deixe o chamador lidar com a UI/alert
  }
}

  // ---------- UI + routing ----------
  return (
    <div className="min-h-screen bg-neutral-800 text-white">
      <header className="p-4 bg-neutral-900 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-0 shadow-sm border-b border-neutral-700">
        <h1 className="text-2xl font-bold">Inventários & Loja — Completo</h1>
        <div className="flex items-center gap-3">
          {supabase && !connectedSupabase && (
            <button 
              className="px-3 py-1 rounded bg-neutral-700 border border-neutral-600" 

  // --- Supabase write helpers (injected) ---
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


              onClick={loadFromSupabase}
            >
              Conectar Supabase
            </button>
          )}
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
              onClick={()=>setLoginOpen(true)}
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
                        onClick={()=>openInventory(inv.id)}
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
            onBack={()=>setView('menu')}
            connectedSupabase={connectedSupabase}
            loadFromSupabase={loadFromSupabase}
          />
        )}

        {view === 'shop' && (
          <ShopView
            shop={state.shop}
            weapons={state.weapons}
            currentUser={currentUser}
            state={state}
            updateState={updateState}
            onBack={()=>setView('menu')}
            connectedSupabase={connectedSupabase}
            createWeaponSupabase={createWeaponSupabase}
            loadFromSupabase={loadFromSupabase}
          />
        )}
      </main>

      <LoginModal 
        open={loginOpen} 
        onClose={()=>setLoginOpen(false)} 
        onLogin={handleLogin} 
        users={state.users} 
      />
    </div>
  );
}

 return (
    <div>
      {loading && <p>Carregando dados...</p>}
      <Inventory inventories={inventories} />
      <Shop categories={categories} items={items} weapons={weapons} />
    </div>
  );
}

// 5️⃣ Função utilitária shuffleArray → fora da função App
function shuffleArray(arr) { 
  const a = [...arr]; 
  for (let i = a.length - 1; i > 0; i--) { 
    const j = Math.floor(Math.random() * (i + 1)); 
    [a[i], a[j]] = [a[j], a[i]]; 
  } 
  return a; 
}
