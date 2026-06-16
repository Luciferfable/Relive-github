import React from 'react';
import { motion } from 'motion/react';
import { 
  Clock, 
  UserCheck, 
  CheckCircle2, 
  Truck, 
  MapPin, 
  ShieldCheck, 
  Package, 
  Cpu, 
  Sparkles, 
  CheckCircle,
  Scissors,
  Wand2,
  FileText,
  Layers,
  Check
} from 'lucide-react';
import { DeliveryStatus, RestorationStage } from '../types';

interface DeliveryStatusBadgeProps {
  status: DeliveryStatus;
  className?: string;
}

export function DeliveryStatusBadge({ status, className = '' }: DeliveryStatusBadgeProps) {
  // Config mapping containing details for each state
  const config = React.useMemo(() => {
    switch (status) {
      case 'appointment_created':
        return {
          label: 'Appointment Created',
          bg: 'bg-sky-50 text-sky-700 border-sky-300/60 shadow-sky-500/10',
          dot: 'bg-sky-500',
          icon: Clock,
          pulse: 'rgba(56, 189, 248, 0.4)', // sky-400
          description: 'Awaiting courier matching'
        };
      case 'partner_assigned':
        return {
          label: 'Partner Assigned',
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-300/60 shadow-indigo-500/10',
          dot: 'bg-indigo-500',
          icon: UserCheck,
          pulse: 'rgba(129, 140, 248, 0.4)', // indigo-400
          description: 'Courier agent matched'
        };
      case 'partner_accepted':
        return {
          label: 'Partner Accepted',
          bg: 'bg-amber-50 text-amber-805 border-amber-300 shadow-amber-500/10',
          dot: 'bg-amber-500',
          icon: CheckCircle2,
          pulse: 'rgba(245, 158, 11, 0.4)', // amber-500
          description: 'Courier has accepted run'
        };
      case 'on_the_way':
        return {
          label: 'On the Way',
          bg: 'bg-orange-55 text-orange-900 border-orange-300 shadow-orange-500/15 font-bold',
          dot: 'bg-orange-500',
          icon: Truck,
          pulse: 'rgba(249, 115, 22, 0.5)', // orange-500
          description: 'Courier is in transit'
        };
      case 'arrived':
        return {
          label: 'Courier Arrived',
          bg: 'bg-rose-50 text-rose-800 border-rose-300 shadow-rose-500/20 font-bold',
          dot: 'bg-rose-500',
          icon: MapPin,
          pulse: 'rgba(244, 63, 94, 0.6)', // rose-500
          description: 'Courier is at your doorstep'
        };
      case 'pickup_verified':
        return {
          label: 'PIN Verified',
          bg: 'bg-teal-50 text-teal-800 border-teal-300/60 shadow-teal-500/10',
          dot: 'bg-teal-500',
          icon: ShieldCheck,
          pulse: 'rgba(20, 184, 166, 0.4)', // teal-500
          description: 'Secure handshake complete'
        };
      case 'collected':
        return {
          label: 'Collected',
          bg: 'bg-stone-50 text-stone-700 border-stone-300/60 shadow-stone-500/10',
          dot: 'bg-stone-500',
          icon: Package,
          pulse: 'rgba(120, 113, 108, 0.4)', // stone-500
          description: 'Assets safely retrieved'
        };
      case 'processing':
        return {
          label: 'Processing In Lab',
          bg: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-300/60 shadow-fuchsia-500/10',
          dot: 'bg-fuchsia-500',
          icon: Layers,
          pulse: 'rgba(217, 70, 239, 0.4)', // fuchsia-500
          description: 'Foresight preparation'
        };
      case 'restoring':
        return {
          label: 'Actively Restoring',
          bg: 'bg-violet-50 text-violet-700 border-violet-300/60 shadow-violet-500/10',
          dot: 'bg-violet-500',
          icon: Cpu, 
          pulse: 'rgba(139, 92, 246, 0.4)', // violet-500
          description: 'Fine art digital repair'
        };
      case 'completed':
        return {
          label: 'Completed',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300/60 shadow-emerald-500/10',
          dot: 'bg-emerald-500',
          icon: Sparkles,
          pulse: 'rgba(16, 185, 129, 0.4)', // emerald-500
          description: 'Vault files generated'
        };
      case 'delivered':
        return {
          label: 'Delivered',
          bg: 'bg-green-100 text-green-800 border-green-300 shadow-green-500/10',
          dot: 'bg-green-600',
          icon: CheckCircle,
          pulse: 'rgba(34, 197, 94, 0.4)', // green-500
          description: 'Order fully complete'
        };
      default:
        return {
          label: String(status).replace('_', ' '),
          bg: 'bg-stone-100 text-stone-700 border-stone-200 shadow-stone-500/5',
          dot: 'bg-stone-500',
          icon: Clock,
          pulse: 'rgba(120, 113, 108, 0.3)',
          description: ''
        };
    }
  }, [status]);

  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ 
        opacity: 1, 
        scale: [1, 1.02, 1],
        boxShadow: [
          `0 0 4px ${config.pulse}`,
          `0 0 12px ${config.pulse}`,
          `0 0 4px ${config.pulse}`
        ]
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        repeatType: "reverse"
      }}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase font-black tracking-wider rounded-xl border select-none transition-colors ${config.bg} ${className}`}
    >
      {/* Blinking dot container */}
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: config.pulse }} />
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${config.dot}`} />
      </span>
      
      <Icon className="w-3.5 h-3.5" />
      <span>{config.label}</span>
    </motion.div>
  );
}

