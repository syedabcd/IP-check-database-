import React from 'react';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { CheckStatus } from '../types';

interface IpStatusCardProps {
  status: CheckStatus;
  ip: string;
}

export const IpStatusCard: React.FC<IpStatusCardProps> = ({ status, ip }) => {
  if (status === CheckStatus.IDLE || status === CheckStatus.CHECKING) return null;

  const config = {
    [CheckStatus.FRESH]: {
      icon: CheckCircle2,
      title: "Fresh IP Address",
      desc: "This IP address was not found in our database.",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      iconColor: "text-emerald-500"
    },
    [CheckStatus.DUPLICATE]: {
      icon: XCircle,
      title: "Duplicate IP Detected",
      desc: "This IP address already exists in the database.",
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-200",
      iconColor: "text-red-500"
    },
    [CheckStatus.ERROR]: {
      icon: AlertCircle,
      title: "Verification Failed",
      desc: "An error occurred while checking the IP address.",
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200",
      iconColor: "text-amber-500"
    },
    [CheckStatus.IDLE]: { icon: AlertCircle, title: "", desc: "", color: "", bg: "", border: "", iconColor: "" },
    [CheckStatus.CHECKING]: { icon: AlertCircle, title: "", desc: "", color: "", bg: "", border: "", iconColor: "" },
  };

  const current = config[status];
  const Icon = current.icon;

  return (
    <div className={`mt-6 p-4 rounded-xl border ${current.border} ${current.bg} animate-in fade-in slide-in-from-bottom-4 duration-300`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-0.5">
          <Icon className={`h-6 w-6 ${current.iconColor}`} />
        </div>
        <div>
          <h3 className={`text-lg font-semibold ${current.color}`}>
            {current.title}
          </h3>
          <p className="mt-1 text-slate-600 text-sm">
            {current.desc}
          </p>
          <div className="mt-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white border border-slate-200 text-slate-800">
            {ip}
          </div>
        </div>
      </div>
    </div>
  );
};