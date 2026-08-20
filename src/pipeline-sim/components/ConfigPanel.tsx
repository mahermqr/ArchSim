import React from 'react';
import { PipelineConfig } from '../types';
import { DEFAULT_LATENCIES } from '../constants';

interface Props {
  config: PipelineConfig;
  onChange: (newConfig: PipelineConfig) => void;
  isDarkMode?: boolean;
}

export const ConfigPanel: React.FC<Props> = ({ config, onChange, isDarkMode = true }) => {
  const handleChange = (key: keyof typeof config.latencies, val: string) => {
    const parsed = parseInt(val, 10);
    const num = isNaN(parsed) ? 0 : Math.max(0, parsed);
    
    onChange({
      ...config,
      latencies: {
        ...config.latencies,
        [key]: num
      }
    });
  };

  const handleConfigChange = (key: keyof PipelineConfig, val: any) => {
      onChange({ ...config, [key]: val });
  }

  const applyPreset = (preset: 'standard') => {
      if (preset === 'standard') {
          onChange({ 
              ...config, 
              latencies: DEFAULT_LATENCIES,
              forwarding: true,
              branchPrediction: 'not-taken'
          });
      }
  }

  const textColor = isDarkMode ? "text-[#F4EFEA]" : "text-[#1B2A41]";
  const labelColor = isDarkMode ? "text-[#9AA8B8]" : "text-[#7A8B99]";
  const bgColor = isDarkMode ? "bg-[#1E2A3B]/80 backdrop-blur-xl border-white/5 border shadow-xl" : "bg-[#FFFFFF]/80 backdrop-blur-xl border-black/5 border shadow-xl";
  const inputBg = isDarkMode ? "bg-[#131B2A] border-white/10 text-white" : "bg-[#FDF8F5] border-black/10 text-black";
  const brandColor = isDarkMode ? "text-[#DCA4A7]" : "text-[#C97A7E]";

  return (
    <div className={`${bgColor} p-6 rounded-3xl transition-colors duration-300 relative overflow-hidden group`}>
      {/* Decorative Glow */}
      <div className={`absolute -top-10 -right-10 w-32 h-32 blur-3xl opacity-20 rounded-full pointer-events-none transition-opacity group-hover:opacity-40 ${isDarkMode ? 'bg-[#DCA4A7]' : 'bg-[#C97A7E]'}`}></div>

      <h3 className={`font-bold ${textColor} mb-6 flex items-center gap-2 text-lg relative z-10`}>
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${brandColor}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
        Configuration
      </h3>
      
      <div className="space-y-8 relative z-10">
        <div>
          <h4 className={`text-xs font-bold ${labelColor} uppercase tracking-widest mb-3`}>Processor Features</h4>
          <div className="flex flex-col gap-3">
            {/* Forwarding Toggle (Custom Switch) */}
            <label className={`flex items-center justify-between p-3 rounded-xl border border-transparent transition-all cursor-pointer shadow-sm ${isDarkMode ? 'bg-[#131B2A]/50 hover:bg-[#131B2A]' : 'bg-[#FDF8F5] hover:bg-white'}`}>
              <span className={`text-sm font-medium ${textColor}`}>Forwarding</span>
              <div className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={config.forwarding} 
                  onChange={() => handleConfigChange('forwarding', !config.forwarding)} 
                  className="sr-only peer" 
                />
                <div className={`w-11 h-6 rounded-full peer peer-focus:ring-2 peer-focus:ring-[#C97A7E] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${isDarkMode ? 'bg-gray-700 peer-checked:bg-[#DCA4A7]' : 'bg-gray-300 peer-checked:bg-[#C97A7E]'}`}></div>
              </div>
            </label>

            {/* Branch Prediction */}
            <div className={`p-3 rounded-xl shadow-sm ${isDarkMode ? 'bg-[#131B2A]/50' : 'bg-[#FDF8F5]'}`}>
                <label className={`block text-xs font-medium ${textColor} mb-2`}>Branch Prediction</label>
                <select 
                    value={config.branchPrediction}
                    onChange={(e) => handleConfigChange('branchPrediction', e.target.value)}
                    className={`w-full text-sm px-3 py-2 rounded-lg border outline-none transition-colors focus:border-[#C97A7E] ${inputBg}`}
                >
                    <option value="not-taken">Predict Not Taken (Fallthrough)</option>
                    <option value="taken">Predict Taken (Jump)</option>
                </select>
            </div>
          </div>
        </div>

        <div>
            <div className="flex justify-between items-center mb-3">
                 <h4 className={`text-xs font-bold ${labelColor} uppercase tracking-widest`}>Latencies (Cycles)</h4>
                 <button onClick={() => applyPreset('standard')} className={`text-[10px] px-3 py-1 rounded-full font-medium transition-colors border shadow-sm ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-[#DCA4A7] border-white/10' : 'bg-white hover:bg-gray-50 text-[#C97A7E] border-black/10'}`}>Standard</button>
            </div>
          
          <div className="grid grid-cols-1 gap-3 p-1">
             {[
               { label: 'Integer ALU', key: 'integer' },
               { label: 'Int Multiply', key: 'intMul' },
               { label: 'Int Divide', key: 'intDiv' },
               { label: 'Load (Mem)', key: 'memory' },
               { label: 'Store (Mem)', key: 'store' },
               { label: 'FP Add/Sub', key: 'fpAdd' },
               { label: 'FP Multiply', key: 'fpMul' },
               { label: 'FP Divide', key: 'fpDiv' },
               { label: 'Branch', key: 'branch' },
             ].map((item) => (
                <div key={item.key} className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${isDarkMode ? 'bg-[#131B2A]/50 border-white/5 hover:bg-[#131B2A]' : 'bg-[#FDF8F5] border-black/5 hover:bg-white'}`}>
                  <label className={`text-xs uppercase tracking-wider ${labelColor} font-semibold w-1/3`}>{item.label}</label>
                  <div className="flex items-center gap-3 w-2/3">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={config.latencies[item.key as keyof typeof config.latencies]}
                      onChange={(e) => handleChange(item.key as keyof typeof config.latencies, e.target.value)}
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-[#C97A7E] dark:accent-[#DCA4A7]"
                    />
                    <span className={`text-xs font-mono font-bold w-4 text-center ${textColor}`}>{config.latencies[item.key as keyof typeof config.latencies]}</span>
                  </div>
                </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};