interface RestorationStageBadgeProps {
  stage: RestorationStage;
  className?: string;
  isActive?: boolean;
}

export function RestorationStageBadge({ stage, className = '', isActive = false }: RestorationStageBadgeProps) {
  const config = React.useMemo(() => {
    switch (stage) {
      case 'collected':
        return {
          label: 'Collected',
          bg: 'bg-stone-50 text-stone-700 border-stone-200 shadow-xs shadow-stone-500/5',
          dot: 'bg-stone-500',
          icon: Package,
          pulse: 'rgba(120, 113, 108, 0.2)'
        };
      case 'cleaning':
        return {
          label: 'Preservation Wash',
          bg: 'bg-sky-50 text-sky-700 border-sky-200/80 shadow-xs shadow-sky-500/5',
          dot: 'bg-sky-500',
          icon: Clock,
          pulse: 'rgba(56, 189, 248, 0.3)'
        };
      case 'scanning':
        return {
          label: 'HD CCD Scanning',
          bg: 'bg-blue-50 text-blue-700 border-blue-200/80 shadow-xs shadow-blue-500/5',
          dot: 'bg-blue-500',
          icon: Cpu,
          pulse: 'rgba(59, 130, 246, 0.3)'
        };
      case 'ai_enhancement':
        return {
          label: 'Neural Restoration',
          bg: 'bg-purple-50 text-purple-700 border-purple-200/80 shadow-xs shadow-purple-500/5',
          dot: 'bg-purple-500',
          icon: Wand2,
          pulse: 'rgba(168, 85, 247, 0.4)'
        };
      case 'color_restoration':
        return {
          label: 'Color Matching',
          bg: 'bg-orange-55 text-orange-850 border-orange-200/80 shadow-xs shadow-orange-500/5',
          dot: 'bg-orange-500',
          icon: Sparkles,
          pulse: 'rgba(249, 115, 22, 0.3)'
        };
      case 'repair':
        return {
          label: 'Physical Patching',
          bg: 'bg-rose-50 text-rose-700 border-rose-200/80 shadow-xs shadow-rose-500/5',
          dot: 'bg-rose-500',
          icon: Scissors,
          pulse: 'rgba(244, 63, 94, 0.3)'
        };
      case 'quality_check':
        return {
          label: 'Archival Vet & QC',
          bg: 'bg-amber-50 text-amber-800 border-amber-200/80 shadow-xs shadow-amber-500/5',
          dot: 'bg-amber-500',
          icon: ShieldCheck,
          pulse: 'rgba(245, 158, 11, 0.3)'
        };
      case 'uploaded':
        return {
          label: 'Vault Ready',
          bg: 'bg-teal-50 text-teal-800 border-teal-200/80 shadow-xs shadow-teal-500/5',
          dot: 'bg-teal-500',
          icon: FileText,
          pulse: 'rgba(20, 184, 166, 0.3)'
        };
      case 'completed':
        return {
          label: 'Ready for Handoff',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-250 shadow-xs shadow-emerald-500/5',
          dot: 'bg-emerald-500',
          icon: Check,
          pulse: 'rgba(16, 185, 129, 0.4)'
        };
      default:
        return {
          label: String(stage).replace('_', ' '),
          bg: 'bg-stone-50 text-stone-700 border-stone-200',
          dot: 'bg-stone-500',
          icon: Clock,
          pulse: 'rgba(120, 113, 108, 0.2)'
        };
    }
  }, [stage]);

  const Icon = config.icon;

  return (
    <motion.span
      animate={{
        scale: isActive ? [1, 1.04, 1] : 1,
        boxShadow: isActive ? [
          `0 0 2px ${config.pulse}`,
          `0 0 10px ${config.pulse}`,
          `0 0 2px ${config.pulse}`
        ] : 'none'
      }}
      transition={{
        duration: 2.5,
        repeat: Infinity,
        repeatType: "reverse"
      }}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold border transition-colors ${config.bg} ${className}`}
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0 mr-0.5">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isActive ? 'block' : 'hidden'}`} style={{ backgroundColor: config.pulse }} />
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${config.dot}`} />
      </span>
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </motion.span>
  );
}
