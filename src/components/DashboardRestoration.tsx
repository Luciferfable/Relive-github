import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Sliders, Brush, Aperture, Eye, CheckCircle2, History, Wand2 } from 'lucide-react';
import { Order, RestorationStage, AppUser } from '../types';

interface DashboardRestorationProps {
  orders: Order[];
  onUpdateOrder: (order: Order) => void;
  currentUser: AppUser;
}

export default function DashboardRestoration({ orders, onUpdateOrder, currentUser }: DashboardRestorationProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(orders[0] || null);

  // Creative tuning studio parameters
  const [cleanIntensity, setCleanIntensity] = useState(85);
  const [neuralSaturation, setNeuralSaturation] = useState(90);
  const [contrastCurve, setContrastCurve] = useState(70);
  const [isProcessingAI, setIsProcessingAI] = useState(false);

  const stagesInOrder: RestorationStage[] = [
    'collected',
    'cleaning',
    'scanning',
    'ai_enhancement',
    'color_restoration',
    'repair',
    'quality_check',
    'uploaded',
    'completed'
  ];

  const advanceRestorationStage = () => {
    if (!selectedOrder) return;
    const currentIdx = stagesInOrder.indexOf(selectedOrder.restorationStage);
    if (currentIdx !== -1 && currentIdx < stagesInOrder.length - 1) {
      const nextStage = stagesInOrder[currentIdx + 1];
      const updatedOrder = {
        ...selectedOrder,
        restorationStage: nextStage
      };
      onUpdateOrder(updatedOrder);
      setSelectedOrder(updatedOrder);
    }
  };

  const runAiDenoiseInference = () => {
    setIsProcessingAI(true);
    setTimeout(() => {
      setIsProcessingAI(false);
      setCleanIntensity(100);
      setNeuralSaturation(95);
      alert("Inference match successful! Core parameters optimized. Fungal dots minimized.");
    }, 1500);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Handheld profile header */}
      <div className="bg-stone-900 text-stone-100 p-6 rounded-3xl border border-stone-850 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-amber-400 text-xs font-mono font-semibold uppercase tracking-widest block">RELIER MASTER RESTORATION LAB</span>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-xl sm:text-2xl font-serif">{currentUser.displayName || 'Restorer'} (Digital Colorist)</h1>
            <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] rounded-full border border-amber-500/30">{currentUser.city || 'Jaipur'} Lab Principal</span>
          </div>
        </div>

        <div className="p-3 bg-stone-950 border border-stone-800 rounded-xl text-center">
          <p className="text-[10px] text-stone-400 uppercase tracking-widest font-mono">LAB CLEANING CLASS</p>
          <p className="text-amber-400 font-bold font-mono">ISO-5 DUST FREE LIMITS</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Active Restoration Queue */}
        <div className="lg:col-span-4 bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h4 className="font-serif font-medium text-stone-900 pb-2 border-b">Active Restoration Pipeline</h4>
          <div className="space-y-3">
            {orders.map((o) => (
              <button
                id={`restorer-order-select-${o.id}`}
                key={o.id}
                onClick={() => setSelectedOrder(o)}
                className={`w-full text-left p-3 rounded-xl border transition-all text-xs flex flex-col gap-1.5 ${
                  selectedOrder?.id === o.id
                    ? 'bg-stone-900 text-white border-stone-900 shadow-md'
                    : 'bg-stone-50 hover:bg-stone-100 border-stone-200'
                }`}
              >
                <div className="flex justify-between w-full font-bold">
                  <span>Order #{o.id}</span>
                  <span className={`text-[10px] uppercase ${selectedOrder?.id === o.id ? 'text-amber-400' : 'text-amber-800'}`}>
                    {o.restorationStage}
                  </span>
                </div>
                <p className="opacity-75">{o.serviceType}</p>
                <p className="text-[9px] opacity-60 font-mono">Date: {o.dateCreated}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Detailed Image adjustment and pipeline stage advanced */}
        {selectedOrder ? (
          <div className="lg:col-span-8 bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-stone-100 pb-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-stone-900">Archival Console for Order #{selectedOrder.id}</h3>
                <p className="text-xs text-stone-500">Current Phase: {selectedOrder.restorationStage.toUpperCase()}</p>
              </div>

              <div className="flex gap-2">
                <button
                  id="restor-advance-stage-btn"
                  onClick={advanceRestorationStage}
                  disabled={selectedOrder.restorationStage === 'completed'}
                  className="px-4 py-2 bg-stone-950 hover:bg-stone-850 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  <CheckCircle2 className="w-4 h-4 text-amber-400" /> Advance Restoration Stage
                </button>
              </div>
            </div>

            {/* Stages visualization tracker */}
            <div className="grid grid-cols-3 sm:grid-cols-9 gap-2 text-center">
              {stagesInOrder.map((stage) => {
                const isCurrent = selectedOrder.restorationStage === stage;
                const isPassed = stagesInOrder.indexOf(selectedOrder.restorationStage) >= stagesInOrder.indexOf(stage);
                return (
                  <div key={stage} className="space-y-1">
                    <div className={`h-1.5 rounded-full ${isCurrent ? 'bg-amber-400' : isPassed ? 'bg-stone-900' : 'bg-stone-100'}`} />
                    <p className={`text-[9px] truncate font-mono uppercase ${isCurrent ? 'text-amber-800 font-bold' : isPassed ? 'text-stone-900' : 'text-stone-300'}`}>
                      {stage.replace('_', ' ')}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Simulated Tuning workspace sliders */}
            <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200/60 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="font-serif font-black text-stone-900 text-sm flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-amber-600" /> Archival Microscope Adjusters
                </h4>

                <div className="space-y-4 text-xs">
                  {/* Slider 1 */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-stone-500 font-semibold text-[11px]">Fungal micro-crease removal intensity:</span>
                      <span className="font-mono font-bold">{cleanIntensity}%</span>
                    </div>
                    <input
                      id="clean-intensity-slider"
                      type="range"
                      min="50"
                      max="100"
                      value={cleanIntensity}
                      onChange={(e) => setCleanIntensity(Number(e.target.value))}
                      aria-label="Fungal micro-crease removal intensity slider"
                      aria-valuemin={50}
                      aria-valuemax={100}
                      aria-valuenow={cleanIntensity}
                      className="w-full h-1 bg-stone-200 rounded-lg appearance-auto cursor-pointer accent-amber-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* Slider 2 */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-stone-500 font-semibold text-[11px]">Neural colorization saturate match:</span>
                      <span className="font-mono font-bold">{neuralSaturation}%</span>
                    </div>
                    <input
                      id="neural-saturation-slider"
                      type="range"
                      min="50"
                      max="100"
                      value={neuralSaturation}
                      onChange={(e) => setNeuralSaturation(Number(e.target.value))}
                      aria-label="Neural colorization saturate match slider"
                      aria-valuemin={50}
                      aria-valuemax={100}
                      aria-valuenow={neuralSaturation}
                      className="w-full h-1 bg-stone-200 rounded-lg appearance-auto cursor-pointer accent-amber-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* Slider 3 */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-stone-500 font-semibold text-[11px]">Mughal-Jaipur original emulsion contrast:</span>
                      <span className="font-mono font-bold">{contrastCurve}%</span>
                    </div>
                    <input
                      id="contrast-curve-slider"
                      type="range"
                      min="40"
                      max="100"
                      value={contrastCurve}
                      onChange={(e) => setContrastCurve(Number(e.target.value))}
                      aria-label="Mughal-Jaipur original emulsion contrast slider"
                      aria-valuemin={40}
                      aria-valuemax={100}
                      aria-valuenow={contrastCurve}
                      className="w-full h-1 bg-stone-200 rounded-lg appearance-auto cursor-pointer accent-amber-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    id="restor-ai-inference"
                    onClick={runAiDenoiseInference}
                    disabled={isProcessingAI}
                    className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-amber-400 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 w-full cursor-pointer disabled:opacity-50"
                  >
                    <Wand2 className={`w-4 h-4 ${isProcessingAI ? 'animate-spin' : ''}`} />
                    {isProcessingAI ? 'Analyzing historical skin balance...' : 'Auto-Optimize via ReLive Archival Core'}
                  </button>
                </div>
              </div>

              {/* Microscope interactive preview */}
              <div className="flex flex-col justify-center items-center">
                <div className="relative border-4 border-white shadow-md rounded-2xl overflow-hidden aspect-square w-full max-w-[280px] bg-stone-950">
                  <img
                    src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&q=80"
                    alt="Microscope Zoom View"
                    className="w-full h-full object-cover transition-colors duration-200"
                    style={{ 
                      filter: `saturate(${neuralSaturation / 100}) contrast(${contrastCurve / 75}) brightness(${1.05 - (100 - cleanIntensity) / 800})` 
                    }}
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute bottom-1 right-1 bg-black/60 text-amber-500 text-[8px] px-1 rounded font-mono font-bold">
                    LAB ZOOM (800x)
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-8 flex flex-col justify-center items-center text-center p-12 py-20 text-stone-400 bg-white border border-stone-200 rounded-2xl">
            <Brush className="w-10 h-10 text-stone-300 animate-pulse mb-3" />
            <p className="text-sm">Select an active restoration pipeline from the queue to start digital colorization adjustments.</p>
          </div>
        )}
      </div>
    </div>
  );
}
