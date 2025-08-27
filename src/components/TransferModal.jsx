import React, { useState, useEffect } from 'react';

function TransferModal({ 
  open, 
  onClose, 
  fromInventory, 
  categoryId, 
  inventories, 
  onTransfer 
}) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [targetInventoryId, setTargetInventoryId] = useState(null);

  useEffect(() => {
    if (!open) {
      setSelectedItem(null);
      setQuantity(1);
      setTargetInventoryId(null);
    }
  }, [open]);

  if (!open || !categoryId) return null;

  // Find the category and its items
  let categoryObj = null;
  let parentFixed = null;

  for (const [fixedName, categories] of Object.entries(fromInventory.custom || {})) {
    const found = categories.find(cat => cat.id === categoryId);
    if (found) {
      categoryObj = found;
      parentFixed = fixedName;
      break;
    }
  }

  if (!categoryObj) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
        <div className="bg-neutral-800 text-white rounded p-6 border border-neutral-700">
          <p>Categoria não encontrada</p>
          <button 
            className="px-3 py-1 rounded bg-neutral-700 border border-neutral-600 mt-2" 
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const items = categoryObj.items || [];
  const targetOptions = Object.values(inventories).filter(inv => 
    inv.id !== fromInventory.id && inv.ownerId
  );

  function handleTransfer() {
    if (!selectedItem || !targetInventoryId || quantity <= 0) {
      alert('Por favor, selecione item, quantidade e inventário destino');
      return;
    }

    const item = items.find(it => it.id === selectedItem);
    if (!item || quantity > (item.qty || 0)) {
      alert('Quantidade inválida');
      return;
    }

    onTransfer({
      categoryId,
      itemId: selectedItem,
      quantity: Number(quantity),
      targetInventoryId
    });

    onClose();
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
      <div className="bg-neutral-800 text-white rounded p-6 w-96 border border-neutral-700">
        <h3 className="text-lg font-bold mb-3">
          Transferir Item - {categoryObj.name}
        </h3>

        <div className="mb-3">
          <label className="block text-sm text-neutral-300 mb-1">Item:</label>
          <select 
            className="w-full bg-neutral-700 border-neutral-600 border px-2 py-1"
            value={selectedItem || ''}
            onChange={(e) => {
              setSelectedItem(e.target.value);
              const item = items.find(it => it.id === e.target.value);
              setQuantity(item ? Math.min(1, item.qty || 0) : 1);
            }}
          >
            <option value="">Selecione um item</option>
            {items.map(item => (
              <option key={item.id} value={item.id}>
                {item.name} (x{item.qty})
              </option>
            ))}
          </select>
        </div>

        {selectedItem && (
          <div className="mb-3">
            <label className="block text-sm text-neutral-300 mb-1">Quantidade:</label>
            <input 
              type="number" 
              min="1" 
              max={items.find(it => it.id === selectedItem)?.qty || 1}
              className="w-full bg-neutral-700 border-neutral-600 border px-2 py-1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>
        )}

        <div className="mb-3">
          <label className="block text-sm text-neutral-300 mb-1">Transferir para:</label>
          <select 
            className="w-full bg-neutral-700 border-neutral-600 border px-2 py-1"
            value={targetInventoryId || ''}
            onChange={(e) => setTargetInventoryId(e.target.value)}
          >
            <option value="">Selecione destino</option>
            {targetOptions.map(inv => (
              <option key={inv.id} value={inv.id}>
                {inv.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2">
          <button 
            className="px-3 py-1 rounded bg-neutral-700 border border-neutral-600" 
            onClick={onClose}
          >
            Cancelar
          </button>
          <button 
            className="px-3 py-1 rounded bg-neutral-600 border border-neutral-600" 
            onClick={handleTransfer}
          >
            Transferir
          </button>
        </div>
      </div>
    </div>
  );
}

export default TransferModal;