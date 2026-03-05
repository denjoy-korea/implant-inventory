import React from 'react';
import { InventoryItem } from '../../types';

interface InventoryManufacturerFilterStripProps {
  selectedManufacturer: string | null;
  onSelectManufacturer: (manufacturer: string | null) => void;
  visibleInventory: InventoryItem[];
  manufacturersList: string[];
  monthFactor: number;
}

const InventoryManufacturerFilterStrip: React.FC<InventoryManufacturerFilterStripProps> = ({
  selectedManufacturer,
  onSelectManufacturer,
  visibleInventory,
  manufacturersList,
  monthFactor,
}) => {
  return (
    <div className="hidden md:block bg-white rounded-2xl px-5 py-3 border border-slate-100 shadow-sm">
      <div className="flex gap-1.5 bg-indigo-50/40 p-1 rounded-xl border border-slate-200">
        <button
          onClick={() => onSelectManufacturer(null)}
          className={`flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-bold rounded-lg transition-all ${selectedManufacturer === null ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 hover:bg-white active:scale-95'}`}
        >
          전체
          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${selectedManufacturer === null ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
            {visibleInventory.length}
          </span>
        </button>
        <div className="w-px bg-slate-200 my-1 mx-0.5" />
        <div className="flex-1 overflow-x-auto hide-scrollbar flex gap-1.5">
          {manufacturersList.map((manufacturer) => {
            const count = visibleInventory.filter((item) => item.manufacturer === manufacturer).length;
            const hasShortage = visibleInventory.some((item) => item.manufacturer === manufacturer && item.currentStock < Math.ceil(item.recommendedStock * monthFactor));
            const isSelected = selectedManufacturer === manufacturer;
            return (
              <button
                key={manufacturer}
                onClick={() => onSelectManufacturer(manufacturer)}
                className={`flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 ${isSelected ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100' : 'text-slate-500 hover:text-slate-700 hover:bg-white border border-transparent active:scale-95'}`}
              >
                {manufacturer}
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${isSelected ? 'bg-indigo-50 text-indigo-600' : hasShortage ? 'bg-rose-50 text-rose-500' : 'bg-slate-100 text-slate-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default InventoryManufacturerFilterStrip;
