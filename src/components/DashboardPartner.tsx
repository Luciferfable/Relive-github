import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Truck, CheckCircle2, Navigation, MapPin, Key, Clock, ShieldCheck, ArrowRight, Phone } from 'lucide-react';
import { Order, AppUser } from '../types';
import { DeliveryStatusBadge } from './DeliveryStatusBadge';

interface DashboardPartnerProps {
  orders: Order[];
  onUpdateOrder: (order: Order) => void;
  currentUser: AppUser;
}

export default function DashboardPartner({ orders, onUpdateOrder, currentUser }: DashboardPartnerProps) {
  const [partnerStatus, setPartnerStatus] = useState<'available' | 'busy' | 'on_pickup' | 'offline'>('available');
  const [typedOtp, setTypedOtp] = useState('');
  const [otpVerificationError, setOtpVerificationError] = useState(false);
  const [activeVerificationOrder, setActiveVerificationOrder] = useState<Order | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const handleStatusChange = (status: any) => {
    setPartnerStatus(status);
  };

  const partnerOrders = orders.filter(o => o.assignedPartnerId === currentUser.uid && o.deliveryStatus !== 'delivered');
  const currentTaskOrder = partnerOrders.find(o => o.id === selectedOrderId) || partnerOrders[0];

  const startLogisticsRoute = () => {
    if (!currentTaskOrder) return;
    onUpdateOrder({
      ...currentTaskOrder,
      deliveryStatus: 'on_the_way',
      eta: 'Arriving in 15 mins'
    });
    alert("Route started! Global GPS node engaged.");
  };

  const markArrivedAtDoorstep = () => {
    if (!currentTaskOrder) return;
    onUpdateOrder({
      ...currentTaskOrder,
      deliveryStatus: 'arrived',
      eta: 'Courier at your gate!'
    });
    alert(`Marked as Arrived! Notification dispatched to customer ${currentTaskOrder.customerName || 'Aarav Sharma'}.`);
  };

  const verifyOtpCode = (e: React.FormEvent) => {
    e.preventDefault();
    const targetOrder = activeVerificationOrder || currentTaskOrder;
    if (!targetOrder) return;

    if (String(typedOtp).trim() === String(targetOrder.pickupOtp).trim()) {
      onUpdateOrder({
        ...targetOrder,
        deliveryStatus: 'pickup_verified',
        restorationStage: 'cleaning', // moves to active laboratorial cleaning
        otpVerified: true,
        eta: 'Transit to Lab'
      });
      setTypedOtp('');
      setActiveVerificationOrder(null);
      setOtpVerificationError(false);
      alert("✓ Secure OTP Verification Passed! High-impact archival vault locked. Transit initiated.");
    } else {
      setOtpVerificationError(true);
      setTimeout(() => setOtpVerificationError(false), 3000);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-6">
      {/* Handheld Courier Profile */}
      <div className="bg-stone-900 text-stone-100 p-5 rounded-3xl border border-stone-850 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-400 bg-stone-800 flex items-center justify-center">
            {currentUser.profilePhoto ? (
              <img src={currentUser.profilePhoto} alt={currentUser.displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-amber-400 font-bold font-serif text-sm">
                {(currentUser.displayName || 'P').charAt(0)}
              </span>
            )}
          </div>
          <div>
            <h1 className="font-serif font-black text-sm sm:text-base text-stone-50">{currentUser.displayName || 'Partner'}</h1>
            <p className="text-[10px] text-amber-400">ReLive {currentUser.city || 'Jaipur'} Logistics Leader</p>
          </div>
        </div>

        {/* Status Dropdowns */}
        <select
          id="partner-status-header"
          value={partnerStatus}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="bg-stone-950 border border-stone-800 text-amber-400 font-bold p-2 rounded text-[11px] focus:outline-none focus:border-amber-500 cursor-pointer"
        >
          <option value="available">🟢 Available</option>
          <option value="busy">🟡 Busy</option>
          <option value="on_pickup">🔵 On Pickup</option>
          <option value="offline">⚪ Offline</option>
        </select>
      </div>

      {/* Task Console */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs space-y-6">
        <div className="border-b border-stone-100 pb-3">
          <h3 className="font-serif text-base font-bold text-stone-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-600" />
            Today’s Fragile Route Assignments
          </h3>
          <p className="text-stone-500 text-[10px]">Jaipur Metro Area distribution logs</p>
        </div>

        {partnerOrders.length > 1 && (
          <div className="space-y-1.5 bg-stone-50 p-3 rounded-2xl border border-stone-200">
            <label className="block text-[10px] font-mono uppercase text-stone-400 font-bold">Select Active Pickup Task:</label>
            <div className="flex flex-col gap-1.5">
              {partnerOrders.map((po) => (
                <button
                  key={po.id}
                  id={`select-partner-order-${po.id}`}
                  onClick={() => {
                    setSelectedOrderId(po.id);
                    setTypedOtp('');
                    setOtpVerificationError(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs flex justify-between items-center ${
                    currentTaskOrder?.id === po.id
                      ? 'bg-amber-500/10 border-amber-500/40 text-stone-900 font-semibold shadow-2xs'
                      : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-600'
                  }`}
                >
                  <div className="truncate pr-2">
                    <p className="font-serif font-black text-stone-950 text-[11px]">#{po.id} - {po.customerName}</p>
                    <p className="text-[10px] text-stone-500 truncate">{po.serviceType}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[8px] font-mono tracking-wider bg-stone-200 text-stone-850 uppercase shrink-0">
                    {po.deliveryStatus.replace('_', ' ')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {currentTaskOrder ? (
          <div className="space-y-4 text-xs">
            <div className="bg-stone-50 p-4 rounded-2xl border space-y-3">
              <div className="flex justify-between items-center font-bold text-stone-900 border-b pb-2">
                <span>Task: Inbound Doorstep Pickup</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-stone-200 text-stone-850 rounded uppercase">{currentTaskOrder.deliveryStatus.replace('_', ' ')}</span>
              </div>

              {/* Reactive Appointment Progress Status Indicator */}
              {(() => {
                const getProgressState = (status: string) => {
                  switch (status) {
                    case 'appointment_created':
                    case 'partner_assigned':
                    case 'pending':
                      return {
                        label: 'Scheduled',
                        colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                        dotClass: 'bg-emerald-500',
                        description: 'Appointment is confirmed. Collection route prepared.'
                      };
                    case 'partner_accepted':
                    case 'on_the_way':
                    case 'arrived':
                      return {
                        label: 'In-Transit',
                        colorClass: 'bg-amber-50 text-amber-900 border-amber-200',
                        dotClass: 'bg-amber-500',
                        description: 'Courier active on route. Live location signal active.'
                      };
                    case 'pickup_verified':
                    case 'delivered':
                      return {
                        label: 'Completed',
                        colorClass: 'bg-blue-50 text-blue-900 border-blue-200',
                        dotClass: 'bg-blue-600',
                        description: 'Secure handover completed. Assets deposited at lab.'
                      };
                    default:
                      return {
                        label: 'Awaiting Update',
                        colorClass: 'bg-stone-50 text-stone-600 border-stone-200',
                        dotClass: 'bg-stone-400',
                        description: 'Awaiting scheduled timing.'
                      };
                  }
                };

                const stage = getProgressState(currentTaskOrder.deliveryStatus);
                return (
                  <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${stage.colorClass}`}>
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-mono uppercase tracking-wider opacity-75">Appointment State Indicator</span>
                      <p className="font-serif font-black text-xs">{stage.label}</p>
                      <p className="text-[10px] opacity-90 leading-tight">{stage.description}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 px-2 py-1 bg-white/70 rounded-full shadow-2xs border border-white/50">
                      <span className={`w-2 h-2 rounded-full ${stage.dotClass} animate-pulse`} />
                      <span className="font-mono text-[9px] font-black uppercase text-stone-900">{stage.label}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Visual Multi-step state circles */}
              <div className="grid grid-cols-3 gap-1 py-1 text-center text-[9px] font-mono border-b pb-3 border-stone-100">
                {/* Step 1: Scheduled */}
                <div className="flex flex-col items-center space-y-1">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                    ['appointment_created', 'partner_assigned', 'pending', 'partner_accepted', 'on_the_way', 'arrived', 'pickup_verified', 'delivered'].includes(currentTaskOrder.deliveryStatus)
                      ? 'bg-emerald-500 text-white' : 'bg-stone-200 text-stone-400'
                  }`}>
                    1
                  </div>
                  <span className={`${
                    ['appointment_created', 'partner_assigned', 'pending'].includes(currentTaskOrder.deliveryStatus)
                      ? 'text-emerald-700 font-bold' : 'text-stone-400 font-normal'
                  }`}>Scheduled</span>
                </div>

                {/* Step 2: Transit */}
                <div className="flex flex-col items-center space-y-1">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] relative ${
                    ['partner_accepted', 'on_the_way', 'arrived', 'pickup_verified', 'delivered'].includes(currentTaskOrder.deliveryStatus)
                      ? 'bg-amber-500 text-stone-950' : 'bg-stone-200 text-stone-400'
                  }`}>
                    {['partner_accepted', 'on_the_way', 'arrived'].includes(currentTaskOrder.deliveryStatus) && (
                      <span className="absolute -inset-0.5 rounded-full border-2 border-amber-400 animate-ping opacity-60" />
                    )}
                    2
                  </div>
                  <span className={`${
                    ['partner_accepted', 'on_the_way', 'arrived'].includes(currentTaskOrder.deliveryStatus)
                      ? 'text-amber-800 font-bold' : 'text-stone-400 font-normal'
                  }`}>In-Transit</span>
                </div>

                {/* Step 3: Completed */}
                <div className="flex flex-col items-center space-y-1">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                    ['pickup_verified', 'delivered'].includes(currentTaskOrder.deliveryStatus)
                      ? 'bg-blue-600 text-white' : 'bg-stone-200 text-stone-400'
                  }`}>
                    3
                  </div>
                  <span className={`${
                    ['pickup_verified', 'delivered'].includes(currentTaskOrder.deliveryStatus)
                      ? 'text-blue-700 font-bold' : 'text-stone-400 font-normal'
                  }`}>Completed</span>
                </div>
              </div>

              <div className="space-y-1.5 font-light text-stone-700">
                <p>👤 Customer: <strong className="font-semibold text-stone-900">{currentTaskOrder.customerName || 'Aarav Sharma'}</strong></p>
                
                <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 text-[11px] text-amber-900 my-1.5 space-y-1.5 font-sans">
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                    <span className="font-bold">Contact Number:</span>
                    <strong className="font-mono text-stone-950 font-black">{currentTaskOrder.customerPhone || '+91 98765 43210'}</strong>
                  </p>
                  {currentTaskOrder.alternatePhone && (
                    <p className="flex items-center gap-1.5 border-t border-amber-500/10 pt-1.5">
                      <Phone className="w-3.5 h-3.5 text-amber-700 shrink-0 opacity-70" />
                      <span className="font-medium">Alternate Contact:</span>
                      <strong className="font-mono text-stone-950 font-bold">{currentTaskOrder.alternatePhone}</strong>
                    </p>
                  )}
                </div>

                <p>📍 Address: <strong className="text-stone-900 font-normal">{currentTaskOrder.address || '12, Heritage Lane, C-Scheme, Jaipur'}</strong></p>
                <p>📦 Quantity: <strong className="text-stone-900 font-normal">{currentTaskOrder.itemCount} vintage archives (moldy paper/tapes)</strong></p>
                {currentTaskOrder.notes && (
                  <p className="text-[11px] text-stone-400 italic bg-stone-100 p-2 rounded-lg border-l-2 border-amber-500">
                    "{currentTaskOrder.notes}"
                  </p>
                )}
              </div>

              <div className="pt-2 flex flex-col gap-3">
                {/* 1. Accept state */}
                {(currentTaskOrder.deliveryStatus === 'appointment_created' || 
                  currentTaskOrder.deliveryStatus === 'partner_assigned') && (
                  <button
                    id="partner-accept-order-btn"
                    onClick={() => {
                      onUpdateOrder({
                        ...currentTaskOrder,
                        deliveryStatus: 'partner_accepted',
                        courierProgress: 10,
                        eta: 'Assigned (ETA 25 mins)'
                      });
                      alert("✓ Order job accepted! Real-time GPS coordinate telemetry sharing has been initiated for client dashboard.");
                    }}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-stone-950 font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-md transition cursor-pointer text-xs"
                  >
                    <CheckCircle2 className="w-4 h-4 text-stone-950" />
                    Accept Order & Engage Coords Sharing
                  </button>
                )}

                {/* 2. Accepted state, ready to start transit route */}
                {currentTaskOrder.deliveryStatus === 'partner_accepted' && (
                  <button
                    id="partner-start-route"
                    onClick={startLogisticsRoute}
                    className="w-full py-3 bg-stone-900 hover:bg-stone-850 text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow transition cursor-pointer text-xs"
                  >
                    <Navigation className="w-3.5 h-3.5 text-amber-400 animate-pulse" /> Start Scooter Transit Route
                  </button>
                )}

                {/* 3. On the way state */}
                {currentTaskOrder.deliveryStatus === 'on_the_way' && (
                  <button
                    id="partner-mark-arrived"
                    onClick={markArrivedAtDoorstep}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer text-xs transition"
                  >
                    <MapPin className="w-3.5 h-3.5 animate-bounce" /> Mark Doorstep Arrival
                  </button>
                )}

                {/* 4. Arrived state, trigger OTP */}
                {currentTaskOrder.deliveryStatus === 'arrived' && (
                  <button
                    id="partner-trigger-otp-verify"
                    onClick={() => setActiveVerificationOrder(currentTaskOrder)}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-stone-950 font-extrabold rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer text-xs shadow-md"
                  >
                    <Key className="w-4 h-4 text-stone-950" /> Verify Secure Pickup OTP
                  </button>
                )}

                {currentTaskOrder.deliveryStatus === 'pickup_verified' && (
                  <div className="w-full p-4 bg-green-50 border border-green-200 text-green-800 rounded-2xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
                    <span className="font-medium text-xs">OTP verified! Handover secured. Delivering directly to Jaipur Archival Labs.</span>
                  </div>
                )}
              </div>
            </div>

            {/* GPS ACTIVE MAP NAVIGATION TERMINAL FOR DRIVER (Visible after acceptance) */}
            {['partner_accepted', 'on_the_way', 'arrived'].includes(currentTaskOrder.deliveryStatus) && (
              <div className="bg-stone-950 text-stone-100 rounded-3xl p-5 border border-stone-800 space-y-4 animate-fade-in">
                <div className="flex justify-between items-center border-b border-stone-850 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <h4 className="font-serif font-black text-xs text-stone-200 uppercase tracking-wider">
                      🗺️ Live GPS Navigation Terminal
                    </h4>
                  </div>
                  <span className="font-mono text-[9px] text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded">
                    ACTIVE ROUTE
                  </span>
                </div>

                {/* Customer Contact Panel - MANDATORY */}
                <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-[11px] border-b border-stone-850 pb-1.5">
                    <span className="text-stone-400 uppercase font-mono tracking-wider text-[9px]">CUSTOMER PHONE DIRECTORY</span>
                    <span className="text-amber-400 font-bold font-mono text-[9px] bg-amber-400/10 px-2 py-0.5 rounded border border-amber-500/20 animate-pulse">LIVE SECURE PHONE</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-serif text-sm text-stone-100 font-bold">
                        {currentTaskOrder.customerName || 'Aarav Sharma'}
                      </p>
                      <p className="font-mono text-xs text-amber-300 font-bold flex items-center gap-1.5">
                        <span className="text-stone-400">Primary:</span> {currentTaskOrder.customerPhone || '+91 98765 43210'}
                      </p>
                      {currentTaskOrder.alternatePhone && (
                        <p className="font-mono text-xs text-amber-400 font-bold flex items-center gap-1.5">
                          <span className="text-stone-400">Alternate:</span> {currentTaskOrder.alternatePhone}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-2 shrink-0">
                      <a 
                        href={`tel:${currentTaskOrder.customerPhone || '+91 98765 43210'}`} 
                        className="flex-1 sm:flex-none bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-stone-100 px-3 py-2 rounded-lg border border-emerald-500/30 transition text-[11px] flex items-center justify-center gap-1.5 font-bold"
                      >
                        <Phone className="w-3.5 h-3.5" /> Call Primary
                      </a>
                      {currentTaskOrder.alternatePhone && (
                        <a 
                          href={`tel:${currentTaskOrder.alternatePhone}`} 
                          className="flex-1 sm:flex-none bg-stone-800 hover:bg-stone-750 text-stone-200 hover:text-stone-100 px-3 py-2 rounded-lg border border-stone-700 transition text-[11px] flex items-center justify-center gap-1.5 font-bold"
                        >
                          <Phone className="w-3.5 h-3.5" /> Call Alt
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="text-[10px] text-stone-400 bg-stone-950 p-2 rounded border border-stone-850">
                    📍 <span className="font-bold">Destination:</span> {currentTaskOrder.address || '12, Heritage Lane, C-Scheme, Jaipur'}
                  </div>
                </div>

                {/* High Fidelity Vector SVG Map */}
                <div className="relative h-44 bg-stone-900 rounded-2xl overflow-hidden border border-stone-850 flex items-center justify-center">
                  {/* Grid Lines Overlay */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#1c1917_1px,transparent_1px),linear-gradient(to_bottom,#1c1917_1px,transparent_1px)] bg-[size:16px_16px] opacity-40" />

                  {/* SVG Route Canvas */}
                  <svg className="absolute inset-0 w-full h-full p-4" viewBox="0 0 300 150">
                    {/* Definitions for map markers and curves */}
                    <defs>
                      <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#d97706" />
                        <stop offset="100%" stopColor="#ea580c" />
                      </linearGradient>
                    </defs>

                    {/* Neighborhood Streets simulation */}
                    <path d="M20 90 L280 90" stroke="#292524" strokeWidth="6" strokeLinecap="round" />
                    <path d="M60 20 L60 130" stroke="#292524" strokeWidth="4" strokeLinecap="round" />
                    <path d="M150 20 L150 130" stroke="#292524" strokeWidth="4" strokeLinecap="round" />
                    <path d="M240 20 L240 130" stroke="#292524" strokeWidth="5" strokeLinecap="round" />

                    {/* Major Jaipur Landmarks labels */}
                    <text x="25" y="115" fill="#57534e" fontSize="7" fontFamily="monospace">ReLive Lab (Hub)</text>
                    <text x="110" y="30" fill="#57534e" fontSize="7" fontFamily="monospace">C-Scheme Crossing</text>
                    <text x="210" y="135" fill="#57534e" fontSize="7" fontFamily="monospace">Heritage Lane</text>

                    {/* Precise delivery route path line */}
                    {/* Starts at ReLive Hub (40, 90), goes to (150, 90), then bends down to (240, 90), then up to C-Scheme gate (240, 40) */}
                    <path 
                      id="navigationPath"
                      d="M40 90 L150 90 L240 90 L240 40" 
                      fill="none" 
                      stroke="#44403c" 
                      strokeWidth="3.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                    />
                    
                    {/* Highlighted active transit route path */}
                    <path 
                      d="M40 90 L150 90 L240 90 L240 40" 
                      fill="none" 
                      stroke="url(#routeGrad)" 
                      strokeWidth="3.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeDasharray="300"
                      // Interpolate dashoffset based on the courier's simulated progress
                      strokeDashoffset={300 - (300 * (currentTaskOrder.courierProgress || 10)) / 100}
                    />

                    {/* Start Hub Node Marker */}
                    <circle cx="40" cy="90" r="5" fill="#78716c" stroke="#1c1917" strokeWidth="1.5" />
                    
                    {/* User Destination Marker (Precise Address) */}
                    <g transform="translate(240, 40)">
                      <circle cx="0" cy="0" r="6" fill="#f59e0b" className="animate-pulse" />
                      <path d="M -3 -3 L 3 -3 L 3 3 L -3 3 Z" fill="#78350f" />
                    </g>

                    {/* Courier Moving Scooter Node */}
                    {/* Calculate position along coordinate line */}
                    {(() => {
                      const progress = currentTaskOrder.courierProgress || 10;
                      // Path segments representation
                      // Total path points: (40,90) -> (150,90) [len: 110] -> (240,90) [len: 90] -> (240,40) [len: 50]. Total len = 250
                      const d = (progress / 100) * 250;
                      let cx = 40, cy = 90;
                      if (d <= 110) {
                        cx = 40 + d;
                        cy = 90;
                      } else if (d <= 200) {
                        cx = 150 + (d - 110);
                        cy = 90;
                      } else {
                        cx = 240;
                        cy = 90 - (d - 200);
                      }
                      return (
                        <g transform={`translate(${cx}, ${cy})`}>
                          <circle cx="0" cy="0" r="10" fill="#10b981" fillOpacity="0.2" className="animate-ping" />
                          <circle cx="0" cy="0" r="5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                        </g>
                      );
                    })()}
                  </svg>

                  {/* Hovering coordinate metrics label */}
                  <div className="absolute bottom-2.5 right-3 bg-stone-950/90 py-1 px-2.5 rounded-lg border border-stone-800 font-mono text-[9px] text-emerald-400">
                    LAT: {currentTaskOrder.latitude ? currentTaskOrder.latitude.toFixed(5) : '26.91240'}° N | LNG: {currentTaskOrder.longitude ? currentTaskOrder.longitude.toFixed(5) : '75.78730'}° E
                  </div>

                  {/* Current progress indicator badge */}
                  <div className="absolute top-2.5 left-3 bg-stone-950/85 text-[10px] text-stone-300 px-2 py-1 rounded-md border border-stone-850 font-mono">
                    🏎️ Scooter: <span className="text-amber-400 font-bold">{currentTaskOrder.courierProgress || 10}%</span> along route
                  </div>
                </div>

                {/* Ride GPS Simulation controls */}
                <div className="bg-stone-900 p-3 rounded-xl space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-stone-400">SIMULATION ENGINE CONTROL PANEL</span>
                    <span className="text-emerald-400 font-bold">STATE READY</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <button
                      id="partner-gps-sim-step"
                      onClick={() => {
                        const currentVal = currentTaskOrder.courierProgress || 10;
                        const nextVal = Math.min(100, currentVal + 15);
                        let simulatedEta = 'Arriving in 15 mins';
                        if (nextVal > 30) simulatedEta = 'Arriving in 9 mins';
                        if (nextVal > 60) simulatedEta = 'Arriving in 4 mins';
                        if (nextVal > 90) simulatedEta = 'Arriving in 1 min';
                        if (nextVal === 100) simulatedEta = 'Courier at your gate!';

                        onUpdateOrder({
                          ...currentTaskOrder,
                          courierProgress: nextVal,
                          eta: simulatedEta,
                          deliveryStatus: nextVal === 100 ? 'arrived' : 'on_the_way'
                        });
                      }}
                      disabled={currentTaskOrder.courierProgress === 100}
                      className="py-2 bg-stone-800 hover:bg-stone-750 text-stone-200 hover:text-white rounded-lg text-[10px] font-bold font-mono transition border border-stone-700/60 disabled:opacity-40"
                    >
                      🚀 Drive Scooter 15%
                    </button>

                    <button
                      id="partner-gps-autopilot"
                      onClick={() => {
                        const nextStatus = currentTaskOrder.deliveryStatus === 'partner_accepted' ? 'on_the_way' : currentTaskOrder.deliveryStatus;
                        onUpdateOrder({
                          ...currentTaskOrder,
                          deliveryStatus: nextStatus,
                          courierProgress: 10
                        });
                        // Automatically drive the model forward
                        let prog = 10;
                        const t = setInterval(() => {
                          prog += 15;
                          if (prog >= 100) {
                            clearInterval(t);
                            onUpdateOrder({
                              ...currentTaskOrder,
                              deliveryStatus: 'arrived',
                              courierProgress: 100,
                              eta: 'Courier at your gate!'
                            });
                          } else {
                            onUpdateOrder({
                              ...currentTaskOrder,
                              deliveryStatus: 'on_the_way',
                              courierProgress: prog,
                              eta: `Arriving in ${Math.ceil((100 - prog) / 5)} mins`
                            });
                          }
                        }, 1800);
                        alert("Autopilot Route sequence engaged! Scooter in transit.");
                      }}
                      disabled={currentTaskOrder.courierProgress === 100}
                      className="py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 rounded-lg text-[10px] font-extrabold transition disabled:opacity-40"
                    >
                      🤖 Auto-Pilot Transit
                    </button>
                  </div>

                  {/* Deep Google Maps Integration navigation */}
                  <a 
                    href={
                      currentTaskOrder.latitude && currentTaskOrder.longitude
                        ? `https://www.google.com/maps/search/?api=1&query=${currentTaskOrder.latitude},${currentTaskOrder.longitude}`
                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentTaskOrder.address || '12, Heritage Lane, C-Scheme, Jaipur')}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-stone-950 hover:bg-stone-900 border border-stone-800 text-amber-400 hover:text-amber-300 text-center py-2.5 rounded-lg font-bold transition block text-[10px] sm:text-xs shadow-md"
                  >
                    🚀 Trigger Precise Compass Navigation (Lat/Lng Directed) in Google Maps App ↗
                  </a>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-stone-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="text-xs">No active pickup routes assigned for today.</p>
          </div>
        )}
      </div>

      {/* OTP verification popup modal */}
      <AnimatePresence>
        {activeVerificationOrder && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white max-w-xs w-full rounded-2xl overflow-hidden shadow-2xl p-6 text-xs text-center space-y-4"
            >
              <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto text-xl">
                <ShieldCheck />
              </div>

              <div>
                <h3 className="font-serif font-bold text-sm text-stone-950">Secure Handover Protocol</h3>
                <p className="text-stone-500 text-[10px] mt-1">
                  Ask customer <strong className="font-semibold text-stone-900">{activeVerificationOrder.customerName || 'Aarav Sharma'}</strong> (📞 <span className="font-mono text-stone-950 font-bold">{activeVerificationOrder.customerPhone || '+91 98765 43210'}</span>) for the 4-digit code displayed on their dashboard.
                </p>
              </div>

              <form onSubmit={verifyOtpCode} className="space-y-3">
                <input
                  id="partner-otp-input"
                  type="text"
                  maxLength={4}
                  required
                  value={typedOtp}
                  onChange={(e) => setTypedOtp(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 p-2.5 rounded text-center text-lg font-mono font-black tracking-widest text-stone-900 focus:outline-none focus:border-amber-500"
                  placeholder="e.g. 4820"
                />

                {otpVerificationError && (
                  <p className="text-red-500 font-bold font-semibold animate-shake">Incorrect. Ask customer to verify screen PIN.</p>
                )}

                <div className="flex gap-2">
                  <button
                    id="submit-partner-otp"
                    type="submit"
                    className="flex-1 py-2 bg-stone-900 text-white rounded font-bold hover:bg-stone-850 cursor-pointer"
                  >
                    Authorize Collection
                  </button>
                  <button
                    id="cancel-partner-otp"
                    type="button"
                    onClick={() => {
                      setActiveVerificationOrder(null);
                      setTypedOtp('');
                    }}
                    className="px-3 py-2 bg-stone-100 text-stone-600 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
