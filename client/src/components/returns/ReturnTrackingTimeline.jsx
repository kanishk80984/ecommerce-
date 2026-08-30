import React from 'react';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

const getTimelineSteps = (returnType) => {
  const isReplacement = returnType === 'REPLACEMENT';
  if (isReplacement) {
    return [
      { id: 'REQUESTED', label: 'Return Requested' },
      { id: 'RETURN_APPROVED', label: 'Vendor Approved' },
      { id: 'RETURN_IN_TRANSIT', label: 'In Transit' },
      { id: 'RETURN_RECEIVED', label: 'Vendor Received' },
      { id: 'REPLACEMENT_SHIPPED', label: 'Replacement Ready' },
      { id: 'REPLACEMENT_DELIVERED', label: 'Replacement Delivered' }
    ];
  }
  return [
    { id: 'REQUESTED', label: 'Return Requested' },
    { id: 'RETURN_APPROVED', label: 'Vendor Approved' },
    { id: 'RETURN_IN_TRANSIT', label: 'In Transit' },
    { id: 'RETURN_RECEIVED', label: 'Vendor Received' },
    { id: 'REFUND_APPROVED', label: 'Refund Initiated' },
    { id: 'REFUND_COMPLETED', label: 'Refund Paid' }
  ];
};

const ReturnTrackingTimeline = ({ currentStatus, statusLogs = [], returnType = 'RETURN' }) => {
  const TIMELINE_STEPS = getTimelineSteps(returnType);

  // Helper to determine status rank
  const getStatusRank = (status) => {
    // Map intermediate statuses for visual progress
    const statusMap = {
      'VENDOR_REVIEW': 'REQUESTED',
      'APPROVED': 'RETURN_APPROVED',
      'INSPECTION': 'RETURN_RECEIVED',
      'INSPECTION_APPROVED': 'RETURN_RECEIVED',
      'REPLACEMENT_READY': 'REPLACEMENT_SHIPPED',
      'REFUND_PROCESSING': 'REFUND_APPROVED',
      'RETURN_COMPLETED': returnType === 'REPLACEMENT' ? 'REPLACEMENT_DELIVERED' : 'REFUND_COMPLETED'
    };
    const mappedStatus = statusMap[status] || status;
    const index = TIMELINE_STEPS.findIndex(s => s.id === mappedStatus);
    return index === -1 ? 0 : index;
  };

  const currentRank = getStatusRank(currentStatus);
  const isRejected = currentStatus === 'RETURN_REJECTED' || currentStatus === 'REJECTED' || currentStatus === 'INSPECTION_REJECTED' || currentStatus === 'REFUND_REJECTED';

  // Map logs by status for quick lookup
  const logsByStatus = statusLogs.reduce((acc, log) => {
    const mapped = log.new_status || log.status;
    acc[mapped] = log;
    return acc;
  }, {});

  return (
    <div className="w-full">
      {/* Scrollable Container */}
      <div className="w-full overflow-x-auto hide-scrollbar scroll-smooth py-6">
        <div className="flex items-start min-w-max md:min-w-full px-4 lg:px-8">
          
          {TIMELINE_STEPS.map((step, index) => {
            const isLast = index === TIMELINE_STEPS.length - 1;
            const isCompleted = index < currentRank;
            const isCurrent = index === currentRank && !isRejected;
            const isFuture = index > currentRank || isRejected;
            
            // Get log details
            const log = logsByStatus[step.id] || (index === 0 && logsByStatus['REQUESTED']) ? logsByStatus[step.id] : null;

            return (
              <div key={step.id} className="relative flex-1 min-w-[130px] max-w-[180px] flex flex-col items-center">
                
                {/* Connector Line (drawn from this node center to next node center) */}
                {!isLast && (
                  <div className={`absolute top-4 left-1/2 w-full h-1 -mt-0.5 z-0 transition-colors duration-500
                    ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} 
                  />
                )}
                
                {/* Node Icon */}
                <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-4 bg-white transition-all duration-500
                  ${isCompleted ? 'border-green-500 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 
                    isCurrent ? 'border-blue-500 text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)] ring-4 ring-blue-50' : 
                    'border-gray-200 text-gray-300'}`
                }>
                  {isCompleted ? <CheckCircle2 size={16} className="fill-current text-white" /> : 
                   isCurrent ? <Clock size={14} className="animate-pulse" /> : 
                   <Circle size={12} className="fill-current" />}
                </div>

                {/* Content area: Title & Timestamp */}
                <div className="mt-4 flex flex-col items-center text-center px-1">
                  
                  {/* Step Label */}
                  <p className={`text-xs font-bold whitespace-normal break-words leading-tight min-h-[32px] flex items-start justify-center transition-colors duration-300
                    ${isCompleted ? 'text-green-700' : 
                      isCurrent ? 'text-blue-700' : 
                      'text-gray-400'}`
                  }>
                    {step.label}
                  </p>

                  {/* Log Details */}
                  {log ? (
                    <div className="mt-1.5 flex flex-col items-center animate-fadeIn">
                      <p className="text-[10px] font-bold text-gray-700">
                        {new Date(log.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-[10px] font-semibold text-gray-500 mt-0.5">
                        {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {log.remarks && (
                        <div className="mt-2 px-2.5 py-1 bg-gray-50 border border-gray-100 rounded-md text-[9px] text-gray-600 font-medium max-w-[110px] break-words line-clamp-2" title={log.remarks}>
                          {log.remarks}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-1.5 flex flex-col items-center">
                      <p className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider">Pending</p>
                      <p className="text-[10px] text-transparent mt-0.5 select-none">-</p> 
                      {/* Invisible text to maintain height consistency between steps */}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rejected State Notice */}
      {isRejected && (
        <div className="mt-6 mx-4 lg:mx-8 bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-sm animate-fadeIn">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0 border border-red-200">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-red-800">Return Request Rejected</h4>
            <p className="text-xs text-red-600 mt-1 font-medium">This return request has been rejected and the process is halted. Please contact support for further queries.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReturnTrackingTimeline;
